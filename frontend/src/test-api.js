// Test API call from frontend context
async function testAPI() {
  try {
    console.log('Testing API call...');
    
    const response = await fetch('http://localhost:5001/api/ai/analyze-symptoms-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symptoms: ['headache', 'fever'],
        additionalInfo: 'Feeling tired for 2 days'
      })
    });

    const data = await response.json();
    console.log('API Response:', data);
    console.log('Nearby Hospitals:', data.analysis?.nearbyHospitals);
    
    if (data.analysis?.nearbyHospitals?.hospitals) {
      console.log('Number of hospitals:', data.analysis.nearbyHospitals.hospitals.length);
      data.analysis.nearbyHospitals.hospitals.forEach((hospital, index) => {
        console.log(`Hospital ${index + 1}:`, hospital.name);
      });
    } else {
      console.log('No hospitals found in response');
    }
    
  } catch (error) {
    console.error('API Error:', error);
  }
}

// Run the test
testAPI();
