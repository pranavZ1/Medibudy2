const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Treatment = require('../models/Treatment');
const router = express.Router();

// Get all specializations
router.get('/specializations', async (req, res) => {
  console.log('🔍 Specializations endpoint called');
  try {
    const specializations = await Treatment.distinct('category');
    console.log('📊 Found specializations:', specializations);
    res.json({
      specializations: specializations.filter(s => s && s.trim() !== '').sort()
    });
  } catch (error) {
    console.error('Error fetching specializations:', error);
    res.status(500).json({ error: 'Failed to fetch specializations' });
  }
});

// Get treatments by specialization
router.get('/by-specialization/:specialization', async (req, res) => {
  try {
    const { specialization } = req.params;
    const treatments = await Treatment.find({ 
      category: { $regex: new RegExp(`^${specialization}$`, 'i') }
    }).select('name description category pricing duration successRate');
    
    res.json({
      specialization,
      treatments,
      count: treatments.length
    });
  } catch (error) {
    console.error('Error fetching treatments by specialization:', error);
    res.status(500).json({ error: 'Failed to fetch treatments' });
  }
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate treatment data using Gemini AI
async function generateTreatmentData(searchTerm) {
  try {
    console.log(`🤖 Starting AI generation for: ${searchTerm}`);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
Generate a medical treatment information object for: "${searchTerm}"

Please provide a JSON object with the following structure:
{
  "name": "Treatment name",
  "description": "Detailed description of the treatment",
  "category": "Medical specialty (e.g., Cardiology, Orthopedics, etc.)",
  "department": "Hospital department",
  "symptoms": ["symptom1", "symptom2", "symptom3"],
  "procedure": {
    "steps": ["step1", "step2", "step3"],
    "duration": "Expected duration",
    "anesthesia": "Type of anesthesia if needed"
  },
  "pricing": {
    "minPrice": 5000,
    "maxPrice": 50000,
    "currency": "INR"
  },
  "urgencyLevel": "routine|urgent|emergency",
  "prerequisites": ["prerequisite1", "prerequisite2"],
  "followUp": {
    "checkups": "Follow-up schedule",
    "recovery": "Recovery timeline"
  }
}

Return only valid JSON, no other text:
`;

    console.log(`🚀 Sending prompt to Gemini AI...`);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log(`📝 Gemini response:`, text);
    
    try {
      const treatmentData = JSON.parse(text.trim());
      const finalData = {
        ...treatmentData,
        _id: 'generated-' + Date.now(),
        isGenerated: true,
        isActive: true,
        createdAt: new Date()
      };
      console.log(`✅ Successfully parsed treatment data:`, finalData.name);
      return finalData;
    } catch (parseError) {
      console.log('❌ Failed to parse Gemini response:', parseError.message);
      console.log('Raw response:', text);
      return null;
    }
  } catch (error) {
    console.error('❌ Error generating treatment data:', error.message);
    return null;
  }
}

// Get all treatments
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      department, 
      search, 
      minPrice, 
      maxPrice, 
      urgency,
      page = 1, 
      limit = 20 
    } = req.query;

    console.log(`🔍 Treatment search request:`, { search, category, department, limit });

    let query = { isActive: true };

    // Build search query
    if (category) {
      query.category = new RegExp(category, 'i');
    }

    if (department) {
      query.department = new RegExp(department, 'i');
    }

    if (search) {
      // Use flexible search - name, description, category, department
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { 'symptoms': { $regex: search, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      query['pricing.minPrice'] = {};
      if (minPrice) query['pricing.minPrice'].$gte = parseFloat(minPrice);
      if (maxPrice) query['pricing.maxPrice'] = { $lte: parseFloat(maxPrice) };
    }

    if (urgency) {
      query.urgencyLevel = urgency;
    }

    const treatments = await Treatment.find(query)
      .sort(search ? { name: 1 } : { createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .exec();

    const total = await Treatment.countDocuments(query);

    console.log(`📊 Found ${treatments.length} treatments matching query:`, JSON.stringify(query, null, 2));

    // If no treatments found and search term provided, try to generate one
    if (treatments.length === 0 && search) {
      console.log(`🤖 No treatments found for "${search}", attempting to generate with AI`);
      const generatedTreatment = await generateTreatmentData(search);
      
      if (generatedTreatment) {
        console.log(`✨ Generated treatment data for: ${generatedTreatment.name}`);
        return res.json({
          treatments: [generatedTreatment],
          totalPages: 1,
          currentPage: 1,
          total: 1,
          isGenerated: true,
          message: `Generated treatment information for "${search}" using AI`
        });
      } else {
        console.log(`❌ Failed to generate treatment data for: ${search}`);
      }
    }

    res.json({
      treatments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching treatments:', error);
    res.status(500).json({ error: 'Failed to fetch treatments' });
  }
});

// Get treatments by symptoms
router.post('/by-symptoms', async (req, res) => {
  try {
    const { symptoms } = req.body;
    
    if (!symptoms || !Array.isArray(symptoms)) {
      return res.status(400).json({ error: 'Symptoms array is required' });
    }

    // Create search query for symptoms
    const symptomQuery = symptoms.map(symptom => 
      new RegExp(symptom.toLowerCase(), 'i')
    );

    const treatments = await Treatment.find({
      isActive: true,
      symptoms: { $in: symptomQuery }
    }).sort({ createdAt: -1 });

    res.json({ treatments });
  } catch (error) {
    console.error('Error fetching treatments by symptoms:', error);
    res.status(500).json({ error: 'Failed to fetch treatments' });
  }
});

// Get treatment categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Treatment.distinct('category', { isActive: true });
    res.json({ categories: categories.filter(cat => cat) });
  } catch (error) {
    console.error('Error fetching treatment categories:', error);
    res.status(500).json({ 
      error: 'Failed to fetch treatment categories',
      message: error.message 
    });
  }
});

// Get treatments by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const treatments = await Treatment.find({
      category: new RegExp(category, 'i'),
      isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

    const total = await Treatment.countDocuments({
      category: new RegExp(category, 'i'),
      isActive: true
    });

    res.json({
      treatments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      category
    });
  } catch (error) {
    console.error('Error fetching treatments by category:', error);
    res.status(500).json({ error: 'Failed to fetch treatments' });
  }
});

// Get treatments by department
router.get('/department/:department', async (req, res) => {
  try {
    const { department } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const treatments = await Treatment.find({
      department: new RegExp(department, 'i'),
      isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

    const total = await Treatment.countDocuments({
      department: new RegExp(department, 'i'),
      isActive: true
    });

    res.json({
      treatments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      department
    });
  } catch (error) {
    console.error('Error fetching treatments by department:', error);
    res.status(500).json({ error: 'Failed to fetch treatments' });
  }
});

// Search treatments
router.get('/search', async (req, res) => {
  try {
    const { 
      query, 
      category, 
      priceRange,
      location,
      page = 1, 
      limit = 20 
    } = req.query;

    let searchFilter = { isActive: true };
    let sortOptions = {};

    // Text search
    if (query) {
      searchFilter.$text = { $search: query };
      sortOptions.score = { $meta: 'textScore' };
    }

    // Category filter
    if (category) {
      searchFilter.category = { $regex: category, $options: 'i' };
    }

    // Price range filter
    if (priceRange) {
      const { min, max } = typeof priceRange === 'string' ? JSON.parse(priceRange) : priceRange;
      if (min !== undefined) searchFilter['pricing.minPrice'] = { $gte: min };
      if (max !== undefined) searchFilter['pricing.maxPrice'] = { $lte: max };
    }

    const treatments = await Treatment.find(searchFilter, query ? { score: { $meta: 'textScore' } } : {})
    .sort(query ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

    const total = await Treatment.countDocuments(searchFilter);

    res.json({
      treatments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error searching treatments:', error);
    res.status(500).json({ error: 'Failed to search treatments' });
  }
});

// Get treatment by ID (must be last to avoid conflicts with other routes)
router.get('/:id', async (req, res) => {
  try {
    const treatment = await Treatment.findById(req.params.id);
    
    if (!treatment) {
      return res.status(404).json({ error: 'Treatment not found' });
    }

    res.json({ treatment });
  } catch (error) {
    console.error('Error fetching treatment:', error);
    res.status(500).json({ error: 'Failed to fetch treatment' });
  }
});

module.exports = router;
