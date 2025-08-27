const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Import the Hospital model
const Hospital = require('./models/Hospital');

class AccurateGeocodeAgent {
  constructor() {
    // Google Maps Geocoding API
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.googleGeocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    
    // Fallback to OpenStreetMap Nominatim API (free, no API key required)
    this.nominatimUrl = 'https://nominatim.openstreetmap.org/search';
    
    this.delay = 200; // 200ms delay between requests to respect rate limits
    this.maxRetries = 3;
  }

  /**
   * Get accurate coordinates using Google Maps Geocoding API
   * @param {string} address - Full address string including hospital name
   * @returns {Promise<Object>} Coordinates object with lat, lng, and accuracy info
   */
  async getGoogleMapsCoordinates(address) {
    if (!this.googleMapsApiKey || this.googleMapsApiKey === 'your-google-maps-api-key-here') {
      console.log('⚠️  Google Maps API key not configured, falling back to Nominatim');
      return null;
    }

    try {
      const response = await axios.get(this.googleGeocodeUrl, {
        params: {
          address: address,
          key: this.googleMapsApiKey,
          region: 'in', // Bias results to India
          language: 'en'
        },
        timeout: 15000
      });

      const data = response.data;
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        // Check location type for accuracy assessment
        const locationType = result.geometry.location_type;
        const accuracy = this.getAccuracyScore(locationType, result.types);
        
        return {
          lat: location.lat,
          lng: location.lng,
          formatted_address: result.formatted_address,
          accuracy: accuracy,
          location_type: locationType,
          place_types: result.types,
          source: 'google_maps'
        };
      } else if (data.status === 'ZERO_RESULTS') {
        console.log(`   ℹ️  Google Maps: No results found for "${address}"`);
        return null;
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.log('   ⚠️  Google Maps API quota exceeded');
        throw new Error('API_QUOTA_EXCEEDED');
      } else {
        console.log(`   ⚠️  Google Maps API error: ${data.status}`);
        return null;
      }
    } catch (error) {
      if (error.message === 'API_QUOTA_EXCEEDED') {
        throw error;
      }
      console.error(`   ❌ Google Maps geocoding error for "${address}":`, error.message);
      return null;
    }
  }

  /**
   * Get coordinates using OpenStreetMap Nominatim API as fallback
   */
  async getNominatimCoordinates(address) {
    try {
      const response = await axios.get(this.nominatimUrl, {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          countrycodes: 'in',
          addressdetails: 1,
          extratags: 1
        },
        headers: {
          'User-Agent': 'MediBuddy-Hospital-Geocoder/2.0'
        },
        timeout: 10000
      });

      const data = response.data;
      
      if (data && data.length > 0) {
        const location = data[0];
        
        // Check if it's actually a hospital/healthcare facility
        const isHealthcareFacility = this.isHealthcareFacility(location);
        
        return {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lon),
          formatted_address: location.display_name,
          accuracy: isHealthcareFacility ? 'high' : 'medium',
          place_types: [location.type, location.class],
          source: 'nominatim'
        };
      }
      
      return null;
    } catch (error) {
      console.error(`   ❌ Nominatim geocoding error for "${address}":`, error.message);
      return null;
    }
  }

  /**
   * Determine if the location is actually a healthcare facility
   */
  isHealthcareFacility(location) {
    const healthcareTerms = [
      'hospital', 'clinic', 'medical', 'health', 'care', 'nursing_home',
      'doctors', 'pharmacy', 'dental', 'healthcare'
    ];
    
    const searchText = `${location.display_name} ${location.type} ${location.class}`.toLowerCase();
    return healthcareTerms.some(term => searchText.includes(term));
  }

  /**
   * Get accuracy score based on Google Maps location type and place types
   */
  getAccuracyScore(locationType, placeTypes) {
    // Check if it's a healthcare facility
    const healthcareTypes = [
      'hospital', 'health', 'doctor', 'pharmacy', 'physiotherapist',
      'medical_lab', 'medical_center', 'nursing_home'
    ];
    
    const isHealthcare = placeTypes.some(type => 
      healthcareTypes.some(healthType => type.includes(healthType))
    );

    // Location type accuracy
    const locationAccuracy = {
      'ROOFTOP': 'very_high',
      'RANGE_INTERPOLATED': 'high', 
      'GEOMETRIC_CENTER': 'medium',
      'APPROXIMATE': 'low'
    };

    const baseAccuracy = locationAccuracy[locationType] || 'medium';
    
    // Boost accuracy if it's identified as healthcare facility
    if (isHealthcare) {
      return baseAccuracy === 'very_high' ? 'very_high' : 'high';
    }
    
    return baseAccuracy;
  }

  /**
   * Generate multiple address variations for better geocoding success
   */
  generateAddressVariations(hospital) {
    const variations = [];
    const name = hospital.name;
    const location = hospital.location;
    
    // Variation 1: Full name + full address
    if (location.address && location.city && location.state) {
      variations.push(`${name}, ${location.address}, ${location.city}, ${location.state}, India`);
    }
    
    // Variation 2: Name + city + state
    if (location.city && location.state) {
      variations.push(`${name}, ${location.city}, ${location.state}, India`);
    }
    
    // Variation 3: Name + city (most specific city name)
    if (location.city) {
      variations.push(`${name}, ${location.city}, India`);
    }
    
    // Variation 4: Just the name with "hospital" if not already included
    if (!name.toLowerCase().includes('hospital')) {
      variations.push(`${name} Hospital, ${location.city || ''}, India`);
    }
    
    // Variation 5: Address without name (if address is detailed)
    if (location.address && location.city && location.state) {
      variations.push(`${location.address}, ${location.city}, ${location.state}, India`);
    }
    
    return variations.filter(v => v.trim() !== '');
  }

  /**
   * Try geocoding with multiple address variations
   */
  async geocodeHospitalWithRetries(hospital) {
    const addressVariations = this.generateAddressVariations(hospital);
    
    console.log(`   📍 Trying ${addressVariations.length} address variations...`);
    
    for (let i = 0; i < addressVariations.length; i++) {
      const address = addressVariations[i];
      console.log(`   ${i + 1}. "${address}"`);
      
      let coordinates = null;
      
      // Try Google Maps first
      try {
        coordinates = await this.getGoogleMapsCoordinates(address);
        if (coordinates && coordinates.accuracy !== 'low') {
          console.log(`   ✅ Google Maps success! Accuracy: ${coordinates.accuracy}`);
          return coordinates;
        }
      } catch (error) {
        if (error.message === 'API_QUOTA_EXCEEDED') {
          console.log('   ⚠️  Google Maps quota exceeded, switching to Nominatim');
          break; // Stop using Google Maps for this session
        }
      }
      
      // Try Nominatim as fallback
      coordinates = await this.getNominatimCoordinates(address);
      if (coordinates) {
        console.log(`   ✅ Nominatim success! Source: ${coordinates.source}`);
        return coordinates;
      }
      
      // Add small delay between attempts
      if (i < addressVariations.length - 1) {
        await this.sleep(this.delay);
      }
    }
    
    return null;
  }

  /**
   * Sleep function to add delay between requests
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update hospitals with accurate coordinates
   */
  async updateHospitalCoordinates() {
    try {
      console.log('🏥 Starting Accurate Hospital Geocoding Agent...');
      console.log('🎯 This will find precise coordinates for each hospital\n');
      
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');

      // Find hospitals without coordinates OR with low-accuracy coordinates
      const hospitalsToUpdate = await Hospital.find({
        $or: [
          // No coordinates at all
          { 'location.coordinates': { $exists: false } },
          { 'location.coordinates.lat': { $exists: false } },
          { 'location.coordinates.lng': { $exists: false } },
          { 'location.coordinates.lat': null },
          { 'location.coordinates.lng': null },
          // Has coordinates but no accuracy info (likely city-level)
          { 'location.coordinates.accuracy': { $exists: false } },
          // Has low accuracy coordinates
          { 'location.coordinates.accuracy': 'low' },
          { 'location.coordinates.source': 'city_fallback' }
        ]
      }).select('name location');

      console.log(`📍 Found ${hospitalsToUpdate.length} hospitals needing accurate coordinates\n`);

      if (hospitalsToUpdate.length === 0) {
        console.log('✅ All hospitals already have accurate coordinates!');
        return;
      }

      let processed = 0;
      let successful = 0;
      let failed = 0;
      let googleMapsUsed = 0;
      let nominatimUsed = 0;

      for (const hospital of hospitalsToUpdate) {
        processed++;
        console.log(`\n[${processed}/${hospitalsToUpdate.length}] 🏥 ${hospital.name}`);
        console.log(`   📍 City: ${hospital.location.city || 'Unknown'}`);
        console.log(`   📍 Address: ${hospital.location.address || 'Not specified'}`);
        
        // Try to get accurate coordinates
        const coordinates = await this.geocodeHospitalWithRetries(hospital);

        if (coordinates) {
          try {
            // Update the hospital document with detailed coordinate info
            await Hospital.findByIdAndUpdate(hospital._id, {
              $set: {
                'location.coordinates': {
                  lat: coordinates.lat,
                  lng: coordinates.lng,
                  accuracy: coordinates.accuracy,
                  source: coordinates.source,
                  formatted_address: coordinates.formatted_address,
                  location_type: coordinates.location_type,
                  place_types: coordinates.place_types,
                  last_updated: new Date()
                }
              }
            });
            
            console.log(`   ✅ Updated: ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`);
            console.log(`   📊 Accuracy: ${coordinates.accuracy} | Source: ${coordinates.source}`);
            
            successful++;
            
            if (coordinates.source === 'google_maps') {
              googleMapsUsed++;
            } else {
              nominatimUsed++;
            }
            
          } catch (updateError) {
            console.error(`   ❌ Database update failed for ${hospital.name}:`, updateError.message);
            failed++;
          }
        } else {
          console.log(`   ❌ Could not find accurate coordinates for ${hospital.name}`);
          failed++;
        }

        // Add delay to respect rate limits
        if (processed < hospitalsToUpdate.length) {
          console.log(`   ⏳ Waiting ${this.delay}ms...`);
          await this.sleep(this.delay);
        }
      }

      console.log(`\n📊 Accurate Geocoding Summary:`);
      console.log(`   Total processed: ${processed}`);
      console.log(`   Successful: ${successful}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Google Maps used: ${googleMapsUsed}`);
      console.log(`   Nominatim used: ${nominatimUsed}`);
      console.log(`   Success rate: ${((successful / processed) * 100).toFixed(1)}%`);

    } catch (error) {
      console.error('❌ Error in accurate geocoding process:', error);
    } finally {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }

  /**
   * Verify and display sample of updated hospitals with accuracy metrics
   */
  async verifyUpdates() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log('\n🔍 Verification Results:');
      console.log('========================');

      // Get accuracy distribution
      const accuracyStats = await Hospital.aggregate([
        {
          $match: {
            'location.coordinates.lat': { $exists: true },
            'location.coordinates.lng': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$location.coordinates.accuracy',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      console.log('\n📊 Coordinate Accuracy Distribution:');
      accuracyStats.forEach(stat => {
        console.log(`   ${stat._id || 'unknown'}: ${stat.count} hospitals`);
      });

      // Get source distribution
      const sourceStats = await Hospital.aggregate([
        {
          $match: {
            'location.coordinates.lat': { $exists: true },
            'location.coordinates.lng': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$location.coordinates.source',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      console.log('\n📡 Data Source Distribution:');
      sourceStats.forEach(stat => {
        console.log(`   ${stat._id || 'unknown'}: ${stat.count} hospitals`);
      });

      // Sample high-accuracy hospitals
      const highAccuracyHospitals = await Hospital.find({
        'location.coordinates.accuracy': { $in: ['very_high', 'high'] }
      }).select('name location.city location.coordinates').limit(10);

      console.log('\n🎯 Sample High-Accuracy Hospitals:');
      highAccuracyHospitals.forEach(hospital => {
        const coords = hospital.location.coordinates;
        console.log(`   ${hospital.name} (${hospital.location.city})`);
        console.log(`     📍 ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)} | ${coords.accuracy} | ${coords.source}`);
      });

      // Overall statistics
      const totalWithCoords = await Hospital.countDocuments({
        'location.coordinates.lat': { $exists: true },
        'location.coordinates.lng': { $exists: true }
      });

      const totalHospitals = await Hospital.countDocuments();

      const highAccuracyCount = await Hospital.countDocuments({
        'location.coordinates.accuracy': { $in: ['very_high', 'high'] }
      });

      console.log(`\n📈 Overall Statistics:`);
      console.log(`   Total hospitals: ${totalHospitals}`);
      console.log(`   With coordinates: ${totalWithCoords} (${((totalWithCoords/totalHospitals)*100).toFixed(1)}%)`);
      console.log(`   High accuracy: ${highAccuracyCount} (${((highAccuracyCount/totalWithCoords)*100).toFixed(1)}% of geocoded)`);

      await mongoose.connection.close();
    } catch (error) {
      console.error('Error in verification:', error);
    }
  }

  /**
   * Force re-geocode all hospitals (use with caution)
   */
  async forceRegeocode() {
    try {
      console.log('🔄 FORCE RE-GEOCODING ALL HOSPITALS');
      console.log('⚠️  This will update ALL hospital coordinates');
      
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      // Reset all coordinates
      await Hospital.updateMany({}, {
        $unset: { 'location.coordinates': 1 }
      });

      console.log('✅ All coordinates cleared. Running fresh geocoding...\n');

      await this.updateHospitalCoordinates();
    } catch (error) {
      console.error('Error in force re-geocoding:', error);
    }
  }
}

// Main execution
async function main() {
  const agent = new AccurateGeocodeAgent();
  
  console.log('🚀 MediBuddy Accurate Hospital Geocoding Agent');
  console.log('===============================================');
  console.log('🎯 Getting precise coordinates for each hospital');
  console.log('📍 Using Google Maps API + OpenStreetMap fallback\n');
  
  // Check if Google Maps API key is configured
  if (!process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY === 'your-google-maps-api-key-here') {
    console.log('⚠️  WARNING: Google Maps API key not configured!');
    console.log('   Add GOOGLE_MAPS_API_KEY to your .env file for best results');
    console.log('   Falling back to OpenStreetMap Nominatim API\n');
  }
  
  const args = process.argv.slice(2);
  
  if (args.includes('--force')) {
    console.log('🔄 Force mode: Re-geocoding ALL hospitals...\n');
    await agent.forceRegeocode();
  } else {
    await agent.updateHospitalCoordinates();
  }
  
  await agent.verifyUpdates();
  
  console.log('\n✨ Accurate geocoding process completed!');
  console.log('\n💡 Tips:');
  console.log('   - Get a Google Maps API key for best accuracy');
  console.log('   - Run with --force to re-geocode all hospitals');
  console.log('   - Check the accuracy field to see coordinate quality');
}

// Run the agent
main().catch(console.error);
