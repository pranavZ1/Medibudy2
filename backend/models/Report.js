const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  parameter: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  unit: String,
  normalRange: {
    min: String,
    max: String,
    description: String
  },
  status: {
    type: String,
    enum: ['normal', 'high', 'low', 'critical', 'abnormal'],
    required: true
  },
  description: String,
  category: String // e.g., 'Blood Chemistry', 'Hematology', 'Lipid Profile'
});

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportType: {
    type: String,
    required: true,
    enum: ['Blood Test', 'Urine Test', 'X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'ECG/EKG', 'Endoscopy', 'Biopsy', 'Pathology', 'Other']
  },
  title: String,
  originalFileName: String,
  extractedText: String,
  
  // Structured data extracted from the report
  testResults: [testResultSchema],
  
  // AI Analysis
  aiAnalysis: {
    summary: String,
    keyFindings: [{
      parameter: String,
      value: String,
      status: {
        type: String,
        enum: ['normal', 'high', 'low', 'critical', 'abnormal']
      },
      description: String
    }],
    recommendations: [String],
    followUpActions: [String],
    riskFactors: [String],
    overallAssessment: String,
    urgencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    }
  },
  
  // Medical metadata
  reportDate: Date,
  labName: String,
  doctorName: String,
  patientInfo: {
    age: Number,
    gender: String,
    referenceId: String
  },
  
  // File information
  fileInfo: {
    originalName: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Status tracking
  processingStatus: {
    type: String,
    enum: ['uploaded', 'processing', 'analyzed', 'failed'],
    default: 'uploaded'
  },
  
  // Comparison with previous reports
  trends: [{
    parameter: String,
    trend: {
      type: String,
      enum: ['improving', 'declining', 'stable']
    },
    description: String,
    previousValue: String,
    changePercent: Number
  }],
  
  tags: [String],
  notes: String,
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
reportSchema.index({ userId: 1, createdAt: -1 });
reportSchema.index({ reportType: 1 });
reportSchema.index({ 'aiAnalysis.urgencyLevel': 1 });
reportSchema.index({ processingStatus: 1 });

// Virtual for getting report age
reportSchema.virtual('reportAge').get(function() {
  if (this.reportDate) {
    return Math.floor((Date.now() - this.reportDate.getTime()) / (1000 * 60 * 60 * 24));
  }
  return null;
});

module.exports = mongoose.model('Report', reportSchema);
