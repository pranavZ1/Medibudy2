import React, { useState } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { locationAPI } from '../services/api';
import { MapPin, Navigation, Search, Users, Building2 } from 'lucide-react';

interface Hospital {
  _id: string;
  name: string;
  location: {
    city: string;
    state: string;
    address: string;
  };
  rating: {
    value: number;
    total_reviews: number;
  };
  distance: number;
  specialty?: string;
}

interface Doctor {
  name: string;
  specialization: string;
  designation: string;
  experience_years: number;
  hospital_info: {
    hospital_name: string;
    hospital_location: {
      city: string;
      state: string;
    };
  };
  distance: number;
}

const LocationTest: React.FC = () => {
  const { 
    userLocation, 
    getCurrentLocation, 
    isLoadingLocation, 
    locationError 
  } = useLocation();

  const [manualLat, setManualLat] = useState('28.6139');
  const [manualLng, setManualLng] = useState('77.2090');
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const testBrowserLocation = async () => {
    setLoading(true);
    try {
      await getCurrentLocation();
      setTestResults({ type: 'success', message: 'Browser location detected successfully!' });
    } catch (error) {
      setTestResults({ type: 'error', message: 'Failed to get browser location' });
    } finally {
      setLoading(false);
    }
  };

  const testReverseGeocode = async () => {
    setLoading(true);
    try {
      const lat = userLocation?.lat || parseFloat(manualLat);
      const lng = userLocation?.lng || parseFloat(manualLng);
      
      const response = await locationAPI.reverseGeocode(lat, lng);
      setTestResults({
        type: 'success',
        message: 'Reverse geocoding successful!',
        data: response.data
      });
    } catch (error) {
      setTestResults({ type: 'error', message: 'Reverse geocoding failed' });
    } finally {
      setLoading(false);
    }
  };

  const testNearbyHospitals = async () => {
    setLoading(true);
    try {
      const lat = userLocation?.lat || parseFloat(manualLat);
      const lng = userLocation?.lng || parseFloat(manualLng);
      
      const response = await locationAPI.getNearbyHospitals(lat, lng, 10, undefined, 5);
      setHospitals(response.data.hospitals);
      setTestResults({
        type: 'success',
        message: `Found ${response.data.hospitals.length} nearby hospitals!`
      });
    } catch (error) {
      setTestResults({ type: 'error', message: 'Failed to fetch hospitals' });
    } finally {
      setLoading(false);
    }
  };

  const testNearbyDoctors = async () => {
    setLoading(true);
    try {
      const lat = userLocation?.lat || parseFloat(manualLat);
      const lng = userLocation?.lng || parseFloat(manualLng);
      
      const response = await locationAPI.getNearbyDoctors(lat, lng, 10, 'Cardiology', 5);
      setDoctors(response.data.doctors);
      setTestResults({
        type: 'success',
        message: `Found ${response.data.doctors.length} nearby cardiologists!`
      });
    } catch (error) {
      setTestResults({ type: 'error', message: 'Failed to fetch doctors' });
    } finally {
      setLoading(false);
    }
  };

  const testCombinedHealthcare = async () => {
    setLoading(true);
    try {
      const lat = userLocation?.lat || parseFloat(manualLat);
      const lng = userLocation?.lng || parseFloat(manualLng);
      
      const response = await locationAPI.getNearbyHealthcare(lat, lng, 15, undefined, undefined, 3, 5);
      setHospitals(response.data.hospitals);
      setDoctors(response.data.doctors);
      setTestResults({
        type: 'success',
        message: `Found ${response.data.hospitals.length} hospitals and ${response.data.doctors.length} doctors!`,
        data: {
          hospitals: response.data.hospitals.length,
          doctors: response.data.doctors.length
        }
      });
    } catch (error) {
      setTestResults({ type: 'error', message: 'Failed to fetch healthcare data' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
          <MapPin className="mr-3 text-blue-600" />
          Location Features Test
        </h1>

        {/* Current Location Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Navigation className="mr-2 text-green-600" />
            Current Location Status
          </h2>
          
          {userLocation ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                <strong>Latitude:</strong> {userLocation.lat}<br />
                <strong>Longitude:</strong> {userLocation.lng}<br />
                {userLocation.address && <span><strong>Address:</strong> {userLocation.address}</span>}
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">No location detected yet</p>
            </div>
          )}

          {locationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-red-800">Error: {locationError}</p>
            </div>
          )}
        </div>

        {/* Manual Location Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Manual Location Input</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="number"
              placeholder="Latitude"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
              step="any"
            />
            <input
              type="number"
              placeholder="Longitude"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
              step="any"
            />
          </div>
          <p className="text-sm text-gray-600">Default: Delhi coordinates (28.6139, 77.2090)</p>
        </div>

        {/* Test Buttons */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Search className="mr-2 text-blue-600" />
            Location Tests
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={testBrowserLocation}
              disabled={loading || isLoadingLocation}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingLocation ? 'Getting Location...' : 'Test Browser Location'}
            </button>

            <button
              onClick={testReverseGeocode}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test Reverse Geocode
            </button>

            <button
              onClick={testNearbyHospitals}
              disabled={loading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Find Nearby Hospitals
            </button>

            <button
              onClick={testNearbyDoctors}
              disabled={loading}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Find Cardiologists
            </button>

            <button
              onClick={testCombinedHealthcare}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed md:col-span-2"
            >
              Combined Healthcare Search
            </button>
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Testing...</span>
            </div>
          )}
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className={`p-4 rounded-lg ${
              testResults.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={testResults.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {testResults.message}
              </p>
              {testResults.data && (
                <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(testResults.data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Hospitals Results */}
        {hospitals.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Building2 className="mr-2 text-blue-600" />
              Nearby Hospitals ({hospitals.length})
            </h2>
            <div className="space-y-4">
              {hospitals.map((hospital, index) => (
                <div key={hospital._id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-lg">{hospital.name}</h3>
                  <p className="text-gray-600">
                    {hospital.location.city}, {hospital.location.state}
                  </p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {hospital.distance} km away
                    </span>
                    <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      ⭐ {hospital.rating.value}/5 ({hospital.rating.total_reviews} reviews)
                    </span>
                    {hospital.specialty && (
                      <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {hospital.specialty}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Doctors Results */}
        {doctors.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Users className="mr-2 text-green-600" />
              Nearby Doctors ({doctors.length})
            </h2>
            <div className="space-y-4">
              {doctors.map((doctor, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-lg">Dr. {doctor.name}</h3>
                  <p className="text-gray-600">{doctor.specialization} • {doctor.designation}</p>
                  <p className="text-sm text-gray-500">{doctor.hospital_info.hospital_name}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                      {doctor.distance} km away
                    </span>
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {doctor.experience_years} years experience
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationTest;
