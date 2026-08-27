'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: '24px',
          minHeight: '100vh',
          backgroundColor: '#070B14',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            marginBottom: '16px',
          }}
        >
          ₹
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 8px 0', color: '#ffffff' }}>
          CoinFlip System Recovering
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '420px', margin: '0 0 24px 0' }}>
          The app encountered a temporary loading pause. Please click below to reload and resume playing.
        </p>
        <button
          type="button"
          onClick={() => {
            if (typeof reset === 'function') reset();
            if (typeof window !== 'undefined') window.location.reload();
          }}
          style={{
            padding: '12px 28px',
            borderRadius: '12px',
            backgroundColor: '#eab308',
            color: '#020617',
            fontWeight: 800,
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(234, 179, 8, 0.3)',
          }}
        >
          Reload CoinFlip
        </button>
      </body>
    </html>
  );
}
