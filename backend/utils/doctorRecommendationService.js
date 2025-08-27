const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');

class DoctorRecommendationService {
  constructor() {
    // Helper function to calculate distance between coordinates
    this.calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // Radius of the Earth in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };
  }

  async findRecommendedDoctors(specialties, userLocation, maxDistance = 25, limit = 10) {
    try {
      if (!userLocation || !userLocation.lat || !userLocation.lng) {
        throw new Error('Valid user location is required');
      }

      console.log('🔍 Finding doctors for specialties:', specialties);
      console.log('📍 User location:', userLocation);

      // Build search query for multiple specialties
      const specialtyQuery = {
        $or: specialties.map(specialty => ({
          specialization: { $regex: specialty, $options: 'i' }
        }))
      };

      // Find doctors matching the specialties
      const doctors = await Doctor.find(specialtyQuery)
        .populate('hospital', 'name location contact ratings specialties')
        .select('name specialization experience_years qualification hospital image_url contact rating consultation_fee availability')
        .limit(limit * 2) // Get more to filter by distance
        .lean();

      console.log(`📋 Found ${doctors.length} doctors before distance filtering`);

      // Filter by distance and enrich with distance information
      const doctorsWithDistance = doctors
        .map(doctor => {
          if (!doctor.hospital || !doctor.hospital.location || !doctor.hospital.location.coordinates) {
            return null;
          }

          const hospitalCoords = doctor.hospital.location.coordinates;
          const distance = this.calculateDistance(
            userLocation.lat,
            userLocation.lng,
            hospitalCoords.lat,
            hospitalCoords.lng
          );

          if (distance <= maxDistance) {
            return {
              ...doctor,
              distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
              hospitalInfo: {
                id: doctor.hospital._id,
                name: doctor.hospital.name,
                address: doctor.hospital.location.address,
                city: doctor.hospital.location.city,
                state: doctor.hospital.location.state,
                coordinates: doctor.hospital.location.coordinates,
                contact: doctor.hospital.contact,
                ratings: doctor.hospital.ratings,
                specialties: doctor.hospital.specialties
              }
            };
          }
          return null;
        })
        .filter(doctor => doctor !== null)
        .sort((a, b) => a.distance - b.distance) // Sort by distance
        .slice(0, limit); // Limit final results

      console.log(`✅ Found ${doctorsWithDistance.length} doctors within ${maxDistance}km`);

      return doctorsWithDistance;

    } catch (error) {
      console.error('Error finding recommended doctors:', error);
      throw error;
    }
  }

  async findSpecialtyHospitals(specialties, userLocation, maxDistance = 30, limit = 5) {
    try {
      if (!userLocation || !userLocation.lat || !userLocation.lng) {
        throw new Error('Valid user location is required');
      }

      console.log('🏥 Finding hospitals for specialties:', specialties);

      // Build search query for hospitals with required specialties
      const specialtyQuery = {
        $or: specialties.map(specialty => ({
          'specialties.name': { $regex: specialty, $options: 'i' }
        }))
      };

      // Find hospitals matching the specialties
      const hospitals = await Hospital.find(specialtyQuery)
        .select('name location contact specialties ratings description type bed_count')
        .limit(limit * 2) // Get more to filter by distance
        .lean();

      console.log(`🏥 Found ${hospitals.length} hospitals before distance filtering`);

      // Filter by distance and enrich with distance information
      const hospitalsWithDistance = hospitals
        .map(hospital => {
          if (!hospital.location || !hospital.location.coordinates) {
            return null;
          }

          const distance = this.calculateDistance(
            userLocation.lat,
            userLocation.lng,
            hospital.location.coordinates.lat,
            hospital.location.coordinates.lng
          );

          if (distance <= maxDistance) {
            return {
              ...hospital,
              distance: Math.round(distance * 10) / 10,
              relevantSpecialties: hospital.specialties?.filter(spec => 
                specialties.some(reqSpec => 
                  spec.name.toLowerCase().includes(reqSpec.toLowerCase()) ||
                  reqSpec.toLowerCase().includes(spec.name.toLowerCase())
                )
              ) || []
            };
          }
          return null;
        })
        .filter(hospital => hospital !== null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

      console.log(`✅ Found ${hospitalsWithDistance.length} hospitals within ${maxDistance}km`);

      return hospitalsWithDistance;

    } catch (error) {
      console.error('Error finding specialty hospitals:', error);
      throw error;
    }
  }

  formatDoctorRecommendation(doctor) {
    return {
      id: doctor._id,
      name: doctor.name,
      specialization: doctor.specialization,
      experience: doctor.experience_years ? `${doctor.experience_years} years` : 'Experience not specified',
      qualification: doctor.qualification || 'Qualification not specified',
      rating: doctor.rating?.value || 'Not rated',
      consultationFee: doctor.consultation_fee || 'Fee not specified',
      distance: `${doctor.distance} km away`,
      availability: doctor.availability || 'Availability not specified',
      image: doctor.image_url,
      contact: doctor.contact,
      hospital: {
        id: doctor.hospitalInfo.id,
        name: doctor.hospitalInfo.name,
        address: doctor.hospitalInfo.address,
        city: doctor.hospitalInfo.city,
        state: doctor.hospitalInfo.state,
        coordinates: doctor.hospitalInfo.coordinates,
        contact: doctor.hospitalInfo.contact,
        rating: doctor.hospitalInfo.ratings?.overall || 'Not rated',
        specialties: doctor.hospitalInfo.specialties?.map(s => s.name) || []
      }
    };
  }

  formatHospitalRecommendation(hospital) {
    return {
      id: hospital._id,
      name: hospital.name,
      address: hospital.location.address,
      city: hospital.location.city,
      state: hospital.location.state,
      coordinates: hospital.location.coordinates,
      distance: `${hospital.distance} km away`,
      rating: hospital.ratings?.overall || 'Not rated',
      type: hospital.type || 'Hospital',
      bedCount: hospital.bed_count,
      contact: hospital.contact,
      description: hospital.description,
      relevantSpecialties: hospital.relevantSpecialties?.map(s => s.name) || [],
      allSpecialties: hospital.specialties?.map(s => s.name) || []
    };
  }
}

module.exports = new DoctorRecommendationService();
