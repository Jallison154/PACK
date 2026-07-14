import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { logCloudEnvStartupCheck } from './lib/env'
import { logMapProviderStartupCheck } from './lib/mapProvider'
import { applyStandalonePwaClass } from './utils/standalonePwa'
import { initPwaInstallCapture } from './services/pwa/installPrompt'

logCloudEnvStartupCheck()
logMapProviderStartupCheck()
applyStandalonePwaClass()
initPwaInstallCapture()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
