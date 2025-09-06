const { GoogleGenerativeAI } = require('@google/generative-ai');

class DiseaseInfoService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async getDetailedDiseaseInfo(diseaseName, userSymptoms = []) {
    try {
      const prompt = `
As a medical AI assistant, provide comprehensive information about "${diseaseName}" in the following JSON format. Be extremely careful with medication recommendations as incorrect medical advice can be harmful.

{
  "disease": "${diseaseName}",
  "description": "Detailed medical description of the condition",
  "symptoms": ["symptom1", "symptom2", "symptom3"],
  "causes": ["cause1", "cause2", "cause3"],
  "riskFactors": ["factor1", "factor2", "factor3"],
  "prevention": {
    "lifestyle": ["lifestyle tip 1", "lifestyle tip 2"],
    "dietary": ["dietary advice 1", "dietary advice 2"],
    "general": ["general prevention 1", "general prevention 2"]
  },
  "homeRemedies": [
    {
      "remedy": "remedy name",
      "description": "how to use it",
      "safety": "safety considerations"
    }
  ],
  "whenToSeekHelp": {
    "urgentSigns": ["urgent symptom 1", "urgent symptom 2"],
    "timeframe": "when to see a doctor"
  },
  "medications": {
    "disclaimer": "IMPORTANT: This information is for educational purposes only. Always consult a qualified healthcare professional before taking any medication. Self-medication can be dangerous.",
    "commonTreatments": [
      {
        "category": "category name (e.g., Pain Relief, Antibiotics)",
        "medications": [
          {
            "name": "generic name (brand name)",
            "purpose": "what it treats",
            "dosage": "typical adult dosage",
            "precautions": ["precaution 1", "precaution 2"],
            "sideEffects": ["common side effect 1", "common side effect 2"]
          }
        ]
      }
    ],
    "prescriptionRequired": "Most medications require prescription. Over-the-counter options are limited."
  },
  "lifestyle": {
    "dos": ["do this", "do that"],
    "donts": ["don't do this", "avoid that"],
    "recovery": ["recovery tip 1", "recovery tip 2"]
  },
  "complications": ["potential complication 1", "potential complication 2"],
  "prognosis": "Expected outcome and recovery timeline"
}

User's current symptoms: ${userSymptoms.join(', ')}

CRITICAL SAFETY REQUIREMENTS:
1. Always include strong disclaimers about consulting healthcare professionals
2. Never recommend specific dosages without medical supervision
3. Emphasize that prescription medications require doctor consultation
4. Include warnings about drug interactions and contraindications
5. Focus on general categories rather than specific brand recommendations
6. Include safety precautions for all suggestions

Provide accurate, evidence-based medical information while prioritizing patient safety.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const diseaseInfo = JSON.parse(jsonMatch[0]);
      
      // Add additional safety measures
      diseaseInfo.safetyNotice = {
        "critical": "This information is for educational purposes only and should not replace professional medical advice, diagnosis, or treatment.",
        "warning": "Always consult with a qualified healthcare provider before making any medical decisions or taking medications.",
        "emergency": "Seek immediate medical attention if you experience severe symptoms or your condition worsens."
      };

      return diseaseInfo;
    } catch (error) {
      console.error('Error getting detailed disease info:', error);
      
      // Return a safe fallback response
      return {
        disease: diseaseName,
        description: "We apologize, but detailed information about this condition is currently unavailable.",
        error: "Unable to fetch disease details at this time.",
        safetyNotice: {
          "critical": "This information is for educational purposes only and should not replace professional medical advice, diagnosis, or treatment.",
          "warning": "Always consult with a qualified healthcare provider before making any medical decisions or taking medications.",
          "emergency": "Seek immediate medical attention if you experience severe symptoms or your condition worsens."
        },
        recommendation: "Please consult with a healthcare professional for accurate diagnosis and treatment options."
      };
    }
  }

  async getDiseaseDetails(diseaseName, userSymptoms = []) {
    try {
      console.log('🔍 Getting disease details for:', diseaseName);
      console.log('🔍 User symptoms:', userSymptoms);
      
      const prompt = `
        As a medical AI assistant, provide comprehensive but SAFE information about the following disease: "${diseaseName}"
        
        User's reported symptoms: ${userSymptoms.join(', ') || 'Not specified'}
        
        Please provide the following information in JSON format:
        {
          "disease": {
            "name": "${diseaseName}",
            "description": "Clear, non-alarming description of the condition",
            "commonCauses": ["List of common causes"],
            "commonSymptoms": ["Complete list of typical symptoms"],
            "severity": "mild/moderate/serious",
            "urgencyLevel": "routine/prompt/urgent"
          },
          "recommendations": {
            "immediateSteps": ["Safe, general immediate care steps"],
            "lifestyle": ["Lifestyle modifications and self-care"],
            "prevention": ["Prevention measures"],
            "whenToSeeDoctor": "Clear guidance on when medical attention is needed"
          },
          "medications": {
            "overTheCounter": [
              {
                "name": "Common OTC medication (generic names only)",
                "purpose": "What symptoms it addresses",
                "generalDosage": "General adult dosage (emphasize consulting pharmacist)",
                "precautions": ["Important safety warnings"]
              }
            ],
            "prescriptionNote": "Professional medications that require doctor consultation and their general categories"
          },
          "warnings": [
            "Important medical disclaimers and when to seek immediate care"
          ],
          "followUp": {
            "timeframe": "When to follow up with healthcare provider",
            "redFlags": ["Symptoms that require immediate medical attention"]
          }
        }

        CRITICAL SAFETY REQUIREMENTS:
        - Only suggest very common, widely-available OTC medications (like acetaminophen, ibuprofen)
        - Always emphasize consulting pharmacist or doctor before ANY medication
        - Include strong disclaimers about not replacing professional medical advice
        - For serious conditions, emphasize seeking medical care immediately
        - Use general, non-specific dosage information
        - Focus on symptom management rather than cure claims
        - Be conservative and err on the side of caution

        Provide helpful but safe medical education information.
      `;

      console.log('🚀 Sending request to Gemini API...');
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      console.log('✅ Received response from Gemini API');
      
      // Clean and parse the JSON response
      const cleanedResponse = this.cleanJsonResponse(response);
      const diseaseInfo = JSON.parse(cleanedResponse);
      
      // Add mandatory safety validations
      return this.validateAndEnhanceDiseaseInfo(diseaseInfo, diseaseName);
      
    } catch (error) {
      console.error('❌ Error getting disease details:', error);
      console.error('Error details:', error.message);
      return this.getDefaultDiseaseInfo(diseaseName);
    }
  }

  cleanJsonResponse(response) {
    // Remove markdown code block markers and extra text
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find the JSON object in the response
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd);
    }
    
    return cleaned;
  }

  validateAndEnhanceDiseaseInfo(diseaseInfo, diseaseName) {
    // Add mandatory medical disclaimers
    const enhancedInfo = {
      ...diseaseInfo,
      medicalDisclaimer: {
        primary: "⚠️ IMPORTANT: This information is for educational purposes only and does not replace professional medical advice.",
        secondary: "Always consult with qualified healthcare professionals for proper diagnosis and treatment.",
        emergency: "If you experience severe symptoms or feel this is an emergency, seek immediate medical attention or call emergency services."
      },
      timestamp: new Date().toISOString(),
      source: "AI-generated educational information"
    };

    // Ensure critical safety warnings are present
    if (!enhancedInfo.warnings || enhancedInfo.warnings.length === 0) {
      enhancedInfo.warnings = [
        "This information is not a substitute for professional medical advice, diagnosis, or treatment",
        "Individual symptoms and conditions can vary significantly",
        "Seek immediate medical care if symptoms worsen or you develop new concerning symptoms",
        "Always verify medication information with a pharmacist or healthcare provider"
      ];
    }

    // Add safety disclaimers to all medications
    if (enhancedInfo.medications?.overTheCounter) {
      enhancedInfo.medications.overTheCounter = enhancedInfo.medications.overTheCounter.map(med => ({
        ...med,
        safetyNote: "⚠️ Consult pharmacist or healthcare provider before taking any medication, even over-the-counter ones",
        disclaimer: "Dosage may vary based on individual factors - always follow professional guidance"
      }));
    }

    // Add specialization suggestions for doctor recommendations
    enhancedInfo.recommendedSpecialties = this.getRecommendedSpecialties(diseaseName);

    return enhancedInfo;
  }

  getRecommendedSpecialties(diseaseName) {
    const diseaseSpecialtyMapping = {
      // Common conditions and their appropriate specialties
      'hypertension': ['Cardiology', 'Internal Medicine', 'Family Medicine'],
      'diabetes': ['Endocrinology', 'Internal Medicine', 'Family Medicine'],
      'heart disease': ['Cardiology', 'Internal Medicine'],
      'stroke': ['Neurology', 'Emergency Medicine'],
      'depression': ['Psychiatry', 'Psychology', 'Mental Health'],
      'anxiety': ['Psychiatry', 'Psychology', 'Mental Health'],
      'asthma': ['Pulmonology', 'Internal Medicine', 'Allergy and Immunology'],
      'pneumonia': ['Pulmonology', 'Internal Medicine', 'Family Medicine'],
      'migraine': ['Neurology', 'Family Medicine', 'Pain Management'],
      'arthritis': ['Rheumatology', 'Orthopedics', 'Internal Medicine'],
      'kidney stones': ['Urology', 'Nephrology'],
      'skin condition': ['Dermatology', 'Family Medicine'],
      'digestive issues': ['Gastroenterology', 'Internal Medicine', 'Family Medicine'],
      'fracture': ['Orthopedics', 'Emergency Medicine'],
      'eye problems': ['Ophthalmology', 'Family Medicine'],
      'ear problems': ['ENT', 'Family Medicine'],
      'thyroid': ['Endocrinology', 'Internal Medicine'],
      'back pain': ['Orthopedics', 'Physical Medicine', 'Pain Management'],
      'headache': ['Neurology', 'Family Medicine', 'Internal Medicine']
    };

    // Find matching specialties based on disease name keywords
    const diseaseLower = diseaseName.toLowerCase();
    
    for (const [condition, specialties] of Object.entries(diseaseSpecialtyMapping)) {
      if (diseaseLower.includes(condition.toLowerCase()) || condition.toLowerCase().includes(diseaseLower)) {
        return specialties;
      }
    }

    // Default to general medicine if no specific match
    return ['Internal Medicine', 'Family Medicine', 'General Practice'];
  }

  getDefaultDiseaseInfo(diseaseName) {
    // Provide some basic medication info even as fallback
    const commonMedications = this.getCommonMedicationsForCondition(diseaseName);
    
    return {
      disease: {
        name: diseaseName,
        description: "This condition may benefit from proper medical evaluation. While detailed information is currently limited, basic guidance is provided below.",
        severity: "unknown",
        urgencyLevel: "prompt"
      },
      recommendations: {
        immediateSteps: ["Consult with a healthcare professional for proper evaluation and guidance", "Monitor symptoms and note any changes", "Rest and maintain good hydration"],
        whenToSeeDoctor: "As soon as possible for proper medical assessment"
      },
      medications: commonMedications,
      warnings: [
        "This information is for educational purposes only and should not replace professional medical advice",
        "Always consult a healthcare provider before taking any medication",
        "Seek immediate medical care if symptoms worsen or you develop new concerning symptoms"
      ],
      medicalDisclaimer: {
        primary: "⚠️ IMPORTANT: This information is for educational purposes only",
        secondary: "Always consult with qualified healthcare professionals for proper diagnosis and treatment",
        emergency: "Contact healthcare providers or emergency services for proper medical evaluation"
      },
      recommendedSpecialties: ['Internal Medicine', 'Family Medicine'],
      note: "Limited information available - professional consultation recommended"
    };
  }

  getCommonMedicationsForCondition(diseaseName) {
    const name = diseaseName.toLowerCase();
    
    // Common OTC medications for different conditions
    if (name.includes('covid') || name.includes('flu') || name.includes('cold')) {
      return {
        overTheCounter: [
          {
            name: "Acetaminophen (Tylenol)",
            purpose: "Fever reduction and pain relief",
            generalDosage: "Follow package instructions - typically 325-650mg every 4-6 hours for adults",
            precautions: ["Do not exceed 3000mg per day", "Avoid if liver problems", "Consult pharmacist for proper dosing"]
          },
          {
            name: "Ibuprofen (Advil, Motrin)",
            purpose: "Pain and inflammation relief, fever reduction",
            generalDosage: "200-400mg every 4-6 hours for adults",
            precautions: ["Take with food", "Avoid if kidney problems or stomach ulcers", "Consult pharmacist before use"]
          }
        ],
        prescriptionNote: "Antiviral medications, antibiotics (if bacterial infection), or stronger pain medications may be prescribed by a doctor based on specific symptoms and severity."
      };
    }
    
    if (name.includes('headache') || name.includes('migraine')) {
      return {
        overTheCounter: [
          {
            name: "Acetaminophen (Tylenol)",
            purpose: "Pain relief",
            generalDosage: "325-650mg every 4-6 hours for adults",
            precautions: ["Do not exceed 3000mg per day", "Consult pharmacist for proper dosing"]
          },
          {
            name: "Ibuprofen (Advil, Motrin)",
            purpose: "Pain and inflammation relief",
            generalDosage: "200-400mg every 4-6 hours for adults",
            precautions: ["Take with food", "Consult pharmacist before use"]
          }
        ],
        prescriptionNote: "Prescription medications like triptans for migraines or stronger pain relievers may be recommended by a healthcare provider."
      };
    }
    
    // Default medications for general conditions
    return {
      overTheCounter: [
        {
          name: "Acetaminophen (Tylenol)",
          purpose: "General pain relief and fever reduction",
          generalDosage: "Follow package instructions - consult pharmacist",
          precautions: ["Do not exceed recommended dose", "Consult pharmacist or doctor before use"]
        }
      ],
      prescriptionNote: "Specific prescription medications depend on the exact condition and should be determined by a qualified healthcare provider after proper evaluation."
    };
  }
}

module.exports = new DiseaseInfoService();
