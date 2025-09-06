# Google Maps API Setup Guide

## Getting Your Google Maps API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select a Project**
   - Create a new project or select an existing one
   - Project name: "MediBuddy Hospital Geocoding"

3. **Enable the Geocoding API**
   - Go to "APIs & Services" → "Library"
   - Search for "Geocoding API"
   - Click on it and press "Enable"

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

5. **Secure Your API Key (Recommended)**
   - Click on the API key to edit it
   - Under "Application restrictions": Choose "HTTP referrers" or "IP addresses"
   - Under "API restrictions": Select "Restrict key" and choose "Geocoding API"

6. **Add to Your Environment**
   - Open `/Users/meherpranav/Desktop/MediBuddy2/backend/.env`
   - Replace `your-google-maps-api-key-here` with your actual API key:
   ```
   GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
   ```

## Pricing Information

- **Free Tier**: 40,000 requests per month
- **Cost**: $5 per 1,000 requests after free tier
- **For this project**: If you have 1,000 hospitals, it will use ~5,000-10,000 requests (due to retries)

## Alternative (Free Option)

If you don't want to use Google Maps API, the script will automatically fall back to OpenStreetMap Nominatim (free but less accurate).

## Running the Geocoding Script

```bash
# Standard mode (only geocode hospitals without coordinates)
cd /Users/meherpranav/Desktop/MediBuddy2/backend
node geocode-hospitals.js

# Force mode (re-geocode ALL hospitals)
node geocode-hospitals.js --force
```

## What the Script Does

1. **Finds hospitals** without accurate coordinates
2. **Generates multiple address variations** for each hospital:
   - "Hospital Name, Full Address, City, State, India"
   - "Hospital Name, City, State, India"
   - "Hospital Name Hospital, City, India"
   - etc.

3. **Tries Google Maps API first** for highest accuracy
4. **Falls back to OpenStreetMap** if Google fails
5. **Updates database** with:
   - Precise latitude/longitude
   - Accuracy level (very_high, high, medium, low)
   - Data source (google_maps, nominatim)
   - Formatted address
   - Last updated timestamp

## Expected Results

- **Very High Accuracy**: Exact building location (GPS coordinates)
- **High Accuracy**: Approximate building location
- **Medium Accuracy**: Street/area level
- **Low Accuracy**: City level (like your current data)

This will ensure each hospital has unique, accurate coordinates instead of all hospitals in a city sharing the same coordinates.
