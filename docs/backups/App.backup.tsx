import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { AuthPage } from '@/pages/AuthPage'
import { ClaimsPage } from '@/pages/ClaimsPage'
import { Layout } from '@/components/layout/Layout'
import { LoadingScreen } from '@/components/ui/loading-screen'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return <Layout>{children}</Layout>
}

function App() {
  return (
    <>
      <Toaster 
        position="top-center" 
        richColors 
        closeButton
        toastOptions={{
          duration: 3000,
        }}
      />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ClaimsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
