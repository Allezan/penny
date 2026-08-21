import React from 'react';

export default function HomePage() {
  return (
    <main style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '1rem',
          padding: '2.5rem 2rem',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🪙</div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '-0.025em' }}>
          Penny
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.125rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          Personal Finance Receipt-Tracking Assistant
        </p>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
                marginRight: '0.75rem',
                boxShadow: '0 0 10px #10b981',
              }}
            ></span>
            <strong style={{ color: '#f1f5f9', fontSize: '0.95rem' }}>Status: Operational</strong>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Telegram Webhook endpoint active at <code>/api/telegram/webhook</code>
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div style={{ background: 'rgba(51, 65, 85, 0.4)', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📸</div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>1. Snap Photo</div>
          </div>
          <div style={{ background: 'rgba(51, 65, 85, 0.4)', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🤖</div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>2. AI Extraction</div>
          </div>
          <div style={{ background: 'rgba(51, 65, 85, 0.4)', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📊</div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>3. Google Sheets</div>
          </div>
        </div>
      </div>
    </main>
  );
}
