const express = require('express');
const axios = require('axios');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const router = express.Router();

// Simple cache for geocoding results
const geocodeCache = new Map();

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// Get user's current location using IP
router.get('/current', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                     (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    // For development, use a default location
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.includes('192.168')) {
      return res.json({
        location: {
          lat: 28.6139,
          lng: 77.2090,
          city: 'New Delhi',
          country: 'India',
          address: 'New Delhi, India'
        },
        message: 'Default location (development mode)'
      });
    }

    // Use IP geolocation service
    const response = await axios.get(`http://ip-api.com/json/${clientIp}`);
    const data = response.data;

    if (data.status === 'success') {
      res.json({
        location: {
          lat: data.lat,
          lng: data.lon,
          city: data.city,
          country: data.country,
          address: `${data.city}, ${data.regionName}, ${data.country}`
        }
      });
    } else {
      throw new Error('Location detection failed');
    }
  } catch (error) {
    console.error('Location detection error:', error);
    
    // Fallback to default location
    res.json({
      location: {
        lat: 28.6139,
        lng: 77.2090,
        city: 'New Delhi',
        country: 'India',
        address: 'New Delhi, India'
      },
      message: 'Fallback location used'
    });
  }
});

// Reverse geocode coordinates to address
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Using OpenStreetMap Nominatim API
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: lat,
        lon: lng,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'MediBudy-App'
      }
    });

    const data = response.data;

    if (data) {
      res.json({
        location: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          address: data.display_name,
          city: data.address?.city || data.address?.town || data.address?.village,
          state: data.address?.state,
          country: data.address?.country,
          postcode: data.address?.postcode
        }
      });
    } else {
      res.status(404).json({ error: 'Address not found for coordinates' });
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode coordinates' });
  }
});

// SUPER FAST hospital search - city-based approach
router.get('/nearby-hospitals', async (req, res) => {
  try {
    const { lat, lng, radius = 50, specialty, limit = 10 } = req.query;
    const startTime = Date.now();

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const searchLimit = parseInt(limit);
    const searchRadius = parseFloat(radius);

    console.log(`🚀 FAST hospital search for: ${userLat}, ${userLng}`);

    // Step 1: Quick reverse geocoding with timeout (2 seconds max)
    let userCity = null;
    let userState = null;
    
    try {
      const reverseResponse = await Promise.race([
        axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: { lat: userLat, lon: userLng, format: 'json', addressdetails: 1 },
          headers: { 'User-Agent': 'MediBudy-App' }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);

      if (reverseResponse.data?.address) {
        userCity = reverseResponse.data.address.city || 
                  reverseResponse.data.address.town || 
                  reverseResponse.data.address.village ||
                  reverseResponse.data.address.state_district;
        userState = reverseResponse.data.address.state;
        console.log(`📍 Found city: ${userCity}, ${userState}`);
      }
    } catch (geocodeError) {
      console.log('⚡ Skipping geocoding, using coordinate-based search');
    }

    // Step 2: Build query
    let query = {};
    if (specialty) {
      query['specialties.name'] = new RegExp(specialty, 'i');
    }

    let hospitals = [];

    // Step 3: Try city-based search first (FASTEST)
    if (userCity) {
      console.log(`🏥 City search: ${userCity}`);
      const cityQuery = { ...query, 'location.city': new RegExp(userCity, 'i') };
      hospitals = await Hospital.find(cityQuery).limit(searchLimit * 2).lean();
      
      // If not enough, try state search
      if (hospitals.length < searchLimit && userState) {
        console.log(`🏥 State search: ${userState}`);
        const stateQuery = {
          ...query,
          'location.state': new RegExp(userState, 'i'),
          '_id': { $nin: hospitals.map(h => h._id) }
        };
        const stateHospitals = await Hospital.find(stateQuery).limit(searchLimit).lean();
        hospitals = [...hospitals, ...stateHospitals];
      }
    }

    // Step 4: Fallback to coordinate-based search
    if (hospitals.length < searchLimit) {
      console.log(`🔍 Coordinate search fallback`);
      const coordQuery = {
        ...query,
        '_id': { $nin: hospitals.map(h => h._id) },
        'location.coordinates.lat': { $exists: true },
        'location.coordinates.lng': { $exists: true }
      };
      const coordHospitals = await Hospital.find(coordQuery).limit(searchLimit * 2).lean();
      hospitals = [...hospitals, ...coordHospitals];
    }

    // Step 5: Calculate distances (ONLY for hospitals we're considering)
    const hospitalsWithDistance = [];
    
    for (const hospital of hospitals.slice(0, searchLimit * 3)) { // Limit processing
      let distance = 0;
      
      if (hospital.location?.coordinates?.lat && hospital.location?.coordinates?.lng) {
        distance = calculateDistance(
          userLat, userLng,
          hospital.location.coordinates.lat,
          hospital.location.coordinates.lng
        );
      } else {
        // Estimate distance based on location match
        if (userCity && hospital.location?.city?.toLowerCase().includes(userCity.toLowerCase())) {
          distance = 5; // Same city
        } else if (userState && hospital.location?.state?.toLowerCase().includes(userState.toLowerCase())) {
          distance = 25; // Same state
        } else {
          distance = 50; // Default
        }
      }
      
      if (distance <= searchRadius) {
        hospitalsWithDistance.push({
          ...hospital,
          distance: Math.round(distance * 100) / 100
        });
      }
    }
    
    // Step 6: Sort and limit
    hospitalsWithDistance.sort((a, b) => a.distance - b.distance);
    const finalHospitals = hospitalsWithDistance.slice(0, searchLimit);

    const searchTime = Date.now() - startTime;
    console.log(`✅ Found ${finalHospitals.length} hospitals in ${searchTime}ms`);

    res.json({
      hospitals: finalHospitals,
      userLocation: { lat: userLat, lng: userLng, city: userCity, state: userState },
      searchRadius,
      count: finalHospitals.length,
      searchTime: `${searchTime}ms`,
      searchMethod: userCity ? 'city-based' : 'coordinate-based'
    });

  } catch (error) {
    console.error('Hospital search error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby hospitals' });
  }
});

// SUPER FAST doctors search - city-based approach
router.get('/nearby-doctors', async (req, res) => {
  try {
    const { lat, lng, radius = 50, specialization, limit = 20 } = req.query;
    const startTime = Date.now();

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const searchLimit = parseInt(limit);
    const searchRadius = parseFloat(radius);

    console.log(`🚀 FAST doctors search for: ${userLat}, ${userLng}`);

    // Step 1: Quick city detection (reuse from hospital search logic)
    let userCity = null;
    let userState = null;
    
    try {
      const reverseResponse = await Promise.race([
        axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: { lat: userLat, lon: userLng, format: 'json', addressdetails: 1 },
          headers: { 'User-Agent': 'MediBudy-App' }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);

      if (reverseResponse.data?.address) {
        userCity = reverseResponse.data.address.city || 
                  reverseResponse.data.address.town || 
                  reverseResponse.data.address.village;
        userState = reverseResponse.data.address.state;
      }
    } catch (geocodeError) {
      console.log('⚡ Skipping geocoding for doctors');
    }

    // Step 2: Build query for hospitals (since doctors are part of hospitals)
    let query = {};
    if (specialization) {
      query['doctors.specialization'] = new RegExp(specialization, 'i');
    }

    // Step 3: Get hospitals with doctors
    let hospitals = [];
    
    if (userCity) {
      const cityQuery = { ...query, 'location.city': new RegExp(userCity, 'i') };
      hospitals = await Hospital.find(cityQuery).limit(searchLimit).lean();
      
      if (hospitals.length < searchLimit / 2 && userState) {
        const stateQuery = {
          ...query,
          'location.state': new RegExp(userState, 'i'),
          '_id': { $nin: hospitals.map(h => h._id) }
        };
        const stateHospitals = await Hospital.find(stateQuery).limit(searchLimit).lean();
        hospitals = [...hospitals, ...stateHospitals];
      }
    } else {
      hospitals = await Hospital.find(query).limit(searchLimit * 2).lean();
    }

    // Step 4: Extract doctors and calculate distances
    const doctorsWithDistance = [];
    
    for (const hospital of hospitals) {
      let hospitalDistance = 0;
      
      // Calculate or estimate hospital distance
      if (hospital.location?.coordinates?.lat && hospital.location?.coordinates?.lng) {
        hospitalDistance = calculateDistance(
          userLat, userLng,
          hospital.location.coordinates.lat,
          hospital.location.coordinates.lng
        );
      } else {
        // Estimate distance
        if (userCity && hospital.location?.city?.toLowerCase().includes(userCity.toLowerCase())) {
          hospitalDistance = 5;
        } else if (userState && hospital.location?.state?.toLowerCase().includes(userState.toLowerCase())) {
          hospitalDistance = 25;
        } else {
          hospitalDistance = 50;
        }
      }
      
      // Only process hospitals within radius
      if (hospitalDistance <= searchRadius) {
        // Extract doctors from this hospital
        if (hospital.doctors && hospital.doctors.length > 0) {
          for (const doctor of hospital.doctors) {
            // Filter by specialization if provided
            if (!specialization || 
                (doctor.specialization && doctor.specialization.toLowerCase().includes(specialization.toLowerCase()))) {
              
              doctorsWithDistance.push({
                ...doctor,
                hospital_info: {
                  hospital_id: hospital._id,
                  hospital_name: hospital.name,
                  hospital_location: hospital.location,
                  hospital_rating: hospital.rating
                },
                distance: Math.round(hospitalDistance * 100) / 100
              });
            }
          }
        }
      }
    }
    
    // Step 5: Sort and limit
    doctorsWithDistance.sort((a, b) => a.distance - b.distance);
    const finalDoctors = doctorsWithDistance.slice(0, searchLimit);

    const searchTime = Date.now() - startTime;
    console.log(`✅ Found ${finalDoctors.length} doctors in ${searchTime}ms`);

    res.json({
      doctors: finalDoctors,
      userLocation: { lat: userLat, lng: userLng, city: userCity, state: userState },
      searchRadius,
      count: finalDoctors.length,
      searchTime: `${searchTime}ms`,
      searchMethod: userCity ? 'city-based' : 'coordinate-based'
    });

  } catch (error) {
    console.error('Doctors search error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby doctors' });
  }
});

// Combined healthcare search (fast version)
router.get('/nearby-healthcare', async (req, res) => {
  try {
    const { lat, lng, radius = 50, specialty, specialization, hospitalLimit = 5, doctorLimit = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Make parallel requests to both endpoints
    const hospitalResponse = await axios.get(`${req.protocol}://${req.get('host')}/api/location/nearby-hospitals`, {
      params: { lat, lng, radius, specialty, limit: hospitalLimit }
    });

    const doctorResponse = await axios.get(`${req.protocol}://${req.get('host')}/api/location/nearby-doctors`, {
      params: { lat, lng, radius, specialization, limit: doctorLimit }
    });

    res.json({
      hospitals: hospitalResponse.data.hospitals,
      doctors: doctorResponse.data.doctors,
      userLocation: hospitalResponse.data.userLocation,
      searchRadius: parseFloat(radius),
      counts: {
        hospitals: hospitalResponse.data.count,
        doctors: doctorResponse.data.count
      },
      searchTime: {
        hospitals: hospitalResponse.data.searchTime,
        doctors: doctorResponse.data.searchTime
      }
    });

  } catch (error) {
    console.error('Error fetching nearby healthcare:', error);
    res.status(500).json({ error: 'Failed to fetch nearby healthcare providers' });
  }
});

module.exports = router;
