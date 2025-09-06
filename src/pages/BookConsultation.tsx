import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Upload, FileText, User, Phone, Mail, Calendar, Check } from 'lucide-react';
import api from '../services/api';

interface BookingData {
  treatment: any;
  hospital: any;
  doctor: any;
}

const BookConsultation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state as BookingData;
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    symptoms: '',
    preferredDate: '',
    preferredTime: '',
    additionalNotes: ''
  });
  
  const [reports, setReports] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [consent, setConsent] = useState(false);

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Invalid booking data. Please start over.</p>
          <button
            onClick={() => navigate('/treatment-journey')}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Start Treatment Journey
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReports(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consent) {
      alert('Please provide consent for sharing your reports with the hospital.');
      return;
    }

    setLoading(true);
    
    try {
      // Create form data for file upload
      const submitData = new FormData();
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });
      
      // Add booking details
      submitData.append('treatmentId', bookingData.treatment._id);
      submitData.append('treatmentName', bookingData.treatment.name);
      submitData.append('hospitalId', bookingData.hospital._id);
      submitData.append('hospitalName', bookingData.hospital.name);
      submitData.append('doctorId', bookingData.doctor._id);
      submitData.append('doctorName', bookingData.doctor.name);
      submitData.append('doctorSpecialization', bookingData.doctor.specialization);
      
      // Add files
      reports.forEach((file, index) => {
        submitData.append(`reports`, file);
      });
      
      submitData.append('hasConsent', 'true');
      submitData.append('appointmentType', 'virtual_consultation');
      submitData.append('status', 'pending');
      submitData.append('bookingDate', new Date().toISOString());

      // Submit to backend
      const response = await api.post('/appointments', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(true);
    } catch (error) {
      console.error('Error booking consultation:', error);
      alert('Error booking consultation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Consultation Booked Successfully!
          </h2>
          
          <div className="space-y-3 text-left mb-6">
            <p className="text-gray-600">
              <strong>Treatment:</strong> {bookingData.treatment.name}
            </p>
            <p className="text-gray-600">
              <strong>Hospital:</strong> {bookingData.hospital.name}
            </p>
            <p className="text-gray-600">
              <strong>Doctor:</strong> Dr. {bookingData.doctor.name}
            </p>
            <p className="text-gray-600">
              <strong>Email:</strong> {formData.email}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <p className="text-green-800 text-sm">
              Your virtual consultation is scheduled! A confirmation link will be sent to your email address within 24 hours.
            </p>
          </div>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Book Virtual Consultation</h1>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm space-y-1">
                <p><strong>Treatment:</strong> {bookingData.treatment.name}</p>
                <p><strong>Hospital:</strong> {bookingData.hospital.name}</p>
                <p><strong>Doctor:</strong> Dr. {bookingData.doctor.name} ({bookingData.doctor.specialization})</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Personal Information</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age *
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    required
                    min="1"
                    max="120"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter your age"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter your mobile number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>
            </div>

            {/* Consultation Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Consultation Details</span>
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Symptoms
                </label>
                <textarea
                  name="symptoms"
                  value={formData.symptoms}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Describe your current symptoms and concerns"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Time
                  </label>
                  <select
                    name="preferredTime"
                    value={formData.preferredTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select time</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="17:00">05:00 PM</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Any additional information or special requests"
                />
              </div>
            </div>

            {/* Medical Reports Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Medical Reports (Optional)</span>
              </h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Upload your medical reports, test results, or any relevant documents
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block bg-gray-100 text-gray-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-200"
                >
                  Choose Files
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 5MB each)
                </p>
              </div>
              
              {reports.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Uploaded files:</p>
                  {reports.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                      <FileText className="h-4 w-4" />
                      <span>{file.name}</span>
                      <span className="text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consent */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="consent" className="text-sm text-gray-700">
                  <strong>Consent for Information Sharing:</strong> I understand and consent that my personal information, medical reports, and consultation details will be securely stored in the system and shared with the selected hospital and doctor for the purpose of providing medical consultation and treatment. This information will be kept confidential and used only for medical purposes.
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !consent}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Booking Consultation...</span>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  <span>Book Virtual Consultation</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookConsultation;
