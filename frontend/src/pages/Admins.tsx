import React from 'react';

export default function Admins() {
  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#3B82F6' }}>
        👥 Admin Management
      </h1>
      <p style={{ color: '#9CA3AF', marginBottom: '2rem' }}>
        Manage Telegram admin permissions and user roles
      </p>
      
      <div style={{ 
        backgroundColor: '#1F2937', 
        padding: '2rem', 
        borderRadius: '0.75rem',
        border: '1px solid #374151',
        textAlign: 'center'
      }}>
        <p style={{ color: '#D1D5DB', fontSize: '1.2rem' }}>
          🚧 Admin management is loading...
        </p>
        <p style={{ color: '#9CA3AF', marginTop: '1rem' }}>
          User roles and Telegram integration will be available here.
        </p>
      </div>
    </div>
  );
} 