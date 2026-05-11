import { Navigate, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '../../store/authStore'

export default function Layout() {
  const { session, profile, loading } = useAuthStore()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-toss-gray-50">
      <div className="w-8 h-8 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!session) return <Navigate to="/login" replace />
  if (profile?.role === 'pending') return <Navigate to="/pending-approval" replace />

  return (
    <div className="flex min-h-screen bg-toss-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-56 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
