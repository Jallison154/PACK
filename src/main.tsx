import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { logCloudEnvStartupCheck } from './lib/env'
import { logMapProviderStartupCheck } from './lib/mapProvider'
import { applyStandalonePwaClass } from './utils/standalonePwa'

logCloudEnvStartupCheck()
logMapProviderStartupCheck()
applyStandalonePwaClass()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
