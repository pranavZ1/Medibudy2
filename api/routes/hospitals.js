const express = require('express');
const Hospital = require('../models/Hospital');
const router = express.Router();

// Get hospitals near location
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 20, specialty, page = 1, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const searchRadius = parseFloat(radius); // in kilometers

    console.log(`🔍 Searching hospitals within ${searchRadius}km of coordinates: ${userLat}, ${userLng}`);

    // Get all hospitals first, then filter by distance
    let query = {};
    
    // If specialty is provided, filter by doctors' specializations or multi-specialty
    if (specialty) {
      query = {
        $or: [
          { 'doctors.specialization': new RegExp(specialty, 'i') },
          { 'specialty': new RegExp('multi.?specialty', 'i') }, // Multi-specialty hospitals
          { 'name': new RegExp('multi.?specialty', 'i') } // Multi-specialty in name
        ]
      };
      console.log(`🏥 Filtering by specialty: ${specialty} or multi-specialty hospitals`);
    }

    const allHospitals = await Hospital.find(query).exec();
    console.log(`📋 Found ${allHospitals.length} hospitals matching criteria`);

    // Calculate distances and filter by radius
    const hospitalswithDistance = allHospitals
      .map(hospital => {
        const hospitalLat = hospital.location.coordinates.lat;
        const hospitalLng = hospital.location.coordinates.lng;
        
        const distance = calculateDistance(userLat, userLng, hospitalLat, hospitalLng);
        
        return {
          ...hospital.toObject(),
          distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
        };
      })
      .filter(hospital => hospital.distance <= searchRadius) // Filter by radius
      .sort((a, b) => a.distance - b.distance); // Sort by distance (closest first)

    console.log(`📍 Found ${hospitalswithDistance.length} hospitals within ${searchRadius}km radius`);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedHospitals = hospitalswithDistance.slice(startIndex, endIndex);

    const total = hospitalswithDistance.length;
    const totalPages = Math.ceil(total / limit);

    // Log sample distances for debugging
    if (paginatedHospitals.length > 0) {
      console.log(`🎯 Sample distances: ${paginatedHospitals.slice(0, 3).map(h => `${h.name}: ${h.distance}km`).join(', ')}`);
    }

    res.json({
      hospitals: paginatedHospitals,
      totalPages,
      currentPage: parseInt(page),
      total,
      searchParams: {
        userLocation: { lat: userLat, lng: userLng },
        radius: searchRadius,
        specialty: specialty || 'all'
      }
    });
  } catch (error) {
    console.error('Error fetching nearby hospitals:', error);
    res.status(500).json({ error: 'Failed to fetch nearby hospitals' });
  }
});

// Get all hospitals
router.get('/', async (req, res) => {
  try {
    const { 
      city, 
      country, 
      specialty, 
      type,
      minRating,
      search,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = {};

    // City search - case insensitive
    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    // Country search
    if (country) {
      query['location.country'] = new RegExp(country, 'i');
    }

    // Specialty search - check both specialties and doctors
    if (specialty) {
      query = {
        ...query,
        $or: [
          { 'specialties.name': new RegExp(specialty, 'i') },
          { 'doctors.specialization': new RegExp(specialty, 'i') },
          { 'specialty': new RegExp('multi.?specialty', 'i') }, // Multi-specialty hospitals
        ]
      };
    }

    // Hospital type filter
    if (type) {
      query.type = type;
    }

    // Rating filter
    if (minRating) {
      query['ratings.overall'] = { $gte: parseFloat(minRating) };
    }

    // Text search in hospital name
    if (search) {
      query.name = new RegExp(search, 'i');
    }

    console.log('Hospital search query:', JSON.stringify(query, null, 2));

    const hospitals = await Hospital.find(query)
      .sort(search ? { name: 1 } : { 'ratings.overall': -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .exec();

    const total = await Hospital.countDocuments(query);

    console.log(`Found ${hospitals.length} hospitals (${total} total matching criteria)`);

    res.json({
      hospitals,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

// Get hospital by ID
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id)
      .populate('treatmentsOffered');

    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    // Fetch doctors associated with this hospital
    const Doctor = require('../models/Doctor');
    const doctors = await Doctor.find({
      $or: [
        { 'hospital.hospital_id': req.params.id },
        { 'hospital.name': new RegExp(hospital.name, 'i') }
      ]
    }).select('name specialization designation experience_years experience_text image_url profileImage summary about contact qualifications languages consultation_fee rating availability');

    // Add doctors to hospital object
    const hospitalWithDoctors = {
      ...hospital.toObject(),
      doctors: doctors || []
    };

    res.json({ hospital: hospitalWithDoctors });
  } catch (error) {
    console.error('Error fetching hospital:', error);
    res.status(500).json({ error: 'Failed to fetch hospital' });
  }
});

// Get detailed doctor information
router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findById(req.params.doctorId)
      .populate('hospital.hospital_id', 'name location contact');

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json({ doctor });
  } catch (error) {
    console.error('Error fetching doctor details:', error);
    res.status(500).json({ error: 'Failed to fetch doctor details' });
  }
});

// Get hospitals by specialty
router.get('/specialty/:specialty', async (req, res) => {
  try {
    const { specialty } = req.params;
    const { lat, lng, radius = 100, page = 1, limit = 20 } = req.query;

    let query = {
      isActive: true,
      'specialties.name': new RegExp(specialty, 'i')
    };

    // If location provided, add proximity search
    if (lat && lng) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000
        }
      };
    }

    const hospitals = await Hospital.find(query)
      .sort(lat && lng ? {} : { 'ratings.overall': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Hospital.countDocuments(query);

    // Add distance if location provided
    let hospitalsWithDistance = hospitals;
    if (lat && lng) {
      hospitalsWithDistance = hospitals.map(hospital => {
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          hospital.location.coordinates.lat,
          hospital.location.coordinates.lng
        );
        
        return {
          ...hospital.toObject(),
          distance: Math.round(distance * 100) / 100
        };
      });
    }

    res.json({
      hospitals: hospitalsWithDistance,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      specialty
    });
  } catch (error) {
    console.error('Error fetching hospitals by specialty:', error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

// Get hospitals by treatment
router.post('/by-treatment', async (req, res) => {
  try {
    const { treatmentId, lat, lng, radius = 100, page = 1, limit = 20 } = req.body;

    let query = {
      isActive: true,
      treatmentsOffered: treatmentId
    };

    // If location provided, add proximity search
    if (lat && lng) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000
        }
      };
    }

    const hospitals = await Hospital.find(query)
      .populate('treatmentsOffered')
      .sort(lat && lng ? {} : { 'ratings.overall': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Hospital.countDocuments(query);

    // Add distance if location provided
    let hospitalsWithDistance = hospitals;
    if (lat && lng) {
      hospitalsWithDistance = hospitals.map(hospital => {
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          hospital.location.coordinates.lat,
          hospital.location.coordinates.lng
        );
        
        return {
          ...hospital.toObject(),
          distance: Math.round(distance * 100) / 100
        };
      });
    }

    res.json({
      hospitals: hospitalsWithDistance,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching hospitals by treatment:', error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

// Get hospital specialties
router.get('/meta/specialties', async (req, res) => {
  try {
    const specialties = await Hospital.distinct('specialties.name', { isActive: true });
    const cities = await Hospital.distinct('location.city', { isActive: true });
    const countries = await Hospital.distinct('location.country', { isActive: true });
    
    res.json({ 
      specialties: specialties.sort(),
      cities: cities.sort(),
      countries: countries.sort()
    });
  } catch (error) {
    console.error('Error fetching hospital metadata:', error);
    res.status(500).json({ error: 'Failed to fetch hospital metadata' });
  }
});

// Search hospitals
router.get('/search', async (req, res) => {
  try {
    const { 
      location,
      specialization,
      rating,
      radius = 100, 
      page = 1, 
      limit = 20 
    } = req.query;

    let searchQuery = { isActive: true };

    // Location-based search
    if (location) {
      // Try to parse as coordinates first, then fallback to text search
      const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        const [, lat, lng] = coordMatch;
        searchQuery['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            $maxDistance: radius * 1000
          }
        };
      } else {
        // Text-based location search
        searchQuery.$or = [
          { 'address': { $regex: location, $options: 'i' } },
          { 'location.city': { $regex: location, $options: 'i' } },
          { 'location.country': { $regex: location, $options: 'i' } }
        ];
      }
    }

    // Specialization filter
    if (specialization) {
      searchQuery['specializations'] = { $regex: specialization, $options: 'i' };
    }

    // Rating filter
    if (rating) {
      searchQuery['ratings.overall'] = { $gte: parseFloat(rating) };
    }

    const hospitals = await Hospital.find(searchQuery)
    .sort({ 'ratings.overall': -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

    const total = await Hospital.countDocuments(searchQuery);

    res.json({
      hospitals,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error searching hospitals:', error);
    res.status(500).json({ error: 'Failed to search hospitals' });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Get detailed hospital information by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🏥 Fetching detailed info for hospital: ${id}`);
    
    // Find hospital - doctors are already embedded with basic info
    const hospital = await Hospital.findById(id);
    
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    console.log(`✅ Found hospital: ${hospital.name} with ${hospital.doctors.length} doctors`);
    
    res.json({ hospital });
  } catch (error) {
    console.error('Error fetching hospital details:', error);
    res.status(500).json({ error: 'Failed to fetch hospital details' });
  }
});

module.exports = router;
