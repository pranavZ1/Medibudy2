const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Appointment = require('../models/Appointment');
const Treatment = require('../models/Treatment');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/medical-reports';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `report-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow specific file types
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, DOC, DOCX files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit per file
  }
});

// Create new appointment
router.post('/', upload.array('reports', 10), async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      age,
      symptoms,
      preferredDate,
      preferredTime,
      additionalNotes,
      treatmentId,
      treatmentName,
      hospitalId,
      hospitalName,
      doctorId,
      doctorName,
      doctorSpecialization,
      hasConsent,
      appointmentType,
      status,
      bookingDate
    } = req.body;

    // Validate required fields
    if (!name || !phone || !email || !age || !treatmentId || !hospitalId || !doctorId) {
      return res.status(400).json({
        error: 'Missing required fields: name, phone, email, age, treatmentId, hospitalId, doctorId'
      });
    }

    // Validate consent
    if (hasConsent !== 'true') {
      return res.status(400).json({
        error: 'Patient consent is required'
      });
    }

    // Verify that the referenced documents exist
    const [treatment, hospital, doctor] = await Promise.all([
      Treatment.findById(treatmentId),
      Hospital.findById(hospitalId),
      Doctor.findById(doctorId)
    ]);

    if (!treatment) {
      return res.status(404).json({ error: 'Treatment not found' });
    }

    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Process uploaded files
    const reports = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        reports.push({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path
        });
      }
    }

    // Create appointment
    const appointmentData = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      age: parseInt(age),
      symptoms: symptoms?.trim() || '',
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      preferredTime: preferredTime || '',
      additionalNotes: additionalNotes?.trim() || '',
      treatmentId,
      treatmentName: treatmentName || treatment.name,
      hospitalId,
      hospitalName: hospitalName || hospital.name,
      doctorId,
      doctorName: doctorName || doctor.name,
      doctorSpecialization: doctorSpecialization || doctor.specialization,
      appointmentType: appointmentType || 'virtual_consultation',
      status: status || 'pending',
      hasConsent: true,
      reports,
      bookingDate: bookingDate ? new Date(bookingDate) : new Date()
    };

    const appointment = new Appointment(appointmentData);
    await appointment.save();

    // Generate consultation link
    appointment.generateConsultationLink();
    await appointment.save();

    // Send confirmation email (placeholder)
    appointment.sendConfirmationEmail();

    // Populate related data for response
    await appointment.populate([
      { path: 'treatmentId', select: 'name category description' },
      { path: 'hospitalId', select: 'name location contact' },
      { path: 'doctorId', select: 'name specialization experience_years rating' }
    ]);

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: {
        ...appointment.toObject(),
        appointmentReference: appointment.appointmentReference
      }
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    
    // Clean up uploaded files if appointment creation fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Get all appointments
router.get('/', async (req, res) => {
  try {
    const {
      status,
      email,
      phone,
      hospitalId,
      doctorId,
      page = 1,
      limit = 20,
      sortBy = 'bookingDate',
      sortOrder = 'desc'
    } = req.query;

    let query = {};

    // Build query based on filters
    if (status) {
      query.status = status;
    }

    if (email) {
      query.email = email.toLowerCase();
    }

    if (phone) {
      query.phone = phone;
    }

    if (hospitalId) {
      query.hospitalId = hospitalId;
    }

    if (doctorId) {
      query.doctorId = doctorId;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const appointments = await Appointment.find(query)
      .populate('treatmentId', 'name category description')
      .populate('hospitalId', 'name location contact')
      .populate('doctorId', 'name specialization experience_years rating')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Appointment.countDocuments(query);

    // Add appointment reference to each appointment
    const appointmentsWithRef = appointments.map(apt => ({
      ...apt.toObject(),
      appointmentReference: apt.appointmentReference
    }));

    res.json({
      appointments: appointmentsWithRef,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get appointment by ID
router.get('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('treatmentId', 'name category description procedures averageCost')
      .populate('hospitalId', 'name description location contact ratings')
      .populate('doctorId', 'name specialization experience_years rating');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      appointment: {
        ...appointment.toObject(),
        appointmentReference: appointment.appointmentReference
      }
    });

  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Update appointment status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, scheduledDate, scheduledTime, consultationNotes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
    if (scheduledTime) updateData.scheduledTime = scheduledTime;
    if (consultationNotes) updateData.consultationNotes = consultationNotes;

    if (status === 'confirmed') {
      updateData.confirmationDate = new Date();
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'treatmentId', select: 'name category' },
      { path: 'hospitalId', select: 'name location contact' },
      { path: 'doctorId', select: 'name specialization' }
    ]);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Send notification email for status changes
    if (status === 'confirmed') {
      appointment.sendConfirmationEmail();
    }

    res.json({
      message: 'Appointment updated successfully',
      appointment: {
        ...appointment.toObject(),
        appointmentReference: appointment.appointmentReference
      }
    });

  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Get upcoming appointments
router.get('/upcoming/list', async (req, res) => {
  try {
    const appointments = await Appointment.getUpcoming();
    
    const appointmentsWithRef = appointments.map(apt => ({
      ...apt.toObject(),
      appointmentReference: apt.appointmentReference
    }));

    res.json({ appointments: appointmentsWithRef });

  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming appointments' });
  }
});

// Get appointments by status
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const appointments = await Appointment.getByStatus(status);
    
    const appointmentsWithRef = appointments.map(apt => ({
      ...apt.toObject(),
      appointmentReference: apt.appointmentReference
    }));

    res.json({ appointments: appointmentsWithRef });

  } catch (error) {
    console.error('Error fetching appointments by status:', error);
    res.status(500).json({ error: 'Failed to fetch appointments by status' });
  }
});

// Delete appointment
router.delete('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Delete uploaded files
    if (appointment.reports && appointment.reports.length > 0) {
      appointment.reports.forEach(report => {
        if (fs.existsSync(report.path)) {
          fs.unlinkSync(report.path);
        }
      });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Appointment deleted successfully' });

  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

module.exports = router;
