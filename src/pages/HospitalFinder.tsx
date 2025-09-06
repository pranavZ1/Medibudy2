import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Search, Phone, Navigation, Star, Building2, Heart, Users, Award, AlertCircle, Loader2, X, Mail, Globe, Shield, Bed, Clock, ArrowLeft, ChevronRight } from 'lucide-react';
import { locationAPI, hospitalAPI } from '../services/api';

interface Hospital {
  _id: string;
  name: string;
  type?: string; // Make type optional
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  contact: {
    phone?: string[];
    email?: string;
    website?: string;
  };
  specialties?: Array<{
    name: string;
    description?: string;
  }>;
  ratings?: {
    overall: number;
    totalReviews?: number;
  };
  description?: string;
  distance?: number;
}

interface DetailedHospital {
  _id: string;
  name: string;
  description?: string;
  type?: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  contact: {
    phone?: string[];
    email?: string;
    website?: string;
    emergencyNumber?: string;
  };
  specialties?: Array<{
    name: string;
    description?: string;
    certifications?: string[];
  }>;
  ratings?: {
    overall: number;
    cleanliness?: number;
    staff?: number;
    facilities?: number;
    treatment?: number;
    totalReviews?: number;
  };
  facilities?: {
    bedCount?: number;
    icuBeds?: number;
    emergencyServices?: boolean;
    ambulanceServices?: boolean;
    pharmacy?: boolean;
    laboratory?: boolean;
    bloodBank?: boolean;
    imaging?: {
      xray?: boolean;
      mri?: boolean;
      ct?: boolean;
      ultrasound?: boolean;
      mammography?: boolean;
    };
    otherFacilities?: string[];
  };
  departments?: Array<{
    name: string;
    head?: string;
    specialists?: number;
    equipments?: string[];
  }>;
  doctors: Doctor[];
  accreditations?: Array<{
    name: string;
    issuedBy?: string;
    validUntil?: string;
    certificateNumber?: string;
  }>;
  established_year?: number;
  bed_count?: number;
  image_url?: string;
}

interface Doctor {
  _id: string;
  name: string;
  specialization: string;
  designation?: string;
  experience_years?: number;
  experience_text?: string;
  rating?: {
    value: number;
    total_reviews: number;
  };
  location?: {
    city: string;
    state: string;
  };
  contact?: {
    phone?: string[];
    email?: string;
  };
  education?: Array<{
    degree: string;
    institution: string;
    year?: number;
  }>;
  image_url?: string;
  bio?: string;
  availableSlots?: Array<{
    day: string;
    slots: Array<{
      time: string;
      available: boolean;
    }>;
  }>;
}

interface UserLocation {
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  address: string;
}

const HospitalFinder: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // Detailed hospital view state
  const [selectedHospital, setSelectedHospital] = useState<DetailedHospital | null>(null);
  const [hospitalDetailsLoading, setHospitalDetailsLoading] = useState(false);
  const [showHospitalDetails, setShowHospitalDetails] = useState(false);
  
  // Doctor details modal state
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showDoctorDetails, setShowDoctorDetails] = useState(false);
  const [doctorDetailsLoading, setDoctorDetailsLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  // Search state
  const [searchLocation, setSearchLocation] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedRating, setSelectedRating] = useState('');
  const [searchRadius, setSearchRadius] = useState(10);

  // Filter options
  const specialties = [
    'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Oncology',
    'Emergency Medicine', 'Surgery', 'Internal Medicine', 'Radiology', 'Pathology'
  ];

  const ratingOptions = [
    { value: '', label: 'Any Rating' },
    { value: '3', label: '3+ Stars' },
    { value: '4', label: '4+ Stars' },
    { value: '4.5', label: '4.5+ Stars' }
  ];

  // Helper function to get region for major cities
  const getCityRegion = (city: string) => {
    const cityRegions: { [key: string]: string } = {
      'Bengaluru': 'Karnataka',
      'Delhi': 'Delhi',
      'Mumbai': 'Maharashtra',
      'Chennai': 'Tamil Nadu',
      'Hyderabad': 'Telangana',
      'Pune': 'Maharashtra'
    };
    return cityRegions[city] || 'India';
  };

  // Get user's location with multiple fallback methods
  const detectUserLocation = useCallback(async () => {
    setLocationLoading(true);
    setError('');
    
    console.log('🔍 Starting location detection...');
    
    try {
      // Method 1: Try browser's native geolocation API first (most accurate)
      if (navigator.geolocation) {
        console.log('🔍 Trying browser geolocation...');
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 minutes
            });
          });

          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          console.log('✅ Browser geolocation success:', { lat, lng });

          // Use reverse geocoding to get city name
          try {
            const response = await locationAPI.reverseGeocode(lat, lng);
            const locationData = response.data;
            
            const userLoc: UserLocation = {
              city: locationData.city || 'Unknown City',
              region: locationData.state || locationData.region || 'Unknown Region',
              country: locationData.country || 'Unknown Country',
              lat: lat,
              lng: lng,
              address: locationData.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
            };
            
            console.log('✅ Reverse geocoding success:', userLoc);
            
            setUserLocation(userLoc);
            setCurrentCoords({ lat, lng });
            setSearchLocation(locationData.city || 'Current Location');
            
            // Fetch nearby hospitals
            await fetchHospitalsForLocation(lat, lng);
            return; // Success with geolocation
          } catch (reverseGeoError) {
            console.warn('⚠️ Reverse geocoding failed, using current location:', reverseGeoError);
            
            // Fallback: use a friendly name instead of coordinates
            const userLoc: UserLocation = {
              city: 'Current Location',
              region: '',
              country: '',
              lat: lat,
              lng: lng,
              address: 'Current Location (GPS)'
            };
            
            setUserLocation(userLoc);
            setCurrentCoords({ lat, lng });
            setSearchLocation('Current Location');
            
            // Fetch nearby hospitals
            await fetchHospitalsForLocation(lat, lng);
            return; // Success with coordinates only
          }
        } catch (geoError: any) {
          console.warn('⚠️ Browser geolocation failed:', geoError.message);
          // Continue to fallback methods
        }
      } else {
        console.warn('⚠️ Browser geolocation not available');
      }

      // Method 2: Use a default location for demo purposes
      console.log('🔍 Using default location (Bangalore) for demo...');
      
      const defaultLocation = {
        city: 'Bengaluru',
        region: 'Karnataka',
        country: 'India',
        lat: 12.9716,
        lng: 77.5946,
        address: 'Bengaluru, Karnataka, India'
      };
      
      const userLoc: UserLocation = defaultLocation;
      
      console.log('✅ Default location set:', userLoc);
      
      setUserLocation(userLoc);
      setCurrentCoords({ lat: userLoc.lat, lng: userLoc.lng });
      setSearchLocation(userLoc.city);
      
      // Fetch nearby hospitals
      await fetchHospitalsForLocation(userLoc.lat, userLoc.lng);
      
    } catch (error: any) {
      console.error('❌ All location detection methods failed:', error);
      setError('Unable to detect location. Please search manually.');
      
      // Set empty state
      setSearchLocation('');
      setCurrentCoords(null);
      setUserLocation(null);
    } finally {
      setLocationLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch hospitals for given coordinates
  const fetchHospitalsForLocation = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      console.log('🏥 Fetching hospitals for coordinates:', lat, lng, 'radius:', searchRadius, 'specialty:', selectedSpecialty);
      
      const response = await locationAPI.getNearbyHospitals(
        lat, 
        lng, 
        searchRadius, 
        selectedSpecialty || undefined, 
        20 // limit
      );

      console.log('🏥 API Response:', response.data);

      // The API returns hospitals directly, not wrapped in a success object
      if (response.data.hospitals && Array.isArray(response.data.hospitals)) {
        // Filter by rating on the frontend if specified
        let filteredHospitals = response.data.hospitals;
        if (selectedRating) {
          const minRating = parseFloat(selectedRating);
          filteredHospitals = filteredHospitals.filter((hospital: Hospital) => 
            hospital.ratings && hospital.ratings.overall >= minRating
          );
        }
        console.log('🏥 Filtered hospitals:', filteredHospitals.length);
        setHospitals(filteredHospitals);
        setError(''); // Clear any previous errors
      } else {
        setHospitals([]);
        setError('No hospitals found in this area');
      }
    } catch (error: any) {
      console.error('Error fetching hospitals:', error);
      setError('Failed to fetch hospitals. Please try again.');
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  }, [searchRadius, selectedSpecialty, selectedRating]);

  // Geocode city name to coordinates
  const geocodeLocation = async (cityName: string) => {
    try {
      const response = await locationAPI.geocode(cityName);
      const { latitude, longitude } = response.data.coordinates;
      return { lat: latitude, lng: longitude };
    } catch (error) {
      throw new Error('Unable to find location');
    }
  };

  // Handle search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!searchLocation.trim()) {
      setError('Please enter a location');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let coords = currentCoords;
      
      // If user entered a different location, geocode it
      if (searchLocation.toLowerCase().trim() !== userLocation?.city.toLowerCase().trim()) {
        coords = await geocodeLocation(searchLocation);
        setCurrentCoords(coords);
        
        // Update the user location display to show the searched location
        const searchedLocation: UserLocation = {
          city: searchLocation,
          region: getCityRegion(searchLocation) !== 'India' ? getCityRegion(searchLocation) : '',
          country: 'India',
          lat: coords.lat,
          lng: coords.lng,
          address: `${searchLocation}, India`
        };
        
        setUserLocation(searchedLocation);
      }

      if (coords) {
        await fetchHospitalsForLocation(coords.lat, coords.lng);
      } else {
        throw new Error('Unable to determine location coordinates');
      }
    } catch (error: any) {
      setError(error.message || 'Search failed. Please try again.');
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-detect location on component mount
  useEffect(() => {
    detectUserLocation();
  }, [detectUserLocation]);

  // Re-search when filters change
  useEffect(() => {
    if (currentCoords) {
      fetchHospitalsForLocation(currentCoords.lat, currentCoords.lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpecialty, searchRadius, selectedRating]);

  // Fetch detailed hospital information
  const fetchHospitalDetails = async (hospitalId: string) => {
    setHospitalDetailsLoading(true);
    try {
      console.log('🏥 Fetching detailed hospital info for:', hospitalId);
      
      const response = await hospitalAPI.getHospitalDetails(hospitalId);
      
      console.log('🏥 Hospital details response:', response.data);
      console.log('🏥 Hospital doctors:', response.data.hospital?.doctors);
      
      if (response.data.hospital) {
        setSelectedHospital(response.data.hospital);
        setShowHospitalDetails(true);
      } else {
        setError('Unable to load hospital details');
      }
    } catch (error: any) {
      console.error('Error fetching hospital details:', error);
      setError('Failed to load hospital details. Please try again.');
    } finally {
      setHospitalDetailsLoading(false);
    }
  };

  // Handle hospital card click
  const handleHospitalClick = (hospital: Hospital) => {
    fetchHospitalDetails(hospital._id);
  };

  // Close hospital details view
  const closeHospitalDetails = () => {
    setShowHospitalDetails(false);
    setSelectedHospital(null);
    setShowFullDescription(false);
  };

  // Fetch detailed doctor information
  const fetchDoctorDetails = async (doctorId: string) => {
    setDoctorDetailsLoading(true);
    try {
      console.log('🔍 Fetching doctor details for ID:', doctorId);
      
      const response = await hospitalAPI.getDoctorDetails(doctorId);
      
      console.log('👨‍⚕️ Doctor details response:', response.data);
      
      if (response.data.doctor) {
        setSelectedDoctor(response.data.doctor);
        setShowDoctorDetails(true);
      } else {
        setError('Unable to load doctor details');
      }
    } catch (error) {
      console.error('Error fetching doctor details:', error);
      setError('Failed to load doctor details. Please try again.');
    } finally {
      setDoctorDetailsLoading(false);
    }
  };

  // Open doctor details modal
  const openDoctorDetails = (doctor: any) => {
    if (doctor._id) {
      fetchDoctorDetails(doctor._id);
    } else {
      // If no ID, show basic info
      setSelectedDoctor(doctor);
      setShowDoctorDetails(true);
    }
  };

  // Close doctor details modal
  const closeDoctorDetails = () => {
    setShowDoctorDetails(false);
    setSelectedDoctor(null);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        style={{
          height: '16px',
          width: '16px',
          color: i < Math.floor(rating) ? '#fbbf24' : '#d1d5db',
          fill: i < Math.floor(rating) ? '#fbbf24' : 'transparent'
        }}
      />
    ));
  };

  const formatDistance = (distance: number) => {
    return distance < 1 
      ? `${Math.round(distance * 1000)}m` 
      : `${distance.toFixed(1)}km`;
  };

  const openDirections = (hospital: Hospital) => {
    const { lat, lng } = hospital.location.coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const getHospitalTypeIcon = (type: string | undefined) => {
    if (!type) return <Building2 style={{ height: '20px', width: '20px', color: '#4b5563' }} />;
    
    switch (type.toLowerCase()) {
      case 'government': return <Building2 style={{ height: '20px', width: '20px', color: '#2563eb' }} />;
      case 'private': return <Heart style={{ height: '20px', width: '20px', color: '#dc2626' }} />;
      case 'trust': return <Users style={{ height: '20px', width: '20px', color: '#059669' }} />;
      case 'charitable': return <Award style={{ height: '20px', width: '20px', color: '#7c3aed' }} />;
      default: return <Building2 style={{ height: '20px', width: '20px', color: '#4b5563' }} />;
    }
  };

  const getHospitalTypeColor = (type: string | undefined) => {
    if (!type) return { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' };
    
    switch (type.toLowerCase()) {
      case 'government': return { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' };
      case 'private': return { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' };
      case 'trust': return { backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' };
      case 'charitable': return { backgroundColor: '#e9d5ff', color: '#581c87', borderColor: '#c4b5fd' };
      default: return { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' };
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
          Hospital Finder
        </h1>
        <p style={{ color: '#6b7280', maxWidth: '600px', margin: '0 auto', fontSize: '16px' }}>
          Find hospitals and medical facilities near you with detailed information about services and ratings.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle style={{ height: '20px', width: '20px', color: '#dc2626' }} />
            <span style={{ color: '#991b1b' }}>{error}</span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {/* Location Search */}
            <div style={{ position: 'relative' }}>
              <MapPin style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', height: '20px', width: '20px', color: '#6b7280' }} />
              <input
                type="text"
                placeholder="Enter location (city, area, pincode)"
                style={{ 
                  width: '100%', 
                  paddingLeft: '44px', 
                  paddingRight: '16px', 
                  paddingTop: '12px', 
                  paddingBottom: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px', 
                  outline: 'none',
                  fontSize: '14px'
                }}
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              />
            </div>

            {/* Specialty Filter */}
            <div>
              <select
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px', 
                  outline: 'none',
                  backgroundColor: 'white',
                  fontSize: '14px'
                }}
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                <option value="">All Specializations</option>
                {specialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <select
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px', 
                  outline: 'none',
                  backgroundColor: 'white',
                  fontSize: '14px'
                }}
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
              >
                {ratingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <button
              type="submit"
              disabled={loading || locationLoading}
              style={{ 
                backgroundColor: loading || locationLoading ? '#9ca3af' : '#3b82f6', 
                color: 'white', 
                padding: '12px 24px', 
                borderRadius: '8px', 
                border: 'none', 
                cursor: loading || locationLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading || locationLoading ? (
                <Loader2 style={{ height: '16px', width: '16px', animation: 'spin 1s linear infinite' }} />
              ) : (
                <Search style={{ height: '16px', width: '16px' }} />
              )}
              {loading || locationLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Radius */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Search Radius: {searchRadius} km
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={searchRadius}
              onChange={(e) => setSearchRadius(Number(e.target.value))}
              style={{ flex: 1, maxWidth: '200px' }}
            />
          </div>

          {/* Quick Location Buttons */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              Quick Search:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Bengaluru', 'Delhi', 'Mumbai', 'Chennai', 'Hyderabad', 'Pune'].map(city => (
                <button
                  key={city}
                  onClick={async () => {
                    setSearchLocation(city);
                    setError('');
                    setLoading(true);
                    
                    try {
                      const coords = await geocodeLocation(city);
                      setCurrentCoords(coords);
                      
                      // Set a proper location object for the clicked city
                      const cityLocation: UserLocation = {
                        city: city,
                        region: getCityRegion(city),
                        country: 'India',
                        lat: coords.lat,
                        lng: coords.lng,
                        address: `${city}, ${getCityRegion(city)}, India`
                      };
                      
                      setUserLocation(cityLocation);
                      await fetchHospitalsForLocation(coords.lat, coords.lng);
                    } catch (error: any) {
                      setError(error.message || 'Search failed. Please try again.');
                      setHospitals([]);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || locationLoading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: loading || locationLoading ? '#f9fafb' : '#f3f4f6',
                    color: loading || locationLoading ? '#9ca3af' : '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: loading || locationLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !locationLoading) {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && !locationLoading) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Results Summary */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          {locationLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 style={{ height: '16px', width: '16px', animation: 'spin 1s linear infinite' }} />
              Detecting your location...
            </span>
          ) : (
            <>Found {hospitals.length} hospitals{userLocation && ` near ${userLocation.city}`}</>
          )}
        </p>
      </div>

      {/* Hospital Results */}
      {hospitals.length > 0 ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {hospitals.map((hospital) => (
            <div
              key={hospital._id}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
              onClick={() => handleHospitalClick(hospital)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {hospital.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {getHospitalTypeIcon(hospital.type)}
                      <span style={{ 
                        fontSize: '12px', 
                        fontWeight: '500', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        border: '1px solid',
                        textTransform: 'capitalize',
                        ...getHospitalTypeColor(hospital.type)
                      }}>
                        {hospital.type || 'Hospital'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                    <MapPin style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                      {hospital.location.address}, {hospital.location.city}
                    </p>
                  </div>

                  {hospital.ratings && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {renderStars(hospital.ratings.overall)}
                      </div>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        {hospital.ratings.overall.toFixed(1)} overall rating
                        {hospital.ratings.totalReviews && ` (${hospital.ratings.totalReviews} reviews)`}
                      </span>
                    </div>
                  )}

                  {hospital.description && (
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                      {hospital.description.substring(0, 150)}
                      {hospital.description.length > 150 && '...'}
                    </p>
                  )}

                  {/* Specialties */}
                  {hospital.specialties && hospital.specialties.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#374151', margin: '0 0 8px 0' }}>
                        Specialties:
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {hospital.specialties.slice(0, 6).map((specialty, index) => (
                          <span
                            key={index}
                            style={{
                              fontSize: '12px',
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb'
                            }}
                          >
                            {specialty.name}
                          </span>
                        ))}
                        {hospital.specialties.length > 6 && (
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            +{hospital.specialties.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  {hospital.distance !== undefined && (
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#059669',
                      backgroundColor: '#f0fdf4',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #bbf7d0'
                    }}>
                      {formatDistance(hospital.distance)}
                    </span>
                  )}
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {hospital.contact.phone && hospital.contact.phone[0] && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:${hospital.contact.phone![0]}`, '_self');
                        }}
                        style={{
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Call Hospital"
                      >
                        <Phone style={{ height: '16px', width: '16px', color: '#374151' }} />
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDirections(hospital);
                      }}
                      style={{
                        backgroundColor: '#3b82f6',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Get Directions"
                    >
                      <Navigation style={{ height: '16px', width: '16px', color: 'white' }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && !locationLoading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Building2 style={{ height: '64px', width: '64px', color: '#9ca3af', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#374151', margin: '0 0 8px 0' }}>
              No hospitals found
            </h3>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Try expanding your search radius or changing the filters.
            </p>
          </div>
        )
      )}

      {/* Loading State */}
      {(loading || locationLoading) && hospitals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 style={{ height: '48px', width: '48px', color: '#3b82f6', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#6b7280', margin: 0 }}>
            {locationLoading ? 'Detecting your location...' : 'Searching for hospitals...'}
          </p>
        </div>
      )}
      
      {/* Hospital Details Modal */}
      {showHospitalDetails && selectedHospital && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          overflow: 'auto',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={closeHospitalDetails}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ArrowLeft style={{ height: '16px', width: '16px' }} />
                  Back
                </button>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {selectedHospital.name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    {getHospitalTypeIcon(selectedHospital.type)}
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      border: '1px solid',
                      textTransform: 'capitalize',
                      ...getHospitalTypeColor(selectedHospital.type)
                    }}>
                      {selectedHospital.type || 'Hospital'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={closeHospitalDetails}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer'
                }}
              >
                <X style={{ height: '24px', width: '24px', color: '#6b7280' }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', maxHeight: '80vh', overflow: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
                {/* Main Content */}
                <div>
                  {/* Hospital Image */}
                  {selectedHospital.image_url && (
                    <div style={{ marginBottom: '24px' }}>
                      <img
                        src={selectedHospital.image_url}
                        alt={selectedHospital.name}
                        style={{
                          width: '100%',
                          maxWidth: '500px',
                          height: '250px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}
                      />
                    </div>
                  )}

                  {/* Description */}
                  {selectedHospital.description && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                        About
                      </h3>
                      <div style={{ 
                        color: '#6b7280', 
                        lineHeight: '1.6',
                        position: 'relative'
                      }}>
                        <p style={{ 
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: showFullDescription ? 'none' : 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: showFullDescription ? 'visible' : 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {selectedHospital.description}
                        </p>
                        {selectedHospital.description.length > 200 && (
                          <button
                            onClick={() => setShowFullDescription(!showFullDescription)}
                            style={{
                              marginTop: '8px',
                              background: 'none',
                              border: 'none',
                              color: '#3b82f6',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              padding: 0
                            }}
                          >
                            {showFullDescription ? 'Show Less' : 'Read More'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Specialties */}
                  {selectedHospital.specialties && selectedHospital.specialties.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                        Specialties
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                        {selectedHospital.specialties.map((specialty, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '12px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          >
                            <div style={{ fontWeight: '500', color: '#374151' }}>{specialty.name}</div>
                            {specialty.description && (
                              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                                {specialty.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Facilities */}
                  {selectedHospital.facilities && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                        Facilities
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                        {selectedHospital.facilities.bedCount && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bed style={{ height: '16px', width: '16px', color: '#3b82f6' }} />
                            <span style={{ fontSize: '14px' }}>{selectedHospital.facilities.bedCount} Beds</span>
                          </div>
                        )}
                        {selectedHospital.facilities.emergencyServices && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle style={{ height: '16px', width: '16px', color: '#ef4444' }} />
                            <span style={{ fontSize: '14px' }}>Emergency Services</span>
                          </div>
                        )}
                        {selectedHospital.facilities.ambulanceServices && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Phone style={{ height: '16px', width: '16px', color: '#10b981' }} />
                            <span style={{ fontSize: '14px' }}>Ambulance</span>
                          </div>
                        )}
                        {selectedHospital.facilities.pharmacy && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shield style={{ height: '16px', width: '16px', color: '#8b5cf6' }} />
                            <span style={{ fontSize: '14px' }}>Pharmacy</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Doctors */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                      Doctors ({selectedHospital.doctors?.length || 0})
                    </h3>
                    
                    {selectedHospital.doctors && selectedHospital.doctors.length > 0 ? (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {selectedHospital.doctors.map((doctor, index) => (
                          <div
                            key={doctor._id || index}
                            onClick={() => openDoctorDetails(doctor)}
                            style={{
                              padding: '16px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              display: 'flex',
                              gap: '16px',
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
                            {/* Doctor Image */}
                            <div style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '50%',
                              backgroundColor: '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '24px',
                              fontWeight: '500',
                              color: '#6b7280',
                              flexShrink: 0,
                              overflow: 'hidden'
                            }}>
                              {(doctor.image_url || (doctor as any).profileImage) ? (
                                <img
                                  src={doctor.image_url || (doctor as any).profileImage}
                                  alt={doctor.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    objectFit: 'cover'
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.parentElement) {
                                      e.currentTarget.parentElement.textContent = doctor.name?.charAt(0).toUpperCase() || 'D';
                                    }
                                  }}
                                />
                              ) : (
                                doctor.name?.charAt(0).toUpperCase() || 'D'
                              )}
                            </div>

                            {/* Doctor Info */}
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                                {doctor.name || 'Unknown Doctor'}
                              </h4>
                              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>
                                {doctor.specialization || 'General Practice'}
                              </p>
                              {doctor.designation && (
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>
                                  {doctor.designation}
                                </p>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {(doctor.experience_years || doctor.experience_text) && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock style={{ height: '14px', width: '14px', color: '#6b7280' }} />
                                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                      {doctor.experience_years ? `${doctor.experience_years} years exp.` : doctor.experience_text}
                                    </span>
                                  </div>
                                )}
                                {doctor.rating && doctor.rating.value > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Star style={{ height: '14px', width: '14px', color: '#fbbf24', fill: '#fbbf24' }} />
                                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                      {doctor.rating.value.toFixed(1)} ({doctor.rating.total_reviews} reviews)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Click indicator */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              color: '#6b7280'
                            }}>
                              <ChevronRight style={{ height: '20px', width: '20px' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        padding: '24px',
                        textAlign: 'center',
                        backgroundColor: '#f9fafb',
                        border: '1px dashed #d1d5db',
                        borderRadius: '8px',
                        color: '#6b7280'
                      }}>
                        <Users style={{ height: '32px', width: '32px', margin: '0 auto 8px', color: '#9ca3af' }} />
                        <p style={{ margin: 0, fontSize: '14px' }}>
                          No doctor information available for this hospital
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div>
                  {/* Contact Info */}
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                      Contact Information
                    </h3>
                    
                    {/* Address */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <MapPin style={{ height: '16px', width: '16px', color: '#6b7280', marginTop: '2px' }} />
                        <div>
                          <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.4' }}>
                            {selectedHospital.location.address}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {selectedHospital.location.city}, {selectedHospital.location.state} {selectedHospital.location.pincode}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phone */}
                    {selectedHospital.contact.phone && selectedHospital.contact.phone.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                          <a
                            href={`tel:${selectedHospital.contact.phone[0]}`}
                            style={{ fontSize: '14px', color: '#3b82f6', textDecoration: 'none' }}
                          >
                            {selectedHospital.contact.phone[0]}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Email */}
                    {selectedHospital.contact.email && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mail style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                          <a
                            href={`mailto:${selectedHospital.contact.email}`}
                            style={{ fontSize: '14px', color: '#3b82f6', textDecoration: 'none' }}
                          >
                            {selectedHospital.contact.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Website */}
                    {selectedHospital.contact.website && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Globe style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                          <a
                            href={selectedHospital.contact.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '14px', color: '#3b82f6', textDecoration: 'none' }}
                          >
                            Visit Website
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Directions Button */}
                    <button
                      onClick={() => openDirections(selectedHospital)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '16px'
                      }}
                    >
                      <Navigation style={{ height: '16px', width: '16px' }} />
                      Get Directions
                    </button>
                  </div>

                  {/* Ratings */}
                  {selectedHospital.ratings && (
                    <div style={{
                      padding: '20px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                        Ratings & Reviews
                      </h3>
                      
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {renderStars(selectedHospital.ratings.overall)}
                          </div>
                          <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                            {selectedHospital.ratings.overall.toFixed(1)}
                          </span>
                        </div>
                        {selectedHospital.ratings.totalReviews && (
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            Based on {selectedHospital.ratings.totalReviews} reviews
                          </div>
                        )}
                      </div>

                      {/* Detailed Ratings */}
                      {(selectedHospital.ratings.cleanliness || selectedHospital.ratings.staff || 
                        selectedHospital.ratings.facilities || selectedHospital.ratings.treatment) && (
                        <div style={{ marginTop: '16px' }}>
                          {selectedHospital.ratings.cleanliness && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '14px', color: '#6b7280' }}>Cleanliness</span>
                              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                {selectedHospital.ratings.cleanliness.toFixed(1)}
                              </span>
                            </div>
                          )}
                          {selectedHospital.ratings.staff && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '14px', color: '#6b7280' }}>Staff</span>
                              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                {selectedHospital.ratings.staff.toFixed(1)}
                              </span>
                            </div>
                          )}
                          {selectedHospital.ratings.facilities && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '14px', color: '#6b7280' }}>Facilities</span>
                              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                {selectedHospital.ratings.facilities.toFixed(1)}
                              </span>
                            </div>
                          )}
                          {selectedHospital.ratings.treatment && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '14px', color: '#6b7280' }}>Treatment</span>
                              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                {selectedHospital.ratings.treatment.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Details Modal */}
      {showDoctorDetails && selectedDoctor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1002,
          backdropFilter: 'blur(4px)'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeDoctorDetails();
          }
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>
                Doctor Details
              </h2>
              <button
                onClick={closeDoctorDetails}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer'
                }}
              >
                <X style={{ height: '24px', width: '24px', color: '#6b7280' }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', maxHeight: '70vh', overflow: 'auto' }}>
              {/* Doctor Profile */}
              <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', alignItems: 'center' }}>
                {/* Doctor Image */}
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  fontWeight: '500',
                  color: '#6b7280',
                  flexShrink: 0,
                  overflow: 'hidden',
                  border: '4px solid #f3f4f6'
                }}>
                  {(selectedDoctor.image_url || (selectedDoctor as any).profileImage) ? (
                    <img
                      src={selectedDoctor.image_url || (selectedDoctor as any).profileImage}
                      alt={selectedDoctor.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.textContent = selectedDoctor.name?.charAt(0).toUpperCase() || 'D';
                        }
                      }}
                    />
                  ) : (
                    selectedDoctor.name?.charAt(0).toUpperCase() || 'D'
                  )}
                </div>

                {/* Basic Info */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
                    {selectedDoctor.name || 'Unknown Doctor'}
                  </h3>
                  <p style={{ fontSize: '18px', color: '#3b82f6', margin: '0 0 8px 0', fontWeight: '600' }}>
                    {selectedDoctor.specialization || 'General Practice'}
                  </p>
                  {selectedDoctor.designation && (
                    <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 12px 0' }}>
                      {selectedDoctor.designation}
                    </p>
                  )}
                  
                  {/* Rating and Experience */}
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {(selectedDoctor.experience_years || selectedDoctor.experience_text) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
                        <Clock style={{ height: '16px', width: '16px', color: '#0ea5e9' }} />
                        <span style={{ fontSize: '14px', color: '#0369a1', fontWeight: '500' }}>
                          {selectedDoctor.experience_years ? `${selectedDoctor.experience_years} Years Experience` : selectedDoctor.experience_text}
                        </span>
                      </div>
                    )}
                    {selectedDoctor.rating && selectedDoctor.rating.value > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#fefce8', borderRadius: '8px' }}>
                        <Star style={{ height: '16px', width: '16px', color: '#eab308', fill: '#eab308' }} />
                        <span style={{ fontSize: '14px', color: '#a16207', fontWeight: '500' }}>
                          {selectedDoctor.rating.value.toFixed(1)} ({selectedDoctor.rating.total_reviews} reviews)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* About Section */}
              {(selectedDoctor.summary || selectedDoctor.about) && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                    About
                  </h4>
                  <p style={{ color: '#6b7280', lineHeight: '1.6', fontSize: '15px' }}>
                    {selectedDoctor.summary || selectedDoctor.about}
                  </p>
                </div>
              )}

              {/* Qualifications */}
              {selectedDoctor.qualifications && selectedDoctor.qualifications.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                    Qualifications
                  </h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {selectedDoctor.qualifications.map((qualification: any, index: number) => (
                      <div key={index} style={{
                        padding: '12px 16px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontWeight: '600', color: '#374151' }}>{qualification.degree}</div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          {qualification.institution} {qualification.year && `(${qualification.year})`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {selectedDoctor.languages && selectedDoctor.languages.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                    Languages
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedDoctor.languages.map((language: string, index: number) => (
                      <span key={index} style={{
                        padding: '6px 12px',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Consultation Fee */}
              {selectedDoctor.consultation_fee && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                    Consultation Fee
                  </h4>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#166534'
                  }}>
                    ₹{selectedDoctor.consultation_fee}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {selectedDoctor.contact && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                    Contact Information
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {selectedDoctor.contact.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Phone style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                        <a href={`tel:${selectedDoctor.contact.phone}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                          {selectedDoctor.contact.phone}
                        </a>
                      </div>
                    )}
                    {selectedDoctor.contact.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Mail style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                        <a href={`mailto:${selectedDoctor.contact.email}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                          {selectedDoctor.contact.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for hospital details */}
      {hospitalDetailsLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <Loader2 style={{ height: '24px', width: '24px', color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '16px', color: '#374151' }}>Loading hospital details...</span>
          </div>
        </div>
      )}

      {/* Loading overlay for doctor details */}
      {doctorDetailsLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1003,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <Loader2 style={{ height: '24px', width: '24px', color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '16px', color: '#374151' }}>Loading doctor details...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalFinder;