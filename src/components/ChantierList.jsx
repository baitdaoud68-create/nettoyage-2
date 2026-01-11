import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ChantierList() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [chantiers, setChantiers] = useState([])
  const [showAddChantier, setShowAddChantier] = useState(false)
  const [newChantier, setNewChantier] = useState({
    name: '',
    address: '',
    description: ''
  })
  const [editingChantier, setEditingChantier] = useState(null)
  const [editedChantier, setEditedChantier] = useState({
    name: '',
    address: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadClientAndChantiers()
  }, [clientId])

  const loadClientAndChantiers = async () => {
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientData) {
      setClient(clientData)
    }

    const { data: chantiersData } = await supabase
      .from('chantiers')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (chantiersData) {
      setChantiers(chantiersData)
    }
  }

  const handleAddChantier = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from('chantiers')
      .insert([{ ...newChantier, client_id: clientId }])
      .select()

    if (!error && data) {
      setChantiers([data[0], ...chantiers])
      setNewChantier({ name: '', address: '', description: '' })
      setShowAddChantier(false)
    }
    setLoading(false)
  }

  const handleEditChantier = (chantier, e) => {
    e.stopPropagation()
    setEditingChantier(chantier)
    setEditedChantier({
      name: chantier.name,
      address: chantier.address || '',
      description: chantier.description || ''
    })
  }

  const handleUpdateChantier = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from('chantiers')
      .update(editedChantier)
      .eq('id', editingChantier.id)
      .select()

    if (!error && data) {
      setChantiers(chantiers.map(c => c.id === editingChantier.id ? data[0] : c))
      setEditingChantier(null)
      setEditedChantier({ name: '', address: '', description: '' })
    }
    setLoading(false)
  }

  if (!client) return <div>Chargement...</div>

  return (
    <div>
      <button
        onClick={() => navigate('/technicien')}
        style={{
          background: '#e2e8f0',
          color: '#4a5568',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '16px'
        }}
      >
        ← Retour aux clients
      </button>

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
          {client.name}
        </h2>
        <p style={{ color: '#718096' }}>{client.email}</p>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1a202c' }}>
          Chantiers
        </h3>
        <button
          onClick={() => setShowAddChantier(true)}
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
          + Nouveau Chantier
        </button>
      </div>

      {showAddChantier && (
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
              Ajouter un chantier
            </h3>

            <form onSubmit={handleAddChantier}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Nom du chantier *
                </label>
                <input
                  type="text"
                  value={newChantier.name}
                  onChange={(e) => setNewChantier({ ...newChantier, name: e.target.value })}
                  required
                  placeholder="ex: Site principal, Bureaux Paris..."
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
                  Adresse
                </label>
                <input
                  type="text"
                  value={newChantier.address}
                  onChange={(e) => setNewChantier({ ...newChantier, address: e.target.value })}
                  placeholder="Adresse du chantier"
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
                  Description
                </label>
                <textarea
                  value={newChantier.description}
                  onChange={(e) => setNewChantier({ ...newChantier, description: e.target.value })}
                  rows="3"
                  placeholder="Informations supplémentaires..."
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
                  onClick={() => setShowAddChantier(false)}
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

      {editingChantier && (
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
              Modifier le chantier
            </h3>

            <form onSubmit={handleUpdateChantier}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Nom du chantier *
                </label>
                <input
                  type="text"
                  value={editedChantier.name}
                  onChange={(e) => setEditedChantier({ ...editedChantier, name: e.target.value })}
                  required
                  placeholder="ex: Site principal, Bureaux Paris..."
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
                  Adresse
                </label>
                <input
                  type="text"
                  value={editedChantier.address}
                  onChange={(e) => setEditedChantier({ ...editedChantier, address: e.target.value })}
                  placeholder="Adresse du chantier"
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
                  Description
                </label>
                <textarea
                  value={editedChantier.description}
                  onChange={(e) => setEditedChantier({ ...editedChantier, description: e.target.value })}
                  rows="3"
                  placeholder="Informations supplémentaires..."
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
                  onClick={() => setEditingChantier(null)}
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
        {chantiers.map((chantier) => (
          <div
            key={chantier.id}
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#1a202c',
              marginBottom: '12px'
            }}>
              {chantier.name}
            </h3>
            {chantier.address && (
              <div style={{ color: '#718096', fontSize: '14px', marginBottom: '8px' }}>
                📍 {chantier.address}
              </div>
            )}
            {chantier.description && (
              <div style={{ color: '#718096', fontSize: '14px', marginBottom: '8px' }}>
                {chantier.description}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/technicien/chantier/${chantier.id}/intervention`)
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
                Intervention
              </button>
              <button
                onClick={(e) => handleEditChantier(chantier, e)}
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

      {chantiers.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#718096',
          background: 'white',
          borderRadius: '12px'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>
            Aucun chantier pour ce client
          </p>
          <p>Cliquez sur "Nouveau Chantier" pour commencer</p>
        </div>
      )}
    </div>
  )
}
