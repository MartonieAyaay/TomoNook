import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { unlockChime } from './lib/chime.ts'

// Sound is only allowed after the first click or key press, so get it ready then.
for (const type of ['pointerdown', 'keydown'] as const) {
  window.addEventListener(type, unlockChime, { once: true, capture: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
