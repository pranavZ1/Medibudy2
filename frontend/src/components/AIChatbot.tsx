import React, { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../services/api';
import { useLocation } from '../contexts/LocationContext';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  data?: any;
  intent?: string;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m MediBuddy AI, your medical assistant. I can help you with:\n\n• Symptom checking and health analysis\n• Finding nearby hospitals and doctors\n• Medical information and guidance\n• General health advice\n\nWhat can I help you with today?',
      timestamp: new Date(),
      intent: 'greeting'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { userLocation } = useLocation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await aiAPI.sendChatMessage(inputText.trim(), userLocation);
      
      setIsTyping(false);
      
      if (response.data.success && response.data.response) {
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: response.data.response.response,
          timestamp: new Date(),
          data: response.data.response.data,
          intent: response.data.response.intent
        };

        setMessages(prev => [...prev, botMessage]);

        // Add additional UI elements based on intent
        if (response.data.response.data) {
          setTimeout(() => {
            addDataVisualization(response.data.response.data, response.data.response.intent);
          }, 1000);
        }
      } else {
        throw new Error(response.data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'I apologize, but I\'m having trouble processing your request right now. Please try again or consult with a healthcare professional for immediate assistance.',
        timestamp: new Date(),
        intent: 'error'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const addDataVisualization = (data: any, intent: string) => {
    let visualizationContent = '';

    if (intent === 'symptom_check' && data.analysis) {
      visualizationContent = formatSymptomAnalysis(data.analysis, data.nearbyDoctors);
    } else if (intent === 'hospital_finder' && data.hospitals) {
      visualizationContent = formatHospitalList(data.hospitals, data.searchRadius);
    } else if (intent === 'disease_info' && data.diseaseDetails) {
      visualizationContent = formatDiseaseInfo(data.diseaseDetails);
    }

    if (visualizationContent) {
      const dataMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'bot',
        content: visualizationContent,
        timestamp: new Date(),
        intent: `${intent}_data`
      };

      setMessages(prev => [...prev, dataMessage]);
    }
  };

  const formatSymptomAnalysis = (analysis: any, nearbyDoctors: any[] = []) => {
    let content = '📊 **Detailed Analysis:**\n\n';
    
    if (analysis.possibleConditions && analysis.possibleConditions.length > 0) {
      content += '🔍 **Possible Conditions:**\n';
      analysis.possibleConditions.slice(0, 3).forEach((condition: any, index: number) => {
        content += `${index + 1}. **${condition.condition}**\n`;
        content += `   📈 Likelihood: ${condition.likelihood}\n`;
        if (condition.description) {
          content += `   📝 ${condition.description.substring(0, 100)}...\n`;
        }
        content += '\n';
      });
    }

    if (analysis.urgencyLevel) {
      const urgencyEmoji = analysis.urgencyLevel === 'High' ? '🚨' : 
                          analysis.urgencyLevel === 'Medium' ? '⚠️' : '💡';
      content += `${urgencyEmoji} **Urgency Level:** ${analysis.urgencyLevel}\n\n`;
    }

    if (analysis.recommendations && analysis.recommendations.length > 0) {
      content += '💊 **Recommendations:**\n';
      analysis.recommendations.slice(0, 3).forEach((rec: string, index: number) => {
        content += `• ${rec}\n`;
      });
      content += '\n';
    }

    if (nearbyDoctors && nearbyDoctors.length > 0) {
      content += '👨‍⚕️ **Nearby Specialists:**\n';
      nearbyDoctors.slice(0, 3).forEach((doctor: any, index: number) => {
        content += `${index + 1}. **Dr. ${doctor.name}**\n`;
        content += `   🏥 ${doctor.hospitalName || 'Hospital Name'}\n`;
        content += `   🎯 ${doctor.specialization}\n`;
        if (doctor.experience) {
          content += `   📅 ${doctor.experience} years experience\n`;
        }
        content += '\n';
      });
    }

    return content;
  };

  const formatHospitalList = (hospitals: any[], radius: number = 10) => {
    let content = `🏥 **Nearby Hospitals (within ${radius}km):**\n\n`;
    
    hospitals.slice(0, 5).forEach((hospital: any, index: number) => {
      content += `${index + 1}. **${hospital.name}**\n`;
      content += `   📍 ${hospital.address || hospital.location?.address || 'Address not available'}\n`;
      
      if (hospital.distance) {
        content += `   📏 Distance: ${hospital.distance}km\n`;
      }
      
      if (hospital.rating) {
        content += `   ⭐ Rating: ${hospital.rating}/5\n`;
      }
      
      if (hospital.phone) {
        content += `   📞 Phone: ${hospital.phone}\n`;
      }
      
      if (hospital.specialties && hospital.specialties.length > 0) {
        content += `   🏷️ Specialties: ${hospital.specialties.slice(0, 3).map((s: any) => s.name || s).join(', ')}\n`;
      }
      
      content += '\n';
    });

    return content;
  };

  const formatDiseaseInfo = (diseaseDetails: any) => {
    let content = `📚 **Disease Information:**\n\n`;
    
    if (diseaseDetails.name) {
      content += `**${diseaseDetails.name}**\n\n`;
    }
    
    if (diseaseDetails.description) {
      content += `📝 **Description:**\n${diseaseDetails.description}\n\n`;
    }
    
    if (diseaseDetails.symptoms && diseaseDetails.symptoms.length > 0) {
      content += `🤒 **Common Symptoms:**\n`;
      diseaseDetails.symptoms.slice(0, 5).forEach((symptom: string) => {
        content += `• ${symptom}\n`;
      });
      content += '\n';
    }
    
    if (diseaseDetails.treatmentOptions && diseaseDetails.treatmentOptions.length > 0) {
      content += `💊 **Treatment Options:**\n`;
      diseaseDetails.treatmentOptions.slice(0, 3).forEach((treatment: string) => {
        content += `• ${treatment}\n`;
      });
      content += '\n';
    }

    return content;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getSuggestions = () => {
    return [
      "I have fever and cough",
      "Find hospitals near me",
      "What is diabetes?",
      "I'm having chest pain",
      "Find cardiologists nearby"
    ];
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - subtle overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-10 backdrop-blur-[1px] z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Professional Chat Panel - GitHub Copilot Style */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 transform transition-transform duration-300 ease-out">
        {/* Header - Clean and Professional */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">MediBuddy AI</h2>
              <p className="text-xs text-gray-500">Medical Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors duration-200 text-gray-500 hover:text-gray-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area - Clean scrollable area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 chat-scrollbar">
          {messages.map((message, index) => (
            <div key={message.id} className="space-y-2 animate-smooth-fade-in">
              {/* Message bubble */}
              <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  {/* Sender label */}
                  <div className={`text-xs font-medium mb-1 ${
                    message.type === 'user' ? 'text-right text-gray-600' : 'text-left text-gray-700'
                  }`}>
                    {message.type === 'user' ? 'You' : 'MediBuddy AI'}
                  </div>
                  
                  {/* Message content */}
                  <div className={`p-3 rounded-lg text-sm leading-relaxed ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                  }`}>
                    <div className="whitespace-pre-line">
                      {message.content}
                    </div>
                  </div>
                  
                  {/* Timestamp */}
                  <div className={`text-xs text-gray-500 mt-1 ${
                    message.type === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <div className="text-xs font-medium mb-1 text-gray-700">MediBuddy AI</div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions - Clean button layout */}
        {messages.length === 1 && (
          <div className="p-4 border-t border-gray-200 bg-white">
            <p className="text-sm text-gray-700 font-medium mb-3">Quick actions</p>
            <div className="space-y-2">
              {getSuggestions().map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left text-sm p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 border border-gray-200 hover:border-gray-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area - Clean and professional */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your health..."
                className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
                rows={1}
                style={{ minHeight: '40px', maxHeight: '120px' }}
                disabled={isLoading}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputText.trim()}
              className="flex-shrink-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg flex items-center justify-center transition-colors duration-200 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>Press Enter to send</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIChatbot;
