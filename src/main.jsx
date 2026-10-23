
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const root = document.getElementById('root');

window.addEventListener('error', (event) => {
  root.innerHTML = `
    <div style="background:#101827;color:white;padding:24px;direction:rtl;font-family:Arial">
      <h2>تعذّر تشغيل المتجر</h2>
      <pre style="white-space:pre-wrap;overflow-wrap:anywhere">${event.message || 'خطأ غير معروف'}</pre>
    </div>
  `;
});

window.addEventListener('unhandledrejection', (event) => {
  root.innerHTML = `
    <div style="background:#101827;color:white;padding:24px;direction:rtl;font-family:Arial">
      <h2>خطأ أثناء تشغيل المتجر</h2>
      <pre style="white-space:pre-wrap;overflow-wrap:anywhere">${String(event.reason?.message || event.reason || 'خطأ غير معروف')}</pre>
    </div>
  `;
});

try {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  root.innerHTML = `
    <div style="background:#101827;color:white;padding:24px;direction:rtl;font-family:Arial">
      <h2>تعذّر تشغيل المتجر</h2>
      <pre style="white-space:pre-wrap;overflow-wrap:anywhere">${String(error.message || error)}</pre>
    </div>
  `;
}
