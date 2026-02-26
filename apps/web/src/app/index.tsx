// 앱 엔트리(Provider 조립)
import { createRoot } from 'react-dom/client';
import './styles/globals.css';

function App() {
  return <div id="app-root">Joka</div>;
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
