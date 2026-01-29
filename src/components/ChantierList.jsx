import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SignaturePad from './SignaturePad'

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
  const [showInterventions, setShowInterventions] = useState(false)
  const [selectedChantierForInterventions, setSelectedChantierForInterventions] = useState(null)
  const [interventions, setInterventions] = useState([])
  const [signingChantier, setSigningChantier] = useState(null)
  const [signatureData, setSignatureData] = useState(null)
  const [chantierComment, setChantierComment] = useState('')
  const [savingSignature, setSavingSignature] = useState(false)
  const [signatureSuccess, setSignatureSuccess] = useState(false)

  useEffect(() => {
    loadClientAndChantiers()

    const chantiersChannel = supabase
      .channel('chantiers-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chantiers',
        filter: `client_id=eq.${clientId}`
      }, (payload) => {
        console.log('Changement chantier détecté:', payload)
        loadClientAndChantiers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(chantiersChannel)
    }
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
      setEditingChantier(null)
      setEditedChantier({ name: '', address: '', description: '' })
    }
    setLoading(false)
  }

  const handleDeleteChantier = async (chantierId, e) => {
    e.stopPropagation()

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce chantier ? Toutes les interventions associées seront également supprimées.')) {
      return
    }

    setLoading(true)

    await supabase
      .from('chantiers')
      .delete()
      .eq('id', chantierId)

    setLoading(false)
  }

  const loadChantierInterventions = async (chantier, e) => {
    e.stopPropagation()
    setSelectedChantierForInterventions(chantier)

    const { data: interventionsData } = await supabase
      .from('interventions')
      .select(`
        *,
        categories (name)
      `)
      .eq('chantier_id', chantier.id)
      .eq('status', 'termine')
      .order('intervention_date', { ascending: false })

    if (interventionsData) {
      setInterventions(interventionsData)
    }

    setShowInterventions(true)
  }

  const handleDeleteIntervention = async (interventionId, e) => {
    e.stopPropagation()

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
      return
    }

    setLoading(true)

    await supabase
      .from('interventions')
      .delete()
      .eq('id', interventionId)

    if (selectedChantierForInterventions) {
      const { data: interventionsData } = await supabase
        .from('interventions')
        .select(`
          *,
          categories (name)
        `)
        .eq('chantier_id', selectedChantierForInterventions.id)
        .eq('status', 'termine')
        .order('intervention_date', { ascending: false })

      if (interventionsData) {
        setInterventions(interventionsData)
      }
    }

    setLoading(false)
  }

  const openSignatureModal = (chantier, e) => {
    e.stopPropagation()
    setSigningChantier(chantier)
    setSignatureData(chantier.signature_data || null)
    setChantierComment(chantier.client_comment || '')
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
        .from('chantiers')
        .update({
          signature_data: signatureData,
          client_comment: chantierComment,
          signature_date: new Date().toISOString()
        })
        .eq('id', signingChantier.id)

      if (error) {
        alert('Erreur lors de la sauvegarde')
        setSavingSignature(false)
        return
      }

      setSignatureSuccess(true)
      setTimeout(() => {
        setSigningChantier(null)
        setSignatureSuccess(false)
        setSignatureData(null)
        setChantierComment('')
      }, 2000)
    } catch (err) {
      alert('Erreur lors de la sauvegarde')
    }

    setSavingSignature(false)
  }

  if (!client) return <div>Chargement...</div>

  if (showInterventions) {
    return (
      <div>
        <button
          onClick={() => {
            setShowInterventions(false)
            setSelectedChantierForInterventions(null)
            setInterventions([])
          }}
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
          ← Retour aux chantiers
        </button>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
            Interventions terminées
          </h2>
          <p style={{ color: '#718096' }}>
            Chantier: {selectedChantierForInterventions?.name}
          </p>
        </div>

        {interventions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#718096',
            background: 'white',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '18px', marginBottom: '16px' }}>
              Aucune intervention terminée
            </p>
            <p>Les interventions terminées apparaîtront ici</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {interventions.map((intervention) => (
              <div
                key={intervention.id}
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
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '12px'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#1a202c'
                  }}>
                    {intervention.categories?.name || 'Sans rubrique'}
                  </h3>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: '#c6f6d5',
                    color: '#22543d',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    Terminé
                  </span>
                </div>
                <div style={{ color: '#718096', fontSize: '14px', marginBottom: '16px' }}>
                  {new Date(intervention.intervention_date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => navigate(`/technicien/intervention-details/${intervention.id}`)}
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
                    Voir les détails
                  </button>
                  <button
                    onClick={(e) => handleDeleteIntervention(intervention.id, e)}
                    disabled={loading}
                    style={{
                      padding: '10px 16px',
                      background: loading ? '#a0aec0' : '#fed7d7',
                      color: '#742a2a',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/technicien/chantier/${chantier.id}/intervention`)
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                + Nouvelle Intervention
              </button>
              <button
                onClick={(e) => openSignatureModal(chantier, e)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: chantier.signature_data ? 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}
                title={chantier.signature_data ? "Modifier la signature" : "Faire signer le client"}
              >
                {chantier.signature_data ? '✅ Modifier signature' : '✍️ Faire signer'}
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => loadChantierInterventions(chantier, e)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#e8f5e9',
                    color: '#2e7d32',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  📋 Interventions
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
                <button
                  onClick={(e) => handleDeleteChantier(chantier.id, e)}
                  disabled={loading}
                  style={{
                    padding: '10px 16px',
                    background: loading ? '#a0aec0' : '#fed7d7',
                    color: '#742a2a',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  🗑️
                </button>
              </div>
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

      {signingChantier && (
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
        }} onClick={() => setSigningChantier(null)}>
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
              Chantier: <strong>{signingChantier.name}</strong>
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
                value={chantierComment}
                onChange={(e) => setChantierComment(e.target.value)}
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
                onClick={() => setSigningChantier(null)}
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
