import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const THEME_KEY = 'oc-theme'

function initTheme() {
  const saved = window.localStorage.getItem(THEME_KEY)
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = saved || (systemDark ? 'dark' : 'light')

  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.setAttribute('data-theme', theme)
}

initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
