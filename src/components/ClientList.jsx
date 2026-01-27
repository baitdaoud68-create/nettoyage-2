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
  const [deletingClient, setDeletingClient] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setClients([])
      }

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('Load clients:', { count: data?.length, error, timestamp: new Date().toISOString() })

      if (error) {
        console.error('Erreur chargement clients:', error)
        return
      }

      setClients(data || [])
    } catch (err) {
      console.error('Exception chargement clients:', err)
    }
  }

  const handleAddClient = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Ajout client:', newClient)

      const { data, error } = await supabase
        .from('clients')
        .insert([newClient])
        .select()

      console.log('Résultat ajout:', { data, error })

      if (error) {
        console.error('Erreur ajout client:', error)
        alert(`Erreur: ${error.message}`)
        setLoading(false)
        return
      }

      if (data && data[0]) {
        await loadClients(true)
        setNewClient({ name: '', email: '', phone: '', address: '' })
        setShowAddClient(false)
        alert('Client ajouté avec succès!')
      }
    } catch (err) {
      console.error('Exception ajout client:', err)
      alert('Erreur inattendue: ' + err.message)
    } finally {
      setLoading(false)
    }
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

    try {
      console.log('Modification client:', { id: editingClient.id, data: editedClient })

      const { data, error } = await supabase
        .from('clients')
        .update(editedClient)
        .eq('id', editingClient.id)
        .select()

      console.log('Résultat modification:', { data, error })

      if (error) {
        console.error('Erreur modification client:', error)
        alert(`Erreur: ${error.message}`)
        setLoading(false)
        return
      }

      if (data && data[0]) {
        await loadClients(true)
        setEditingClient(null)
        setEditedClient({ name: '', email: '', phone: '', address: '' })
        alert('Client modifié avec succès!')
      }
    } catch (err) {
      console.error('Exception modification client:', err)
      alert('Erreur inattendue: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClient = async (e) => {
    e.preventDefault()
    setDeleteError('')

    if (deletePassword !== '3112') {
      setDeleteError('Mot de passe incorrect')
      return
    }

    setLoading(true)

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      console.log('Session check:', { hasSession: !!sessionData?.session, sessionError })

      if (sessionError || !sessionData?.session) {
        setDeleteError('Session expirée. Reconnectez-vous.')
        setLoading(false)
        return
      }

      console.log('Tentative de suppression du client:', deletingClient.id)

      const { data, error } = await supabase
        .from('clients')
        .delete()
        .eq('id', deletingClient.id)

      console.log('Résultat suppression:', { data, error })

      if (error) {
        console.error('Erreur Supabase:', error)
        setDeleteError(`Erreur: ${error.message} (Code: ${error.code})`)
        setLoading(false)
        return
      }

      console.log('Suppression réussie!')

      setClients([])

      setTimeout(async () => {
        await loadClients(true)
        setDeletingClient(null)
        setDeletePassword('')
        setDeleteError('')
      }, 100)

      alert('Client supprimé avec succès!')

    } catch (err) {
      console.error('Exception:', err)
      setDeleteError('Erreur inattendue: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const openDeleteModal = (client, e) => {
    e.stopPropagation()
    setDeletingClient(client)
    setDeletePassword('')
    setDeleteError('')
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

      {deletingClient && (
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
            maxWidth: '400px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '16px',
              color: '#dc2626'
            }}>
              Supprimer le client
            </h3>

            <p style={{
              color: '#4a5568',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              Êtes-vous sûr de vouloir supprimer <strong>{deletingClient.name}</strong> ?
              <br/>
              <br/>
              Cette action supprimera également tous les chantiers, catégories et interventions associés. Cette action est irréversible.
            </p>

            <form onSubmit={handleDeleteClient}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Entrez le mot de passe de confirmation
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value)
                    setDeleteError('')
                  }}
                  placeholder="Mot de passe"
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: deleteError ? '2px solid #dc2626' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                {deleteError && (
                  <div style={{
                    color: '#dc2626',
                    fontSize: '14px',
                    marginTop: '8px',
                    fontWeight: '500'
                  }}>
                    {deleteError}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: loading ? '#a0aec0' : '#dc2626',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Suppression...' : 'Supprimer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingClient(null)
                    setDeletePassword('')
                    setDeleteError('')
                  }}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#e2e8f0',
                    color: '#4a5568',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer'
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
              <button
                onClick={(e) => openDeleteModal(client, e)}
                style={{
                  padding: '10px 16px',
                  background: '#dc2626',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
                title="Supprimer le client"
              >
                🗑️
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
