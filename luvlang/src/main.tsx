import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
// 🔒 Version protection - prevents wrong deployment
import './version-check.ts'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
