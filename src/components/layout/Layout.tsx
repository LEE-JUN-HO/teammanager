import { Navigate, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAppStore } from '../../store'

export default function Layout() {
  const { currentUser } = useAppStore()
  if (!currentUser) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-toss-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-56 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
