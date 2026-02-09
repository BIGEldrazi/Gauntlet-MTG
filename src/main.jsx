import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initStorage } from './storage.js'
import App from './App.jsx'

initStorage()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
