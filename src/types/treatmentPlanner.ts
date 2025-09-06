// Treatment Planner Types
export interface TreatmentCostSource {
  source: string;
  url?: string;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  hospitals?: Array<{
    name: string;
    location: string;
    rating: number;
  }>;
  description?: string;
  reliability?: number;
  hospitalType?: string;
  lastUpdated: string;
}

export interface TreatmentCosts {
  sources: TreatmentCostSource[];
  analysis: string;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  lastUpdated: string;
  error?: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  reviews: number;
  specialties: string[];
  costRange: {
    min: number;
    max: number;
    currency: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  facilities: string[];
  insuranceAccepted: string[];
}

export interface Doctor {
  id: string;
  name: string;
  qualification: string;
  specialization: string;
  experience: string;
  hospital: string;
  rating: number;
  consultationFee: number;
  availability: string[];
  languages: string[];
  awards?: string[];
}

export interface TreatmentDetails {
  description: string;
  category: string;
  duration: string;
  complexity: string;
}

export interface TreatmentRecommendations {
  aiRecommendations: string;
  topHospitalPicks: Array<{
    name: string;
    reason: string;
  }>;
  budgetOptions: Array<{
    name: string;
    cost: string;
  }>;
  premiumOptions: Array<{
    name: string;
    cost: string;
  }>;
}

export interface TreatmentPlan {
  treatment: {
    name: string;
    details: TreatmentDetails;
    location: string;
    insurance: string;
  };
  costs: TreatmentCosts;
  hospitals: Hospital[];
  doctors: Doctor[];
  recommendations: TreatmentRecommendations;
  generatedAt: string;
}

export interface TreatmentPlannerResponse {
  success: boolean;
  data: TreatmentPlan;
}

export interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}
