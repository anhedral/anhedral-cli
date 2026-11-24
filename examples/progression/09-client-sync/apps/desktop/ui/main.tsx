import { createRoot } from 'react-dom/client';

function App() {
  return <main>{document.title}</main>;
}

createRoot(document.getElementById('root')!).render(<App />);
