import React, { useState, useEffect, useCallback } from 'react';
import { reportAPI } from '../services/api';
import { 
  Upload, 
  FileText, 
  Brain, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Download,
  Eye,
  Plus,
  Filter,
  Search,
  Calendar,
  BarChart3,
  Users,
  Clock,
  AlertTriangle,
  Info,
  Trash2,
  RefreshCw,
  FileX,
  Loader2,
  ChevronRight,
  ChevronDown,
  Star,
  Heart,
  Zap,
  Shield,
  Target,
  Award,
  Database,
  Microscope
} from 'lucide-react';

interface TestResult {
  parameter: string;
  value: string;
  unit: string;
  normalRange: {
    min: string;
    max: string;
    description: string;
  };
  status: 'normal' | 'high' | 'low' | 'critical' | 'abnormal';
  description: string;
  category: string;
}

interface AIAnalysis {
  summary: string;
  keyFindings: Array<{
    parameter: string;
    value: string;
    status: 'normal' | 'high' | 'low' | 'critical' | 'abnormal';
    description: string;
  }>;
  recommendations: string[];
  followUpActions: string[];
  riskFactors: string[];
  overallAssessment: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface Report {
  _id: string;
  title: string;
  reportType: string;
  processingStatus: 'uploaded' | 'processing' | 'analyzed' | 'failed';
  createdAt: string;
  testResults: TestResult[];
  aiAnalysis?: AIAnalysis;
  trends?: Array<{
    parameter: string;
    trend: 'improving' | 'declining' | 'stable';
    description: string;
    previousValue: string;
    changePercent: number;
  }>;
  reportDate?: string;
  labName?: string;
  userId: string;
}

const ReportAnalysis: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['General', 'Blood Chemistry', 'Hematology']));
  const [showKeyFindings, setShowKeyFindings] = useState<Record<string, boolean>>({});
  const [deletingReport, setDeletingReport] = useState<string | null>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportNotes, setReportNotes] = useState('');

  const reportTypes = [
    'Blood Test',
    'Urine Test', 
    'X-Ray',
    'MRI',
    'CT Scan',
    'Ultrasound',
    'ECG/EKG',
    'Endoscopy',
    'Biopsy',
    'Pathology',
    'Other'
  ];

  // Fetch reports
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(''); // Clear any previous errors
    try {
      const params: any = {};
      if (filterType !== 'all') params.reportType = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;

      console.log('📡 Fetching reports with params:', params);
      console.log('🔗 API Base URL:', process.env.NODE_ENV === 'production' ? 'https://web-production-4fc87.up.railway.app/api' : 'http://localhost:5001/api');
      
      const response = await reportAPI.getReports(params);
      console.log('📊 Full API response:', response);
      console.log('📊 Response data:', response.data);
      console.log('📊 Response status:', response.status);
      
      // Extract reports from response and sort by creation date (newest first)
      const reportsData = response.data.reports || response.data || [];
      console.log('📊 Reports data extracted:', reportsData);
      
      const sortedReports = reportsData.sort((a: Report, b: Report) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setReports(sortedReports);
      console.log('✅ Reports loaded successfully:', sortedReports.length, 'reports');
    } catch (error: any) {
      console.error('❌ Error fetching reports:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      setError(error.response?.data?.error || error.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => {
    // Test API connection first
    const testConnection = async () => {
      try {
        console.log('🔍 Testing API connection...');
        const testResponse = await fetch('http://localhost:5001/health');
        const testData = await testResponse.json();
        console.log('✅ API connection test successful:', testData);
      } catch (error) {
        console.error('❌ API connection test failed:', error);
      }
    };
    
    testConnection();
    fetchReports();
    
    // Auto-refresh reports every 30 seconds to show new uploads
    const intervalId = setInterval(() => {
      fetchReports();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [fetchReports]);

  // Handle file upload
  const handleFileUpload = async () => {
    if (!uploadFile || !reportType) {
      setError('Please select a file and report type');
      return;
    }

    setUploading(true);
    setError('');

    try {
      console.log('📤 Uploading report:', {
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        reportType,
        title: reportTitle
      });

      const formData = new FormData();
      formData.append('reportFile', uploadFile);
      formData.append('reportType', reportType);
      if (reportTitle) formData.append('title', reportTitle);
      if (reportNotes) formData.append('notes', reportNotes);

      const response = await reportAPI.uploadReport(formData);
      console.log('✅ Upload successful:', response.data);
      
      // Reset form
      setUploadFile(null);
      setReportType('');
      setReportTitle('');
      setReportNotes('');
      setShowUploadModal(false);
      
      // Immediately refresh reports to show the new upload
      await fetchReports();
      
      // If the response contains the new report, automatically select it and show key findings
      if (response.data.report) {
        setSelectedReport(response.data.report);
        // Auto-expand key findings for new reports
        if (response.data.report.aiAnalysis?.keyFindings?.length > 0) {
          setShowKeyFindings(prev => ({
            ...prev,
            [response.data.report._id]: true
          }));
        }
      }
      
    } catch (error: any) {
      console.error('❌ Upload failed:', error);
      setError(error.response?.data?.error || 'Failed to upload report');
    } finally {
      setUploading(false);
    }
  };

  // Handle report deletion
  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    setDeletingReport(reportId);
    try {
      await reportAPI.deleteReport(reportId);
      console.log('✅ Report deleted successfully');
      
      // Remove from local state
      setReports(prev => prev.filter(report => report._id !== reportId));
      
      // Clear selected report if it was deleted
      if (selectedReport?._id === reportId) {
        setSelectedReport(null);
      }
      
      // Clear key findings state for deleted report
      setShowKeyFindings(prev => {
        const updated = { ...prev };
        delete updated[reportId];
        return updated;
      });
      
    } catch (error: any) {
      console.error('❌ Delete failed:', error);
      setError(error.response?.data?.error || 'Failed to delete report');
    } finally {
      setDeletingReport(null);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.type === 'text/plain') {
        setUploadFile(file);
        if (!reportTitle) {
          setReportTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      } else {
        setError('Please upload a PDF or text file');
      }
    }
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'uploaded':
        return { color: '#8b5cf6', bg: '#f3e8ff', icon: Clock, text: 'Uploaded' };
      case 'processing':
        return { color: '#f59e0b', bg: '#fef3c7', icon: Loader2, text: 'Processing' };
      case 'analyzed':
        return { color: '#10b981', bg: '#d1fae5', icon: CheckCircle, text: 'Analyzed' };
      case 'failed':
        return { color: '#ef4444', bg: '#fee2e2', icon: AlertCircle, text: 'Failed' };
      default:
        return { color: '#6b7280', bg: '#f3f4f6', icon: FileX, text: 'Unknown' };
    }
  };

  const getUrgencyDisplay = (level: string) => {
    switch (level) {
      case 'low':
        return { color: '#10b981', bg: '#d1fae5', icon: CheckCircle, text: 'Low Priority' };
      case 'medium':
        return { color: '#f59e0b', bg: '#fef3c7', icon: Info, text: 'Medium Priority' };
      case 'high':
        return { color: '#f97316', bg: '#fed7aa', icon: AlertTriangle, text: 'High Priority' };
      case 'critical':
        return { color: '#ef4444', bg: '#fee2e2', icon: AlertCircle, text: 'Critical' };
      default:
        return { color: '#6b7280', bg: '#f3f4f6', icon: Info, text: 'Unknown' };
    }
  };

  const getTestResultColor = (status: string) => {
    switch (status) {
      case 'normal':
        return { color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', textColor: '#065f46' };
      case 'high':
        return { color: '#f97316', bg: '#fff7ed', border: '#fdba74', textColor: '#c2410c' };
      case 'low':
        return { color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd', textColor: '#1e40af' };
      case 'critical':
        return { color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', textColor: '#dc2626' };
      case 'abnormal':
        return { color: '#8b5cf6', bg: '#faf5ff', border: '#c4b5fd', textColor: '#7c3aed' };
      default:
        return { color: '#6b7280', bg: '#f9fafb', border: '#d1d5db', textColor: '#374151' };
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp style={{ height: '16px', width: '16px', color: '#10b981' }} />;
      case 'declining':
        return <TrendingDown style={{ height: '16px', width: '16px', color: '#ef4444' }} />;
      default:
        return <Activity style={{ height: '16px', width: '16px', color: '#6b7280' }} />;
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleKeyFindings = (reportId: string) => {
    setShowKeyFindings(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }));
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.reportType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Group test results by category
  const groupedResults = selectedReport?.testResults?.reduce((acc, result) => {
    const category = result.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '16px',
              borderRadius: '20px',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
            }}>
              <Microscope style={{ height: '48px', width: '48px', color: 'white' }} />
            </div>
            <h1 style={{ 
              fontSize: '42px', 
              fontWeight: '900', 
              color: 'white', 
              margin: 0,
              textShadow: '0 4px 8px rgba(0,0,0,0.2)',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              AI Medical Report Analysis
            </h1>
          </div>
          <p style={{ 
            color: 'rgba(255,255,255,0.9)', 
            fontSize: '20px',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Upload your medical reports and get AI-powered insights with detailed analysis
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selectedReport ? '420px 1fr' : '1fr', gap: '32px' }}>
          {/* Left Panel - Reports List */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            {/* Controls */}
            <div style={{ 
              padding: '32px', 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderBottom: '1px solid #e2e8f0' 
            }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <button
                  onClick={() => setShowUploadModal(true)}
                  style={{
                    flex: 1,
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  <Plus style={{ height: '20px', width: '20px' }} />
                  Upload Report
                </button>
                <button
                  onClick={fetchReports}
                  disabled={loading}
                  style={{
                    padding: '16px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  <RefreshCw style={{ height: '20px', width: '20px', color: '#6b7280' }} />
                </button>
              </div>

              {/* Search */}
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', height: '20px', width: '20px', color: '#6b7280' }} />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 14px 14px 48px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Types</option>
                  {reportTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="analyzed">Analyzed</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            {/* Reports List */}
            <div style={{ maxHeight: '700px', overflowY: 'auto' }}>
              {error && (
                <div style={{ 
                  margin: '20px',
                  padding: '16px', 
                  backgroundColor: '#fee2e2', 
                  border: '2px solid #fca5a5',
                  borderRadius: '12px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle style={{ height: '20px', width: '20px', color: '#dc2626' }} />
                    <span style={{ fontSize: '16px', color: '#dc2626', fontWeight: '500' }}>{error}</span>
                  </div>
                  <button
                    onClick={() => {
                      setError('');
                      fetchReports();
                    }}
                    style={{
                      marginTop: '10px',
                      padding: '8px 16px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
              
              {loading ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                  <Loader2 style={{ height: '40px', width: '40px', color: '#667eea', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading reports...</p>
                </div>
              ) : filteredReports.length === 0 && !error ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                  <FileText style={{ height: '64px', width: '64px', color: '#cbd5e1', margin: '0 auto 20px' }} />
                  <p style={{ color: '#6b7280', fontSize: '18px', marginBottom: '8px', fontWeight: '600' }}>No reports found</p>
                  <p style={{ color: '#9ca3af', fontSize: '14px' }}>Upload your first medical report to get started</p>
                </div>
              ) : !error && filteredReports.length > 0 ? (
                filteredReports.map((report) => {
                  const statusDisplay = getStatusDisplay(report.processingStatus);
                  const StatusIcon = statusDisplay.icon;
                  const urgencyDisplay = report.aiAnalysis ? getUrgencyDisplay(report.aiAnalysis.urgencyLevel) : null;
                  
                  return (
                    <div
                      key={report._id}
                      onClick={() => setSelectedReport(report)}
                      style={{
                        padding: '24px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        backgroundColor: selectedReport?._id === report._id ? '#f8fafc' : 'white',
                        borderLeft: selectedReport?._id === report._id ? '6px solid #667eea' : '6px solid transparent',
                        transition: 'all 0.3s ease',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedReport?._id !== report._id) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.borderLeft = '6px solid #cbd5e1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedReport?._id !== report._id) {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.borderLeft = '6px solid transparent';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0, flex: 1 }}>
                          {report.title}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
                          <StatusIcon style={{ height: '14px', width: '14px', color: statusDisplay.color }} />
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: '600',
                            color: statusDisplay.color,
                            backgroundColor: statusDisplay.bg,
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            {statusDisplay.text}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReport(report._id);
                            }}
                            disabled={deletingReport === report._id}
                            style={{
                              padding: '4px',
                              backgroundColor: deletingReport === report._id ? '#f3f4f6' : '#fee2e2',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: deletingReport === report._id ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              marginLeft: '6px'
                            }}
                            onMouseEnter={(e) => {
                              if (deletingReport !== report._id) {
                                e.currentTarget.style.backgroundColor = '#fecaca';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (deletingReport !== report._id) {
                                e.currentTarget.style.backgroundColor = '#fee2e2';
                              }
                            }}
                          >
                            {deletingReport === report._id ? (
                              <Loader2 style={{ height: '12px', width: '12px', color: '#6b7280', animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <Trash2 style={{ height: '12px', width: '12px', color: '#dc2626' }} />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#6b7280',
                          backgroundColor: '#f3f4f6',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '500'
                        }}>
                          {report.reportType}
                        </span>
                        {urgencyDisplay && (
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: '600',
                            color: urgencyDisplay.color,
                            backgroundColor: urgencyDisplay.bg,
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            {urgencyDisplay.text}
                          </span>
                        )}
                      </div>
                      
                      <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                        {new Date(report.createdAt).toLocaleDateString()} • {report.testResults?.length || 0} parameters
                      </p>

                      {/* Key Findings & Recommendations Preview */}
                      {report.processingStatus === 'analyzed' && report.aiAnalysis && (
                        <div style={{ marginTop: '12px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleKeyFindings(report._id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              backgroundColor: '#eff6ff',
                              border: '1px solid #dbeafe',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#1e40af',
                              transition: 'all 0.2s',
                              width: '100%',
                              justifyContent: 'space-between'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Brain style={{ height: '14px', width: '14px' }} />
                              <span>AI Insights</span>
                            </div>
                            {showKeyFindings[report._id] ? 
                              <ChevronDown style={{ height: '14px', width: '14px' }} /> :
                              <ChevronRight style={{ height: '14px', width: '14px' }} />
                            }
                          </button>
                          
                          {showKeyFindings[report._id] && (
                            <div style={{ 
                              marginTop: '8px',
                              padding: '12px',
                              backgroundColor: '#f8fafc',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0'
                            }}>
                              {/* Key Findings */}
                              {report.aiAnalysis.keyFindings && report.aiAnalysis.keyFindings.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <Star style={{ height: '12px', width: '12px', color: '#f59e0b' }} />
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase' }}>
                                      Key Findings
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#374151', lineHeight: '1.4' }}>
                                    {report.aiAnalysis.keyFindings.slice(0, 2).map((finding, idx) => (
                                      <div key={idx} style={{ marginBottom: '4px' }}>
                                        • <strong>{finding.parameter}:</strong> {finding.description.slice(0, 50)}...
                                      </div>
                                    ))}
                                    {report.aiAnalysis.keyFindings.length > 2 && (
                                      <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                                        +{report.aiAnalysis.keyFindings.length - 2} more findings
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Recommendations */}
                              {report.aiAnalysis.recommendations && report.aiAnalysis.recommendations.length > 0 && (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <Heart style={{ height: '12px', width: '12px', color: '#10b981' }} />
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#065f46', textTransform: 'uppercase' }}>
                                      Recommendations
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#374151', lineHeight: '1.4' }}>
                                    {report.aiAnalysis.recommendations.slice(0, 2).map((rec, idx) => (
                                      <div key={idx} style={{ marginBottom: '4px' }}>
                                        • {rec.slice(0, 60)}...
                                      </div>
                                    ))}
                                    {report.aiAnalysis.recommendations.length > 2 && (
                                      <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                                        +{report.aiAnalysis.recommendations.length - 2} more recommendations
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : null}
            </div>
          </div>

          {/* Right Panel - Report Details */}
          {selectedReport && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              {/* Report Header */}
              <div style={{ 
                padding: '32px', 
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderBottom: '1px solid #e2e8f0' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {selectedReport.title}
                  </h2>
                  <button
                    onClick={() => setSelectedReport(null)}
                    style={{
                      padding: '10px',
                      backgroundColor: '#f3f4f6',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  >
                    ✕
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: '#667eea',
                    backgroundColor: '#eff6ff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #dbeafe'
                  }}>
                    {selectedReport.reportType}
                  </span>
                  <span style={{ 
                    fontSize: '14px', 
                    color: '#6b7280',
                    backgroundColor: '#f3f4f6',
                    padding: '6px 12px',
                    borderRadius: '8px'
                  }}>
                    {new Date(selectedReport.createdAt).toLocaleDateString()}
                  </span>
                  {selectedReport.labName && (
                    <span style={{ 
                      fontSize: '14px', 
                      color: '#6b7280',
                      backgroundColor: '#f3f4f6',
                      padding: '6px 12px',
                      borderRadius: '8px'
                    }}>
                      {selectedReport.labName}
                    </span>
                  )}
                </div>

                {selectedReport.aiAnalysis && (
                  <div style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    borderRadius: '12px',
                    border: '1px solid #93c5fd'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <Brain style={{ height: '20px', width: '20px', color: '#3b82f6' }} />
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e40af', margin: 0 }}>
                        AI Analysis Summary
                      </h3>
                    </div>
                    <p style={{ fontSize: '14px', color: '#1e40af', lineHeight: '1.6', margin: 0 }}>
                      {selectedReport.aiAnalysis.summary}
                    </p>
                  </div>
                )}
              </div>

              {/* Report Content */}
              <div style={{ padding: '32px', maxHeight: '800px', overflowY: 'auto' }}>
                {selectedReport.processingStatus === 'processing' ? (
                  <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      padding: '20px',
                      borderRadius: '20px',
                      display: 'inline-block',
                      marginBottom: '20px'
                    }}>
                      <Loader2 style={{ height: '48px', width: '48px', color: 'white', animation: 'spin 1s linear infinite' }} />
                    </div>
                    <h3 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                      AI Processing Report
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '16px' }}>
                      Our AI is analyzing your report. This usually takes 1-2 minutes.
                    </p>
                  </div>
                ) : selectedReport.processingStatus === 'failed' ? (
                  <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <AlertCircle style={{ height: '64px', width: '64px', color: '#ef4444', margin: '0 auto 20px' }} />
                    <h3 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                      Processing Failed
                    </h3>
                    <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '16px' }}>
                      We couldn't process this report. Try uploading again or contact support.
                    </p>
                    <button
                      onClick={() => {/* Add reprocess logic */}}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Retry Processing
                    </button>
                  </div>
                ) : selectedReport.testResults && selectedReport.testResults.length > 0 ? (
                  <div>
                    {/* Test Results Table */}
                    <div style={{ marginBottom: '40px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Database style={{ height: '24px', width: '24px', color: '#667eea' }} />
                        <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>
                          Test Results ({selectedReport.testResults.length})
                        </h3>
                      </div>
                      
                      {groupedResults && Object.entries(groupedResults).map(([category, results]) => (
                        <div key={category} style={{ marginBottom: '32px' }}>
                          <button
                            onClick={() => toggleCategory(category)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '16px 20px',
                              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                              border: '2px solid #e2e8f0',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              width: '100%',
                              marginBottom: '12px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#667eea'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                          >
                            {expandedCategories.has(category) ? 
                              <ChevronDown style={{ height: '20px', width: '20px', color: '#667eea' }} /> :
                              <ChevronRight style={{ height: '20px', width: '20px', color: '#667eea' }} />
                            }
                            <span style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                              {category} ({results.length})
                            </span>
                          </button>
                          
                          {expandedCategories.has(category) && (
                            <div style={{ 
                              border: '2px solid #e2e8f0', 
                              borderRadius: '16px', 
                              overflow: 'hidden',
                              backgroundColor: 'white',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                              {/* Table Header */}
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '2.5fr 1fr 2fr 1fr 140px', 
                                gap: '20px',
                                padding: '20px 24px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                fontSize: '14px',
                                fontWeight: '700',
                                color: 'white',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                <span>Parameter</span>
                                <span>Your Value</span>
                                <span>Normal Range</span>
                                <span>Unit</span>
                                <span>Status</span>
                              </div>
                              
                              {/* Table Rows */}
                              {results.map((result, index) => {
                                const colors = getTestResultColor(result.status);
                                return (
                                  <div 
                                    key={index}
                                    style={{ 
                                      display: 'grid', 
                                      gridTemplateColumns: '2.5fr 1fr 2fr 1fr 140px', 
                                      gap: '20px',
                                      padding: '20px 24px',
                                      borderBottom: index < results.length - 1 ? '1px solid #f1f5f9' : 'none',
                                      alignItems: 'center',
                                      backgroundColor: index % 2 === 0 ? '#fafbfc' : 'white'
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
                                        {result.parameter}
                                      </div>
                                      {result.description && (
                                        <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>
                                          {result.description}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div style={{ 
                                      fontSize: '18px', 
                                      fontWeight: '800',
                                      color: colors.textColor
                                    }}>
                                      {result.value}
                                    </div>
                                    
                                    <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                                      {result.normalRange.min && result.normalRange.max ? 
                                        `${result.normalRange.min} - ${result.normalRange.max}` :
                                        result.normalRange.description || 'N/A'
                                      }
                                    </div>
                                    
                                    <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                                      {result.unit || '-'}
                                    </div>
                                    
                                    <div style={{
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      color: colors.textColor,
                                      backgroundColor: colors.bg,
                                      border: `2px solid ${colors.border}`,
                                      padding: '6px 12px',
                                      borderRadius: '10px',
                                      textAlign: 'center',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}>
                                      {result.status}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* AI Analysis Sections */}
                    {selectedReport.aiAnalysis && (
                      <div style={{ display: 'grid', gap: '24px' }}>
                        {/* Key Findings */}
                        {selectedReport.aiAnalysis.keyFindings.length > 0 && (
                          <div style={{ 
                            padding: '24px', 
                            background: 'linear-gradient(135deg, #fef7cd 0%, #fef3c7 100%)',
                            borderRadius: '16px',
                            border: '2px solid #fbbf24',
                            boxShadow: '0 4px 6px -1px rgba(251, 191, 36, 0.1)'
                          }}>
                            <h4 style={{ fontSize: '20px', fontWeight: '700', color: '#92400e', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Star style={{ height: '20px', width: '20px' }} />
                              Key Findings
                            </h4>
                            <div style={{ display: 'grid', gap: '12px' }}>
                              {selectedReport.aiAnalysis.keyFindings.map((finding, index) => (
                                <div key={index} style={{ 
                                  fontSize: '16px', 
                                  color: '#92400e',
                                  padding: '12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                  borderRadius: '8px'
                                }}>
                                  <strong>{finding.parameter}:</strong> {finding.description}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {selectedReport.aiAnalysis.recommendations.length > 0 && (
                          <div style={{ 
                            padding: '24px', 
                            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                            borderRadius: '16px',
                            border: '2px solid #10b981',
                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.1)'
                          }}>
                            <h4 style={{ fontSize: '20px', fontWeight: '700', color: '#065f46', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Heart style={{ height: '20px', width: '20px' }} />
                              Recommendations
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: '24px' }}>
                              {selectedReport.aiAnalysis.recommendations.map((rec, index) => (
                                <li key={index} style={{ 
                                  fontSize: '16px', 
                                  color: '#065f46', 
                                  marginBottom: '8px',
                                  lineHeight: '1.5'
                                }}>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Trends */}
                        {selectedReport.trends && selectedReport.trends.length > 0 && (
                          <div style={{ 
                            padding: '24px', 
                            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                            borderRadius: '16px',
                            border: '2px solid #3b82f6',
                            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1)'
                          }}>
                            <h4 style={{ fontSize: '20px', fontWeight: '700', color: '#1e40af', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <BarChart3 style={{ height: '20px', width: '20px' }} />
                              Trends vs Previous Reports
                            </h4>
                            <div style={{ display: 'grid', gap: '12px' }}>
                              {selectedReport.trends.map((trend, index) => (
                                <div key={index} style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '12px', 
                                  fontSize: '16px', 
                                  color: '#1e40af',
                                  padding: '12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                  borderRadius: '8px'
                                }}>
                                  {getTrendIcon(trend.trend)}
                                  <strong>{trend.parameter}:</strong>
                                  <span>{trend.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <FileText style={{ height: '64px', width: '64px', color: '#cbd5e1', margin: '0 auto 20px' }} />
                    <h3 style={{ fontSize: '22px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                      No Analysis Available
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '16px' }}>
                      This report hasn't been analyzed yet or contains no structured data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowUploadModal(false);
                setUploadFile(null);
                setReportType('');
                setReportTitle('');
                setReportNotes('');
                setError('');
              }
            }}
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              width: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                  Upload Medical Report
                </h2>
                <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '16px' }}>
                  Upload a PDF or text file of your medical report for AI analysis
                </p>

                {/* File Upload Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  style={{
                    padding: '48px',
                    border: `3px dashed ${dragActive ? '#667eea' : '#d1d5db'}`,
                    borderRadius: '16px',
                    textAlign: 'center',
                    background: dragActive 
                      ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' 
                      : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    marginBottom: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {uploadFile ? (
                    <div>
                      <FileText style={{ height: '64px', width: '64px', color: '#667eea', margin: '0 auto 16px' }} />
                      <p style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                        {uploadFile.name}
                      </p>
                      <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '16px' }}>
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        onClick={() => setUploadFile(null)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: '#374151',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload style={{ height: '64px', width: '64px', color: '#9ca3af', margin: '0 auto 16px' }} />
                      <p style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                        Drop your file here
                      </p>
                      <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '20px' }}>
                        Supports PDF and text files up to 10MB
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center', marginBottom: '16px' }}>
                        <div style={{ height: '1px', flex: 1, backgroundColor: '#d1d5db' }}></div>
                        <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>OR</span>
                        <div style={{ height: '1px', flex: 1, backgroundColor: '#d1d5db' }}></div>
                      </div>
                      <button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        style={{
                          padding: '12px 24px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          margin: '0 auto',
                          transition: 'all 0.2s',
                          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                        }}
                      >
                        <Upload style={{ height: '20px', width: '20px' }} />
                        Browse Files
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFile(file);
                        if (!reportTitle) {
                          setReportTitle(file.name.replace(/\.[^/.]+$/, ''));
                        }
                      }
                    }}
                    style={{ display: 'none' }}
                    id="file-upload"
                  />
                </div>

                {/* Form Fields */}
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Report Type *
                    </label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #d1d5db',
                        borderRadius: '10px',
                        fontSize: '16px',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Select report type</option>
                      {reportTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Report Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder="Enter a custom title"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #d1d5db',
                        borderRadius: '10px',
                        fontSize: '16px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Notes (Optional)
                    </label>
                    <textarea
                      value={reportNotes}
                      onChange={(e) => setReportNotes(e.target.value)}
                      placeholder="Add any additional notes"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #d1d5db',
                        borderRadius: '10px',
                        fontSize: '16px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{ 
                    marginTop: '20px',
                    padding: '16px', 
                    backgroundColor: '#fee2e2', 
                    border: '2px solid #fca5a5',
                    borderRadius: '12px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertCircle style={{ height: '20px', width: '20px', color: '#dc2626' }} />
                      <span style={{ fontSize: '16px', color: '#dc2626', fontWeight: '500' }}>{error}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadFile(null);
                      setReportType('');
                      setReportTitle('');
                      setReportNotes('');
                      setError('');
                    }}
                    style={{
                      flex: 1,
                      padding: '16px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFileUpload}
                    disabled={!uploadFile || !reportType || uploading}
                    style={{
                      flex: 1,
                      padding: '16px',
                      background: (!uploadFile || !reportType || uploading) 
                        ? '#9ca3af' 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: (!uploadFile || !reportType || uploading) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: (!uploadFile || !reportType || uploading) 
                        ? 'none' 
                        : '0 4px 15px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    {uploading ? (
                      <>
                        <Loader2 style={{ height: '20px', width: '20px', animation: 'spin 1s linear infinite' }} />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Zap style={{ height: '20px', width: '20px' }} />
                        Upload & Analyze
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportAnalysis;
