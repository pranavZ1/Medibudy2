const express = require('express');
const EnhancedAIService = require('../utils/enhancedAIService');
const MedicalAIDoctor = require('../utils/medicalAIDoctor');
const LocationService = require('../utils/locationService');
const DiseaseInfoService = require('../utils/diseaseInfoService');
const DoctorRecommendationService = require('../utils/doctorRecommendationService');
const AIChatbotService = require('../utils/aiChatbotService');
const Consultation = require('../models/Consultation');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const aiService = new EnhancedAIService();
const medicalDoctor = new MedicalAIDoctor();
const locationService = new LocationService();

// Start new consultation
router.post('/consultation', verifyToken, async (req, res) => {
  try {
    const { type, userConsent } = req.body;

    if (!userConsent || !userConsent.dataProcessing || !userConsent.aiAnalysis) {
      return res.status(400).json({ error: 'User consent is required for AI analysis' });
    }

    const consultation = new Consultation({
      user: req.userId,
      type,
      userConsent: {
        ...userConsent,
        consentDate: new Date()
      },
      status: 'active'
    });

    await consultation.save();

    res.status(201).json({
      message: 'Consultation started successfully',
      consultationId: consultation._id
    });
  } catch (error) {
    console.error('Consultation creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analyze symptoms
router.post('/analyze-symptoms', verifyToken, async (req, res) => {
  try {
    const { consultationId, symptoms, medicalHistory, userInfo } = req.body;

    // Find consultation
    const consultation = await Consultation.findOne({
      _id: consultationId,
      user: req.userId,
      status: 'active'
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found or inactive' });
    }

    // Update consultation with symptoms
    consultation.symptoms = symptoms;
    if (medicalHistory) {
      consultation.medicalHistory = medicalHistory;
    }

    // AI Analysis
    const analysis = await aiService.analyzeSymptoms(symptoms, userInfo);
    
    consultation.aiAnalysis = {
      ...analysis,
      generatedAt: new Date()
    };

    await consultation.save();

    res.json({
      message: 'Symptoms analyzed successfully',
      analysis: consultation.aiAnalysis
    });
  } catch (error) {
    console.error('Symptoms analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze symptoms' });
  }
});

// Get treatment recommendations
router.post('/recommend-treatments', verifyToken, async (req, res) => {
  try {
    const { consultationId, selectedCondition, userInfo } = req.body;

    const consultation = await Consultation.findOne({
      _id: consultationId,
      user: req.userId,
      status: 'active'
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found or inactive' });
    }

    const recommendations = await aiService.recommendTreatments(
      selectedCondition,
      consultation.symptoms,
      userInfo
    );

    // Add to conversation history
    consultation.conversationHistory.push({
      role: 'ai',
      message: `Treatment recommendations for ${selectedCondition}`,
      timestamp: new Date(),
      metadata: { recommendations }
    });

    await consultation.save();

    res.json({
      message: 'Treatment recommendations generated',
      recommendations
    });
  } catch (error) {
    console.error('Treatment recommendation error:', error);
    res.status(500).json({ error: 'Failed to generate treatment recommendations' });
  }
});

// Analyze medical report
router.post('/analyze-report', verifyToken, async (req, res) => {
  try {
    const { consultationId, reportText, reportType } = req.body;

    const consultation = await Consultation.findOne({
      _id: consultationId,
      user: req.userId,
      status: 'active'
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found or inactive' });
    }

    if (!consultation.userConsent.reportAnalysis) {
      return res.status(400).json({ error: 'Report analysis consent not provided' });
    }

    const analysis = await aiService.analyzeMedicalReport(reportText, reportType);

    // Add report to consultation
    consultation.reports.push({
      type: reportType,
      name: `Report - ${new Date().toLocaleDateString()}`,
      uploadDate: new Date(),
      analysis: JSON.stringify(analysis)
    });

    await consultation.save();

    res.json({
      message: 'Medical report analyzed successfully',
      analysis
    });
  } catch (error) {
    console.error('Report analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze medical report' });
  }
});

// Get surgery options
router.post('/surgery-options', verifyToken, async (req, res) => {
  try {
    const { consultationId, condition, patientProfile } = req.body;

    const consultation = await Consultation.findOne({
      _id: consultationId,
      user: req.userId,
      status: 'active'
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found or inactive' });
    }

    const surgeryOptions = await aiService.suggestSurgeryOptions(condition, patientProfile);

    // Add to conversation history
    consultation.conversationHistory.push({
      role: 'ai',
      message: `Surgery options for ${condition}`,
      timestamp: new Date(),
      metadata: { surgeryOptions }
    });

    await consultation.save();

    res.json({
      message: 'Surgery options generated',
      surgeryOptions
    });
  } catch (error) {
    console.error('Surgery options error:', error);
    res.status(500).json({ error: 'Failed to generate surgery options' });
  }
});

// Chat with AI
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { consultationId, message } = req.body;

    const consultation = await Consultation.findOne({
      _id: consultationId,
      user: req.userId,
      status: 'active'
    });

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found or inactive' });
    }

    // Add user message to history
    consultation.conversationHistory.push({
      role: 'user',
      message: message,
      timestamp: new Date()
    });

    // Generate AI response (simplified - you can enhance this)
    const aiResponse = `Thank you for your message: "${message}". Based on our previous analysis, I recommend continuing with the suggested treatment plan. Please consult with a healthcare professional for detailed guidance.`;

    // Add AI response to history
    consultation.conversationHistory.push({
      role: 'ai',
      message: aiResponse,
      timestamp: new Date()
    });

    await consultation.save();

    res.json({
      message: 'Message sent successfully',
      response: aiResponse
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Get consultation history
router.get('/consultations', verifyToken, async (req, res) => {
  try {
    const consultations = await Consultation.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .populate('treatmentOptions.treatment')
      .populate('hospitalRecommendations.hospital');

    res.json({ consultations });
  } catch (error) {
    console.error('Consultation history error:', error);
    res.status(500).json({ error: 'Failed to fetch consultation history' });
  }
});

// Get specific consultation
router.get('/consultation/:id', verifyToken, async (req, res) => {
  try {
    const consultation = await Consultation.findOne({
      _id: req.params.id,
      user: req.userId
    })
    .populate('treatmentOptions.treatment')
    .populate('hospitalRecommendations.hospital');

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    res.json({ consultation });
  } catch (error) {
    console.error('Consultation fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch consultation' });
  }
});

// Simple symptom analysis (no auth required) - Enhanced Medical AI with Hospital Suggestions
router.post('/analyze-symptoms-simple', async (req, res) => {
  try {
    console.log('=== SYMPTOM ANALYSIS REQUEST ===');
    console.log('Request received:', req.method, req.url);
    console.log('Request origin:', req.get('Origin'));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request body type:', typeof req.body);
    
    const { symptoms, additionalInfo, userLocation: providedLocation } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      console.log('Invalid symptoms provided:', symptoms);
      return res.status(400).json({ error: 'Please provide at least one symptom' });
    }

    console.log('Analyzing symptoms with Medical AI Doctor:', symptoms);
    console.log('User location provided:', providedLocation);

    // Use Medical AI Doctor for comprehensive analysis
    const analysis = await medicalDoctor.analyzeSymptoms(symptoms, { additionalInfo });

    console.log('Analysis completed successfully');

    // Get user location from request or fallback to IP
    let hospitalSuggestions = [];
    let doctorSuggestions = [];
    let userLocation = providedLocation;
    
    try {
      // If no location provided in request, fallback to IP-based location
      if (!userLocation) {
        console.log('No user location provided, getting from IP...');
        const clientIP = req.headers['x-forwarded-for'] || 
                        req.headers['x-real-ip'] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress ||
                        (req.connection.socket ? req.connection.socket.remoteAddress : null);
        
        console.log('Client IP:', clientIP);
        
        // Get user location
        const locationData = await locationService.getLocationFromIP(clientIP);
        userLocation = locationData.location;
      }
      
      console.log('Final user location used:', userLocation);

      if (userLocation && analysis.possibleConditions) {
        // Get relevant specialties based on conditions
        const relevantSpecialties = locationService.getRelevantSpecialties(analysis.possibleConditions);
        console.log('Relevant specialties:', relevantSpecialties);

        // Use the fast hospital search with timeout
        try {
          console.log('🚀 Using fast hospital search...');
          const searchPromise = locationService.findNearbyHospitalsFast(
            userLocation.latitude,
            userLocation.longitude,
            10, // 10km radius for faster search
            5   // limit to 5 hospitals
          );
          
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Hospital search timeout')), 5000)
          );
          
          const fastHospitals = await Promise.race([searchPromise, timeoutPromise]);
          hospitalSuggestions = fastHospitals || [];
          
          console.log(`✅ Fast search found ${hospitalSuggestions.length} nearby hospitals`);
        } catch (fastSearchError) {
          console.log('❌ Fast search failed, trying basic search...');
          // Fallback to a very simple search
          const Hospital = require('../models/Hospital');
          const simpleHospitals = await Hospital.find({
            'location.city': { $regex: new RegExp(userLocation.city || 'bangalore', 'i') }
          }).limit(3).lean();
          
          hospitalSuggestions = simpleHospitals.map(h => ({
            ...h,
            distance: 'Unknown'
          }));
          
          console.log(`📍 Fallback search found ${hospitalSuggestions.length} hospitals`);
        }

        // Add doctor search with timeout
        try {
          console.log('🩺 Searching for nearby doctors...');
          const Doctor = require('../models/Doctor');
          const doctorSearchPromise = Doctor.find({
            'location.city': { $regex: new RegExp(userLocation.city || 'bangalore', 'i') },
            $or: relevantSpecialties.map(spec => ({
              specialization: { $regex: new RegExp(spec, 'i') }
            }))
          }).limit(5).lean();
          
          const doctorTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Doctor search timeout')), 3000)
          );
          
          const doctors = await Promise.race([doctorSearchPromise, doctorTimeoutPromise]);
          doctorSuggestions = doctors || [];
          
          console.log(`✅ Found ${doctorSuggestions.length} nearby doctors`);
        } catch (doctorSearchError) {
          console.log('❌ Doctor search failed:', doctorSearchError.message);
          doctorSuggestions = [];
        }
      }
    } catch (locationError) {
      console.error('Error getting location or healthcare providers:', locationError.message);
      // Continue without healthcare suggestions
    }

    const response = {
      message: 'Medical analysis completed successfully',
      analysis: {
        ...analysis,
        nearbyHospitals: {
          userLocation: userLocation,
          hospitals: hospitalSuggestions,
          doctors: doctorSuggestions,
          searchRadius: userLocation ? 10 : null,
          totalHospitalsFound: hospitalSuggestions.length,
          totalDoctorsFound: doctorSuggestions.length
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Medical AI analysis error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to analyze symptoms',
      details: error.message,
      analysis: {
        ...medicalDoctor.getComprehensiveDefaultAnalysis(),
        nearbyHospitals: {
          userLocation: null,
          hospitals: [],
          doctors: [],
          searchRadius: null,
          totalHospitalsFound: 0,
          totalDoctorsFound: 0,
          error: 'Could not fetch healthcare provider suggestions'
        }
      }
    });
  }
});

// Get detailed disease information
router.post('/disease-details', async (req, res) => {
  try {
    const { diseaseName, userSymptoms, userLocation } = req.body;

    if (!diseaseName) {
      return res.status(400).json({ error: 'Disease name is required' });
    }

    console.log('🔍 Getting disease details for:', diseaseName);
    console.log('👤 User symptoms:', userSymptoms);
    console.log('📍 User location:', userLocation);

    // Get comprehensive disease information
    const diseaseInfo = await DiseaseInfoService.getDiseaseDetails(diseaseName, userSymptoms || []);

    // Get recommended doctors if location is provided
    let recommendedDoctors = [];
    let recommendedHospitals = [];
    
    if (userLocation && userLocation.lat && userLocation.lng && diseaseInfo.recommendedSpecialties) {
      try {
        console.log('🔍 Finding doctors for specialties:', diseaseInfo.recommendedSpecialties);
        
        const doctors = await DoctorRecommendationService.findRecommendedDoctors(
          diseaseInfo.recommendedSpecialties,
          userLocation,
          25, // 25km radius
          8   // limit to 8 doctors
        );

        const hospitals = await DoctorRecommendationService.findSpecialtyHospitals(
          diseaseInfo.recommendedSpecialties,
          userLocation,
          30, // 30km radius
          5   // limit to 5 hospitals
        );

        recommendedDoctors = doctors.map(doctor => 
          DoctorRecommendationService.formatDoctorRecommendation(doctor)
        );

        recommendedHospitals = hospitals.map(hospital => 
          DoctorRecommendationService.formatHospitalRecommendation(hospital)
        );

        console.log(`✅ Found ${recommendedDoctors.length} doctors and ${recommendedHospitals.length} hospitals`);

      } catch (locationError) {
        console.warn('⚠️ Could not fetch nearby providers:', locationError.message);
      }
    }

    const response = {
      success: true,
      diseaseInfo,
      recommendations: {
        doctors: recommendedDoctors,
        hospitals: recommendedHospitals,
        specialties: diseaseInfo.recommendedSpecialties,
        searchLocation: userLocation ? {
          city: userLocation.city || 'Unknown',
          coordinates: { lat: userLocation.lat, lng: userLocation.lng }
        } : null
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Error getting disease details:', error);
    res.status(500).json({
      error: 'Failed to get disease information',
      details: error.message,
      diseaseInfo: DiseaseInfoService.getDefaultDiseaseInfo(req.body.diseaseName || 'Unknown'),
      recommendations: {
        doctors: [],
        hospitals: [],
        specialties: ['Internal Medicine', 'Family Medicine'],
        searchLocation: null
      }
    });
  }
});

// Get user location from IP
router.get('/user-location', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                     (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    console.log('🌍 Detecting location for IP:', clientIp);

    // For development/localhost, use default location
    if (!clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.includes('192.168') || clientIp === '::ffff:127.0.0.1') {
      return res.json({
        success: true,
        location: {
          lat: 12.9716,
          lng: 77.5946,
          city: 'Bengaluru',
          region: 'Karnataka',
          country: 'India',
          source: 'default'
        },
        message: 'Using default location for development'
      });
    }

    // Try to get location from IP
    try {
      const axios = require('axios');
      const response = await axios.get(`http://ip-api.com/json/${clientIp}`, { timeout: 5000 });
      const data = response.data;

      if (data.status === 'success' && data.lat && data.lon) {
        return res.json({
          success: true,
          location: {
            lat: data.lat,
            lng: data.lon,
            city: data.city,
            region: data.regionName,
            country: data.country,
            source: 'ip_geolocation'
          }
        });
      }
    } catch (ipError) {
      console.warn('IP geolocation failed:', ipError.message);
    }

    // Fallback to default location
    res.json({
      success: true,
      location: {
        lat: 12.9716,
        lng: 77.5946,
        city: 'Bengaluru',
        region: 'Karnataka',
        country: 'India',
        source: 'fallback'
      },
      message: 'Using fallback location'
    });

  } catch (error) {
    console.error('Error detecting user location:', error);
    res.status(500).json({
      error: 'Failed to detect location',
      location: {
        lat: 12.9716,
        lng: 77.5946,
        city: 'Bengaluru',
        region: 'Karnataka',
        country: 'India',
        source: 'error_fallback'
      }
    });
  }
});

// Get detailed disease information
router.post('/disease-details', async (req, res) => {
  try {
    console.log('=== DISEASE DETAILS REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { diseaseName, userSymptoms } = req.body;

    if (!diseaseName) {
      return res.status(400).json({ error: 'Disease name is required' });
    }

    console.log('Getting detailed info for disease:', diseaseName);
    console.log('User symptoms:', userSymptoms);

    const diseaseInfoService = new DiseaseInfoService();
    const diseaseDetails = await diseaseInfoService.getDetailedDiseaseInfo(diseaseName, userSymptoms || []);

    console.log('Disease details retrieved successfully');

    res.json({
      message: 'Disease details retrieved successfully',
      diseaseInfo: diseaseDetails
    });
  } catch (error) {
    console.error('Disease details error:', error);
    res.status(500).json({ 
      error: 'Failed to get disease details',
      message: 'Please consult with a healthcare professional for accurate medical information.'
    });
  }
});

// AI Chatbot endpoint
router.post('/chatbot', async (req, res) => {
  try {
    const { message, userLocation } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Message is required and cannot be empty' 
      });
    }

    console.log('Processing chat message:', message);
    console.log('User location:', userLocation);

    const chatbotService = new AIChatbotService();
    const response = await chatbotService.processChatMessage(message.trim(), userLocation);

    console.log('Chat response generated successfully');

    res.json({
      success: true,
      message: 'Chat response generated successfully',
      response
    });
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      message: 'I apologize, but I\'m having trouble processing your request right now. Please try again or consult with a healthcare professional for immediate assistance.'
    });
  }
});

module.exports = router;
