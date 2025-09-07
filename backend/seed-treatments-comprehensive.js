const mongoose = require('mongoose');
require('dotenv').config();

const Treatment = require('./models/Treatment');

// Comprehensive treatments organized by specialization
const treatmentsBySpecialization = {
  "Cardiology": [
    {
      name: "Angioplasty",
      department: "Cardiology",
      category: "Cardiology",
      description: "A minimally invasive procedure to open blocked coronary arteries using a balloon catheter.",
      procedures: [
        {
          name: "Balloon Angioplasty",
          description: "Opening blocked arteries with a balloon catheter",
          duration: "1-2 hours",
          complexity: "medium",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 150000,
        maxPrice: 300000,
        currency: "INR",
        factors: ["Hospital type", "Stent type", "Complexity"]
      },
      duration: {
        procedure: "1-2 hours",
        hospital: "2-3 days",
        recovery: "1-2 weeks"
      },
      successRate: 95,
      risks: ["Bleeding", "Infection", "Re-narrowing of artery"],
      symptoms: ["Chest pain", "Shortness of breath", "Heart attack"]
    },
    {
      name: "Bypass Surgery",
      department: "Cardiology",
      category: "Cardiology",
      description: "Surgical procedure to create new routes around narrowed or blocked coronary arteries.",
      procedures: [
        {
          name: "Coronary Artery Bypass Grafting (CABG)",
          description: "Creating new pathways for blood flow to the heart",
          duration: "3-5 hours",
          complexity: "high",
          isMinimallyInvasive: false
        }
      ],
      pricing: {
        minPrice: 300000,
        maxPrice: 800000,
        currency: "INR",
        factors: ["Number of bypasses", "Hospital type", "Surgeon experience"]
      },
      duration: {
        procedure: "3-5 hours",
        hospital: "7-10 days",
        recovery: "6-8 weeks"
      },
      successRate: 90,
      risks: ["Bleeding", "Infection", "Stroke", "Irregular heartbeat"],
      symptoms: ["Severe chest pain", "Multiple blocked arteries", "Heart failure"]
    },
    {
      name: "Heart Valve Replacement",
      department: "Cardiology",
      category: "Cardiology",
      description: "Surgical replacement of damaged heart valves with artificial or biological valves.",
      procedures: [
        {
          name: "Aortic Valve Replacement",
          description: "Replacing damaged aortic valve",
          duration: "2-4 hours",
          complexity: "high",
          isMinimallyInvasive: false
        }
      ],
      pricing: {
        minPrice: 400000,
        maxPrice: 1000000,
        currency: "INR",
        factors: ["Valve type", "Hospital type", "Surgical approach"]
      },
      duration: {
        procedure: "2-4 hours",
        hospital: "5-7 days",
        recovery: "4-6 weeks"
      },
      successRate: 88,
      risks: ["Bleeding", "Infection", "Stroke", "Valve dysfunction"],
      symptoms: ["Heart murmur", "Chest pain", "Shortness of breath", "Fatigue"]
    }
  ],

  "Orthopedic": [
    {
      name: "Knee Replacement",
      department: "Orthopedics",
      category: "Orthopedic",
      description: "Surgical procedure to replace damaged knee joint with artificial implants.",
      procedures: [
        {
          name: "Total Knee Replacement",
          description: "Complete replacement of knee joint",
          duration: "1-2 hours",
          complexity: "medium",
          isMinimallyInvasive: false
        }
      ],
      pricing: {
        minPrice: 200000,
        maxPrice: 500000,
        currency: "INR",
        factors: ["Implant type", "Hospital type", "Bilateral surgery"]
      },
      duration: {
        procedure: "1-2 hours",
        hospital: "3-5 days",
        recovery: "3-6 months"
      },
      successRate: 92,
      risks: ["Infection", "Blood clots", "Implant loosening"],
      symptoms: ["Severe knee pain", "Limited mobility", "Arthritis"]
    },
    {
      name: "Hip Replacement",
      department: "Orthopedics",
      category: "Orthopedic",
      description: "Surgical procedure to replace damaged hip joint with artificial components.",
      procedures: [
        {
          name: "Total Hip Replacement",
          description: "Complete replacement of hip joint",
          duration: "1-2 hours",
          complexity: "medium",
          isMinimallyInvasive: false
        }
      ],
      pricing: {
        minPrice: 250000,
        maxPrice: 600000,
        currency: "INR",
        factors: ["Implant type", "Hospital type", "Surgical approach"]
      },
      duration: {
        procedure: "1-2 hours",
        hospital: "4-6 days",
        recovery: "3-6 months"
      },
      successRate: 90,
      risks: ["Infection", "Dislocation", "Blood clots"],
      symptoms: ["Hip pain", "Limited mobility", "Arthritis"]
    },
    {
      name: "Spine Surgery",
      department: "Orthopedics",
      category: "Orthopedic",
      description: "Surgical treatment for spine disorders including disc problems and spinal stenosis.",
      procedures: [
        {
          name: "Lumbar Discectomy",
          description: "Removal of damaged disc material",
          duration: "1-2 hours",
          complexity: "medium",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 180000,
        maxPrice: 400000,
        currency: "INR",
        factors: ["Complexity", "Hospital type", "Instrumentation needed"]
      },
      duration: {
        procedure: "1-3 hours",
        hospital: "2-4 days",
        recovery: "6-12 weeks"
      },
      successRate: 85,
      risks: ["Nerve damage", "Infection", "Failed back surgery syndrome"],
      symptoms: ["Back pain", "Leg pain", "Numbness", "Weakness"]
    }
  ],

  "Neurology": [
    {
      name: "Brain Tumor Surgery",
      department: "Neurology",
      category: "Neurology",
      description: "Surgical removal of brain tumors using advanced neurosurgical techniques.",
      procedures: [
        {
          name: "Craniotomy",
          description: "Surgical opening of the skull to access brain tumor",
          duration: "4-8 hours",
          complexity: "high",
          isMinimallyInvasive: false
        }
      ],
      pricing: {
        minPrice: 500000,
        maxPrice: 1500000,
        currency: "INR",
        factors: ["Tumor type", "Location", "Hospital type", "Technology used"]
      },
      duration: {
        procedure: "4-8 hours",
        hospital: "7-14 days",
        recovery: "2-6 months"
      },
      successRate: 80,
      risks: ["Neurological deficits", "Infection", "Bleeding", "Seizures"],
      symptoms: ["Headaches", "Seizures", "Vision problems", "Memory issues"]
    },
    {
      name: "Deep Brain Stimulation",
      department: "Neurology",
      category: "Neurology",
      description: "Surgical implantation of electrodes to treat movement disorders like Parkinson's disease.",
      procedures: [
        {
          name: "DBS Electrode Implantation",
          description: "Precise placement of stimulation electrodes in brain",
          duration: "3-5 hours",
          complexity: "high",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 800000,
        maxPrice: 2000000,
        currency: "INR",
        factors: ["Device type", "Hospital type", "Bilateral surgery"]
      },
      duration: {
        procedure: "3-5 hours",
        hospital: "3-5 days",
        recovery: "2-4 weeks"
      },
      successRate: 85,
      risks: ["Infection", "Bleeding", "Device malfunction", "Speech changes"],
      symptoms: ["Tremors", "Rigidity", "Bradykinesia", "Dystonia"]
    }
  ],

  "Oncology": [
    {
      name: "Cancer Surgery",
      department: "Oncology",
      category: "Oncology",
      description: "Surgical removal of cancerous tumors and affected tissues.",
      procedures: [
        {
          name: "Tumor Resection",
          description: "Surgical removal of cancer tumor",
          duration: "2-6 hours",
          complexity: "high",
          isMinimallyInvasive: false
        }
      ],
      pricing: {
        minPrice: 300000,
        maxPrice: 1000000,
        currency: "INR",
        factors: ["Cancer type", "Stage", "Hospital type", "Reconstruction needed"]
      },
      duration: {
        procedure: "2-6 hours",
        hospital: "5-10 days",
        recovery: "4-8 weeks"
      },
      successRate: 75,
      risks: ["Infection", "Bleeding", "Organ dysfunction", "Recurrence"],
      symptoms: ["Lumps", "Unexplained weight loss", "Fatigue", "Pain"]
    },
    {
      name: "Chemotherapy",
      department: "Oncology",
      category: "Oncology",
      description: "Medical treatment using drugs to destroy cancer cells.",
      procedures: [
        {
          name: "Intravenous Chemotherapy",
          description: "Administration of cancer-fighting drugs through IV",
          duration: "2-6 hours per session",
          complexity: "medium",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 50000,
        maxPrice: 500000,
        currency: "INR",
        factors: ["Drug type", "Number of cycles", "Hospital type"]
      },
      duration: {
        procedure: "Multiple sessions over months",
        hospital: "Outpatient or short stays",
        recovery: "Varies by regimen"
      },
      successRate: 70,
      risks: ["Nausea", "Hair loss", "Fatigue", "Increased infection risk"],
      symptoms: ["Cancer diagnosis", "Tumor shrinkage needed", "Preventive treatment"]
    }
  ],

  "Gastroenterology": [
    {
      name: "Gallbladder Surgery",
      department: "Gastroenterology",
      category: "Gastroenterology",
      description: "Surgical removal of gallbladder, typically done laparoscopically.",
      procedures: [
        {
          name: "Laparoscopic Cholecystectomy",
          description: "Minimally invasive removal of gallbladder",
          duration: "30-60 minutes",
          complexity: "medium",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 80000,
        maxPrice: 200000,
        currency: "INR",
        factors: ["Surgical approach", "Hospital type", "Complications"]
      },
      duration: {
        procedure: "30-60 minutes",
        hospital: "1-2 days",
        recovery: "1-2 weeks"
      },
      successRate: 95,
      risks: ["Infection", "Bile duct injury", "Bleeding"],
      symptoms: ["Gallstones", "Severe abdominal pain", "Nausea", "Jaundice"]
    },
    {
      name: "Liver Transplant",
      department: "Gastroenterology",
      category: "Gastroenterology",
      description: "Surgical replacement of diseased liver with healthy donor liver.",
      procedures: [
        {
          name: "Orthotopic Liver Transplantation",
          description: "Complete liver replacement surgery",
          duration: "6-12 hours",
          complexity: "high",
          isMinimallyInvasive: false
        }
      ],
      pricing: {
        minPrice: 2000000,
        maxPrice: 5000000,
        currency: "INR",
        factors: ["Donor type", "Hospital type", "Post-op care"]
      },
      duration: {
        procedure: "6-12 hours",
        hospital: "2-4 weeks",
        recovery: "3-6 months"
      },
      successRate: 85,
      risks: ["Rejection", "Infection", "Bleeding", "Bile duct complications"],
      symptoms: ["Liver failure", "Cirrhosis", "Hepatitis", "Liver cancer"]
    }
  ],

  "Urology": [
    {
      name: "Kidney Stone Surgery",
      department: "Urology",
      category: "Urology",
      description: "Surgical removal of kidney stones using various minimally invasive techniques.",
      procedures: [
        {
          name: "Ureteroscopy",
          description: "Endoscopic removal of kidney stones",
          duration: "1-2 hours",
          complexity: "medium",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 60000,
        maxPrice: 150000,
        currency: "INR",
        factors: ["Stone size", "Location", "Hospital type", "Technology used"]
      },
      duration: {
        procedure: "1-2 hours",
        hospital: "1-2 days",
        recovery: "1-2 weeks"
      },
      successRate: 90,
      risks: ["Bleeding", "Infection", "Ureteral injury"],
      symptoms: ["Severe flank pain", "Blood in urine", "Nausea", "Frequent urination"]
    },
    {
      name: "Prostate Surgery",
      department: "Urology",
      category: "Urology",
      description: "Surgical treatment for enlarged prostate or prostate cancer.",
      procedures: [
        {
          name: "Transurethral Resection of Prostate (TURP)",
          description: "Endoscopic removal of prostate tissue",
          duration: "1-2 hours",
          complexity: "medium",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 100000,
        maxPrice: 300000,
        currency: "INR",
        factors: ["Procedure type", "Hospital type", "Prostate size"]
      },
      duration: {
        procedure: "1-2 hours",
        hospital: "2-3 days",
        recovery: "2-4 weeks"
      },
      successRate: 88,
      risks: ["Bleeding", "Infection", "Incontinence", "Erectile dysfunction"],
      symptoms: ["Difficulty urinating", "Frequent urination", "Weak stream", "Incomplete emptying"]
    }
  ],

  "Ophthalmology": [
    {
      name: "Cataract Surgery",
      department: "Ophthalmology",
      category: "Ophthalmology",
      description: "Surgical removal of clouded lens and replacement with artificial intraocular lens.",
      procedures: [
        {
          name: "Phacoemulsification",
          description: "Ultrasonic removal of cataract with lens implantation",
          duration: "15-30 minutes",
          complexity: "low",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 25000,
        maxPrice: 80000,
        currency: "INR",
        factors: ["Lens type", "Hospital type", "Bilateral surgery"]
      },
      duration: {
        procedure: "15-30 minutes",
        hospital: "Day care",
        recovery: "1-2 weeks"
      },
      successRate: 98,
      risks: ["Infection", "Retinal detachment", "Glaucoma"],
      symptoms: ["Blurred vision", "Glare sensitivity", "Night vision problems"]
    },
    {
      name: "Retinal Surgery",
      department: "Ophthalmology",
      category: "Ophthalmology",
      description: "Surgical treatment for retinal disorders including detachment and macular problems.",
      procedures: [
        {
          name: "Vitrectomy",
          description: "Surgical removal of vitreous gel and retinal repair",
          duration: "1-3 hours",
          complexity: "high",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 80000,
        maxPrice: 250000,
        currency: "INR",
        factors: ["Complexity", "Hospital type", "Additional procedures"]
      },
      duration: {
        procedure: "1-3 hours",
        hospital: "1-2 days",
        recovery: "2-6 weeks"
      },
      successRate: 85,
      risks: ["Infection", "Bleeding", "Cataract formation", "Increased pressure"],
      symptoms: ["Sudden vision loss", "Flashing lights", "Floaters", "Visual distortion"]
    }
  ],

  "Gynecology": [
    {
      name: "Hysterectomy",
      department: "Gynecology",
      category: "Gynecology",
      description: "Surgical removal of uterus for various medical conditions.",
      procedures: [
        {
          name: "Laparoscopic Hysterectomy",
          description: "Minimally invasive removal of uterus",
          duration: "1-3 hours",
          complexity: "medium",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 150000,
        maxPrice: 400000,
        currency: "INR",
        factors: ["Surgical approach", "Hospital type", "Complications"]
      },
      duration: {
        procedure: "1-3 hours",
        hospital: "2-4 days",
        recovery: "4-6 weeks"
      },
      successRate: 92,
      risks: ["Bleeding", "Infection", "Organ injury", "Blood clots"],
      symptoms: ["Heavy bleeding", "Fibroids", "Endometriosis", "Cancer"]
    },
    {
      name: "Cesarean Section",
      department: "Gynecology",
      category: "Gynecology",
      description: "Surgical delivery of baby through incision in abdomen and uterus.",
      procedures: [
        {
          name: "Lower Segment Cesarean Section",
          description: "Surgical delivery through lower uterine segment",
          duration: "30-60 minutes",
          complexity: "medium",
          isMinimallyInvasive: false
        }
      ],
      pricing: {
        minPrice: 50000,
        maxPrice: 200000,
        currency: "INR",
        factors: ["Hospital type", "Emergency vs planned", "Complications"]
      },
      duration: {
        procedure: "30-60 minutes",
        hospital: "3-5 days",
        recovery: "4-6 weeks"
      },
      successRate: 95,
      risks: ["Bleeding", "Infection", "Blood clots", "Future pregnancy complications"],
      symptoms: ["Labor complications", "Breech presentation", "Previous C-section", "Medical conditions"]
    }
  ],

  "Pediatrics": [
    {
      name: "Pediatric Heart Surgery",
      department: "Pediatrics",
      category: "Pediatrics",
      description: "Surgical correction of congenital heart defects in children.",
      procedures: [
        {
          name: "Atrial Septal Defect Repair",
          description: "Surgical closure of hole in heart's septum",
          duration: "2-4 hours",
          complexity: "high",
          isMinimallyInvasive: false
        }
      ],
      pricing: {
        minPrice: 400000,
        maxPrice: 1200000,
        currency: "INR",
        factors: ["Defect complexity", "Hospital type", "Age of child"]
      },
      duration: {
        procedure: "2-4 hours",
        hospital: "7-14 days",
        recovery: "4-8 weeks"
      },
      successRate: 90,
      risks: ["Bleeding", "Infection", "Arrhythmias", "Neurological complications"],
      symptoms: ["Heart murmur", "Shortness of breath", "Poor feeding", "Fatigue"]
    },
    {
      name: "Pediatric Surgery",
      department: "Pediatrics",
      category: "Pediatrics",
      description: "Various surgical procedures for children including appendectomy and hernia repair.",
      procedures: [
        {
          name: "Laparoscopic Appendectomy",
          description: "Minimally invasive removal of appendix in children",
          duration: "30-60 minutes",
          complexity: "medium",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 60000,
        maxPrice: 150000,
        currency: "INR",
        factors: ["Procedure type", "Hospital type", "Age of child"]
      },
      duration: {
        procedure: "30-60 minutes",
        hospital: "1-3 days",
        recovery: "1-2 weeks"
      },
      successRate: 95,
      risks: ["Infection", "Bleeding", "Anesthesia complications"],
      symptoms: ["Abdominal pain", "Fever", "Vomiting", "Loss of appetite"]
    }
  ],

  "Dermatology": [
    {
      name: "Skin Cancer Surgery",
      department: "Dermatology",
      category: "Dermatology",
      description: "Surgical removal of skin cancers including melanoma and basal cell carcinoma.",
      procedures: [
        {
          name: "Mohs Surgery",
          description: "Precise layer-by-layer removal of skin cancer",
          duration: "2-4 hours",
          complexity: "medium",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 50000,
        maxPrice: 200000,
        currency: "INR",
        factors: ["Cancer type", "Size", "Location", "Reconstruction needed"]
      },
      duration: {
        procedure: "2-4 hours",
        hospital: "Day care",
        recovery: "2-4 weeks"
      },
      successRate: 95,
      risks: ["Infection", "Scarring", "Recurrence", "Nerve damage"],
      symptoms: ["Suspicious moles", "Non-healing sores", "Changes in skin lesions"]
    }
  ],

  "Pulmonology": [
    {
      name: "Lung Surgery",
      department: "Pulmonology",
      category: "Pulmonology",
      description: "Surgical treatment for lung diseases including cancer and infections.",
      procedures: [
        {
          name: "Video-Assisted Thoracoscopy (VATS)",
          description: "Minimally invasive lung surgery",
          duration: "2-4 hours",
          complexity: "high",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 300000,
        maxPrice: 800000,
        currency: "INR",
        factors: ["Procedure type", "Hospital type", "Complexity"]
      },
      duration: {
        procedure: "2-4 hours",
        hospital: "5-7 days",
        recovery: "4-8 weeks"
      },
      successRate: 85,
      risks: ["Bleeding", "Infection", "Air leak", "Respiratory failure"],
      symptoms: ["Persistent cough", "Chest pain", "Shortness of breath", "Blood in sputum"]
    }
  ],

  "Endocrinology": [
    {
      name: "Thyroid Surgery",
      department: "Endocrinology",
      category: "Endocrinology",
      description: "Surgical removal of thyroid gland or thyroid nodules.",
      procedures: [
        {
          name: "Thyroidectomy",
          description: "Complete or partial removal of thyroid gland",
          duration: "2-3 hours",
          complexity: "medium",
          isMinimallyInvasive: false
        }
      ],
      pricing: {
        minPrice: 100000,
        maxPrice: 300000,
        currency: "INR",
        factors: ["Extent of surgery", "Hospital type", "Cancer presence"]
      },
      duration: {
        procedure: "2-3 hours",
        hospital: "2-3 days",
        recovery: "2-4 weeks"
      },
      successRate: 92,
      risks: ["Voice changes", "Low calcium", "Bleeding", "Infection"],
      symptoms: ["Thyroid nodules", "Hyperthyroidism", "Thyroid cancer", "Goiter"]
    }
  ],

  "Nephrology": [
    {
      name: "Kidney Transplant",
      department: "Nephrology",
      category: "Nephrology",
      description: "Surgical transplantation of healthy kidney from donor to patient with kidney failure.",
      procedures: [
        {
          name: "Renal Transplantation",
          description: "Surgical placement of donor kidney",
          duration: "3-5 hours",
          complexity: "high",
          isMinimallyInvasive: false
        }
      ],
      pricing: {
        minPrice: 800000,
        maxPrice: 2000000,
        currency: "INR",
        factors: ["Donor type", "Hospital type", "Post-op care", "Immunosuppression"]
      },
      duration: {
        procedure: "3-5 hours",
        hospital: "1-2 weeks",
        recovery: "2-3 months"
      },
      successRate: 88,
      risks: ["Rejection", "Infection", "Bleeding", "Cardiovascular complications"],
      symptoms: ["End-stage kidney disease", "Chronic kidney failure", "Dialysis dependence"]
    }
  ],

  "General Surgery": [
    {
      name: "Hernia Repair",
      department: "General Surgery",
      category: "General Surgery",
      description: "Surgical repair of hernias using mesh reinforcement techniques.",
      procedures: [
        {
          name: "Laparoscopic Hernia Repair",
          description: "Minimally invasive hernia repair with mesh",
          duration: "1-2 hours",
          complexity: "medium",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 60000,
        maxPrice: 150000,
        currency: "INR",
        factors: ["Hernia type", "Size", "Hospital type", "Bilateral repair"]
      },
      duration: {
        procedure: "1-2 hours",
        hospital: "1-2 days",
        recovery: "2-4 weeks"
      },
      successRate: 95,
      risks: ["Infection", "Recurrence", "Chronic pain", "Mesh complications"],
      symptoms: ["Visible bulge", "Pain", "Heavy feeling", "Discomfort with activity"]
    },
    {
      name: "Appendectomy",
      department: "General Surgery",
      category: "General Surgery",
      description: "Surgical removal of inflamed appendix.",
      procedures: [
        {
          name: "Laparoscopic Appendectomy",
          description: "Minimally invasive removal of appendix",
          duration: "30-60 minutes",
          complexity: "low",
          isMinimallyInvasive: true
        }
      ],
      pricing: {
        minPrice: 40000,
        maxPrice: 120000,
        currency: "INR",
        factors: ["Complexity", "Hospital type", "Emergency vs elective"]
      },
      duration: {
        procedure: "30-60 minutes",
        hospital: "1-3 days",
        recovery: "1-2 weeks"
      },
      successRate: 98,
      risks: ["Infection", "Bleeding", "Bowel injury"],
      symptoms: ["Right lower abdominal pain", "Fever", "Nausea", "Vomiting"]
    }
  ]
};

// Function to seed treatments
const seedTreatments = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medibuddy';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Clear existing treatments
    await Treatment.deleteMany({});
    console.log('Cleared existing treatments');

    // Flatten all treatments into a single array
    const allTreatments = [];
    for (const [specialization, treatments] of Object.entries(treatmentsBySpecialization)) {
      allTreatments.push(...treatments);
    }

    // Insert treatments
    const result = await Treatment.insertMany(allTreatments);
    console.log(`Successfully seeded ${result.length} treatments`);

    // Create indexes for better search performance
    await Treatment.createIndexes();
    console.log('Created indexes for treatments collection');

    // Log summary by specialization
    console.log('\nTreatments seeded by specialization:');
    for (const [specialization, treatments] of Object.entries(treatmentsBySpecialization)) {
      console.log(`${specialization}: ${treatments.length} treatments`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding treatments:', error);
    process.exit(1);
  }
};

// Run the seeding function
if (require.main === module) {
  seedTreatments();
}

module.exports = { treatmentsBySpecialization, seedTreatments };
