import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import TeamsPage from './pages/TeamsPage'
import TeamDetailPage from './pages/TeamDetailPage'
import ExpensePage from './pages/ExpensePage'
import ExpenseTeamPage from './pages/ExpenseTeamPage'
import AdminPage from './pages/AdminPage'
import PendingApprovalPage from './pages/PendingApprovalPage'

export default function App() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    initialize().then(fn => { unsubscribe = fn })
    return () => { unsubscribe?.() }
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/signup"          element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"    element={<ResetPasswordPage />} />
        <Route path="/pending-approval"  element={<PendingApprovalPage />} />
        <Route element={<Layout />}>
          <Route path="/dashboard"          element={<DashboardPage />} />
          <Route path="/teams"              element={<TeamsPage />} />
          <Route path="/teams/:teamId"      element={<TeamDetailPage />} />
          <Route path="/expenses"           element={<ExpensePage />} />
          <Route path="/expenses/:teamId"   element={<ExpenseTeamPage />} />
          <Route path="/admin"              element={<AdminPage />} />
          <Route path="/"                   element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  )
}
