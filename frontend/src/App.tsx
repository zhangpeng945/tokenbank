import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Bank from './pages/Bank'
import Usage from './pages/Usage'
import ApiKeys from './pages/ApiKeys'
import Docs from './pages/Docs'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes — wrapped by auth guard + layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bank" element={<Bank />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      {/* Fallbacks */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
