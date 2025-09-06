const axios = require('axios');

class LocationService {
  constructor() {
    this.ipApiUrl = 'https://ipapi.co';
  }

  /**
   * Get user location from IP address
   * @param {string} ip - IP address (optional, will use requester's IP if not provided)
   * @returns {Promise<Object>} Location data
   */
  async getLocationFromIP(ip = null) {
    try {
      const url = ip ? `${this.ipApiUrl}/${ip}/json/` : `${this.ipApiUrl}/json/`;
      
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'MediBuddy/1.0'
        }
      });

      const data = response.data;

      if (data.error) {
        throw new Error(`IP API Error: ${data.reason}`);
      }

      return {
        success: true,
        location: {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          city: data.city,
          region: data.region,
          country: data.country_name,
          countryCode: data.country_code,
          timezone: data.timezone,
          address: `${data.city}, ${data.region}, ${data.country_name}`
        },
        raw: data
      };
    } catch (error) {
      console.error('Location service error:', error.message);
      
      // Return fallback location (you can customize this)
      return {
        success: false,
        error: error.message,
        location: {
          latitude: 28.6139, // Delhi, India as fallback
          longitude: 77.2090,
          city: 'Delhi',
          region: 'Delhi',
          country: 'India',
          countryCode: 'IN',
          timezone: 'Asia/Kolkata',
          address: 'Delhi, India'
        }
      };
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 
   * @param {number} lon1 
   * @param {number} lat2 
   * @param {number} lon2 
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees 
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  /**
   * Find nearby hospitals based on coordinates
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {number} radius - Search radius in kilometers (default: 25km)
   * @param {string} specialty - Optional specialty filter
   * @param {number} limit - Maximum number of hospitals to return
   * @returns {Promise<Array>} Array of nearby hospitals
   */
  async findNearbyHospitals(latitude, longitude, radius = 25, specialty = null, limit = 10) {
    try {
      const Hospital = require('../models/Hospital');
      
      // First, try to find hospitals using precise distance calculation
      let hospitals = await Hospital.find({
        'location.coordinates.lat': { $exists: true, $ne: null },
        'location.coordinates.lng': { $exists: true, $ne: null }
      });

      // Calculate distances and filter
      const hospitalsWithDistance = hospitals
        .map(hospital => {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            hospital.location.coordinates.lat,
            hospital.location.coordinates.lng
          );
          
          return {
            _id: hospital._id,
            name: hospital.name,
            description: hospital.description,
            type: hospital.type,
            specialties: hospital.specialties || [],
            location: hospital.location,
            contact: hospital.contact,
            ratings: hospital.ratings,
            distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
          };
        })
        .filter(hospital => hospital.distance <= radius) // Filter by radius
        .sort((a, b) => a.distance - b.distance); // Sort by distance

      // If specialty is specified, prioritize hospitals with that specialty
      if (specialty) {
        const specialtyHospitals = hospitalsWithDistance.filter(hospital => 
          hospital.specialties && hospital.specialties.some(spec => 
            spec.name && spec.name.toLowerCase().includes(specialty.toLowerCase())
          )
        );
        
        const otherHospitals = hospitalsWithDistance.filter(hospital => 
          !hospital.specialties || !hospital.specialties.some(spec => 
            spec.name && spec.name.toLowerCase().includes(specialty.toLowerCase())
          )
        );

        // Return specialty hospitals first, then others
        return [...specialtyHospitals, ...otherHospitals].slice(0, limit);
      }

      return hospitalsWithDistance.slice(0, limit);
    } catch (error) {
      console.error('Error finding nearby hospitals:', error);
      throw new Error('Failed to find nearby hospitals');
    }
  }

  /**
   * Get relevant specialties based on medical conditions
   * @param {Array} conditions - Array of medical conditions
   * @returns {Array} Array of relevant medical specialties
   */
  getRelevantSpecialties(conditions) {
    const specialtyMap = {
      // Common conditions to specialty mapping
      'cold': ['General Medicine', 'Family Medicine'],
      'flu': ['General Medicine', 'Family Medicine'],
      'influenza': ['General Medicine', 'Family Medicine'],
      'covid': ['General Medicine', 'Pulmonology', 'Infectious Disease'],
      'pneumonia': ['Pulmonology', 'General Medicine'],
      'bronchitis': ['Pulmonology', 'General Medicine'],
      'asthma': ['Pulmonology', 'Allergy'],
      'allergy': ['Allergy', 'Immunology'],
      'diabetes': ['Endocrinology', 'Internal Medicine'],
      'hypertension': ['Cardiology', 'Internal Medicine'],
      'heart': ['Cardiology'],
      'cardiac': ['Cardiology'],
      'chest pain': ['Cardiology', 'Emergency Medicine'],
      'abdominal': ['Gastroenterology', 'General Surgery'],
      'stomach': ['Gastroenterology', 'General Medicine'],
      'kidney': ['Nephrology', 'Urology'],
      'urinary': ['Urology', 'Nephrology'],
      'skin': ['Dermatology'],
      'bone': ['Orthopedics'],
      'joint': ['Orthopedics', 'Rheumatology'],
      'muscle': ['Orthopedics', 'Sports Medicine'],
      'neurological': ['Neurology'],
      'mental': ['Psychiatry', 'Psychology'],
      'eye': ['Ophthalmology'],
      'ear': ['ENT', 'Otolaryngology'],
      'throat': ['ENT', 'Otolaryngology'],
      'pregnancy': ['Obstetrics', 'Gynecology'],
      'pediatric': ['Pediatrics']
    };

    const relevantSpecialties = new Set();
    
    conditions.forEach(condition => {
      const conditionLower = condition.condition.toLowerCase();
      
      Object.keys(specialtyMap).forEach(key => {
        if (conditionLower.includes(key)) {
          specialtyMap[key].forEach(specialty => relevantSpecialties.add(specialty));
        }
      });
    });

    return Array.from(relevantSpecialties);
  }
}

module.exports = LocationService;
