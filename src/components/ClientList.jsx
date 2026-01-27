import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function ClientList() {
  const [clients, setClients] = useState([])
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })
  const [editingClient, setEditingClient] = useState(null)
  const [editedClient, setEditedClient] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setClients(data)
    }
  }

  const handleAddClient = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from('clients')
      .insert([newClient])
      .select()

    if (!error && data) {
      setClients([data[0], ...clients])
      setNewClient({ name: '', email: '', phone: '', address: '' })
      setShowAddClient(false)
    }
    setLoading(false)
  }

  const copyClientLink = (e) => {
    e.stopPropagation()
    const link = `${window.location.origin}/portail/connexion`
    navigator.clipboard.writeText(link).then(() => {
      alert('Lien copié dans le presse-papiers!')
    })
  }

  const handleEditClient = (client, e) => {
    e.stopPropagation()
    setEditingClient(client)
    setEditedClient({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      address: client.address || ''
    })
  }

  const handleUpdateClient = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from('clients')
      .update(editedClient)
      .eq('id', editingClient.id)
      .select()

    if (!error && data) {
      setClients(clients.map(c => c.id === editingClient.id ? data[0] : c))
      setEditingClient(null)
      setEditedClient({ name: '', email: '', phone: '', address: '' })
    }
    setLoading(false)
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c' }}>
          Mes Clients
        </h2>
        <button
          onClick={() => setShowAddClient(true)}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          + Nouveau Client
        </button>
      </div>

      {showAddClient && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>
              Ajouter un client
            </h3>

            <form onSubmit={handleAddClient}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Nom de l'entreprise *
                </label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Adresse
                </label>
                <textarea
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: loading ? '#a0aec0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  {loading ? 'Ajout...' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#e2e8f0',
                    color: '#4a5568',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingClient && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>
              Modifier le client
            </h3>

            <form onSubmit={handleUpdateClient}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Nom de l'entreprise *
                </label>
                <input
                  type="text"
                  value={editedClient.name}
                  onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={editedClient.email}
                  onChange={(e) => setEditedClient({ ...editedClient, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={editedClient.phone}
                  onChange={(e) => setEditedClient({ ...editedClient, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Adresse
                </label>
                <textarea
                  value={editedClient.address}
                  onChange={(e) => setEditedClient({ ...editedClient, address: e.target.value })}
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: loading ? '#a0aec0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  {loading ? 'Modification...' : 'Modifier'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#e2e8f0',
                    color: '#4a5568',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {clients.map((client) => (
          <div
            key={client.id}
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
            }}
            onClick={() => navigate(`/technicien/client/${client.id}/chantiers`)}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#1a202c',
              marginBottom: '12px'
            }}>
              {client.name}
            </h3>
            <div style={{ color: '#718096', fontSize: '14px', marginBottom: '8px' }}>
              {client.email}
            </div>
            {client.phone && (
              <div style={{ color: '#718096', fontSize: '14px', marginBottom: '8px' }}>
                {client.phone}
              </div>
            )}
            {client.address && (
              <div style={{ color: '#718096', fontSize: '14px', marginBottom: '8px' }}>
                {client.address}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/technicien/client/${client.id}/chantiers`)
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Chantiers
              </button>
              <button
                onClick={(e) => copyClientLink(e)}
                style={{
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
                title="Copier le lien du portail client"
              >
                🔗
              </button>
              <button
                onClick={(e) => handleEditClient(client, e)}
                style={{
                  padding: '10px 16px',
                  background: '#e2e8f0',
                  color: '#4a5568',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ✏️
              </button>
            </div>
          </div>
        ))}
      </div>

      {clients.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#718096'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>
            Aucun client pour le moment
          </p>
          <p>Cliquez sur "Nouveau Client" pour commencer</p>
        </div>
      )}
    </div>
  )
}
