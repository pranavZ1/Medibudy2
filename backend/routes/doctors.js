const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Fuzzy specialty matching using Gemini
async function getMatchingSpecialties(searchSpecialty) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
Given the medical specialty search term: "${searchSpecialty}"

Please provide a JSON array of medical specialties that could match this search term, including common variations, abbreviations, and related specialties.

For example:
- "cardiology" should match: ["cardiology", "cardiac", "heart", "cardiovascular"]
- "orthopedics" should match: ["orthopedics", "orthopedic", "ortho", "bone", "joint"]
- "eye" should match: ["ophthalmology", "eye", "vision", "retina"]

Return only a JSON array of strings, no other text:
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text.trim());
    } catch (parseError) {
      console.log('Failed to parse Gemini response, using fallback');
      return [searchSpecialty];
    }
  } catch (error) {
    console.error('Error getting specialty matches from Gemini:', error);
    return [searchSpecialty];
  }
}

// Get doctors by hospital ID and specialty
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { specialty } = req.query;

    console.log(`🔍 Looking for doctors at hospital ${hospitalId} with specialty: ${specialty}`);

    // First, get the hospital to access its doctors array
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    console.log(`🏥 Found hospital: ${hospital.name} with ${hospital.doctors.length} doctors`);

    // Extract doctor IDs from hospital's doctors array
    const doctorIds = hospital.doctors.map(doc => doc.doctor_id);
    
    // Build query to find doctors by IDs
    let doctorQuery = { _id: { $in: doctorIds } };
    
    // Enhanced specialty filtering with fuzzy matching
    if (specialty) {
      console.log(`🧠 Using AI to find specialty matches for: ${specialty}`);
      const matchingSpecialties = await getMatchingSpecialties(specialty);
      console.log(`🎯 AI found these matching specialties:`, matchingSpecialties);
      
      // Create regex patterns for all matching specialties
      const specialtyPatterns = matchingSpecialties.map(spec => new RegExp(spec, 'i'));
      doctorQuery.specialization = { $in: specialtyPatterns };
    }

    // Fetch doctor details from doctors collection
    const doctors = await Doctor.find(doctorQuery);

    console.log(`👨‍⚕️ Found ${doctors.length} doctors matching criteria`);

    // Enhance doctors with hospital information
    const enhancedDoctors = doctors.map(doctor => ({
      ...doctor.toObject(),
      hospital: {
        id: hospital._id,
        name: hospital.name,
        location: hospital.location,
        distance: hospital.distance || 0
      }
    }));

    // Only add virtual consultation if no physical doctors are available
    let finalDoctors = enhancedDoctors;
    
    if (enhancedDoctors.length === 0) {
      const virtualConsultationOption = {
        _id: 'virtual-consultation',
        name: 'Virtual Consultation',
        specialization: specialty || 'General Medicine',
        experience: 'Available 24/7',
        rating: { value: 4.8, total_reviews: 1250 },
        consultation_fee: 500,
        isVirtual: true,
        hospital: {
          id: hospital._id,
          name: hospital.name,
          location: hospital.location
        }
      };
      finalDoctors = [virtualConsultationOption];
    }

    res.json({
      doctors: finalDoctors,
      hospital: {
        id: hospital._id,
        name: hospital.name,
        location: hospital.location
      },
      total: finalDoctors.length,
      physicalDoctors: enhancedDoctors.length,
      virtualOptions: enhancedDoctors.length === 0 ? 1 : 0
    });
  } catch (error) {
    console.error('Error fetching hospital doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// Get all doctors
router.get('/', async (req, res) => {
  try {
    const { 
      specialization, 
      hospital_id,
      city, 
      state,
      minRating,
      maxExperience,
      minExperience,
      search,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = {};

    // Build search query
    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    if (hospital_id) {
      query.hospital_id = hospital_id;
    }

    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    if (state) {
      query['location.state'] = new RegExp(state, 'i');
    }

    if (minRating) {
      query['rating.value'] = { $gte: parseFloat(minRating) };
    }

    if (minExperience || maxExperience) {
      query.experience_years = {};
      if (minExperience) query.experience_years.$gte = parseInt(minExperience);
      if (maxExperience) query.experience_years.$lte = parseInt(maxExperience);
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { specialization: new RegExp(search, 'i') },
        { designation: new RegExp(search, 'i') }
      ];
    }

    const doctors = await Doctor.find(query)
      .sort({ 'rating.value': -1, experience_years: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Doctor.countDocuments(query);

    res.json({
      doctors,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// Get doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json({ doctor });

  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
});

// Get doctors by hospital
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { 
      specialization,
      minRating,
      page = 1,
      limit = 20
    } = req.query;

    let query = { hospital_id: hospitalId };

    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    if (minRating) {
      query['rating.value'] = { $gte: parseFloat(minRating) };
    }

    const doctors = await Doctor.find(query)
      .sort({ 'rating.value': -1, experience_years: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Doctor.countDocuments(query);

    res.json({
      doctors,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Error fetching doctors by hospital:', error);
    res.status(500).json({ error: 'Failed to fetch doctors by hospital' });
  }
});

// Get doctors by specialization
router.get('/specialization/:specialization', async (req, res) => {
  try {
    const { specialization } = req.params;
    const { 
      city,
      state,
      minRating,
      page = 1,
      limit = 20
    } = req.query;

    let query = { 
      specialization: new RegExp(specialization, 'i')
    };

    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    if (state) {
      query['location.state'] = new RegExp(state, 'i');
    }

    if (minRating) {
      query['rating.value'] = { $gte: parseFloat(minRating) };
    }

    const doctors = await Doctor.find(query)
      .sort({ 'rating.value': -1, experience_years: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Doctor.countDocuments(query);

    res.json({
      doctors,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Error fetching doctors by specialization:', error);
    res.status(500).json({ error: 'Failed to fetch doctors by specialization' });
  }
});

// Get unique specializations
router.get('/specializations/list', async (req, res) => {
  try {
    const specializations = await Doctor.distinct('specialization');
    
    res.json({ specializations: specializations.filter(s => s && s.trim()) });

  } catch (error) {
    console.error('Error fetching specializations:', error);
    res.status(500).json({ error: 'Failed to fetch specializations' });
  }
});

module.exports = router;
