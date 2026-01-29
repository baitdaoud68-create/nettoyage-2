import { useState, useEffect } from 'react'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import SignaturePad from './SignaturePad'

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
  const [settingPasswordClient, setSettingPasswordClient] = useState(null)
  const [newPasswordForClient, setNewPasswordForClient] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [signingClient, setSigningClient] = useState(null)
  const [signatureData, setSignatureData] = useState(null)
  const [clientComment, setClientComment] = useState('')
  const [savingSignature, setSavingSignature] = useState(false)
  const [signatureSuccess, setSignatureSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadClients()

    const channel = supabase
      .channel('clients-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clients'
      }, (payload) => {
        console.log('Changement détecté:', payload)
        loadClients(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
      console.log('Tentative de suppression du client:', deletingClient.id)

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', deletingClient.id)

      console.log('Résultat suppression:', { error })

      if (error) {
        console.error('Erreur Supabase:', error)
        setDeleteError(`Erreur: ${error.message}`)
        setLoading(false)
        return
      }

      console.log('Suppression réussie!')

      setDeletingClient(null)
      setDeletePassword('')
      setDeleteError('')

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

  const openSetPasswordModal = (client, e) => {
    e.stopPropagation()
    setSettingPasswordClient(client)
    setNewPasswordForClient('')
    setConfirmNewPassword('')
    setPasswordError('')
  }

  const openSignatureModal = (client, e) => {
    e.stopPropagation()
    setSigningClient(client)
    setSignatureData(client.signature_data || null)
    setClientComment(client.client_comment || '')
    setSignatureSuccess(false)
  }

  const handleSignatureSave = (signature) => {
    setSignatureData(signature)
  }

  const saveSignatureAndComment = async () => {
    setSavingSignature(true)
    setSignatureSuccess(false)

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          signature_data: signatureData,
          client_comment: clientComment,
          signature_date: new Date().toISOString()
        })
        .eq('id', signingClient.id)

      if (error) {
        alert('Erreur lors de la sauvegarde')
        setSavingSignature(false)
        return
      }

      setSignatureSuccess(true)
      setTimeout(() => {
        setSigningClient(null)
        setSignatureSuccess(false)
        setSignatureData(null)
        setClientComment('')
      }, 2000)
    } catch (err) {
      alert('Erreur lors de la sauvegarde')
    }

    setSavingSignature(false)
  }

  const handleSetPassword = async (e) => {
    e.preventDefault()
    setPasswordError('')

    if (newPasswordForClient.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    if (newPasswordForClient !== confirmNewPassword) {
      setPasswordError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/client-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          action: 'set_password',
          clientId: settingPasswordClient.id,
          newPassword: newPasswordForClient
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setPasswordError(data.error || 'Erreur lors de la définition du mot de passe')
        setLoading(false)
        return
      }

      setSettingPasswordClient(null)
      setNewPasswordForClient('')
      setConfirmNewPassword('')
      alert('Mot de passe défini avec succès!')
    } catch (err) {
      setPasswordError('Erreur de connexion. Veuillez réessayer.')
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

      {settingPasswordClient && (
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
            maxWidth: '450px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '8px',
              color: '#1a202c'
            }}>
              {settingPasswordClient.password_hash ? 'Modifier le mot de passe' : 'Définir un mot de passe'}
            </h3>
            <p style={{
              color: '#718096',
              marginBottom: '24px',
              fontSize: '14px'
            }}>
              Client: <strong>{settingPasswordClient.name}</strong>
              <br />
              Email: <strong>{settingPasswordClient.email}</strong>
            </p>

            <form onSubmit={handleSetPassword}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPasswordForClient}
                  onChange={(e) => setNewPasswordForClient(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  autoFocus
                  required
                  minLength="6"
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
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Retapez le mot de passe"
                  required
                  minLength="6"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              {passwordError && (
                <div style={{
                  padding: '12px',
                  background: '#fff5f5',
                  borderRadius: '8px',
                  color: '#c53030',
                  fontSize: '14px',
                  marginBottom: '16px',
                  border: '1px solid #feb2b2'
                }}>
                  {passwordError}
                </div>
              )}

              <div style={{
                padding: '12px',
                background: '#fffbeb',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '20px',
                lineHeight: '1.5',
                border: '1px solid #fde68a'
              }}>
                <strong style={{ color: '#92400e' }}>Note:</strong>
                <span style={{ color: '#78350f' }}> Le client devra utiliser ce mot de passe pour se connecter au portail client.</span>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: loading ? '#a0aec0' : 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettingPasswordClient(null)
                    setNewPasswordForClient('')
                    setConfirmNewPassword('')
                    setPasswordError('')
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
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/technicien/client/${client.id}/chantiers`)
                }}
                style={{
                  flex: '1 1 100%',
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
                onClick={(e) => openSetPasswordModal(client, e)}
                style={{
                  flex: '1 1 100%',
                  padding: '10px',
                  background: client.password_hash ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
                title={client.password_hash ? "Modifier le mot de passe" : "Définir un mot de passe"}
              >
                {client.password_hash ? '🔑 Modifier mot de passe' : '🔑 Définir mot de passe'}
              </button>
              <button
                onClick={(e) => openSignatureModal(client, e)}
                style={{
                  flex: '1 1 100%',
                  padding: '10px',
                  background: client.signature_data ? 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
                title={client.signature_data ? "Modifier la signature" : "Faire signer le client"}
              >
                {client.signature_data ? '✅ Modifier signature' : '✍️ Faire signer'}
              </button>
              <button
                onClick={(e) => copyClientLink(e)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
                title="Copier le lien du portail client"
              >
                🔗 Lien
              </button>
              <button
                onClick={(e) => handleEditClient(client, e)}
                style={{
                  flex: 1,
                  padding: '10px',
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
                  flex: 1,
                  padding: '10px',
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

      {signingClient && (
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
          zIndex: 1000,
          overflowY: 'auto'
        }} onClick={() => setSigningClient(null)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '700px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            margin: '20px'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1a202c',
              marginBottom: '8px'
            }}>
              Signature et commentaires
            </h2>
            <p style={{
              color: '#718096',
              fontSize: '14px',
              marginBottom: '8px'
            }}>
              Client: <strong>{signingClient.name}</strong>
            </p>
            <p style={{
              color: '#718096',
              fontSize: '14px',
              marginBottom: '24px'
            }}>
              Demandez au client de signer avec son doigt ou la souris et d'ajouter ses commentaires
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                color: '#4a5568',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                Signature manuscrite
              </label>
              <SignaturePad
                onSave={handleSignatureSave}
                initialSignature={signatureData}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#4a5568',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                Commentaires du client (optionnel)
              </label>
              <textarea
                value={clientComment}
                onChange={(e) => setClientComment(e.target.value)}
                placeholder="Commentaires, remarques ou observations du client..."
                rows="4"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#22b14c'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {signatureSuccess && (
              <div style={{
                padding: '12px',
                background: '#f0fff4',
                borderRadius: '8px',
                color: '#22543d',
                fontSize: '14px',
                marginBottom: '16px',
                border: '1px solid #9ae6b4'
              }}>
                Signature et commentaires sauvegardés avec succès !
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSigningClient(null)}
                disabled={savingSignature}
                style={{
                  padding: '12px 24px',
                  background: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: savingSignature ? 'not-allowed' : 'pointer',
                  color: '#4a5568'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={saveSignatureAndComment}
                disabled={savingSignature || !signatureData}
                style={{
                  padding: '12px 24px',
                  background: (savingSignature || !signatureData) ? '#a0aec0' : 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (savingSignature || !signatureData) ? 'not-allowed' : 'pointer',
                  border: 'none',
                  boxShadow: (savingSignature || !signatureData) ? 'none' : '0 4px 12px rgba(34, 177, 76, 0.3)'
                }}
              >
                {savingSignature ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
