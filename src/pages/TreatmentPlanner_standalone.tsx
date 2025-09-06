import React, { useState, useEffect } from 'react';
import { Search, MapPin, DollarSign, Clock, Star, Phone, Award, AlertCircle, CheckCircle, Info } from 'lucide-react';
import api from '../services/api';
import { TreatmentPlan, TreatmentCostSource, Hospital, Doctor, ApiError } from '../types/treatmentPlanner';

const TreatmentPlanner: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [insuranceType, setInsuranceType] = useState<string>('none');
  const [treatmentData, setTreatmentData] = useState<TreatmentPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');

  const insuranceOptions = [
    { value: 'none', label: 'No Insurance' },
    { value: 'star_health', label: 'Star Health' },
    { value: 'hdfc_ergo', label: 'HDFC Ergo' },
    { value: 'icici_lombard', label: 'ICICI Lombard' },
    { value: 'bajaj_allianz', label: 'Bajaj Allianz' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude},${position.coords.longitude}`);
        },
        () => {
          setLocation('Delhi, India'); // Default location
        }
      );
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a treatment or procedure name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/treatment-planner/analyze-treatment', {
        treatmentName: searchQuery,
        patientLocation: location,
        insuranceType: insuranceType
      });

      setTreatmentData(response.data.data);
      setActiveTab('overview');
    } catch (err) {
      const error = err as ApiError;
      setError(error.response?.data?.error || 'Failed to analyze treatment');
      console.error('Treatment analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTreatmentComplexityColor = (complexity: string): string => {
    switch (complexity?.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              AI Treatment Planner
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get comprehensive treatment plans with cost analysis, hospital recommendations, and specialist doctors
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Treatment or Procedure
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., Knee replacement, Heart surgery, Dental implant"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State or Pincode"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Insurance Provider
                </label>
                <select
                  value={insuranceType}
                  onChange={(e) => setInsuranceType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {insuranceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center mx-auto min-w-[200px]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Get Treatment Plan
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Treatment Data Display */}
        {treatmentData && (
          <>
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex overflow-x-auto">
                  {[
                    { id: 'overview', label: 'Overview', icon: Info },
                    { id: 'costs', label: 'Cost Analysis', icon: DollarSign },
                    { id: 'hospitals', label: 'Hospitals', icon: MapPin },
                    { id: 'doctors', label: 'Doctors', icon: Award },
                    { id: 'recommendations', label: 'AI Recommendations', icon: CheckCircle }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="h-4 w-4 mr-2" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Treatment Overview</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Treatment Details</h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Treatment Name</p>
                            <p className="font-medium text-lg">{treatmentData.treatment.name}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Description</p>
                            <p className="text-gray-800 leading-relaxed">{treatmentData.treatment.details.description}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Duration</p>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="font-medium">{treatmentData.treatment.details.duration}</span>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Complexity</p>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTreatmentComplexityColor(treatmentData.treatment.details.complexity)}`}>
                                {treatmentData.treatment.details.complexity}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Cost Summary</h3>
                        <div className="bg-gray-50 rounded-lg p-6">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Minimum Cost:</span>
                              <span className="font-bold text-lg text-green-600">
                                {formatCurrency(treatmentData.costs.priceRange.min)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Maximum Cost:</span>
                              <span className="font-bold text-lg text-red-600">
                                {formatCurrency(treatmentData.costs.priceRange.max)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center border-t pt-3">
                              <span className="text-gray-600">Average Cost:</span>
                              <span className="font-bold text-xl text-blue-600">
                                {formatCurrency((treatmentData.costs.priceRange.min + treatmentData.costs.priceRange.max) / 2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'costs' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Cost Analysis</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {treatmentData.costs.sources.map((cost: TreatmentCostSource, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">{cost.source}</h3>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Price Range:</span>
                              <span className="font-medium">{formatCurrency(cost.priceRange.min)} - {formatCurrency(cost.priceRange.max)}</span>
                            </div>
                            
                            {cost.description && (
                              <div>
                                <p className="text-gray-600 text-sm mb-2">Description:</p>
                                <p className="text-sm text-gray-700">{cost.description}</p>
                              </div>
                            )}
                            
                            <div className="border-t pt-3">
                              <div className="flex justify-between font-bold">
                                <span>Hospital Type:</span>
                                <span className="text-blue-600">{cost.hospitalType || 'All Types'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'hospitals' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Recommended Hospitals</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {treatmentData.hospitals.map((hospital: Hospital) => (
                        <div key={hospital.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{hospital.name}</h3>
                              <div className="flex items-center mt-1">
                                <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                                <p className="text-gray-600 text-sm">{hospital.address}</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-500 mr-1" />
                              <span className="font-bold">{hospital.rating}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                              <p className="text-gray-600">Distance:</p>
                              <p className="font-medium">{hospital.distance}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Specialties:</p>
                              <p className="font-medium">{hospital.specialties.slice(0, 2).join(', ')}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Cost Range:</p>
                              <p className="font-medium text-green-600">
                                {formatCurrency(hospital.costRange.min)} - {formatCurrency(hospital.costRange.max)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Contact:</p>
                              <div className="flex items-center">
                                <Phone className="h-3 w-3 text-gray-400 mr-1" />
                                <p className="text-xs">{hospital.contact.phone}</p>
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Facilities & Insurance</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600 mb-1">Facilities:</p>
                                <p>{hospital.facilities.join(', ')}</p>
                              </div>
                              <div>
                                <p className="text-gray-600 mb-1">Insurance Accepted:</p>
                                <p>{hospital.insuranceAccepted.join(', ')}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'doctors' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Specialist Doctors</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {treatmentData.doctors.map((doctor: Doctor, index: number) => (
                        <div key={doctor.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                          <div className="flex items-start space-x-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                              <Award className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900">{doctor.name}</h3>
                              <p className="text-blue-600 font-medium">{doctor.qualification}</p>
                              <p className="text-gray-600">{doctor.specialization}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center">
                                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                <span className="font-bold">{doctor.rating}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                              <p className="text-gray-600">Experience:</p>
                              <p className="font-medium">{doctor.experience}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Hospital:</p>
                              <p className="font-medium">{doctor.hospital}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Consultation Fee:</p>
                              <p className="font-medium text-green-600">{formatCurrency(doctor.consultationFee)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Languages:</p>
                              <p className="font-medium">{doctor.languages.join(', ')}</p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-gray-600 text-sm mb-1">Availability:</p>
                            <div className="space-y-1">
                              {doctor.availability.map((slot: string, idx: number) => (
                                <p key={idx} className="text-sm font-medium text-gray-700">{slot}</p>
                              ))}
                            </div>
                          </div>

                          {doctor.awards && doctor.awards.length > 0 && (
                            <div className="border-t pt-4">
                              <p className="text-gray-600 text-sm mb-2">Awards & Recognition:</p>
                              <div className="flex flex-wrap gap-1">
                                {doctor.awards.map((award: string, idx: number) => (
                                  <span key={idx} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                    {award}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'recommendations' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">AI-Powered Recommendations</h2>
                    
                    <div className="prose max-w-none mb-8">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-blue-900 mb-3">Personalized Analysis</h3>
                        <div className="text-blue-800 whitespace-pre-line">
                          {treatmentData.recommendations.aiRecommendations}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-green-50 rounded-lg p-6">
                        <h3 className="font-semibold text-green-900 mb-4">Top Hospital Picks</h3>
                        <div className="space-y-3">
                          {treatmentData.recommendations.topHospitalPicks.map((pick, index) => (
                            <div key={index} className="border-l-4 border-green-500 pl-3">
                              <p className="font-medium text-green-900">{pick.name}</p>
                              <p className="text-sm text-green-700">{pick.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-yellow-50 rounded-lg p-6">
                        <h3 className="font-semibold text-yellow-900 mb-4">Budget Options</h3>
                        <div className="space-y-3">
                          {treatmentData.recommendations.budgetOptions.map((option, index) => (
                            <div key={index} className="border-l-4 border-yellow-500 pl-3">
                              <p className="font-medium text-yellow-900">{option.name}</p>
                              <p className="text-sm text-yellow-700">{option.cost}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-6">
                        <h3 className="font-semibold text-purple-900 mb-4">Premium Options</h3>
                        <div className="space-y-3">
                          {treatmentData.recommendations.premiumOptions.map((option, index) => (
                            <div key={index} className="border-l-4 border-purple-500 pl-3">
                              <p className="font-medium text-purple-900">{option.name}</p>
                              <p className="text-sm text-purple-700">{option.cost}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TreatmentPlanner;
