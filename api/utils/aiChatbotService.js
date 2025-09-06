const { GoogleGenerativeAI } = require('@google/generative-ai');
const diseaseInfoService = require('./diseaseInfoService');
const LocationService = require('./locationService');

class AIChatbotService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.diseaseInfoService = diseaseInfoService;
    this.locationService = new LocationService();
  }

  async analyzeUserIntent(message, userLocation = null) {
    try {
      const prompt = `
Analyze the following user message and determine their intent. Respond with JSON in this exact format:

{
  "intent": "symptom_check" | "hospital_finder" | "disease_info" | "general_health" | "greeting" | "other",
  "confidence": 0.0-1.0,
  "extractedData": {
    "symptoms": ["symptom1", "symptom2"],
    "location": "location if mentioned",
    "diseaseName": "disease name if asking about specific condition",
    "searchRadius": number,
    "specialty": "medical specialty if mentioned"
  },
  "reasoning": "Brief explanation of why this intent was chosen"
}

Intent definitions:
- symptom_check: User mentions symptoms, pain, discomfort, feeling unwell, wants diagnosis
- hospital_finder: User wants to find hospitals, medical facilities, doctors near them
- disease_info: User asks about a specific disease, condition, or medical term
- general_health: General health questions, medical advice, health tips
- greeting: Greetings, how are you, hello, etc.
- other: Doesn't fit other categories

User message: "${message}"
User location available: ${userLocation ? 'Yes' : 'No'}

Examples:
"I have fever and cough" -> symptom_check
"Find hospitals near me" -> hospital_finder
"What is diabetes?" -> disease_info
"Hello" -> greeting
"How to stay healthy?" -> general_health`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error analyzing intent:', error);
      
      // Fallback intent analysis when API is unavailable
      const message_lower = message.toLowerCase();
      
      if (message_lower.includes('hospital') || message_lower.includes('clinic') || message_lower.includes('medical center')) {
        return {
          intent: 'hospital_finder',
          confidence: 0.9,
          extractedData: {
            symptoms: [],
            location: userLocation ? "User's current location" : null,
            diseaseName: null,
            searchRadius: null,
            specialty: null
          },
          reasoning: 'Fallback: Message contains hospital-related keywords'
        };
      }
      
      if (message_lower.includes('fever') || message_lower.includes('cough') || message_lower.includes('pain') || 
          message_lower.includes('headache') || message_lower.includes('symptom')) {
        return {
          intent: 'symptom_check',
          confidence: 0.8,
          extractedData: {
            symptoms: message_lower.includes('fever') ? ['fever'] : 
                     message_lower.includes('cough') ? ['cough'] : ['pain'],
            location: userLocation,
            diseaseName: null,
            searchRadius: null,
            specialty: null
          },
          reasoning: 'Fallback: Message contains symptom keywords'
        };
      }
      
      return {
        intent: 'other',
        confidence: 0.5,
        extractedData: {},
        reasoning: 'Unable to analyze intent'
      };
    }
  }

  async processSymptomCheck(symptoms, userLocation = null) {
    try {
      // Use existing medical AI doctor for analysis
      const MedicalAIDoctor = require('./medicalAIDoctor');
      const medicalDoctor = new MedicalAIDoctor();
      
      const analysis = await medicalDoctor.analyzeSymptoms(symptoms, {});
      
      // Get nearby doctors if location available
      let nearbyDoctors = [];
      if (userLocation && analysis.possibleConditions) {
        try {
          const relevantSpecialties = this.locationService.getRelevantSpecialties(analysis.possibleConditions);
          const Doctor = require('../models/Doctor');
          
          const doctors = await Doctor.find({
            'location.city': { $regex: new RegExp(userLocation.city || 'bangalore', 'i') },
            $or: relevantSpecialties.map(spec => ({
              specialization: { $regex: new RegExp(spec, 'i') }
            }))
          }).limit(3).lean();
          
          nearbyDoctors = doctors;
        } catch (error) {
          console.log('Error finding nearby doctors:', error);
        }
      }

      return {
        type: 'symptom_analysis',
        analysis,
        nearbyDoctors,
        userLocation
      };
    } catch (error) {
      console.error('Error in symptom check:', error);
      throw error;
    }
  }

  async processHospitalFinder(userLocation, radius = 10, specialty = null) {
    try {
      if (!userLocation) {
        return {
          type: 'error',
          message: 'Location is required to find nearby hospitals. Please enable location services.'
        };
      }

      const hospitals = await this.locationService.findNearbyHospitals(
        userLocation.lat,
        userLocation.lng,
        radius,
        null, // specialty
        10 // limit to 10 hospitals
      );

      // Filter by specialty if provided
      let filteredHospitals = hospitals;
      if (specialty) {
        filteredHospitals = hospitals.filter(hospital => 
          hospital.specialties && hospital.specialties.some(s => 
            s.name.toLowerCase().includes(specialty.toLowerCase())
          )
        );
      }

      return {
        type: 'hospital_list',
        hospitals: filteredHospitals,
        searchRadius: radius,
        specialty,
        userLocation
      };
    } catch (error) {
      console.error('Error finding hospitals:', error);
      throw error;
    }
  }

  async processDiseaseInfo(diseaseName, userSymptoms = []) {
    try {
      const diseaseDetails = await this.diseaseInfoService.getDetailedDiseaseInfo(diseaseName, userSymptoms);
      
      return {
        type: 'disease_info',
        diseaseDetails
      };
    } catch (error) {
      console.error('Error getting disease info:', error);
      throw error;
    }
  }

  async generateChatResponse(intent, extractedData, processedData = null, userLocation = null) {
    try {
      let responsePrompt = '';

      switch (intent) {
        case 'symptom_check':
          responsePrompt = `
Based on the symptom analysis results, provide a conversational response that includes:
1. Brief summary of possible conditions
2. Urgency level and recommendations
3. Mention of nearby doctors if available
4. Encouraging user to seek professional help

Analysis data: ${JSON.stringify(processedData?.analysis)}
Nearby doctors: ${processedData?.nearbyDoctors?.length || 0} found
Location: ${userLocation?.city || 'Not specified'}

Keep response friendly, informative but not alarming. Always emphasize consulting healthcare professionals.`;
          break;

        case 'hospital_finder':
          responsePrompt = `
Based on the hospital search results, provide a conversational response that includes:
1. Number of hospitals found
2. Brief overview of top hospitals
3. Mention of search radius and location
4. Helpful guidance on choosing a hospital

Hospital data: ${JSON.stringify(processedData?.hospitals?.slice(0, 3))}
Search radius: ${processedData?.searchRadius}km
Location: ${userLocation?.city || 'Not specified'}

Keep response helpful and informative.`;
          break;

        case 'disease_info':
          responsePrompt = `
Based on the disease information, provide a conversational response that includes:
1. Brief description of the condition
2. Key symptoms to watch for
3. When to seek medical help
4. General guidance

Disease data: ${JSON.stringify(processedData?.diseaseDetails)}

Keep response educational but emphasize professional medical consultation.`;
          break;

        case 'general_health':
          responsePrompt = `
Provide helpful general health advice for: "${extractedData.originalMessage}"
Keep response informative, encouraging, and always recommend consulting healthcare professionals for specific concerns.`;
          break;

        case 'greeting':
          responsePrompt = `
Respond to the greeting warmly and introduce yourself as MediBuddy AI assistant. 
Mention that you can help with:
- Symptom checking
- Finding nearby hospitals
- Medical information
- Health guidance

Keep it friendly and welcoming.`;
          break;

        default:
          responsePrompt = `
The user said: "${extractedData.originalMessage}"
Provide a helpful response and guide them on how you can assist with medical and health-related queries.
Mention your capabilities: symptom checking, hospital finding, disease information, and health guidance.`;
      }

      const result = await this.model.generateContent(responsePrompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating chat response:', error);
      throw error; // Throw error so it can be caught by the fallback system
    }
  }

  async processChatMessage(message, userLocation = null) {
    try {
      console.log('Processing chat message:', message);
      
      // Analyze intent
      const intentAnalysis = await this.analyzeUserIntent(message, userLocation);
      console.log('Intent analysis:', intentAnalysis);

      let processedData = null;
      
      // Process based on intent
      switch (intentAnalysis.intent) {
        case 'symptom_check':
          if (intentAnalysis.extractedData.symptoms?.length > 0) {
            processedData = await this.processSymptomCheck(
              intentAnalysis.extractedData.symptoms,
              userLocation
            );
          }
          break;

        case 'hospital_finder':
          processedData = await this.processHospitalFinder(
            userLocation,
            intentAnalysis.extractedData.searchRadius || 10,
            intentAnalysis.extractedData.specialty
          );
          break;

        case 'disease_info':
          if (intentAnalysis.extractedData.diseaseName) {
            processedData = await this.processDiseaseInfo(
              intentAnalysis.extractedData.diseaseName,
              intentAnalysis.extractedData.symptoms || []
            );
          }
          break;
      }

      // Generate conversational response
      let chatResponse;
      try {
        chatResponse = await this.generateChatResponse(
          intentAnalysis.intent,
          { ...intentAnalysis.extractedData, originalMessage: message },
          processedData,
          userLocation
        );
      } catch (error) {
        console.error('Error generating chat response, using fallback:', error);
        // Create a fallback response based on intent and data
        chatResponse = this.generateFallbackResponse(intentAnalysis.intent, processedData, userLocation);
      }

      return {
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        response: chatResponse,
        data: processedData,
        extractedData: intentAnalysis.extractedData
      };
    } catch (error) {
      console.error('Error processing chat message:', error);
      return {
        intent: 'error',
        confidence: 0,
        response: "I'm sorry, I encountered an error processing your request. Please try again or consult with a healthcare professional.",
        data: null,
        extractedData: {}
      };
    }
  }

  generateFallbackResponse(intent, data, userLocation) {
    switch (intent) {
      case 'hospital_finder':
        if (data && data.hospitals && data.hospitals.length > 0) {
          return `I found ${data.hospitals.length} hospitals near you! Here are some options:\n\n${data.hospitals.slice(0, 5).map((hospital, index) => 
            `${index + 1}. **${hospital.name}**\n   📍 ${hospital.location?.address || 'Address not available'}\n   📏 Distance: ${hospital.distance}km`
          ).join('\n\n')}\n\nWould you like more details about any of these hospitals?`;
        } else {
          return "I'm searching for hospitals near you, but I'm having trouble with the detailed response. Please try again or visit your nearest healthcare facility.";
        }
      
      case 'symptom_check':
        if (data && data.analysis) {
          return `I've analyzed your symptoms. Based on what you've described, here are some insights:\n\n${data.analysis.possibleConditions ? 
            `**Possible conditions to consider:**\n${data.analysis.possibleConditions.slice(0, 3).map(c => `• ${c.condition}`).join('\n')}\n\n` : ''
          }${data.analysis.urgencyLevel ? `**Urgency Level:** ${data.analysis.urgencyLevel}\n\n` : ''
          }Please consult with a healthcare professional for proper diagnosis and treatment.`;
        } else {
          return "I understand you're experiencing symptoms. For your safety, I recommend consulting with a healthcare professional who can properly evaluate your condition.";
        }
      
      case 'disease_info':
        if (data && data.diseaseDetails) {
          return `Here's information about ${data.diseaseDetails.name || 'the condition'}:\n\n${data.diseaseDetails.description || 'This is a medical condition that requires professional evaluation.'}\n\nFor detailed information and treatment options, please consult with a healthcare provider.`;
        } else {
          return "I can provide general health information, but for specific medical conditions, I recommend consulting with a healthcare professional.";
        }
      
      case 'greeting':
        return "Hello! I'm MediBuddy AI, your medical assistant. I can help you with symptom checking, finding nearby hospitals, and providing health information. How can I assist you today?";
      
      case 'general_health':
        return "I'm here to provide general health guidance. For specific medical advice, treatment recommendations, or urgent health concerns, please consult with a qualified healthcare professional.";
      
      default:
        return "I'm here to help with your health-related questions. I can assist with symptom checking, finding hospitals, and providing medical information. What would you like to know?";
    }
  }
}

module.exports = AIChatbotService;
