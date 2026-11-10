import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setupPwaUpdates } from './lib/pwa'
import './index.css'
import App from './App.tsx'

setupPwaUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
