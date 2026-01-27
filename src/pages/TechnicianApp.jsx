import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ClientList from '../components/ClientList'
import ChantierList from '../components/ChantierList'
import InterventionForm from '../components/InterventionForm'
import InterventionDetails from '../components/InterventionDetails'

export default function TechnicianApp() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Vérifier l'authentification
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      } else {
        setLoading(false)
      }
    })

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Chargement...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc' }}>
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '16px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>
            Application Terrain
          </h1>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px'
      }}>
        <Routes>
          <Route path="/" element={<ClientList />} />
          <Route path="/client/:clientId/chantiers" element={<ChantierList />} />
          <Route path="/chantier/:chantierId/intervention" element={<InterventionForm />} />
          <Route path="/intervention-details/:interventionId" element={<InterventionDetails />} />
        </Routes>
      </main>
    </div>
  )
}
