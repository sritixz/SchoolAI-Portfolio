import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store/index.js'
import { injectStore } from './api.js'
import './index.css'
import App from './App.jsx'

// Wire up the store so api.js interceptors can dispatch actions (e.g. auto-logout on 401)
injectStore(store)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
