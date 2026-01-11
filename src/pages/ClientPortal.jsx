import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { jsPDF } from 'jspdf'

const SECTION_LABELS = {
  'implantation': 'Implantation',
  'bac_condensat': 'Bac à condensat',
  'echangeur': 'Échangeur',
  'evacuation': 'Évacuation',
  'observations': 'Observations'
}

export default function ClientPortal() {
  const { clientEmail } = useParams()
  const [client, setClient] = useState(null)
  const [chantiers, setChantiers] = useState([])
  const [selectedChantier, setSelectedChantier] = useState(null)
  const [interventions, setInterventions] = useState([])
  const [selectedIntervention, setSelectedIntervention] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    loadClientData()
  }, [clientEmail])

  const loadClientData = async () => {
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('email', decodeURIComponent(clientEmail))
      .maybeSingle()

    if (clientData) {
      setClient(clientData)

      const { data: chantiersData } = await supabase
        .from('chantiers')
        .select('*')
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: false })

      if (chantiersData) {
        setChantiers(chantiersData)
      }
    }

    setLoading(false)
  }

  const loadChantierInterventions = async (chantierId) => {
    const chantier = chantiers.find(c => c.id === chantierId)
    setSelectedChantier(chantier)

    const { data: interventionsData } = await supabase
      .from('interventions')
      .select(`
        *,
        categories (name)
      `)
      .eq('chantier_id', chantierId)
      .eq('status', 'termine')
      .order('intervention_date', { ascending: false })

    if (interventionsData) {
      setInterventions(interventionsData)
    }
  }

  const loadInterventionDetails = async (interventionId) => {
    const intervention = interventions.find(i => i.id === interventionId)
    setSelectedIntervention(intervention)

    const { data: sectionsData } = await supabase
      .from('intervention_sections')
      .select('*')
      .eq('intervention_id', interventionId)

    if (sectionsData) {
      const sectionsWithPhotos = await Promise.all(
        sectionsData.map(async (section) => {
          const { data: photos } = await supabase
            .from('section_photos')
            .select('*')
            .eq('section_id', section.id)

          return { ...section, photos: photos || [] }
        })
      )
      setSections(sectionsWithPhotos)
    }
  }

  const loadImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Erreur lors du chargement de l\'image:', url, error)
      throw error
    }
  }

  const generatePDF = async () => {
    setGeneratingPDF(true)
    try {
      const doc = new jsPDF()
      let yPosition = 20

      doc.setFontSize(18)
      doc.text('Rapport d\'Intervention', 105, yPosition, { align: 'center' })
      yPosition += 10

      doc.setFontSize(12)
      doc.text(`Client: ${client.name}`, 20, yPosition)
      yPosition += 7
      doc.text(`Chantier: ${selectedChantier?.name || 'N/A'}`, 20, yPosition)
      yPosition += 7
      doc.text(`Rubrique: ${selectedIntervention?.categories?.name || 'N/A'}`, 20, yPosition)
      yPosition += 7
      doc.text(`Date: ${new Date(selectedIntervention?.intervention_date).toLocaleDateString('fr-FR')}`, 20, yPosition)
      yPosition += 15

      for (const section of sections) {
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text(SECTION_LABELS[section.section_type], 20, yPosition)
        doc.setFont(undefined, 'normal')
        yPosition += 7

        if (section.notes) {
          doc.setFontSize(10)
          const lines = doc.splitTextToSize(`Notes: ${section.notes}`, 170)
          doc.text(lines, 20, yPosition)
          yPosition += lines.length * 5 + 5
        }

        if (section.photos && section.photos.length > 0) {
          doc.setFontSize(10)
          doc.text(`Photos (${section.photos.length}):`, 20, yPosition)
          yPosition += 7

          for (const photo of section.photos) {
            if (yPosition > 220) {
              doc.addPage()
              yPosition = 20
            }

            try {
              const imgData = await loadImageAsBase64(photo.photo_url)
              const imgWidth = 80
              const imgHeight = 60
              const format = photo.photo_url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG'
              doc.addImage(imgData, format, 20, yPosition, imgWidth, imgHeight)
              yPosition += imgHeight + 10
            } catch (error) {
              console.error('Erreur chargement image:', error, photo.photo_url)
              doc.setFontSize(9)
              doc.text('Image non disponible', 20, yPosition)
              yPosition += 10
            }
          }
        }

        yPosition += 5
      }

      const fileName = `Intervention_${client.name}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      alert('Erreur lors de la génération du PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Chargement...
      </div>
    )
  }

  if (!client) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', color: '#1a202c' }}>
            Client non trouvé
          </h2>
          <p style={{ color: '#718096' }}>
            Aucun client trouvé avec cet email. Veuillez vérifier le lien.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc' }}>
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            Portail Client
          </h1>
          <p style={{ fontSize: '16px', opacity: 0.9 }}>
            {client.name}
          </p>
        </div>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px'
      }}>
        {!selectedChantier && !selectedIntervention ? (
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '24px',
              color: '#1a202c'
            }}>
              Mes Chantiers
            </h2>

            {chantiers.length === 0 ? (
              <div style={{
                background: 'white',
                padding: '60px 20px',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#718096'
              }}>
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>
                  Aucun chantier disponible
                </p>
                <p>Vos chantiers apparaîtront ici</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                {chantiers.map((chantier) => (
                  <div
                    key={chantier.id}
                    onClick={() => loadChantierInterventions(chantier.id)}
                    style={{
                      background: 'white',
                      padding: '24px',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
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
                        {chantier.address}
                      </div>
                    )}
                    {chantier.description && (
                      <div style={{
                        color: '#4a5568',
                        fontSize: '14px',
                        marginTop: '12px',
                        padding: '12px',
                        background: '#f7fafc',
                        borderRadius: '8px'
                      }}>
                        {chantier.description}
                      </div>
                    )}
                    <button
                      style={{
                        marginTop: '16px',
                        width: '100%',
                        padding: '10px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      Voir les interventions
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : selectedChantier && !selectedIntervention ? (
          <div>
            <button
              onClick={() => {
                setSelectedChantier(null)
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

            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '8px',
              color: '#1a202c'
            }}>
              {selectedChantier.name}
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#718096',
              marginBottom: '24px'
            }}>
              Interventions terminées
            </p>

            {interventions.length === 0 ? (
              <div style={{
                background: 'white',
                padding: '60px 20px',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#718096'
              }}>
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>
                  Aucune intervention disponible
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
                    onClick={() => loadInterventionDetails(intervention.id)}
                    style={{
                      background: 'white',
                      padding: '24px',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
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
                    <div style={{ color: '#718096', fontSize: '14px' }}>
                      {new Date(intervention.intervention_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <button
                      style={{
                        marginTop: '16px',
                        width: '100%',
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
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => {
                setSelectedIntervention(null)
                setSections([])
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
              ← Retour aux interventions du chantier
            </button>

            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
                {selectedIntervention.categories?.name}
              </h2>
              <div style={{ color: '#718096', marginBottom: '8px' }}>
                <strong>Date:</strong> {new Date(selectedIntervention.intervention_date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
              <div style={{ color: '#718096', marginBottom: '16px' }}>
                <strong>Statut:</strong>{' '}
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  background: '#c6f6d5',
                  color: '#22543d',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Terminé
                </span>
              </div>

              <button
                onClick={generatePDF}
                disabled={generatingPDF}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: generatingPDF ? '#a0aec0' : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => !generatingPDF && (e.target.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                {generatingPDF ? 'Génération du PDF...' : '📄 Télécharger le rapport PDF'}
              </button>
            </div>

            {sections.map((section) => (
              <div
                key={section.id}
                style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  marginBottom: '20px'
                }}
              >
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  marginBottom: '16px',
                  color: '#1a202c'
                }}>
                  {SECTION_LABELS[section.section_type]}
                </h4>

                {section.notes && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      color: '#4a5568',
                      fontWeight: '500',
                      marginBottom: '8px'
                    }}>
                      Notes:
                    </div>
                    <div style={{
                      color: '#718096',
                      padding: '12px',
                      background: '#f7fafc',
                      borderRadius: '8px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {section.notes}
                    </div>
                  </div>
                )}

                {section.photos && section.photos.length > 0 && (
                  <div>
                    <div style={{
                      color: '#4a5568',
                      fontWeight: '500',
                      marginBottom: '12px'
                    }}>
                      Photos ({section.photos.length})
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '12px'
                    }}>
                      {section.photos.map((photo) => (
                        <div
                          key={photo.id}
                          style={{
                            position: 'relative',
                            paddingTop: '100%',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            transition: 'transform 0.2s'
                          }}
                          onClick={() => window.open(photo.photo_url, '_blank')}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <img
                            src={photo.photo_url}
                            alt="Photo intervention"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!section.photos || section.photos.length === 0) && !section.notes && (
                  <div style={{ color: '#a0aec0', fontStyle: 'italic' }}>
                    Aucune donnée pour cette section
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
