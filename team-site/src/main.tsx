import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initMonitoring } from './lib/sentry';
import './styles.css';

// T30 - start Sentry monitoring before the app renders.
initMonitoring();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
