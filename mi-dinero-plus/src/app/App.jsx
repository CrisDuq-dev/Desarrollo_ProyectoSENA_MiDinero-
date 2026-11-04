import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@shared/contexts/ThemeContext'
import { AuthProvider, useAuth } from '@shared/contexts/AuthContext'
import { FinanceProvider } from '@shared/contexts/FinanceContext'
import Welcome from '@features/auth/pages/Welcome'
import Login from '@features/auth/pages/Login'
import Register from '@features/auth/pages/Register'
import VerifyEmail from '@features/auth/pages/VerifyEmail'
import ForgotPassword from '@features/auth/pages/ForgotPassword'
import ResetPassword from '@features/auth/pages/ResetPassword'
import GoogleCallback from '@features/auth/pages/GoogleCallback'
import Dashboard from '@features/dashboard/pages/Dashboard'
import Transactions from '@features/transactions/pages/Transactions'
import Goals from '@features/goals/pages/Goals'
import Debts from '@features/debts/pages/Debts'
import Profile from '@features/profile/pages/Profile'
import ActivityCenter from '@features/profile/pages/ActivityCenter'
import MainLayout from '@shared/components/layout/MainLayout'
import LogoutScreen from '@shared/components/common/LogoutScreen'
import MundoPlusHome from '@features/mundo-plus/pages/MundoPlusHome'
import MundoPlusArticle from '@features/mundo-plus/pages/MundoPlusArticle'
import PlatformLockGate from '@shared/components/common/PlatformLockGate'
import PlatformLockControl from '@features/system/pages/PlatformLockControl'
import { LOCK_CONTROL_PATH } from '@features/system/data/platformLock'

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--bg-page, #0b1220)',
          color: 'var(--text-primary, #e2e8f0)',
          fontFamily: 'Nunito, Inter, system-ui, sans-serif',
        }}
      >
        Cargando…
      </div>
    )
  }
  return isAuthenticated ? children : <Navigate to="/" replace />
}

function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return children
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LogoutScreen />
        <FinanceProvider>
          <BrowserRouter>
            <PlatformLockGate />
            <Routes>
              {/* / siempre es Welcome (con o sin sesión) */}
              <Route path="/" element={<Welcome />} />

              {/* Auth de invitado */}
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/crear-cuenta" element={<GuestRoute><Register /></GuestRoute>} />
              <Route path="/welcome" element={<Navigate to="/" replace />} />

              {/* Links de correo */}
              <Route path="/verificar-email" element={<VerifyEmail />} />
              <Route path="/olvide-contrasena" element={<ForgotPassword />} />
              <Route path="/recuperar-contrasena" element={<ResetPassword />} />

              {/* Tarjeta secreta para bloquear/desbloquear la plataforma (con clave) */}
              <Route path={LOCK_CONTROL_PATH} element={<PlatformLockControl />} />
              {/* Callback Google */}
              <Route path="/auth/google/callback" element={<GoogleCallback />} />

              {/* App autenticada */}
              <Route
                element={
                  <RequireAuth>
                    <MainLayout />
                  </RequireAuth>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/debts" element={<Debts />} />
                <Route path="/mundo-plus" element={<MundoPlusHome />} />
                <Route path="/mundo-plus/:slug" element={<MundoPlusArticle />} />
                <Route path="/activity" element={<ActivityCenter />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </FinanceProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App