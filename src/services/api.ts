import axios from 'axios';

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // If explicitly set via environment variable, use that
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In production (on Netlify), use Railway backend
  if (process.env.NODE_ENV === 'production') {
    return 'https://web-production-4fc87.up.railway.app/api';
  }
  
  // For local development
  return 'http://localhost:5001/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (userData: {
    name: string;
    email: string;
    password: string;
    age?: number;
    gender?: string;
    location?: {
      type: string;
      coordinates: [number, number];
      address: string;
    };
  }) => api.post('/auth/register', userData),
  
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
};

// AI API
export const aiAPI = {
  analyzeSymptoms: (symptoms: string[], additionalInfo?: string, userLocation?: any) =>
    api.post('/ai/analyze-symptoms-simple', { symptoms, additionalInfo, userLocation }),
  
  getDiseaseDetails: (diseaseName: string, userSymptoms?: string[], userLocation?: any) =>
    api.post('/ai/disease-details', { diseaseName, userSymptoms, userLocation }),
  
  getUserLocation: () => api.get('/ai/user-location'),
  
  recommendTreatments: (condition: string, location?: string) =>
    api.post('/ai/recommend-treatments', { condition, location }),
  
  findHospitals: (treatmentType: string, location: string, radius?: number) =>
    api.post('/ai/find-hospitals', { treatmentType, location, radius }),
  
  analyzeReport: (reportText: string, reportType?: string) =>
    api.post('/ai/analyze-report', { reportText, reportType }),
  
  sendChatMessage: (message: string, userLocation?: any) =>
    api.post('/ai/chatbot', { message, userLocation }),
};

// Treatments API
export const treatmentsAPI = {
  search: (params: {
    query?: string;
    category?: string;
    priceRange?: { min: number; max: number };
    location?: string;
    page?: number;
    limit?: number;
  }) => api.get('/treatments/search', { params }),
  
  getById: (id: string) => api.get(`/treatments/${id}`),
  
  getCategories: () => api.get('/treatments/categories'),
};

// Hospitals API
export const hospitalsAPI = {
  search: (params: {
    location?: string;
    specialization?: string;
    rating?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }) => api.get('/hospitals/search', { params }),
  
  getById: (id: string) => api.get(`/hospitals/${id}`),
  
  getNearby: (coordinates: [number, number], radius: number = 10) =>
    api.get('/hospitals/nearby', { 
      params: { 
        longitude: coordinates[0], 
        latitude: coordinates[1], 
        radius 
      } 
    }),
};

// Location API
export const locationAPI = {
  getCurrentLocation: () => api.get('/location/current'),
  
  geocode: (address: string) => api.post('/location/geocode', { address }),
  
  reverseGeocode: (lat: number, lng: number) => 
    api.post('/location/reverse-geocode', { lat, lng }),
  
  searchPlaces: (query: string, limit?: number) => 
    api.get('/location/search', { params: { query, limit } }),
  
  getNearbyHospitals: (lat: number, lng: number, radius?: number, specialty?: string, limit?: number) =>
    api.get('/location/nearby-hospitals', { 
      params: { lat, lng, radius, specialty, limit } 
    }),
  
  getNearbyDoctors: (lat: number, lng: number, radius?: number, specialization?: string, limit?: number) =>
    api.get('/location/nearby-doctors', { 
      params: { lat, lng, radius, specialization, limit } 
    }),
  
  getNearbyHealthcare: (lat: number, lng: number, radius?: number, specialty?: string, specialization?: string, hospitalLimit?: number, doctorLimit?: number) =>
    api.get('/location/nearby-healthcare', { 
      params: { lat, lng, radius, specialty, specialization, hospitalLimit, doctorLimit } 
    }),
  
  getUserLocation: () => api.get('/location/user'),
  
  updateUserLocation: (location: {
    type: string;
    coordinates: [number, number];
    address: string;
  }) => api.put('/location/user', { location }),
};

// Hospital API
export const hospitalAPI = {
  getHospitalDetails: (hospitalId: string) => api.get(`/hospitals/${hospitalId}`),
  getDoctorDetails: (doctorId: string) => api.get(`/hospitals/doctor/${doctorId}`)
};

// Hardcoded user ID for testing (since no login system)
const HARDCODED_USER_ID = '507f1f77bcf86cd799439012';

export const reportAPI = {
  uploadReport: (formData: FormData) => api.post(`/reports/upload/${HARDCODED_USER_ID}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getReports: (params?: any) => api.get(`/reports/${HARDCODED_USER_ID}`, { params }),
  getReport: (id: string) => api.get(`/reports/${HARDCODED_USER_ID}/${id}`),
  updateReport: (id: string, data: any) => api.put(`/reports/${HARDCODED_USER_ID}/${id}`, data),
  deleteReport: (id: string) => api.delete(`/reports/${HARDCODED_USER_ID}/${id}`),
  reprocessReport: (id: string) => api.post(`/reports/${HARDCODED_USER_ID}/${id}/reprocess`),
  getAnalytics: () => api.get(`/reports/${HARDCODED_USER_ID}/analytics/dashboard`)
};

export default api;
