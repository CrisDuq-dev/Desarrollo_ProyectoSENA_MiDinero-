import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { FinanceProvider } from './contexts/FinanceContext'
import Welcome from './pages/auth/Welcome'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import VerifyEmail from './pages/auth/VerifyEmail'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import GoogleCallback from './pages/auth/GoogleCallback'
import Dashboard from './pages/dashboard/Dashboard'
import Transactions from './pages/transactions/Transactions'
import Goals from './pages/goals/Goals'
import Debts from './pages/debts/Debts'
import Profile from './pages/profile/Profile'
import ActivityCenter from './pages/profile/ActivityCenter'
import MainLayout from './components/layout/MainLayout'
import MundoPlusHome from './pages/mundo-plus/MundoPlusHome'
import MundoPlusArticle from './pages/mundo-plus/MundoPlusArticle'

/**
 * Rutas privadas: requieren sesión.
 * Sin sesión → / (Welcome).
 * Durante loading mostramos un placeholder (no null) para no “pantalla gris”.
 */
function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
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

/**
 * Login / registro: si ya hay sesión → dashboard.
 * Importante: con loading seguimos mostrando children para no desmontar
 * el formulario de registro (si no, se pierde el check de “Registro exitoso”).
 */
function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return children
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FinanceProvider>
          <BrowserRouter>
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