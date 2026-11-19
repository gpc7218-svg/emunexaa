import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from './components/layout/Layout'
import { LoadingScreen } from './components/ui/LoadingScreen'

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const DeviceManager = lazy(() => import('./pages/DeviceManager').then(m => ({ default: m.DeviceManager })))
const DeviceWizard = lazy(() => import('./pages/DeviceWizard').then(m => ({ default: m.DeviceWizard })))
const LiveWindow = lazy(() => import('./pages/LiveWindow').then(m => ({ default: m.LiveWindow })))
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const Diagnostics = lazy(() => import('./pages/Diagnostics').then(m => ({ default: m.Diagnostics })))
const ImportImage = lazy(() => import('./pages/ImportImage').then(m => ({ default: m.ImportImage })))

function App() {
  const { i18n } = useTranslation()

  // Handle RTL direction
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={i18n.language} dir={dir}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>EmuNexa - Modern Android Virtualization Platform</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-surface-primary text-text-primary antialiased">
        <Suspense fallback={<LoadingScreen />}>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/devices" element={<DeviceManager />} />
              <Route path="/devices/create" element={<DeviceWizard />} />
              <Route path="/devices/:id/live" element={<LiveWindow />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/:section" element={<Settings />} />
              <Route path="/diagnostics" element={<Diagnostics />} />
              <Route path="/import" element={<ImportImage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </Suspense>
      </body>
    </html>
  )
}

export default App