import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './style.css';

// SPA fallback for GitHub Pages: restore path saved by 404.html
const savedPath = sessionStorage.getItem('spa-fallback-path');
if (savedPath) {
  sessionStorage.removeItem('spa-fallback-path');
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (current === '/' || current.startsWith('/solaire-frontend/')) {
    const target = savedPath.startsWith('/solaire-frontend') ? savedPath : '/solaire-frontend' + savedPath;
    window.history.replaceState(null, '', target);
  }
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
