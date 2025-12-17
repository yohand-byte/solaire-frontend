import React, { useEffect, useState } from 'react';
import { healthApi } from '../api/health';

export function HealthDebug() {
  const [status, setStatus] = useState<string>('...');
  const [timestamp, setTimestamp] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    healthApi.ping()
      .then((res) => {
        setStatus(res.data?.status || 'unknown');
        setTimestamp(res.data?.timestamp || '');
      })
      .catch((err) => setError(err?.message || 'error'));
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Health Debug</h2>
      <p>Status: {status}</p>
      <p>Timestamp: {timestamp}</p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
