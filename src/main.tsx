import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/study-forge-tokens.css';
import './styles/study-forge-utilities.css';
import './index.css';

function validateConfig() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    console.warn('VITE_GEMINI_API_KEY is not set. AI features may be unavailable.');
  }
}

validateConfig();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
