import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './role-refinement.css'
import './design-system/foundation.css'
import './design-system/shared-shell.css'
import './design-system/core-components.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
