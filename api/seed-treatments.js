require('dotenv').config();
const mongoose = require('mongoose');
const Treatment = require('./models/Treatment');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Sample treatments data
const treatments = [
  {
    name: "Heart Surgery",
    department: "Cardiology",
    category: "Cardiology",
    description: "Comprehensive cardiac surgical procedures including bypass surgery, valve replacement, and heart transplants",
    procedures: [
      {
        name: "Coronary Artery Bypass Grafting (CABG)",
        description: "Surgical procedure to restore blood flow to the heart",
        duration: "3-6 hours",
        complexity: "high",
        isMinimallyInvasive: false
      },
      {
        name: "Heart Valve Replacement",
        description: "Replacement of damaged heart valves",
        duration: "2-4 hours",
        complexity: "high",
        isMinimallyInvasive: false
      },
      {
        name: "Angioplasty",
        description: "Minimally invasive procedure to open blocked arteries",
        duration: "1-2 hours",
        complexity: "medium",
        isMinimallyInvasive: true
      }
    ],
    pricing: {
      minPrice: 200000,
      maxPrice: 2000000,
      currency: "INR",
      factors: ["Hospital type", "Surgeon experience", "Procedure complexity"]
    },
    duration: {
      procedure: "2-8 hours",
      hospital: "5-10 days",
      recovery: "6-12 weeks"
    },
    successRate: 95,
    risks: [
      "Bleeding",
      "Infection",
      "Blood clots",
      "Irregular heartbeat",
      "Stroke"
    ],
    symptoms: [
      "chest pain",
      "shortness of breath",
      "heart palpitations",
      "fatigue",
      "dizziness"
    ],
    urgencyLevel: "urgent",
    ageGroup: {
      min: 18,
      max: 85
    },
    isActive: true
  },
  {
    name: "Knee Replacement",
    department: "Orthopedics", 
    category: "Orthopedics",
    description: "Total or partial knee joint replacement surgery for severe arthritis or injury",
    procedures: [
      {
        name: "Total Knee Replacement",
        description: "Complete replacement of knee joint",
        duration: "1-2 hours",
        complexity: "high",
        isMinimallyInvasive: false
      },
      {
        name: "Partial Knee Replacement",
        description: "Replacement of only damaged part of knee",
        duration: "1-1.5 hours",
        complexity: "medium",
        isMinimallyInvasive: true
      }
    ],
    pricing: {
      minPrice: 150000,
      maxPrice: 500000,
      currency: "INR",
      factors: ["Implant type", "Hospital facilities", "Surgeon expertise"]
    },
    duration: {
      procedure: "1-3 hours",
      hospital: "3-5 days",
      recovery: "12-16 weeks"
    },
    successRate: 98,
    risks: [
      "Infection",
      "Blood clots",
      "Implant loosening",
      "Nerve damage"
    ],
    symptoms: [
      "knee pain",
      "stiffness",
      "swelling",
      "difficulty walking",
      "limited range of motion"
    ],
    urgencyLevel: "elective",
    ageGroup: {
      min: 40,
      max: 85
    },
    isActive: true
  },
  {
    name: "Cataract Surgery",
    department: "Ophthalmology",
    category: "Ophthalmology",
    description: "Surgical removal of clouded lens from the eye and replacement with artificial lens",
    procedures: [
      {
        name: "Phacoemulsification",
        description: "Ultrasound-assisted cataract removal",
        duration: "20-30 minutes",
        complexity: "low",
        isMinimallyInvasive: true
      },
      {
        name: "Laser-Assisted Cataract Surgery",
        description: "Laser-guided precise cataract removal",
        duration: "15-25 minutes",
        complexity: "low",
        isMinimallyInvasive: true
      }
    ],
    pricing: {
      minPrice: 25000,
      maxPrice: 100000,
      currency: "INR",
      factors: ["Lens type", "Technology used", "Hospital facilities"]
    },
    duration: {
      procedure: "30-45 minutes",
      hospital: "Day surgery",
      recovery: "2-4 weeks"
    },
    successRate: 99,
    risks: [
      "Infection",
      "Retinal detachment",
      "Glaucoma",
      "Lens dislocation"
    ],
    symptoms: [
      "blurred vision",
      "cloudy vision",
      "difficulty seeing at night",
      "sensitivity to light",
      "seeing halos"
    ],
    urgencyLevel: "elective",
    ageGroup: {
      min: 50,
      max: 95
    },
    isActive: true
  },
  {
    name: "Brain Surgery",
    department: "Neurosurgery",
    category: "Neurosurgery",
    description: "Surgical procedures on the brain including tumor removal, aneurysm repair, and trauma treatment",
    procedures: [
      {
        name: "Craniotomy",
        description: "Opening of skull to access brain",
        duration: "3-8 hours",
        complexity: "high",
        isMinimallyInvasive: false
      },
      {
        name: "Stereotactic Surgery",
        description: "Minimally invasive precise brain surgery",
        duration: "2-4 hours",
        complexity: "high",
        isMinimallyInvasive: true
      }
    ],
    pricing: {
      minPrice: 500000,
      maxPrice: 3000000,
      currency: "INR",
      factors: ["Tumor location", "Surgery complexity", "Technology used"]
    },
    duration: {
      procedure: "4-12 hours",
      hospital: "7-14 days",
      recovery: "8-16 weeks"
    },
    successRate: 85,
    risks: [
      "Bleeding",
      "Infection",
      "Seizures",
      "Speech problems",
      "Paralysis"
    ],
    symptoms: [
      "severe headaches",
      "seizures",
      "vision problems",
      "speech difficulties",
      "weakness"
    ],
    urgencyLevel: "urgent",
    ageGroup: {
      min: 1,
      max: 80
    },
    isActive: true
  },
  {
    name: "Appendectomy",
    department: "General Surgery",
    category: "General Surgery",
    description: "Surgical removal of the appendix, typically performed as emergency surgery",
    procedures: [
      {
        name: "Laparoscopic Appendectomy",
        description: "Minimally invasive appendix removal",
        duration: "30-60 minutes",
        complexity: "medium",
        isMinimallyInvasive: true
      },
      {
        name: "Open Appendectomy",
        description: "Traditional open surgery for appendix removal",
        duration: "30-60 minutes",
        complexity: "medium",
        isMinimallyInvasive: false
      }
    ],
    pricing: {
      minPrice: 40000,
      maxPrice: 150000,
      currency: "INR",
      factors: ["Surgery type", "Hospital facilities", "Complications"]
    },
    duration: {
      procedure: "30-60 minutes",
      hospital: "1-3 days",
      recovery: "2-4 weeks"
    },
    successRate: 99,
    risks: [
      "Infection",
      "Bleeding",
      "Injury to nearby organs",
      "Adhesions"
    ],
    symptoms: [
      "abdominal pain",
      "nausea",
      "vomiting",
      "fever",
      "loss of appetite"
    ],
    urgencyLevel: "emergency",
    ageGroup: {
      min: 5,
      max: 80
    },
    isActive: true
  }
];

// Seed function
async function seedTreatments() {
  try {
    // Clear existing treatments
    await Treatment.deleteMany({});
    console.log('Cleared existing treatments');

    // Insert new treatments
    const result = await Treatment.insertMany(treatments);
    console.log(`Successfully seeded ${result.length} treatments`);

    // Log the created treatments
    result.forEach((treatment, index) => {
      console.log(`${index + 1}. ${treatment.name} (${treatment.category})`);
    });

  } catch (error) {
    console.error('Error seeding treatments:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the seed function
seedTreatments();
