const LocationService = require('./utils/locationService');
const mongoose = require('mongoose');
require('dotenv').config();

async function testLocationService() {
  try {
    console.log('🌍 Testing Location Service...\n');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const locationService = new LocationService();

    // Test IP geolocation
    console.log('\n📍 Testing IP Geolocation:');
    const locationData = await locationService.getLocationFromIP();
    console.log('Location data:', JSON.stringify(locationData, null, 2));

    if (locationData.success) {
      const { latitude, longitude } = locationData.location;
      
      // Test hospital finding
      console.log('\n🏥 Testing Hospital Search:');
      console.log(`Searching for hospitals near ${latitude}, ${longitude}`);
      
      const hospitals = await locationService.findNearbyHospitals(latitude, longitude, 25, null, 5);
      console.log(`Found ${hospitals.length} hospitals:`);
      
      hospitals.forEach((hospital, index) => {
        console.log(`\n${index + 1}. ${hospital.name}`);
        console.log(`   Distance: ${hospital.distance}km`);
        console.log(`   Address: ${hospital.location.address}, ${hospital.location.city}`);
        console.log(`   Type: ${hospital.type}`);
        if (hospital.specialties && hospital.specialties.length > 0) {
          console.log(`   Specialties: ${hospital.specialties.map(s => s.name).slice(0, 3).join(', ')}`);
        }
      });

      // Test with specialty filter
      console.log('\n🩺 Testing with specialty filter (General Medicine):');
      const specialtyHospitals = await locationService.findNearbyHospitals(latitude, longitude, 25, 'General Medicine', 3);
      console.log(`Found ${specialtyHospitals.length} hospitals with General Medicine:`);
      
      specialtyHospitals.forEach((hospital, index) => {
        console.log(`\n${index + 1}. ${hospital.name} (${hospital.distance}km)`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testLocationService();
