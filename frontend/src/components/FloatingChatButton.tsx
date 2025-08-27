import React, { useState } from 'react';
import AIChatbot from './AIChatbot';

const FloatingChatButton: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Professional Floating Button - Custom Styles */}
      <div 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999
        }}
      >
        <button
          onClick={() => setIsChatOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            position: 'relative',
            width: '48px',
            height: '48px',
            backgroundColor: isHovered ? '#1d4ed8' : '#2563eb',
            color: 'white',
            borderRadius: '8px',
            boxShadow: isHovered ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.2s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #3b82f6',
            outline: 'none',
            cursor: 'pointer'
          }}
          aria-label="Open MediBuddy AI Assistant"
        >
          {/* Chat Icon */}
          <svg 
            style={{ width: '24px', height: '24px' }} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>
          
          {/* Online indicator */}
          <div 
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '12px',
              height: '12px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              border: '2px solid white'
            }}
          >
            <div 
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            ></div>
          </div>
        </button>
        
        {/* Tooltip */}
        {isHovered && (
          <div 
            style={{
              position: 'absolute',
              bottom: '56px',
              right: '0',
              transition: 'all 0.2s ease-out'
            }}
          >
            <div 
              style={{
                backgroundColor: '#1f2937',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                whiteSpace: 'nowrap'
              }}
            >
              MediBuddy AI Assistant
              {/* Arrow */}
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: '16px',
                  width: '0',
                  height: '0',
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '4px solid #1f2937'
                }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <AIChatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
};

export default FloatingChatButton;
