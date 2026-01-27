import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import TechnicianApp from './pages/TechnicianApp'
import ClientPortal from './pages/ClientPortal'
import ClientLogin from './pages/ClientLogin'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        Chargement...
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/technicien/*"
          element={session ? <TechnicianApp /> : <Navigate to="/login" />}
        />
        <Route path="/portail/connexion" element={<ClientLogin />} />
        <Route path="/portail/:email" element={<Navigate to="/portail/connexion" />} />
        <Route path="/portail" element={<ClientPortal />} />
        <Route path="/" element={<Navigate to={session ? "/technicien" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
