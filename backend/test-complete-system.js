const axios = require('axios');

async function testSymptomCheckerWithHospitals() {
  try {
    console.log('🧪 Testing Symptom Checker with Hospital Suggestions...\n');

    const testData = {
      symptoms: ['fever', 'cough', 'shortness of breath'],
      additionalInfo: 'Symptoms started 3 days ago, mild fatigue'
    };

    console.log('📋 Test symptoms:', testData.symptoms);
    console.log('📝 Additional info:', testData.additionalInfo);
    console.log('\n🔄 Making API request...');

    const response = await axios.post('http://localhost:5001/api/ai/analyze-symptoms-simple', testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ API Response Status:', response.status);
    console.log('\n📊 Analysis Results:');
    
    const analysis = response.data.analysis;
    
    // Display possible conditions
    if (analysis.possibleConditions) {
      console.log('\n🔍 Possible Conditions:');
      analysis.possibleConditions.forEach((condition, index) => {
        console.log(`   ${index + 1}. ${condition.condition} (${condition.probability}% probability)`);
        console.log(`      ${condition.description}`);
      });
    }

    // Display recommendations
    if (analysis.recommendations) {
      console.log('\n💡 Recommendations:');
      analysis.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    // Display urgency level
    console.log(`\n⚠️  Urgency Level: ${analysis.urgencyLevel.toUpperCase()}`);

    // Display nearby hospitals
    if (analysis.nearbyHospitals) {
      console.log('\n🏥 Nearby Hospital Suggestions:');
      
      if (analysis.nearbyHospitals.userLocation) {
        console.log(`📍 Your location: ${analysis.nearbyHospitals.userLocation.address}`);
        console.log(`🔍 Search radius: ${analysis.nearbyHospitals.searchRadius}km`);
      }
      
      if (analysis.nearbyHospitals.hospitals && analysis.nearbyHospitals.hospitals.length > 0) {
        console.log(`\n🏨 Found ${analysis.nearbyHospitals.totalFound} hospitals:`);
        
        analysis.nearbyHospitals.hospitals.slice(0, 5).forEach((hospital, index) => {
          console.log(`\n   ${index + 1}. ${hospital.name}`);
          console.log(`      📍 ${hospital.location.address}, ${hospital.location.city}`);
          console.log(`      📏 Distance: ${hospital.distance}km`);
          console.log(`      🏥 Type: ${hospital.type}`);
          
          if (hospital.specialties && hospital.specialties.length > 0) {
            const specialtyNames = hospital.specialties.map(s => s.name).slice(0, 3);
            console.log(`      🩺 Specialties: ${specialtyNames.join(', ')}`);
          }
          
          if (hospital.contact && hospital.contact.phone && hospital.contact.phone.length > 0) {
            console.log(`      📞 Phone: ${hospital.contact.phone[0]}`);
          }
          
          if (hospital.ratings && hospital.ratings.overall) {
            console.log(`      ⭐ Rating: ${hospital.ratings.overall}/5`);
          }
        });
      } else {
        console.log('   ❌ No hospitals found in the area');
        if (analysis.nearbyHospitals.error) {
          console.log(`   Error: ${analysis.nearbyHospitals.error}`);
        }
      }
    }

    console.log(`\n📢 ${analysis.disclaimer}`);
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testSymptomCheckerWithHospitals();
