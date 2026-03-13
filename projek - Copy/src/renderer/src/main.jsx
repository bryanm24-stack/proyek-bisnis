import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Pastikan ini mengarah ke file CSS tempat Anda menaruh direktif Tailwind
// (@tailwind base; @tailwind components; @tailwind utilities;)
import './assets/index.css' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)