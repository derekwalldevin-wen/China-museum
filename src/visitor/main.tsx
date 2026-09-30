import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import VisitorRecordsApp from './VisitorRecordsApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VisitorRecordsApp />
  </StrictMode>,
);
