const { GoogleGenerativeAI } = require('@google/generative-ai');

class MedicalReportAI {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async analyzeReport(extractedText, reportType = 'Medical Report') {
    try {
      const prompt = this.createAnalysisPrompt(extractedText, reportType);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 AI Response received, length:', text.length);
      
      // Parse the AI response
      return this.parseAIResponse(text);
    } catch (error) {
      console.error('Error analyzing report with Gemini AI:', error);
      throw new Error('Failed to analyze report with AI');
    }
  }

  createAnalysisPrompt(extractedText, reportType) {
    return `You are a medical AI assistant. Analyze this medical report and extract ALL test results in proper JSON format.

MEDICAL REPORT DATA:
${extractedText}

Extract every single test parameter found in the report. Based on the text, I can see:
- Lipid Profile (Cholesterol Total, HDL, LDL, VLDL, Triglycerides, etc.)
- Liver Function Profile (Bilirubin, ALP, ALT, AST, GGT, Protein, Albumin, etc.)
- Kidney Function (Creatinine, Urea, BUN, eGFR, Electrolytes)
- Iron Profile (Iron, UIBC, TIBC, Transferrin)
- HbA1c (Diabetes marker)
- Calcium & Phosphorus
- Vitamins (Folate, B12, Vitamin D)
- Thyroid Profile (T3, T4, TSH)
- Complete Blood Count (Hemoglobin, RBC, WBC, Platelets, etc.)
- Blood Glucose

Return ONLY a valid JSON object in this exact format:

{
  "testResults": [
    {
      "parameter": "Cholesterol - Total",
      "value": "183",
      "unit": "mg/dL",
      "normalRange": {
        "min": "",
        "max": "200",
        "description": "Desirable: <200, Borderline: 200-239, High: >240"
      },
      "status": "normal",
      "description": "Total cholesterol level in blood",
      "category": "Lipid Profile"
    }
  ],
  "aiAnalysis": {
    "summary": "Comprehensive metabolic panel analysis",
    "keyFindings": [
      {
        "parameter": "HbA1c",
        "value": "6.3%",
        "status": "high",
        "description": "Pre-diabetic range"
      }
    ],
    "recommendations": [
      "Monitor blood glucose levels",
      "Consider dietary modifications"
    ],
    "followUpActions": [
      "Repeat HbA1c in 3 months"
    ],
    "riskFactors": [
      "Pre-diabetic HbA1c level"
    ],
    "overallAssessment": "Generally good health",
    "urgencyLevel": "medium"
  },
  "extractedMetadata": {
    "reportDate": "2025-06-14",
    "labName": "HealthMap Diagnostics Pvt Ltd",
    "doctorName": "MALLIKARJUN",
    "patientInfo": {
      "age": "56",
      "gender": "Male",
      "referenceId": "320724"
    }
  }
}

CRITICAL INSTRUCTIONS:
1. Extract EVERY test parameter with numerical values
2. Use exact parameter names from the report
3. Include proper units (mg/dL, g/dL, %, etc.)
4. Determine status by comparing values to normal ranges
5. Group tests into appropriate categories
6. Return ONLY valid JSON - no explanatory text before or after
7. Do not use markdown formatting`;
  }

  parseAIResponse(responseText) {
    try {
      // Clean the response text to extract JSON
      let cleanedText = responseText.trim();
      
      // Remove markdown code blocks if present
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      cleanedText = cleanedText.replace(/```/g, '');
      
      // Try to find JSON content if there's extra text
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      
      console.log('🔧 Attempting to parse AI response...');
      console.log('📝 Cleaned text length:', cleanedText.length);
      
      // Parse the JSON response
      const parsed = JSON.parse(cleanedText);
      
      console.log('✅ Successfully parsed AI response');
      console.log('📊 Test results found:', parsed.testResults?.length || 0);
      
      // Validate the structure
      return this.validateAndCleanResponse(parsed);
    } catch (error) {
      console.error('❌ Error parsing AI response:', error.message);
      console.log('📄 Raw response preview:', responseText.substring(0, 500) + '...');
      
      // Return a fallback structure
      return {
        testResults: [],
        aiAnalysis: {
          summary: "Unable to parse AI response. Please review the report manually.",
          keyFindings: [],
          recommendations: ["Manual review recommended"],
          followUpActions: ["Consult healthcare provider"],
          riskFactors: [],
          overallAssessment: "Analysis incomplete",
          urgencyLevel: "medium"
        },
        extractedMetadata: {}
      };
    }
  }

  validateAndCleanResponse(response) {
    // Ensure required fields exist
    const validated = {
      testResults: Array.isArray(response.testResults) ? response.testResults : [],
      aiAnalysis: {
        summary: response.aiAnalysis?.summary || '',
        keyFindings: Array.isArray(response.aiAnalysis?.keyFindings) ? response.aiAnalysis.keyFindings : [],
        recommendations: Array.isArray(response.aiAnalysis?.recommendations) ? response.aiAnalysis.recommendations : [],
        followUpActions: Array.isArray(response.aiAnalysis?.followUpActions) ? response.aiAnalysis.followUpActions : [],
        riskFactors: Array.isArray(response.aiAnalysis?.riskFactors) ? response.aiAnalysis.riskFactors : [],
        overallAssessment: response.aiAnalysis?.overallAssessment || '',
        urgencyLevel: this.validateUrgencyLevel(response.aiAnalysis?.urgencyLevel)
      },
      extractedMetadata: response.extractedMetadata || {}
    };

    // Validate and clean test results
    validated.testResults = validated.testResults.map(result => ({
      parameter: result.parameter || 'Unknown Parameter',
      value: result.value || 'N/A',
      unit: result.unit || '',
      normalRange: {
        min: result.normalRange?.min || '',
        max: result.normalRange?.max || '',
        description: result.normalRange?.description || ''
      },
      status: this.validateStatus(result.status),
      description: result.description || '',
      category: result.category || 'General'
    }));

    // Validate key findings
    validated.aiAnalysis.keyFindings = validated.aiAnalysis.keyFindings.map(finding => ({
      parameter: finding.parameter || 'Unknown',
      value: finding.value || 'N/A',
      status: this.validateStatus(finding.status),
      description: finding.description || ''
    }));

    return validated;
  }

  validateStatus(status) {
    const validStatuses = ['normal', 'high', 'low', 'critical', 'abnormal'];
    return validStatuses.includes(status) ? status : 'abnormal';
  }

  validateUrgencyLevel(level) {
    const validLevels = ['low', 'medium', 'high', 'critical'];
    return validLevels.includes(level) ? level : 'low';
  }

  // Method to compare with previous reports for trend analysis
  async generateTrends(currentResults, previousReports) {
    try {
      if (!previousReports || previousReports.length === 0) {
        return [];
      }

      const trends = [];
      const latestPrevious = previousReports[0]; // Assuming sorted by date desc

      if (!latestPrevious.testResults) {
        return [];
      }

      // Compare current results with the most recent previous report
      currentResults.forEach(currentResult => {
        const previousResult = latestPrevious.testResults.find(
          prev => prev.parameter === currentResult.parameter
        );

        if (previousResult) {
          const trend = this.calculateTrend(currentResult, previousResult);
          if (trend) {
            trends.push(trend);
          }
        }
      });

      return trends;
    } catch (error) {
      console.error('Error generating trends:', error);
      return [];
    }
  }

  calculateTrend(current, previous) {
    try {
      const currentValue = this.extractNumericValue(current.value);
      const previousValue = this.extractNumericValue(previous.value);

      if (currentValue === null || previousValue === null) {
        return null;
      }

      const changePercent = ((currentValue - previousValue) / previousValue) * 100;
      
      let trendDirection;
      let description;

      if (Math.abs(changePercent) < 5) {
        trendDirection = 'stable';
        description = 'Stable compared to previous report';
      } else if (changePercent > 0) {
        trendDirection = 'improving';
        description = `Increased by ${Math.abs(changePercent).toFixed(1)}%`;
      } else {
        trendDirection = 'declining';
        description = `Decreased by ${Math.abs(changePercent).toFixed(1)}%`;
      }

      return {
        parameter: current.parameter,
        trend: trendDirection,
        description,
        previousValue: previous.value,
        changePercent: Math.round(changePercent * 10) / 10
      };
    } catch (error) {
      console.error('Error calculating trend for', current.parameter, error);
      return null;
    }
  }

  extractNumericValue(valueString) {
    try {
      const numericValue = parseFloat(valueString.toString().replace(/[^\d.-]/g, ''));
      return isNaN(numericValue) ? null : numericValue;
    } catch (error) {
      return null;
    }
  }
}

module.exports = MedicalReportAI;
