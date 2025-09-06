import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, ArrowRight, Navigation, Loader, Phone, Calendar } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import api from '../services/api';

interface Treatment {
  _id: string;
  name: string;
  department: string;
  category: string;
  description: string;
  procedures: Array<{
    name: string;
    description: string;
    duration: string;
    complexity: string;
    isMinimallyInvasive: boolean;
  }>;
  pricing: {
    minPrice: number;
    maxPrice: number;
    currency: string;
    factors: string[];
  };
  duration: {
    procedure: string;
    hospital: string;
    recovery: string;
  };
  successRate: number;
  risks: string[];
  symptoms: string[];
}

interface Hospital {
  _id: string;
  name: string;
  location: {
    city: string;
    state: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  rating: {
    value: number;
    total_reviews: number;
  };
  distance: number;
  type: string;
  specialty?: string;
}

interface Doctor {
  _id: string;
  name: string;
  specialization: string;
  designation?: string;
  experience_years?: number;
  experience?: string;
  rating?: {
    value: number;
    total_reviews: number;
  };
  consultation_fee?: number;
  isVirtual?: boolean;
  hospital?: {
    id: string;
    name: string;
    location: any;
    distance: number;
  };
}

const TreatmentJourney: React.FC = () => {
  const navigate = useNavigate();
  const { 
    userLocation, 
    isLoadingLocation, 
    locationError, 
    getCurrentLocation,
    clearLocationError 
  } = useLocation();
  
  const [step, setStep] = useState<'search' | 'treatment-details' | 'hospitals' | 'doctors'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  
  // Filter-based search states
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('');
  const [treatmentsBySpecialization, setTreatmentsBySpecialization] = useState<Treatment[]>([]);
  const [showSpecializationDropdown, setShowSpecializationDropdown] = useState(false);
  const [showTreatmentDropdown, setShowTreatmentDropdown] = useState(false);

  // Request location when component mounts
  useEffect(() => {
    const requestLocation = async () => {
      if (!userLocation && !isLoadingLocation) {
        setShowLocationPrompt(true);
      }
    };
    requestLocation();
    
    // Fetch specializations on component mount
    fetchSpecializations();
  }, [userLocation, isLoadingLocation]);

  // Fetch all specializations
  const fetchSpecializations = async () => {
    try {
      const response = await api.get('/treatments/specializations');
      setSpecializations(response.data.specializations);
    } catch (error) {
      console.error('Error fetching specializations:', error);
    }
  };

  // Fetch treatments by specialization
  const fetchTreatmentsBySpecialization = async (specialization: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/treatments/by-specialization/${encodeURIComponent(specialization)}`);
      setTreatmentsBySpecialization(response.data.treatments);
    } catch (error) {
      console.error('Error fetching treatments by specialization:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle specialization selection
  const handleSpecializationSelect = (specialization: string) => {
    setSelectedSpecialization(specialization);
    setShowSpecializationDropdown(false);
    setSelectedTreatment(null);
    setTreatmentsBySpecialization([]);
    fetchTreatmentsBySpecialization(specialization);
  };

  // Handle treatment selection
  const handleTreatmentSelect = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setShowTreatmentDropdown(false);
    setStep('treatment-details');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowSpecializationDropdown(false);
        setShowTreatmentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle location permission request
  const handleLocationRequest = async () => {
    try {
      clearLocationError();
      setShowLocationPrompt(false);
      await getCurrentLocation();
    } catch (error) {
      console.error('Failed to get location:', error);
      // Continue without location - will use fallback
    }
  };

  // Search for treatments
  const handleTreatmentSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await api.get('/treatments', {
        params: { search: searchQuery, limit: 1 }
      });
      
      if (response.data.treatments && response.data.treatments.length > 0) {
        setSelectedTreatment(response.data.treatments[0]);
        setStep('treatment-details');
      } else {
        alert('No treatment found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Error searching treatments:', error);
      alert('Error searching for treatments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Find hospitals for the selected treatment
  const findHospitals = async () => {
    if (!selectedTreatment) {
      alert('Please select a treatment first.');
      return;
    }
    
    // Use user location if available, otherwise use Delhi as fallback
    const location = userLocation || { lat: 28.6139, lng: 77.2090 };
    const locationSource = userLocation ? '📍 your actual location' : '🏢 Delhi (default)';
    
    console.log('🔍 Hospital Search Debug:', {
      userLocationExists: !!userLocation,
      searchLocation: location,
      locationSource,
      treatment: selectedTreatment.name,
      specialty: selectedTreatment.category
    });
    
    setLoading(true);
    try {
      // Search for hospitals that can handle this treatment
      const response = await api.get('/hospitals/nearby', {
        params: {
          lat: location.lat,
          lng: location.lng,
          specialty: selectedTreatment.category,
          radius: 20, // 20km radius
          limit: 10
        }
      });
      
      console.log('Hospital search response:', response.data);
      
      if (response.data.hospitals && response.data.hospitals.length > 0) {
        setHospitals(response.data.hospitals);
        setStep('hospitals');
        
        // Show info about location used
        if (!userLocation) {
          alert(`Found ${response.data.hospitals.length} hospitals near Delhi. For better results, please enable location access.`);
        }
      } else {
        alert(`No hospitals found for ${selectedTreatment.category} treatment near ${locationSource}. Showing all nearby hospitals.`);
        // Try without specialty filter
        const fallbackResponse = await api.get('/hospitals', {
          params: { limit: 10 }
        });
        setHospitals(fallbackResponse.data.hospitals || []);
        setStep('hospitals');
      }
    } catch (error) {
      console.error('Error finding hospitals:', error);
      alert('Error finding hospitals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get doctors for selected hospital and treatment
  const selectHospital = async (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setLoading(true);
    
    try {
      // Get doctors from the selected hospital with the required specialty
      const response = await api.get(`/doctors/hospital/${hospital._id}`, {
        params: {
          specialty: selectedTreatment?.category
        }
      });
      
      console.log('Doctor search response:', response.data);
      setDoctors(response.data.doctors || []);
      setStep('doctors');
    } catch (error) {
      console.error('Error fetching doctors:', error);
      // Continue with empty doctors list
      setDoctors([]);
      setStep('doctors');
    } finally {
      setLoading(false);
    }
  };

  // Search hospitals by name
  const searchHospitalsByName = async () => {
    if (!hospitalSearchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await api.get('/hospitals', {
        params: {
          search: hospitalSearchQuery,
          specialty: selectedTreatment?.category,
          limit: 20
        }
      });
      
      console.log('Hospital name search response:', response.data);
      setHospitals(response.data.hospitals || []);
    } catch (error) {
      console.error('Error searching hospitals by name:', error);
      alert('Error searching hospitals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Search hospitals by city
  const searchHospitalsByCity = async (city: string) => {
    setSelectedCity(city);
    setLoading(true);
    
    try {
      const response = await api.get('/hospitals', {
        params: {
          city: city,
          specialty: selectedTreatment?.category,
          limit: 20
        }
      });
      
      console.log(`Hospital search for ${city}:`, response.data);
      setHospitals(response.data.hospitals || []);
    } catch (error) {
      console.error(`Error searching hospitals in ${city}:`, error);
      alert(`Error finding hospitals in ${city}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const renderSearchStep = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Start Your Treatment Journey
        </h1>
        <p className="text-gray-600">
          Search for medical treatments and find the best hospitals and doctors near you
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          {/* Step 1: Select Specialization */}
          <div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-2 block">
                Step 1: Choose Medical Specialization
              </span>
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowSpecializationDropdown(!showSpecializationDropdown)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center justify-between"
                >
                  <span className={selectedSpecialization ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedSpecialization || 'Select a medical specialization...'}
                  </span>
                  <ArrowRight className={`h-5 w-5 text-gray-400 transform transition-transform ${showSpecializationDropdown ? 'rotate-90' : ''}`} />
                </button>
                
                {showSpecializationDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                    {specializations.map((specialization) => (
                      <button
                        key={specialization}
                        onClick={() => handleSpecializationSelect(specialization)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {specialization}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Step 2: Select Treatment (only show if specialization is selected) */}
          {selectedSpecialization && (
            <div>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-2 block">
                  Step 2: Choose Treatment Type
                </span>
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setShowTreatmentDropdown(!showTreatmentDropdown)}
                    disabled={loading || treatmentsBySpecialization.length === 0}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center justify-between disabled:opacity-50"
                  >
                    <span className={selectedTreatment ? 'text-gray-900' : 'text-gray-500'}>
                      {loading ? 'Loading treatments...' : 
                       selectedTreatment ? selectedTreatment.name :
                       treatmentsBySpecialization.length === 0 ? 'No treatments available' :
                       'Select a treatment...'}
                    </span>
                    {loading ? (
                      <Loader className="h-5 w-5 text-gray-400 animate-spin" />
                    ) : (
                      <ArrowRight className={`h-5 w-5 text-gray-400 transform transition-transform ${showTreatmentDropdown ? 'rotate-90' : ''}`} />
                    )}
                  </button>
                  
                  {showTreatmentDropdown && treatmentsBySpecialization.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                      {treatmentsBySpecialization.map((treatment) => (
                        <button
                          key={treatment._id}
                          onClick={() => handleTreatmentSelect(treatment)}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div>
                            <div className="font-medium">{treatment.name}</div>
                            <div className="text-sm text-gray-500 truncate">
                              {treatment.description}
                            </div>
                            <div className="text-sm text-blue-600 mt-1">
                              ₹{treatment.pricing?.minPrice?.toLocaleString()} - ₹{treatment.pricing?.maxPrice?.toLocaleString()}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* Progress indicator */}
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedSpecialization ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {selectedSpecialization ? '✓' : '1'}
            </div>
            <div className={`h-1 w-8 ${selectedSpecialization ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedTreatment ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {selectedTreatment ? '✓' : '2'}
            </div>
            <span className="ml-2">
              {!selectedSpecialization ? 'Select specialization' :
               !selectedTreatment ? 'Select treatment' :
               'Ready to find hospitals'}
            </span>
          </div>

          {/* Legacy search option */}
          <div className="border-t pt-6">
            <div className="text-center mb-4">
              <span className="text-sm text-gray-500 bg-white px-3">Or search directly</span>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., heart surgery, knee replacement, cataract surgery"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleTreatmentSearch()}
                />
                <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
              </div>

              <button
                onClick={handleTreatmentSearch}
                disabled={loading || !searchQuery.trim()}
                className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span>{loading ? 'Searching...' : 'Search Treatment'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTreatmentDetails = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Treatment Details</h1>
        <button
          onClick={() => setStep('search')}
          className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
        >
          <span>← Back to search</span>
        </button>
      </div>

      {selectedTreatment && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {selectedTreatment.name}
            </h2>
            <p className="text-sm text-gray-500 mb-2">
              Category: {selectedTreatment.category}
            </p>
            <p className="text-gray-600">{selectedTreatment.description}</p>
          </div>

          {selectedTreatment.procedures && selectedTreatment.procedures.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Available Procedures:</h3>
              <ul className="space-y-2">
                {selectedTreatment.procedures.map((procedure, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-600">•</span>
                    <div>
                      <span className="font-medium">{procedure.name}</span>
                      <span className="text-gray-500"> ({procedure.duration})</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div className="text-center">
              <div className="font-medium text-gray-900">Procedure Duration</div>
              <div className="text-gray-600">{selectedTreatment.duration?.procedure || '2-8 hours'}</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">Hospital Stay</div>
              <div className="text-gray-600">{selectedTreatment.duration?.hospital || '5-10 days'}</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">Recovery Time</div>
              <div className="text-gray-600">{selectedTreatment.duration?.recovery || '6-12 weeks'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
              <div className="font-medium text-gray-900">Success Rate</div>
              <div className="text-gray-600">{selectedTreatment.successRate || 95}%</div>
            </div>
            <div>
              <div className="font-medium text-gray-900">Cost Range</div>
              <div className="text-gray-600">
                {selectedTreatment.pricing?.currency || 'INR'} {selectedTreatment.pricing?.minPrice?.toLocaleString() || '200,000'} - {selectedTreatment.pricing?.maxPrice?.toLocaleString() || '2,000,000'}
              </div>
            </div>
          </div>

          <button
            onClick={findHospitals}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Finding Hospitals...</span>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                <span>Find Hospitals Near You</span>
              </>
            )}
          </button>
          
          {/* Location Update Button */}
          {!userLocation && (
            <button
              onClick={handleLocationRequest}
              disabled={isLoadingLocation}
              className="w-full mt-3 bg-blue-100 text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-200 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isLoadingLocation ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              <span>
                {isLoadingLocation ? 'Getting Location...' : 'Enable Location for Better Results'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderHospitals = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Hospitals for {selectedTreatment?.name}
        </h1>
        <button
          onClick={() => setStep('treatment-details')}
          className="text-green-600 hover:text-green-700"
        >
          ← Back to treatment
        </button>
      </div>

      {/* Search and City Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        {/* Hospital Search Bar */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Search Hospitals by Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={hospitalSearchQuery}
              onChange={(e) => setHospitalSearchQuery(e.target.value)}
              placeholder="e.g., Apollo, Fortis, Max Healthcare"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && searchHospitalsByName()}
            />
            <button
              onClick={searchHospitalsByName}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* City Quick Actions */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Search by City
          </label>
          <div className="flex flex-wrap gap-2">
            {['Mumbai', 'Chennai', 'Delhi', 'Bangalore', 'Hyderabad'].map((city) => (
              <button
                key={city}
                onClick={() => searchHospitalsByCity(city)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCity === city
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Find Nearby Button */}
        <div className="text-center border-t pt-4">
          <button
            onClick={findHospitals}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <MapPin className="h-5 w-5 mr-2" />
            Find Hospitals Near Me (20km)
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {hospitals.map((hospital) => (
          <div
            key={hospital._id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => selectHospital(hospital)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {hospital.name}
                  </h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {hospital.type}
                  </span>
                </div>
                
                <div className="flex items-center text-gray-600 mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    {hospital.location.address}
                  </span>
                  {hospital.distance && (
                    <span className="ml-2 text-green-600 font-medium">
                      • {hospital.distance} km away
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {hospital.rating && (
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span>{hospital.rating.value}/5</span>
                      <span className="ml-1">({hospital.rating.total_reviews} reviews)</span>
                    </div>
                  )}
                  <Phone className="h-4 w-4" />
                </div>
              </div>
              
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDoctors = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Doctors at {selectedHospital?.name}
          </h1>
          <p className="text-gray-600">Specializing in {selectedTreatment?.category}</p>
        </div>
        <button
          onClick={() => setStep('hospitals')}
          className="text-green-600 hover:text-green-700"
        >
          ← Back to hospitals
        </button>
      </div>

      {doctors.length > 0 ? (
        <div className="space-y-4">
          {doctors.map((doctor) => (
            <div 
              key={doctor._id} 
              className={`bg-white rounded-lg shadow-md p-6 ${
                doctor.isVirtual ? 'border-2 border-blue-500 bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {doctor.name}
                    </h3>
                    {doctor.isVirtual && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                        🔄 Virtual Consultation
                      </span>
                    )}
                  </div>
                  <p className="text-blue-600 font-medium mb-2">
                    {doctor.specialization}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                    {doctor.isVirtual ? (
                      <span>Available 24/7 • Video Call Consultation</span>
                    ) : (
                      <>
                        <span>{doctor.designation}</span>
                        <span>• {doctor.experience_years} years experience</span>
                      </>
                    )}
                  </div>
                  
                  {/* Rating and fees */}
                  {doctor.rating && (
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 mr-1 fill-current" />
                        <span>{doctor.rating.value}/5</span>
                        <span className="ml-1">({doctor.rating.total_reviews} reviews)</span>
                      </div>
                      {doctor.consultation_fee && (
                        <span className="text-green-600 font-medium">
                          ₹{doctor.consultation_fee} consultation fee
                        </span>
                      )}
                    </div>
                  )}
                  
                  <button
                    onClick={() => navigate('/book-consultation', {
                      state: {
                        doctor,
                        hospital: selectedHospital,
                        treatment: selectedTreatment
                      }
                    })}
                    className={`px-6 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2 transition-colors ${
                      doctor.isVirtual
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>
                      {doctor.isVirtual ? 'Book Virtual Consultation' : 'Book Appointment'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            No doctors found for this specialization at this hospital.
          </p>
          <p className="text-gray-400 text-sm">
            Please try selecting a different hospital.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Location Permission Modal */}
      {showLocationPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <Navigation className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold">Enable Location Access</h3>
            </div>
            <p className="text-gray-600 mb-6">
              To find the best hospitals near you, we need access to your location. 
              This helps us show nearby healthcare facilities and accurate travel times.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleLocationRequest}
                disabled={isLoadingLocation}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {isLoadingLocation ? (
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MapPin className="h-4 w-4 mr-2" />
                )}
                {isLoadingLocation ? 'Getting Location...' : 'Enable Location'}
              </button>
              <button
                onClick={() => setShowLocationPrompt(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Continue Without
              </button>
            </div>
            {locationError && (
              <p className="text-red-600 text-sm mt-3">{locationError}</p>
            )}
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {step === 'search' && renderSearchStep()}
          {step === 'treatment-details' && renderTreatmentDetails()}
          {step === 'hospitals' && renderHospitals()}
          {step === 'doctors' && renderDoctors()}
        </div>
      </div>
    </>
  );
};

export default TreatmentJourney;
