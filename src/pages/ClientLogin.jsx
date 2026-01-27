import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ClientLogin() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    sessionStorage.setItem('clientEmail', email)
    navigate('/portail')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px 24px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <img
            src="/logo_fin.png"
            alt="Green Life Logo"
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain',
              margin: '0 auto 16px'
            }}
          />
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1a202c',
            marginBottom: '8px'
          }}>
            Portail Client
          </h1>
          <p style={{
            color: '#718096',
            fontSize: '16px'
          }}>
            Green Life Nettoyage
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4a5568',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              inputMode="email"
              placeholder="votre@email.com"
              style={{
                width: '100%',
                padding: '14px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'border-color 0.2s',
                outline: 'none',
                WebkitAppearance: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#22b14c'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: '#fee',
              borderRadius: '8px',
              color: '#c53030',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? '#a0aec0' : 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)',
              color: 'white',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              border: 'none',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(34, 177, 76, 0.3)'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)', e.target.style.boxShadow = '0 8px 20px rgba(34, 177, 76, 0.4)')}
            onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = '0 4px 12px rgba(34, 177, 76, 0.3)')}
          >
            {loading ? 'Connexion...' : 'Accéder à mon portail'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f7fafc',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#718096',
          lineHeight: '1.6'
        }}>
          <strong style={{ color: '#4a5568' }}>Note:</strong> Utilisez l'adresse email que vous avez communiquée à votre interlocuteur chez Green Life.
        </div>
      </div>
    </div>
  )
}
