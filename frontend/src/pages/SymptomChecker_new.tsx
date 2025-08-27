import React, { useState, useEffect } from 'react';
import { aiAPI } from '../services/api';
import { 
  Search, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Brain,
  Stethoscope,
  FileText,
  MapPin,
  Hospital,
  User,
  Star,
  Navigation2,
  ArrowLeft,
  Clock,
  Phone,
  Mail,
  ExternalLink,
  Shield,
  Info,
  Users,
  Building
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

interface DiseaseInfo {
  disease: {
    name: string;
    description: string;
    commonCauses: string[];
    commonSymptoms: string[];
    severity: string;
    urgencyLevel: string;
  };
  recommendations: {
    immediateSteps: string[];
    lifestyle: string[];
    prevention: string[];
    whenToSeeDoctor: string;
  };
  medications: {
    overTheCounter: Array<{
      name: string;
      purpose: string;
      generalDosage: string;
      precautions: string[];
      safetyNote: string;
      disclaimer: string;
    }>;
    prescriptionNote: string;
  };
  warnings: string[];
  followUp: {
    timeframe: string;
    redFlags: string[];
  };
  medicalDisclaimer: {
    primary: string;
    secondary: string;
    emergency: string;
  };
  recommendedSpecialties: string[];
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  qualification: string;
  rating: string;
  consultationFee: string;
  distance: string;
  image?: string;
  hospital: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    rating: string;
    contact?: any;
  };
}

interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
  source?: string;
}

const SymptomChecker: React.FC = () => {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  
  // New states for disease details
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null);
  const [diseaseInfo, setDiseaseInfo] = useState<DiseaseInfo | null>(null);
  const [loadingDiseaseInfo, setLoadingDiseaseInfo] = useState(false);
  const [recommendedDoctors, setRecommendedDoctors] = useState<Doctor[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [showDoctors, setShowDoctors] = useState(false);

  // Get user location on component mount
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const response = await aiAPI.getUserLocation();
        if (response.data.success && response.data.location) {
          setUserLocation(response.data.location);
        }
      } catch (error) {
        console.warn('Could not get user location:', error);
      }
    };

    getUserLocation();
  }, []);

  const addSymptom = () => {
    if (currentSymptom.trim() && !symptoms.includes(currentSymptom.trim())) {
      setSymptoms([...symptoms, currentSymptom.trim()]);
      setCurrentSymptom('');
    }
  };

  const removeSymptom = (index: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (symptoms.length === 0) {
      setError('Please add at least one symptom');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSelectedDisease(null);
    setDiseaseInfo(null);

    try {
      const response = await aiAPI.analyzeSymptoms(symptoms, additionalInfo);
      setResult(response.data.analysis);
    } catch (err: any) {
      setError('Failed to analyze symptoms. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDiseaseClick = async (diseaseName: string) => {
    setSelectedDisease(diseaseName);
    setLoadingDiseaseInfo(true);
    setDiseaseInfo(null);
    setRecommendedDoctors([]);
    setShowDoctors(false);

    try {
      const response = await aiAPI.getDiseaseDetails(diseaseName, symptoms, userLocation);
      
      if (response.data.success) {
        setDiseaseInfo(response.data.diseaseInfo);
        setRecommendedDoctors(response.data.recommendations.doctors || []);
      } else {
        setError('Failed to get disease information');
      }
    } catch (err: any) {
      setError('Failed to get disease details. Please try again.');
      console.error('Disease details error:', err);
    } finally {
      setLoadingDiseaseInfo(false);
    }
  };

  const goBackToResults = () => {
    setSelectedDisease(null);
    setDiseaseInfo(null);
    setShowDoctors(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'mild': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'serious': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'routine': return '#10b981';
      case 'prompt': return '#f59e0b';
      case 'urgent': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (selectedDisease && diseaseInfo) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Header with Back Button */}
        <div style={{ marginBottom: '30px' }}>
          <button
            onClick={goBackToResults}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            <ArrowLeft style={{ height: '16px', width: '16px' }} />
            Back to Results
          </button>
          
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
            {diseaseInfo.disease.name}
          </h1>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <span style={{
              padding: '4px 12px',
              backgroundColor: getSeverityColor(diseaseInfo.disease.severity) + '20',
              color: getSeverityColor(diseaseInfo.disease.severity),
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: '500',
              border: `1px solid ${getSeverityColor(diseaseInfo.disease.severity)}40`
            }}>
              Severity: {diseaseInfo.disease.severity}
            </span>
            <span style={{
              padding: '4px 12px',
              backgroundColor: getUrgencyColor(diseaseInfo.disease.urgencyLevel) + '20',
              color: getUrgencyColor(diseaseInfo.disease.urgencyLevel),
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: '500',
              border: `1px solid ${getUrgencyColor(diseaseInfo.disease.urgencyLevel)}40`
            }}>
              Urgency: {diseaseInfo.disease.urgencyLevel}
            </span>
          </div>
        </div>

        {/* Medical Disclaimer */}
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <Shield style={{ height: '20px', width: '20px', color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                {diseaseInfo.medicalDisclaimer.primary}
              </div>
              <div style={{ color: '#92400e', fontSize: '14px' }}>
                {diseaseInfo.medicalDisclaimer.secondary}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Disease Description */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info style={{ height: '20px', width: '20px', color: '#3b82f6' }} />
                Description
              </h3>
              <p style={{ color: '#4b5563', lineHeight: '1.6' }}>
                {diseaseInfo.disease.description}
              </p>
            </div>

            {/* Common Symptoms */}
            {diseaseInfo.disease.commonSymptoms && diseaseInfo.disease.commonSymptoms.length > 0 && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Stethoscope style={{ height: '20px', width: '20px', color: '#10b981' }} />
                  Common Symptoms
                </h3>
                <ul style={{ color: '#4b5563', paddingLeft: '20px' }}>
                  {diseaseInfo.disease.commonSymptoms.map((symptom, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{symptom}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Immediate Steps */}
            {diseaseInfo.recommendations.immediateSteps && diseaseInfo.recommendations.immediateSteps.length > 0 && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle style={{ height: '20px', width: '20px', color: '#059669' }} />
                  Immediate Steps
                </h3>
                <ul style={{ color: '#4b5563', paddingLeft: '20px' }}>
                  {diseaseInfo.recommendations.immediateSteps.map((step, index) => (
                    <li key={index} style={{ marginBottom: '8px' }}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Over-the-Counter Medications */}
            {diseaseInfo.medications.overTheCounter && diseaseInfo.medications.overTheCounter.length > 0 && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText style={{ height: '20px', width: '20px', color: '#8b5cf6' }} />
                  Over-the-Counter Options
                </h3>
                {diseaseInfo.medications.overTheCounter.map((med, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                      {med.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '4px' }}>
                      <strong>Purpose:</strong> {med.purpose}
                    </div>
                    <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>
                      <strong>General Dosage:</strong> {med.generalDosage}
                    </div>
                    <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '500' }}>
                      {med.safetyNote}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* When to See Doctor */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock style={{ height: '20px', width: '20px', color: '#ef4444' }} />
                When to See a Doctor
              </h3>
              <p style={{ color: '#4b5563', lineHeight: '1.6', marginBottom: '16px' }}>
                {diseaseInfo.recommendations.whenToSeeDoctor}
              </p>
              
              {/* Red Flags */}
              {diseaseInfo.followUp.redFlags && diseaseInfo.followUp.redFlags.length > 0 && (
                <div style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  padding: '12px'
                }}>
                  <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>
                    Seek immediate medical attention if you experience:
                  </div>
                  <ul style={{ color: '#dc2626', paddingLeft: '16px', margin: 0 }}>
                    {diseaseInfo.followUp.redFlags.map((flag, index) => (
                      <li key={index} style={{ marginBottom: '4px' }}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Find Doctors Button */}
            {recommendedDoctors.length > 0 && (
              <button
                onClick={() => setShowDoctors(!showDoctors)}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Users style={{ height: '20px', width: '20px' }} />
                {showDoctors ? 'Hide' : 'Find'} Nearby Specialists ({recommendedDoctors.length})
              </button>
            )}
          </div>
        </div>

        {/* Recommended Doctors Section */}
        {showDoctors && recommendedDoctors.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Hospital style={{ height: '24px', width: '24px', color: '#3b82f6' }} />
              Recommended Specialists Near You
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              {recommendedDoctors.map((doctor, index) => (
                <div key={index} style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      backgroundColor: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: '600',
                      color: '#6b7280'
                    }}>
                      {doctor.image ? (
                        <img src={doctor.image} alt={doctor.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        doctor.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                        Dr. {doctor.name}
                      </h4>
                      <p style={{ color: '#3b82f6', fontWeight: '500', marginBottom: '4px' }}>
                        {doctor.specialization}
                      </p>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#6b7280' }}>
                        <span>{doctor.experience}</span>
                        <span>⭐ {doctor.rating}</span>
                        <span style={{ color: '#059669', fontWeight: '500' }}>{doctor.distance}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hospital Information */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Building style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                      <span style={{ fontWeight: '500', color: '#374151' }}>{doctor.hospital.name}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {doctor.hospital.address}, {doctor.hospital.city}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#374151' }}>
                      <strong>Fee:</strong> {doctor.consultationFee}
                    </div>
                    <button style={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}>
                      Book Appointment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <Brain style={{ height: '48px', width: '48px', color: '#3b82f6' }} />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
          AI Symptom Checker
        </h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Describe your symptoms and get AI-powered health insights
        </p>
      </div>

      {/* Symptom Input */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Add Your Symptoms
        </h3>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            type="text"
            value={currentSymptom}
            onChange={(e) => setCurrentSymptom(e.target.value)}
            placeholder="Describe a symptom (e.g., headache, fever, cough)"
            onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
            style={{
              flex: 1,
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <button
            onClick={addSymptom}
            style={{
              padding: '12px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus style={{ height: '16px', width: '16px' }} />
            Add
          </button>
        </div>

        {/* Symptoms List */}
        {symptoms.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              Your Symptoms:
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {symptoms.map((symptom, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '20px',
                    fontSize: '14px'
                  }}
                >
                  <span>{symptom}</span>
                  <button
                    onClick={() => removeSymptom(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X style={{ height: '14px', width: '14px', color: '#6b7280' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            Additional Information (Optional)
          </label>
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Any additional details about duration, severity, triggers, etc."
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading || symptoms.length === 0}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading || symptoms.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Search style={{ height: '20px', width: '20px' }} />
          {loading ? 'Analyzing...' : 'Analyze Symptoms'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle style={{ height: '20px', width: '20px', color: '#dc2626' }} />
            <span style={{ color: '#dc2626' }}>{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle style={{ height: '24px', width: '24px', color: '#10b981' }} />
            Analysis Results
          </h3>

          {/* Possible Conditions */}
          {result.possibleConditions && result.possibleConditions.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Possible Conditions (Click for details):
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.possibleConditions.map((condition, index) => (
                  <button
                    key={index}
                    onClick={() => handleDiseaseClick(condition.condition)}
                    style={{
                      textAlign: 'left',
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', color: '#111827' }}>
                        {condition.condition}
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {Math.round(condition.probability)}% match
                      </span>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                      {condition.description}
                    </p>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#3b82f6', fontWeight: '500' }}>
                      Click for detailed information and nearby specialists →
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                General Recommendations:
              </h4>
              <ul style={{ paddingLeft: '20px', color: '#4b5563' }}>
                {result.recommendations.map((rec, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Urgency Level */}
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: result.urgencyLevel === 'high' ? '#fee2e2' :
                           result.urgencyLevel === 'medium' ? '#fef3c7' : '#dcfce7',
            border: `1px solid ${result.urgencyLevel === 'high' ? '#fca5a5' :
                                result.urgencyLevel === 'medium' ? '#fcd34d' : '#86efac'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <AlertCircle style={{
                height: '16px',
                width: '16px',
                color: result.urgencyLevel === 'high' ? '#dc2626' :
                       result.urgencyLevel === 'medium' ? '#d97706' : '#059669'
              }} />
              <span style={{
                fontWeight: '600',
                color: result.urgencyLevel === 'high' ? '#dc2626' :
                       result.urgencyLevel === 'medium' ? '#d97706' : '#059669'
              }}>
                Urgency Level: {result.urgencyLevel.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Disclaimer */}
          {result.disclaimer && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#4b5563'
            }}>
              <strong>Important:</strong> {result.disclaimer}
            </div>
          )}
        </div>
      )}

      {loadingDiseaseInfo && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <Brain style={{ height: '48px', width: '48px', color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
          </div>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            Getting detailed information about {selectedDisease}...
          </p>
        </div>
      )}
    </div>
  );
};

export default SymptomChecker;
