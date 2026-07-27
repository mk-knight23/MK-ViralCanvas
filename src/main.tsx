// MUST stay the first import: persisted zustand stores hydrate from
// localStorage the moment their modules are evaluated, so the legacy-key
// migration has to run before anything else is imported.
import './bootstrapStorage';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import './index.css';
import { useSettingsStore } from './stores/settings';
import { useStatsStore } from './stores/stats';
import { loadAnalytics } from './utils/loadAnalytics';

function initializeApp() {
  const settings = useSettingsStore.getState();
  settings.applyTheme();
  useStatsStore.getState();
  loadAnalytics();
}

initializeApp();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
