import { createRoot } from 'react-dom/client';
import '@fontsource/shippori-mincho/latin-600.css';
import '@fontsource/shippori-mincho/latin-700.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-500.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
