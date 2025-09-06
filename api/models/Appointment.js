const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // Patient Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  age: {
    type: Number,
    required: true,
    min: 1,
    max: 120
  },
  
  // Medical Information
  symptoms: {
    type: String,
    trim: true
  },
  additionalNotes: {
    type: String,
    trim: true
  },
  
  // Treatment Information
  treatmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Treatment',
    required: true
  },
  treatmentName: {
    type: String,
    required: true
  },
  
  // Hospital Information
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  hospitalName: {
    type: String,
    required: true
  },
  
  // Doctor Information
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  doctorName: {
    type: String,
    required: true
  },
  doctorSpecialization: {
    type: String,
    required: true
  },
  
  // Appointment Details
  appointmentType: {
    type: String,
    enum: ['virtual_consultation', 'in_person', 'phone_consultation'],
    default: 'virtual_consultation'
  },
  preferredDate: {
    type: Date
  },
  preferredTime: {
    type: String
  },
  scheduledDate: {
    type: Date
  },
  scheduledTime: {
    type: String
  },
  
  // Status and Tracking
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
    default: 'pending'
  },
  bookingDate: {
    type: Date,
    default: Date.now
  },
  confirmationDate: {
    type: Date
  },
  
  // Medical Reports
  reports: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    path: String
  }],
  
  // Consent and Legal
  hasConsent: {
    type: Boolean,
    required: true,
    default: false
  },
  consentDate: {
    type: Date,
    default: Date.now
  },
  
  // Communication
  consultationLink: {
    type: String
  },
  meetingId: {
    type: String
  },
  notificationsSent: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push']
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed']
    }
  }],
  
  // Consultation Details
  consultationNotes: {
    type: String
  },
  prescription: {
    type: String
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  
  // Payment (if needed in future)
  consultationFee: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'free'],
    default: 'free'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
appointmentSchema.index({ email: 1 });
appointmentSchema.index({ phone: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ bookingDate: -1 });
appointmentSchema.index({ hospitalId: 1 });
appointmentSchema.index({ doctorId: 1 });
appointmentSchema.index({ treatmentId: 1 });

// Virtual for appointment reference number
appointmentSchema.virtual('appointmentReference').get(function() {
  return `APT${this._id.toString().slice(-8).toUpperCase()}`;
});

// Pre-save middleware to update updatedAt
appointmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to generate consultation link (placeholder)
appointmentSchema.methods.generateConsultationLink = function() {
  // This would integrate with a video conferencing service
  const meetingId = `meeting_${this._id}_${Date.now()}`;
  this.meetingId = meetingId;
  this.consultationLink = `https://meet.medibuddy.com/join/${meetingId}`;
  return this.consultationLink;
};

// Method to send confirmation email (placeholder)
appointmentSchema.methods.sendConfirmationEmail = function() {
  // This would integrate with an email service
  console.log(`Sending confirmation email to ${this.email} for appointment ${this.appointmentReference}`);
  
  this.notificationsSent.push({
    type: 'email',
    status: 'sent'
  });
  
  return true;
};

// Static method to get appointments by status
appointmentSchema.statics.getByStatus = function(status) {
  return this.find({ status })
    .populate('treatmentId', 'name category')
    .populate('hospitalId', 'name location contact')
    .populate('doctorId', 'name specialization experience_years rating')
    .sort({ bookingDate: -1 });
};

// Static method to get upcoming appointments
appointmentSchema.statics.getUpcoming = function() {
  const now = new Date();
  return this.find({
    status: 'confirmed',
    scheduledDate: { $gte: now }
  })
    .populate('treatmentId', 'name category')
    .populate('hospitalId', 'name location contact')
    .populate('doctorId', 'name specialization experience_years rating')
    .sort({ scheduledDate: 1 });
};

module.exports = mongoose.model('Appointment', appointmentSchema);
