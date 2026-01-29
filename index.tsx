import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  console.error("Fatal Error during React Mount:", e);
  rootElement.innerHTML = `<div style="color:red; padding:20px; font-family:sans-serif;"><h1>Fatal Error</h1><p>${e instanceof Error ? e.message : 'Unknown error'}</p></div>`;
}