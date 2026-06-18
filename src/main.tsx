import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function validateConfig() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    console.error(
      '❌ VITE_GEMINI_API_KEY is not set.\n' +
      'Check your environment variables.'
    );
  } else {
    console.log('✓ Gemini API key detected.');
  }
}

validateConfig();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
