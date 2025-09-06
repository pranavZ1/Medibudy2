import React, { useState } from 'react';
import { aiAPI } from '../services/api';
import { useLocation } from '../contexts/LocationContext';
import { 
  Search, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Brain,
  Stethoscope,
  FileText
} from 'lucide-react';

interface AnalysisResult {
  possibleConditions: Array<{
    condition: string;
    probability: number;
    description: string;
  }>;
  recommendations: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
  disclaimer: string;
}

interface DiseaseDetails {
  disease: string;
  description: string;
  symptoms?: string[];
  causes?: string[];
  riskFactors?: string[];
  prevention?: {
    lifestyle: string[];
    dietary: string[];
    general: string[];
  };
  homeRemedies?: Array<{
    remedy: string;
    description: string;
    safety: string;
  }>;
  whenToSeekHelp?: {
    urgentSigns: string[];
    timeframe: string;
  };
  medications?: {
    disclaimer: string;
    commonTreatments: Array<{
      category: string;
      medications: Array<{
        name: string;
        purpose: string;
        dosage: string;
        precautions: string[];
        sideEffects: string[];
      }>;
    }>;
    prescriptionRequired: string;
  };
  lifestyle?: {
    dos: string[];
    donts: string[];
    recovery: string[];
  };
  complications?: string[];
  prognosis?: string;
  safetyNotice?: {
    critical: string;
    warning: string;
    emergency: string;
  };
}

// Commented out unused interfaces - keeping for future use
// interface Hospital {
//   _id: string;
//   name: string;
//   location: {
//     address: string;
//     city: string;
//     state: string;
//     coordinates: {
//       lat: number;
//       lng: number;
//     };
//   };
//   specialties: Array<{
//     name: string;
//     description: string;
//   }>;
//   ratings: {
//     overall: number;
//   };
//   distance?: number;
// }

// interface Doctor {
//   _id: string;
//   name: string;
//   specialization: string;
//   experience_years: number;
//   rating: {
//     average: number;
//     total_reviews: number;
//   };
//   hospital: {
//     name: string;
//   };
//   distance?: number;
// }

const SymptomChecker: React.FC = () => {
  const { userLocation } = useLocation();
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  
  // Location and healthcare provider states (keeping for future use)
  // const [showLocationSelector, setShowLocationSelector] = useState(false);
  // const [nearbyHospitals, setNearbyHospitals] = useState<Hospital[]>([]);
  // const [nearbyDoctors, setNearbyDoctors] = useState<Doctor[]>([]);
  // const [loadingHealthcare, setLoadingHealthcare] = useState(false);
  // const [healthcareError, setHealthcareError] = useState('');
  // const [showNearbyProviders, setShowNearbyProviders] = useState(false);

  // Disease details modal states
  const [showDiseaseModal, setShowDiseaseModal] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<string>('');
  const [diseaseDetails, setDiseaseDetails] = useState<DiseaseDetails | null>(null);
  const [loadingDiseaseDetails, setLoadingDiseaseDetails] = useState(false);
  const [diseaseError, setDiseaseError] = useState('');

  const commonSymptoms = [
    'Headache', 'Fever', 'Cough', 'Fatigue', 'Nausea', 'Dizziness',
    'Chest pain', 'Shortness of breath', 'Abdominal pain', 'Joint pain',
    'Muscle aches', 'Sore throat', 'Runny nose', 'Vomiting', 'Diarrhea'
  ];

  const addSymptom = (symptom: string) => {
    if (symptom.trim() && !symptoms.includes(symptom.trim())) {
      setSymptoms([...symptoms, symptom.trim()]);
      setCurrentSymptom('');
    }
  };

  const removeSymptom = (index: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== index));
  };

  // Commented out unused function - keeping for future use
  // const fetchNearbyHealthcare = async () => {
  //   if (!userLocation) {
  //     setHealthcareError('Location not available. Please enable location services or select manually.');
  //     return;
  //   }

  //   setLoadingHealthcare(true);
  //   setHealthcareError('');

  //   try {
  //     const response = await locationAPI.getNearbyHealthcare(
  //       userLocation.lat,
  //       userLocation.lng,
  //       50, // radius in km
  //       undefined, // specialty
  //       undefined, // specialization
  //       5, // hospital limit
  //       10 // doctor limit
  //     );

  //     setNearbyHospitals(response.data.hospitals || []);
  //     setNearbyDoctors(response.data.doctors || []);
  //     setShowNearbyProviders(true);
  //   } catch (err: any) {
  //     setHealthcareError('Failed to fetch nearby healthcare providers');
  //     console.error('Error fetching nearby healthcare:', err);
  //   } finally {
  //     setLoadingHealthcare(false);
  //   }
  // };

  const handleDiseaseClick = async (diseaseName: string) => {
    setSelectedDisease(diseaseName);
    setShowDiseaseModal(true);
    setLoadingDiseaseDetails(true);
    setDiseaseError('');
    setDiseaseDetails(null);

    try {
      console.log('Fetching details for disease:', diseaseName);
      const response = await aiAPI.getDiseaseDetails(diseaseName, symptoms, userLocation);
      console.log('Raw API response:', response.data);
      
      // Handle both old and new API response formats
      const diseaseInfo = response.data.diseaseInfo || response.data;
      console.log('Disease info:', diseaseInfo);
      
      // Transform the response to match our expected format if needed
      let transformedData;
      if (diseaseInfo.disease && typeof diseaseInfo.disease === 'object') {
        // New format with nested disease object
        transformedData = {
          disease: diseaseInfo.disease.name || diseaseName,
          description: diseaseInfo.disease.description,
          symptoms: diseaseInfo.disease.commonSymptoms || [],
          causes: diseaseInfo.disease.commonCauses || [],
          medications: {
            disclaimer: "IMPORTANT: This information is for educational purposes only. Always consult a qualified healthcare professional before taking any medication. Self-medication can be dangerous.",
            commonTreatments: diseaseInfo.medications?.overTheCounter ? [{
              category: "Over-the-Counter Medications",
              medications: diseaseInfo.medications.overTheCounter.map((med: any) => ({
                name: med.name,
                purpose: med.purpose,
                dosage: med.generalDosage || "Follow package directions",
                precautions: med.precautions || [],
                sideEffects: []
              }))
            }] : [],
            prescriptionRequired: diseaseInfo.medications?.prescriptionNote || "Most medications for this condition require a prescription. Consult with a healthcare professional."
          },
          recommendations: diseaseInfo.recommendations,
          whenToSeekHelp: diseaseInfo.followUp ? {
            urgentSigns: diseaseInfo.followUp.redFlags || [],
            timeframe: diseaseInfo.followUp.timeframe
          } : undefined,
          safetyNotice: {
            critical: diseaseInfo.medicalDisclaimer?.primary || "This information is for educational purposes only.",
            warning: diseaseInfo.medicalDisclaimer?.secondary || "Always consult healthcare professionals.",
            emergency: diseaseInfo.medicalDisclaimer?.emergency || "Seek immediate help for emergencies."
          }
        };
      } else {
        // Direct format
        transformedData = diseaseInfo;
      }
      
      setDiseaseDetails(transformedData);
      console.log('Transformed disease details:', transformedData);
    } catch (err: any) {
      console.error('Error fetching disease details:', err);
      setDiseaseError('Failed to fetch disease details. Please try again.');
    } finally {
      setLoadingDiseaseDetails(false);
    }
  };

  const closeDiseaseModal = () => {
    setShowDiseaseModal(false);
    setSelectedDisease('');
    setDiseaseDetails(null);
    setDiseaseError('');
  };

  const handleAnalyze = async () => {
    if (symptoms.length === 0) {
      setError('Please add at least one symptom');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    // setShowNearbyProviders(false); // Commented out - keeping for future use

    try {
      // Prepare the request data with user location if available
      const requestData = {
        symptoms,
        additionalInfo,
        userLocation: userLocation ? {
          lat: userLocation.lat,
          lng: userLocation.lng,
          city: userLocation.city,
          state: userLocation.state,
          country: userLocation.country,
          address: userLocation.address
        } : null
      };

      console.log('Sending request with user location:', requestData.userLocation);
      
      const response = await aiAPI.analyzeSymptoms(symptoms, additionalInfo, requestData.userLocation);
      setResult(response.data.analysis);
      
      // Extract hospitals and doctors from the response (commented out - keeping for future use)
      // const nearbyData = response.data.analysis.nearbyHospitals;
      // if (nearbyData) {
      //   setNearbyHospitals(nearbyData.hospitals || []);
      //   setNearbyDoctors(nearbyData.doctors || []);
      //   setShowNearbyProviders(true);
      //   console.log(`Found ${nearbyData.totalHospitalsFound || 0} hospitals and ${nearbyData.totalDoctorsFound || 0} doctors`);
      // }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to analyze symptoms');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'high': return { color: '#dc2626', backgroundColor: '#fef2f2', borderColor: '#fecaca' };
      case 'medium': return { color: '#d97706', backgroundColor: '#fffbeb', borderColor: '#fed7aa' };
      case 'low': return { color: '#059669', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' };
      default: return { color: '#4b5563', backgroundColor: '#f9fafb', borderColor: '#e5e7eb' };
    }
  };

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertCircle style={{ height: '20px', width: '20px' }} />;
      case 'medium': return <AlertCircle style={{ height: '20px', width: '20px' }} />;
      case 'low': return <CheckCircle style={{ height: '20px', width: '20px' }} />;
      default: return <AlertCircle style={{ height: '20px', width: '20px' }} />;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spinner {
            animation: spin 1s linear infinite;
          }
        `}
      </style>

      {/* Header */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#dbeafe', padding: '16px', borderRadius: '50%' }}>
            <Brain style={{ height: '32px', width: '32px', color: '#2563eb' }} />
          </div>
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827' }}>AI Symptom Checker</h1>
        <p style={{ color: '#4b5563', maxWidth: '672px', margin: '0 auto' }}>
          Describe your symptoms and get AI-powered analysis to understand potential conditions. 
          This is not a substitute for professional medical advice.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
        {/* Input Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Add Your Symptoms</h2>
            
            {/* Symptom Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Type a symptom..."
                  style={{ 
                    flex: 1, 
                    padding: '8px 12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                  value={currentSymptom}
                  onChange={(e) => setCurrentSymptom(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addSymptom(currentSymptom);
                    }
                  }}
                />
                <button
                  onClick={() => addSymptom(currentSymptom)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <Plus style={{ height: '20px', width: '20px' }} />
                </button>
              </div>

              {/* Common Symptoms */}
              <div>
                <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>Common symptoms:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {commonSymptoms.map((symptom) => (
                    <button
                      key={symptom}
                      onClick={() => addSymptom(symptom)}
                      disabled={symptoms.includes(symptom)}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        backgroundColor: symptoms.includes(symptom) ? '#e5e7eb' : '#f3f4f6',
                        color: symptoms.includes(symptom) ? '#9ca3af' : '#374151',
                        border: 'none',
                        borderRadius: '16px',
                        cursor: symptoms.includes(symptom) ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Symptoms */}
              {symptoms.length > 0 && (
                <div>
                  <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>Your symptoms:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {symptoms.map((symptom, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#eff6ff',
                          padding: '8px 12px',
                          borderRadius: '6px'
                        }}
                      >
                        <span style={{ color: '#1e40af' }}>{symptom}</span>
                        <button
                          onClick={() => removeSymptom(index)}
                          style={{
                            color: '#2563eb',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <X style={{ height: '16px', width: '16px' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Additional Information (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe when symptoms started, severity, what makes them better/worse, etc."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                    fontSize: '14px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                />
              </div>

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={loading || symptoms.length === 0}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  backgroundColor: symptoms.length === 0 || loading ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: symptoms.length === 0 || loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {loading ? (
                  <div className="spinner" style={{ 
                    width: '20px', 
                    height: '20px', 
                    border: '2px solid white', 
                    borderTop: '2px solid transparent', 
                    borderRadius: '50%'
                  }} />
                ) : (
                  <>
                    <Search style={{ height: '20px', width: '20px' }} />
                    <span>Analyze Symptoms</span>
                  </>
                )}
              </button>

              {error && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '12px', 
                  backgroundColor: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  borderRadius: '6px', 
                  color: '#dc2626' 
                }}>
                  <AlertCircle style={{ height: '20px', width: '20px' }} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Urgency Level */}
              <div style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                border: '1px solid',
                ...getUrgencyColor(result.urgencyLevel)
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getUrgencyIcon(result.urgencyLevel)}
                  <h3 style={{ fontWeight: '600', margin: 0 }}>
                    Urgency Level: {result.urgencyLevel.charAt(0).toUpperCase() + result.urgencyLevel.slice(1)}
                  </h3>
                </div>
              </div>

              {/* Possible Conditions */}
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Stethoscope style={{ height: '20px', width: '20px' }} />
                  <span>Possible Conditions</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {result.possibleConditions.map((condition, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px', 
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: 'white'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f9ff';
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px -8px rgba(59, 130, 246, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onClick={() => handleDiseaseClick(condition.condition)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ 
                          fontWeight: '600', 
                          color: '#1e40af', 
                          margin: 0, 
                          fontSize: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <Stethoscope style={{ height: '18px', width: '18px' }} />
                          {condition.condition}
                        </h4>
                        <span style={{ 
                          fontSize: '14px', 
                          backgroundColor: '#dbeafe', 
                          color: '#1e40af',
                          padding: '6px 12px', 
                          borderRadius: '20px',
                          fontWeight: '600'
                        }}>
                          {condition.probability}% match
                        </span>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '12px', 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '6px',
                        border: '1px dashed #cbd5e1'
                      }}>
                        <div style={{ 
                          backgroundColor: '#3b82f6', 
                          borderRadius: '50%', 
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Search style={{ height: '12px', width: '12px', color: 'white' }} />
                        </div>
                        <span style={{ 
                          color: '#475569', 
                          fontSize: '14px', 
                          fontWeight: '500'
                        }}>
                          Click to view detailed information, symptoms, treatment options & medication guidance
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText style={{ height: '20px', width: '20px' }} />
                  <span>Recommendations</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.recommendations.map((recommendation, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <CheckCircle style={{ height: '20px', width: '20px', color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ color: '#374151' }}>{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fed7aa', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertCircle style={{ height: '20px', width: '20px', color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <h4 style={{ fontWeight: '500', color: '#92400e', marginBottom: '4px' }}>Important Disclaimer</h4>
                    <p style={{ color: '#b45309', fontSize: '14px', margin: 0 }}>{result.disclaimer}</p>
                  </div>
                </div>
              </div>

              {/* Nearby Healthcare Providers - Commented out for now */}
              {/* {showNearbyProviders && nearbyDoctors.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Nearby Doctors */}
                  {/* <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User style={{ height: '20px', width: '20px' }} />
                      <span>Recommended Doctors ({nearbyDoctors.length})</span>
                    </h3>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      {nearbyDoctors.map((doctor, index) => (
                        <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div>
                              <h4 style={{ fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>{doctor.name}</h4>
                              <div style={{ fontSize: '14px', color: '#2563eb', fontWeight: '500', marginBottom: '4px' }}>
                                {doctor.specialization}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#6b7280' }}>
                                <span>{doctor.experience_years}+ years experience</span>
                                {doctor.location?.city && (
                                  <>
                                    <span>•</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <MapPin style={{ height: '14px', width: '14px' }} />
                                      <span>{doctor.location.city}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            {doctor.rating?.value > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                                <Star style={{ height: '14px', width: '14px', color: '#fbbf24' }} />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>{doctor.rating.value}</span>
                                {doctor.rating.total_reviews > 0 && (
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>({doctor.rating.total_reviews})</span>
                                )}
                              </div>
                            )}
                          </div>
                          {doctor.hospital?.name && (
                            <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                              <strong>Hospital:</strong> {doctor.hospital.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )} */}
            </div>
          ) : (
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <Brain style={{ height: '48px', width: '48px', color: '#9ca3af', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', marginBottom: '8px' }}>
                  Ready to Analyze
                </h3>
                <p style={{ color: '#4b5563' }}>
                  Add your symptoms and click "Analyze Symptoms" to get AI-powered insights.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disease Details Modal */}
      {showDiseaseModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              backgroundColor: 'white',
              zIndex: 1
            }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '24px', fontWeight: '600' }}>
                {selectedDisease}
              </h2>
              <button
                onClick={closeDiseaseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X style={{ height: '24px', width: '24px', color: '#6b7280' }} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px' }}>
              {loadingDiseaseDetails && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f4f6',
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    margin: '0 auto 16px'
                  }} />
                  <p style={{ color: '#6b7280' }}>Loading detailed information...</p>
                </div>
              )}

              {diseaseError && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle style={{ height: '20px', width: '20px', color: '#dc2626' }} />
                    <span style={{ color: '#dc2626' }}>{diseaseError}</span>
                  </div>
                </div>
              )}

              {diseaseDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Safety Notice */}
                  {diseaseDetails.safetyNotice && (
                    <div style={{
                      backgroundColor: '#fef3c7',
                      border: '2px solid #f59e0b',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                        <AlertCircle style={{ height: '20px', width: '20px', color: '#f59e0b', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <h4 style={{ fontWeight: '600', color: '#92400e', margin: '0 0 8px 0' }}>Important Medical Disclaimer</h4>
                          <p style={{ color: '#b45309', fontSize: '14px', margin: '0 0 8px 0' }}>{diseaseDetails.safetyNotice.critical}</p>
                          <p style={{ color: '#b45309', fontSize: '14px', margin: '0 0 8px 0' }}>{diseaseDetails.safetyNotice.warning}</p>
                          <p style={{ color: '#dc2626', fontSize: '14px', margin: 0, fontWeight: '500' }}>{diseaseDetails.safetyNotice.emergency}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Description</h3>
                    <p style={{ color: '#374151', lineHeight: '1.6' }}>{diseaseDetails.description}</p>
                  </div>

                  {/* Symptoms */}
                  {diseaseDetails.symptoms && diseaseDetails.symptoms.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Common Symptoms</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {diseaseDetails.symptoms.map((symptom, index) => (
                          <span key={index} style={{
                            backgroundColor: '#eff6ff',
                            color: '#1e40af',
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '14px'
                          }}>
                            {symptom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* When to Seek Help */}
                  {diseaseDetails.whenToSeekHelp && (
                    <div style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#dc2626', marginBottom: '12px' }}>When to Seek Medical Help</h3>
                      {diseaseDetails.whenToSeekHelp.urgentSigns && (
                        <div style={{ marginBottom: '12px' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: '500', color: '#111827', marginBottom: '8px' }}>Urgent Signs:</h4>
                          <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {diseaseDetails.whenToSeekHelp.urgentSigns.map((sign, index) => (
                              <li key={index} style={{ color: '#374151', marginBottom: '4px' }}>{sign}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {diseaseDetails.whenToSeekHelp.timeframe && (
                        <p style={{ color: '#374151', margin: 0, fontWeight: '500' }}>
                          <strong>Timeframe:</strong> {diseaseDetails.whenToSeekHelp.timeframe}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Medications */}
                  {diseaseDetails.medications && (
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Medication Information</h3>
                      
                      {/* Medication Disclaimer */}
                      <div style={{
                        backgroundColor: '#fef2f2',
                        border: '2px solid #dc2626',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <AlertCircle style={{ height: '20px', width: '20px', color: '#dc2626', marginTop: '2px', flexShrink: 0 }} />
                          <p style={{ color: '#dc2626', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                            {diseaseDetails.medications.disclaimer}
                          </p>
                        </div>
                      </div>

                      {/* Common Treatments */}
                      {diseaseDetails.medications.commonTreatments && diseaseDetails.medications.commonTreatments.map((treatment, index) => (
                        <div key={index} style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '16px',
                          marginBottom: '16px'
                        }}>
                          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                            {treatment.category}
                          </h4>
                          {treatment.medications.map((med, medIndex) => (
                            <div key={medIndex} style={{
                              backgroundColor: '#f9fafb',
                              padding: '12px',
                              borderRadius: '6px',
                              marginBottom: '12px'
                            }}>
                              <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                                {med.name}
                              </h5>
                              <p style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                                <strong>Purpose:</strong> {med.purpose}
                              </p>
                              <p style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                                <strong>Typical Dosage:</strong> {med.dosage}
                              </p>
                              
                              {med.precautions && med.precautions.length > 0 && (
                                <div style={{ marginBottom: '8px' }}>
                                  <strong style={{ fontSize: '14px', color: '#dc2626' }}>Precautions:</strong>
                                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                                    {med.precautions.map((precaution, pIndex) => (
                                      <li key={pIndex} style={{ fontSize: '13px', color: '#dc2626' }}>{precaution}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {med.sideEffects && med.sideEffects.length > 0 && (
                                <div>
                                  <strong style={{ fontSize: '14px', color: '#d97706' }}>Common Side Effects:</strong>
                                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                                    {med.sideEffects.map((effect, eIndex) => (
                                      <li key={eIndex} style={{ fontSize: '13px', color: '#d97706' }}>{effect}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}

                      {diseaseDetails.medications.prescriptionRequired && (
                        <p style={{ color: '#dc2626', fontSize: '14px', fontWeight: '500' }}>
                          {diseaseDetails.medications.prescriptionRequired}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Home Remedies */}
                  {diseaseDetails.homeRemedies && diseaseDetails.homeRemedies.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Home Remedies & Self Care</h3>
                      {diseaseDetails.homeRemedies.map((remedy, index) => (
                        <div key={index} style={{
                          border: '1px solid #d1fae5',
                          backgroundColor: '#f0fdf4',
                          borderRadius: '8px',
                          padding: '16px',
                          marginBottom: '12px'
                        }}>
                          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#065f46', marginBottom: '8px' }}>
                            {remedy.remedy}
                          </h4>
                          <p style={{ color: '#374151', marginBottom: '8px' }}>{remedy.description}</p>
                          <p style={{ color: '#d97706', fontSize: '14px', fontWeight: '500' }}>
                            <strong>Safety:</strong> {remedy.safety}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Lifestyle Recommendations */}
                  {diseaseDetails.lifestyle && (
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Lifestyle Recommendations</h3>
                      
                      {diseaseDetails.lifestyle.dos && diseaseDetails.lifestyle.dos.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#059669', marginBottom: '8px' }}>✓ Do:</h4>
                          <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {diseaseDetails.lifestyle.dos.map((item, index) => (
                              <li key={index} style={{ color: '#374151', marginBottom: '4px' }}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {diseaseDetails.lifestyle.donts && diseaseDetails.lifestyle.donts.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>✗ Don't:</h4>
                          <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {diseaseDetails.lifestyle.donts.map((item, index) => (
                              <li key={index} style={{ color: '#374151', marginBottom: '4px' }}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prognosis */}
                  {diseaseDetails.prognosis && (
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Prognosis & Recovery</h3>
                      <p style={{ color: '#374151', lineHeight: '1.6' }}>{diseaseDetails.prognosis}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SymptomChecker;
