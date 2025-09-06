const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Report = require('../models/Report');
const MedicalReportAI = require('../utils/medicalReportAI');
const { mockAuth } = require('../middleware/auth');
const router = express.Router();

// Initialize AI service
const medicalAI = new MedicalReportAI();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF files and text files
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and text files are allowed'), false);
    }
  }
});

// Upload and analyze report
router.post('/upload/:uid', mockAuth, upload.single('reportFile'), async (req, res) => {
  try {
    const { reportType, title, notes } = req.body;
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📄 Processing report upload for user:', userId);
    console.log('📄 File info:', {
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    });

    // Clean reportType to remove any trailing spaces
    const cleanReportType = reportType ? reportType.trim() : 'Other';

    // Extract text from PDF or get text content
    let extractedText = '';
    
    if (req.file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
    } else {
      extractedText = req.file.buffer.toString('utf8');
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'No text could be extracted from the file' });
    }

    console.log('📄 Extracted text length:', extractedText.length);

    // Create initial report record
    const report = new Report({
      userId,
      reportType: cleanReportType,
      title: title || req.file.originalname,
      originalFileName: req.file.originalname,
      extractedText,
      fileInfo: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      },
      processingStatus: 'processing',
      notes
    });

    await report.save();
    console.log('📄 Report saved with ID:', report._id);

      // Analyze with AI in background
      try {
        console.log('🤖 Starting AI analysis...');
        const aiResult = await medicalAI.analyzeReport(extractedText, cleanReportType);      // Get previous reports for trend analysis
      const previousReports = await Report.find({
        userId,
        _id: { $ne: report._id },
        processingStatus: 'analyzed'
      })
      .sort({ createdAt: -1 })
      .limit(5);

      // Generate trends if we have previous reports
      let trends = [];
      if (aiResult.testResults && aiResult.testResults.length > 0) {
        trends = await medicalAI.generateTrends(aiResult.testResults, previousReports);
      }

      // Update report with AI analysis
      report.testResults = aiResult.testResults;
      report.aiAnalysis = aiResult.aiAnalysis;
      report.trends = trends;
      
      // Extract and set metadata
      if (aiResult.extractedMetadata) {
        if (aiResult.extractedMetadata.reportDate) {
          report.reportDate = new Date(aiResult.extractedMetadata.reportDate);
        }
        if (aiResult.extractedMetadata.labName) {
          report.labName = aiResult.extractedMetadata.labName;
        }
        if (aiResult.extractedMetadata.doctorName) {
          report.doctorName = aiResult.extractedMetadata.doctorName;
        }
        if (aiResult.extractedMetadata.patientInfo) {
          report.patientInfo = aiResult.extractedMetadata.patientInfo;
        }
      }

      report.processingStatus = 'analyzed';
      await report.save();

      console.log('✅ AI analysis completed successfully');
      
    } catch (aiError) {
      console.error('❌ AI analysis failed:', aiError);
      report.processingStatus = 'failed';
      await report.save();
    }

    // Return the report (even if AI analysis failed)
    const populatedReport = await Report.findById(report._id);
    
    res.json({
      message: 'Report uploaded and processing initiated',
      report: populatedReport
    });

  } catch (error) {
    console.error('Error uploading report:', error);
    res.status(500).json({ error: 'Failed to upload and process report' });
  }
});

// Get all reports for a user
router.get('/:uid', mockAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, reportType, status } = req.query;
    
    const query = { userId, isArchived: false };
    
    if (reportType && reportType !== 'all') {
      query.reportType = reportType;
    }
    
    if (status && status !== 'all') {
      query.processingStatus = status;
    }

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-extractedText'); // Exclude large text field from list view

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get specific report with full details
router.get('/:uid/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const report = await Report.findOne({ _id: id, userId });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Update report (add notes, tags, etc.)
router.put('/:uid/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { notes, tags, title } = req.body;

    const report = await Report.findOneAndUpdate(
      { _id: id, userId },
      { 
        ...(notes !== undefined && { notes }),
        ...(tags !== undefined && { tags }),
        ...(title !== undefined && { title })
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Archive/delete report
router.delete('/:uid/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const report = await Report.findOneAndUpdate(
      { _id: id, userId },
      { isArchived: true },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ message: 'Report archived successfully' });
  } catch (error) {
    console.error('Error archiving report:', error);
    res.status(500).json({ error: 'Failed to archive report' });
  }
});

// Get report analytics/dashboard data
router.get('/analytics/dashboard', mockAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get counts by status
    const statusCounts = await Report.aggregate([
      { $match: { userId: userId, isArchived: false } },
      { $group: { _id: '$processingStatus', count: { $sum: 1 } } }
    ]);

    // Get counts by report type
    const typeCounts = await Report.aggregate([
      { $match: { userId: userId, isArchived: false } },
      { $group: { _id: '$reportType', count: { $sum: 1 } } }
    ]);

    // Get recent critical/high urgency reports
    const criticalReports = await Report.find({
      userId,
      isArchived: false,
      'aiAnalysis.urgencyLevel': { $in: ['high', 'critical'] }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title reportType aiAnalysis.urgencyLevel aiAnalysis.summary createdAt');

    // Get trends for common parameters
    const trendData = await Report.aggregate([
      { $match: { userId: userId, isArchived: false, processingStatus: 'analyzed' } },
      { $unwind: '$testResults' },
      { 
        $group: {
          _id: '$testResults.parameter',
          latestValue: { $last: '$testResults.value' },
          latestStatus: { $last: '$testResults.status' },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gte: 2 } } }, // Only parameters with multiple readings
      { $limit: 10 }
    ]);

    res.json({
      statusCounts,
      typeCounts,
      criticalReports,
      trendData,
      totalReports: await Report.countDocuments({ userId, isArchived: false })
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Reprocess report with AI (if analysis failed)
router.post('/:id/reprocess', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const report = await Report.findOne({ _id: id, userId });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (!report.extractedText) {
      return res.status(400).json({ error: 'No extracted text available for reprocessing' });
    }

    // Set status to processing
    report.processingStatus = 'processing';
    await report.save();

    try {
      // Reanalyze with AI
      const aiResult = await medicalAI.analyzeReport(report.extractedText, report.reportType);
      
      // Get previous reports for trend analysis
      const previousReports = await Report.find({
        userId,
        _id: { $ne: report._id },
        processingStatus: 'analyzed'
      })
      .sort({ createdAt: -1 })
      .limit(5);

      // Generate trends
      let trends = [];
      if (aiResult.testResults && aiResult.testResults.length > 0) {
        trends = await medicalAI.generateTrends(aiResult.testResults, previousReports);
      }

      // Update report
      report.testResults = aiResult.testResults;
      report.aiAnalysis = aiResult.aiAnalysis;
      report.trends = trends;
      report.processingStatus = 'analyzed';
      
      await report.save();

      res.json({ 
        message: 'Report reprocessed successfully',
        report 
      });

    } catch (aiError) {
      console.error('AI reprocessing failed:', aiError);
      report.processingStatus = 'failed';
      await report.save();
      
      res.status(500).json({ error: 'AI analysis failed during reprocessing' });
    }

  } catch (error) {
    console.error('Error reprocessing report:', error);
    res.status(500).json({ error: 'Failed to reprocess report' });
  }
});

module.exports = router;
