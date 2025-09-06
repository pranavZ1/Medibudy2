const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const cheerio = require('cheerio');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Treatment cost scraping and analysis
router.post('/analyze-treatment', async (req, res) => {
  try {
    const { treatmentName, patientLocation, insuranceType = 'none' } = req.body;

    if (!treatmentName) {
      return res.status(400).json({ error: 'Treatment name is required' });
    }

    console.log(`🔍 Analyzing treatment: ${treatmentName} for location: ${patientLocation}`);

    // Parallel execution of different data gathering
    const [costData, hospitalData, doctorData, procedureInfo] = await Promise.all([
      scrapeTreatmentCosts(treatmentName),
      findNearbyHospitals(treatmentName, patientLocation),
      findSpecialistDoctors(treatmentName, patientLocation),
      getTreatmentDetails(treatmentName)
    ]);

    // Compile comprehensive treatment plan
    const treatmentPlan = {
      treatment: {
        name: treatmentName,
        details: procedureInfo,
        location: patientLocation,
        insurance: insuranceType
      },
      costs: costData,
      hospitals: hospitalData,
      doctors: doctorData,
      recommendations: await generateRecommendations(treatmentName, costData, hospitalData, patientLocation),
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: treatmentPlan
    });

  } catch (error) {
    console.error('❌ Treatment analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze treatment',
      details: error.message 
    });
  }
});

// Scrape treatment costs from multiple sources
async function scrapeTreatmentCosts(treatmentName) {
  const sources = [];
  
  try {
    // Source 1: Vaidam Health
    const vaidamData = await scrapeVaidam(treatmentName);
    if (vaidamData) sources.push(vaidamData);

    // Source 2: Practo/Google search results
    const googleData = await scrapeGoogleResults(treatmentName);
    if (googleData) sources.push(...googleData);

    // Source 3: Hospital websites (simulate)
    const hospitalData = await scrapeHospitalSites(treatmentName);
    if (hospitalData) sources.push(...hospitalData);

    // Use Gemini to analyze and normalize cost data
    const normalizedCosts = await normalizeCostData(treatmentName, sources);

    return {
      sources: sources,
      analysis: normalizedCosts,
      priceRange: calculatePriceRange(sources),
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error('Cost scraping error:', error);
    return {
      sources: [],
      analysis: 'Cost data unavailable',
      priceRange: { min: 0, max: 0, currency: 'INR' },
      error: error.message
    };
  }
}

// Scrape Vaidam Health (example implementation)
async function scrapeVaidam(treatmentName) {
  try {
    const searchUrl = `https://www.vaidam.com/treatments/${treatmentName.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Note: In real implementation, you'd need proper web scraping
    // For demo, we'll simulate the response
    const simulatedData = {
      source: 'Vaidam Health',
      url: searchUrl,
      priceRange: {
        min: Math.floor(Math.random() * 50000) + 25000,
        max: Math.floor(Math.random() * 100000) + 75000,
        currency: 'INR'
      },
      hospitals: [
        { name: 'Apollo Hospital', location: 'Delhi', rating: 4.5 },
        { name: 'Fortis Healthcare', location: 'Mumbai', rating: 4.3 },
        { name: 'Max Healthcare', location: 'Gurgaon', rating: 4.4 }
      ],
      lastUpdated: new Date().toISOString()
    };

    return simulatedData;

  } catch (error) {
    console.error('Vaidam scraping error:', error);
    return null;
  }
}

// Scrape Google search results for treatment costs
async function scrapeGoogleResults(treatmentName) {
  try {
    // Simulate Google search results for treatment costs
    const results = [
      {
        source: 'Medical Tourism India',
        priceRange: {
          min: Math.floor(Math.random() * 40000) + 20000,
          max: Math.floor(Math.random() * 120000) + 60000,
          currency: 'INR'
        },
        description: `${treatmentName} cost in India - comprehensive treatment packages`,
        reliability: 0.8
      },
      {
        source: 'Healthcare Compare',
        priceRange: {
          min: Math.floor(Math.random() * 35000) + 25000,
          max: Math.floor(Math.random() * 110000) + 70000,
          currency: 'INR'
        },
        description: `Compare ${treatmentName} prices across top hospitals`,
        reliability: 0.7
      }
    ];

    return results;

  } catch (error) {
    console.error('Google scraping error:', error);
    return [];
  }
}

// Scrape hospital websites for treatment costs
async function scrapeHospitalSites(treatmentName) {
  try {
    // Simulate hospital-specific pricing
    const hospitals = [
      {
        source: 'AIIMS Delhi',
        priceRange: {
          min: Math.floor(Math.random() * 30000) + 15000,
          max: Math.floor(Math.random() * 80000) + 40000,
          currency: 'INR'
        },
        hospitalType: 'Government',
        reliability: 0.9
      },
      {
        source: 'Apollo Hospital',
        priceRange: {
          min: Math.floor(Math.random() * 60000) + 40000,
          max: Math.floor(Math.random() * 150000) + 100000,
          currency: 'INR'
        },
        hospitalType: 'Private',
        reliability: 0.9
      }
    ];

    return hospitals;

  } catch (error) {
    console.error('Hospital scraping error:', error);
    return [];
  }
}

// Find nearby hospitals offering the treatment
async function findNearbyHospitals(treatmentName, location) {
  try {
    // Simulate hospital search based on location and treatment
    const hospitals = [
      {
        id: 'h1',
        name: 'Apollo Hospital',
        address: 'Sarita Vihar, Delhi',
        distance: '5.2 km',
        rating: 4.5,
        reviews: 1245,
        specialties: [treatmentName, 'Cardiology', 'Oncology'],
        costRange: {
          min: 45000,
          max: 125000,
          currency: 'INR'
        },
        contact: {
          phone: '+91-11-2692-5858',
          email: 'info@apollodelhi.com'
        },
        facilities: ['ICU', 'Emergency', '24x7 Pharmacy', 'Diagnostic Center'],
        insuranceAccepted: ['Star Health', 'HDFC Ergo', 'ICICI Lombard']
      },
      {
        id: 'h2',
        name: 'Fortis Hospital',
        address: 'Sector 62, Noida',
        distance: '12.8 km',
        rating: 4.3,
        reviews: 892,
        specialties: [treatmentName, 'Neurology', 'Orthopedics'],
        costRange: {
          min: 40000,
          max: 110000,
          currency: 'INR'
        },
        contact: {
          phone: '+91-120-662-7200',
          email: 'info@fortisnoida.com'
        },
        facilities: ['Emergency', 'Blood Bank', 'Dialysis', 'Rehabilitation'],
        insuranceAccepted: ['Bajaj Allianz', 'New India Assurance']
      },
      {
        id: 'h3',
        name: 'Max Super Speciality Hospital',
        address: 'Saket, Delhi',
        distance: '8.5 km',
        rating: 4.4,
        reviews: 1567,
        specialties: [treatmentName, 'Gastroenterology', 'Pulmonology'],
        costRange: {
          min: 50000,
          max: 140000,
          currency: 'INR'
        },
        contact: {
          phone: '+91-11-2651-5050',
          email: 'info@maxsaket.com'
        },
        facilities: ['Robotic Surgery', 'Transplant Center', 'Cancer Center'],
        insuranceAccepted: ['United India', 'Oriental Insurance']
      }
    ];

    return hospitals;

  } catch (error) {
    console.error('Hospital search error:', error);
    return [];
  }
}

// Find specialist doctors for the treatment
async function findSpecialistDoctors(treatmentName, location) {
  try {
    const doctors = [
      {
        id: 'd1',
        name: 'Dr. Rajesh Sharma',
        qualification: 'MBBS, MS, MCh',
        specialization: getSpecializationForTreatment(treatmentName),
        experience: '15 years',
        hospital: 'Apollo Hospital',
        rating: 4.6,
        consultationFee: 1500,
        availability: ['Mon-Fri: 10:00-14:00', 'Sat: 09:00-12:00'],
        languages: ['English', 'Hindi'],
        awards: ['Best Doctor Award 2023', 'Excellence in Surgery 2022']
      },
      {
        id: 'd2',
        name: 'Dr. Priya Gupta',
        qualification: 'MBBS, MD, DM',
        specialization: getSpecializationForTreatment(treatmentName),
        experience: '12 years',
        hospital: 'Fortis Hospital',
        rating: 4.4,
        consultationFee: 1200,
        availability: ['Tue-Sat: 11:00-15:00'],
        languages: ['English', 'Hindi', 'Punjabi'],
        awards: ['Rising Star in Medicine 2021']
      },
      {
        id: 'd3',
        name: 'Dr. Amit Kumar',
        qualification: 'MBBS, MS, Fellowship',
        specialization: getSpecializationForTreatment(treatmentName),
        experience: '18 years',
        hospital: 'Max Hospital',
        rating: 4.7,
        consultationFee: 1800,
        availability: ['Mon-Thu: 09:00-13:00', 'Fri: 10:00-12:00'],
        languages: ['English', 'Hindi'],
        awards: ['Lifetime Achievement 2023', 'Best Surgeon 2022', 'Patient Choice Award 2021']
      }
    ];

    return doctors;

  } catch (error) {
    console.error('Doctor search error:', error);
    return [];
  }
}

// Get detailed treatment information using Gemini AI
async function getTreatmentDetails(treatmentName) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Provide comprehensive information about the medical treatment: "${treatmentName}"

Please include:
1. Treatment description and purpose
2. Procedure steps and duration
3. Pre-operative requirements
4. Post-operative care
5. Success rates and risks
6. Recovery timeline
7. Alternative treatments
8. Cost factors that affect pricing

Format the response as a detailed medical guide for patients.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return {
      description: response.text(),
      category: categorizeeTreatment(treatmentName),
      duration: estimateTreatmentDuration(treatmentName),
      complexity: assessTreatmentComplexity(treatmentName)
    };

  } catch (error) {
    console.error('Treatment details error:', error);
    return {
      description: `Information about ${treatmentName} treatment`,
      category: 'General',
      duration: 'Variable',
      complexity: 'Medium'
    };
  }
}

// Generate AI-powered recommendations
async function generateRecommendations(treatmentName, costData, hospitalData, location) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Based on the following treatment analysis data, provide personalized recommendations:

Treatment: ${treatmentName}
Location: ${location}
Cost Range: ₹${costData.priceRange?.min || 0} - ₹${costData.priceRange?.max || 0}
Available Hospitals: ${hospitalData.length}

Provide recommendations for:
1. Best value-for-money options
2. Quality vs cost analysis
3. Timeline planning
4. Insurance considerations
5. Pre-treatment preparation tips
6. Questions to ask doctors
7. Second opinion suggestions

Keep recommendations practical and patient-focused.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return {
      aiRecommendations: response.text(),
      topHospitalPicks: hospitalData.slice(0, 3).map(h => ({
        name: h.name,
        reason: `Excellent ${treatmentName} services with ${h.rating}/5 rating`
      })),
      budgetOptions: filterBudgetOptions(hospitalData),
      premiumOptions: filterPremiumOptions(hospitalData)
    };

  } catch (error) {
    console.error('Recommendations error:', error);
    return {
      aiRecommendations: 'Personalized recommendations unavailable',
      topHospitalPicks: [],
      budgetOptions: [],
      premiumOptions: []
    };
  }
}

// Helper functions
function calculatePriceRange(sources) {
  if (!sources || sources.length === 0) {
    return { min: 0, max: 0, currency: 'INR' };
  }

  const prices = sources
    .map(s => s.priceRange)
    .filter(p => p && p.min && p.max);

  if (prices.length === 0) {
    return { min: 0, max: 0, currency: 'INR' };
  }

  return {
    min: Math.min(...prices.map(p => p.min)),
    max: Math.max(...prices.map(p => p.max)),
    currency: 'INR'
  };
}

function getSpecializationForTreatment(treatmentName) {
  const specializations = {
    'heart surgery': 'Cardiothoracic Surgery',
    'knee replacement': 'Orthopedic Surgery',
    'cataract surgery': 'Ophthalmology',
    'gallbladder surgery': 'General Surgery',
    'brain tumor': 'Neurosurgery',
    'cancer treatment': 'Oncology'
  };

  return specializations[treatmentName.toLowerCase()] || 'General Medicine';
}

function categorizeeTreatment(treatmentName) {
  const categories = {
    'surgery': ['surgery', 'operation', 'procedure'],
    'therapy': ['therapy', 'treatment', 'rehabilitation'],
    'diagnostic': ['scan', 'test', 'examination']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => treatmentName.toLowerCase().includes(keyword))) {
      return category;
    }
  }

  return 'general';
}

function estimateTreatmentDuration(treatmentName) {
  // Simple duration estimation based on treatment type
  if (treatmentName.toLowerCase().includes('surgery')) {
    return '2-4 hours';
  } else if (treatmentName.toLowerCase().includes('therapy')) {
    return 'Multiple sessions';
  }
  return 'Varies';
}

function assessTreatmentComplexity(treatmentName) {
  const complexTreatments = ['brain', 'heart', 'transplant', 'cancer'];
  const isComplex = complexTreatments.some(term => 
    treatmentName.toLowerCase().includes(term)
  );
  return isComplex ? 'High' : 'Medium';
}

function filterBudgetOptions(hospitals) {
  return hospitals
    .filter(h => h.costRange.min < 50000)
    .slice(0, 2)
    .map(h => ({ name: h.name, cost: `₹${h.costRange.min}-${h.costRange.max}` }));
}

function filterPremiumOptions(hospitals) {
  return hospitals
    .filter(h => h.costRange.max > 100000)
    .slice(0, 2)
    .map(h => ({ name: h.name, cost: `₹${h.costRange.min}-${h.costRange.max}` }));
}

async function normalizeCostData(treatmentName, sources) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Analyze these treatment cost sources for "${treatmentName}" and provide a normalized cost analysis:

Sources: ${JSON.stringify(sources, null, 2)}

Provide:
1. Average cost estimate
2. Cost breakdown factors
3. Regional variations
4. Insurance coverage insights
5. Cost optimization tips

Return analysis in structured format.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text();

  } catch (error) {
    console.error('Cost normalization error:', error);
    return 'Cost analysis unavailable';
  }
}

module.exports = router;
