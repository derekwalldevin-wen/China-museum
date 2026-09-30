import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ReviewApp from '../ReviewApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReviewApp />
  </StrictMode>,
);
