import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import BlogPostPage from './BlogPostPage.jsx'

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const PartnersApp = lazy(() => import('./partners/PartnersApp.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/indique/*" element={<PartnersApp />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
