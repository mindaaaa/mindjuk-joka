import { createRoot } from 'react-dom/client';

import { initSentry } from '@/app/providers/sentry';
import './styles/globals.css';

initSentry();

function App() {
  return <div id="app-root">Joka</div>;
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
