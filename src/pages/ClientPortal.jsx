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
  const { accessCode } = useParams()
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
  }, [accessCode])

  const loadClientData = async () => {
    try {
      const apiUrl = `${supabase.supabaseUrl}/functions/v1/client-portal-api?access_code=${accessCode}&action=get_chantiers`

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        }
      })

      if (response.ok) {
        const data = await response.json()
        setClient(data.client)
        setChantiers(data.chantiers || [])
      } else {
        setClient(null)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
      setClient(null)
    }

    setLoading(false)
  }

  const loadChantierInterventions = async (chantierId) => {
    const chantier = chantiers.find(c => c.id === chantierId)
    setSelectedChantier(chantier)

    try {
      const apiUrl = `${supabase.supabaseUrl}/functions/v1/client-portal-api?access_code=${accessCode}&action=get_interventions&chantier_id=${chantierId}`

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        }
      })

      if (response.ok) {
        const data = await response.json()
        setInterventions(data.interventions || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des interventions:', error)
    }
  }

  const loadInterventionDetails = async (interventionId) => {
    const intervention = interventions.find(i => i.id === interventionId)
    setSelectedIntervention(intervention)

    try {
      const apiUrl = `${supabase.supabaseUrl}/functions/v1/client-portal-api?access_code=${accessCode}&action=get_intervention_details&intervention_id=${interventionId}`

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSections(data.sections || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error)
    }
  }

  const loadImageAsBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg'))
      }
      img.onerror = reject
      img.src = url
    })
  }

  const addFooter = (doc, pageNumber) => {
    const pageHeight = doc.internal.pageSize.height
    const pageWidth = doc.internal.pageSize.width

    doc.setTextColor(150, 150, 150)
    doc.setFontSize(8)
    doc.text('Green Life - Nettoyage Froid', pageWidth / 2, pageHeight - 10, { align: 'center' })
    doc.text(`Page ${pageNumber}`, pageWidth - 20, pageHeight - 10, { align: 'right' })
  }

  const generatePDF = async () => {
    setGeneratingPDF(true)
    try {
      const doc = new jsPDF()
      let yPosition = 15
      let pageNumber = 1

      doc.setFillColor(34, 177, 76)
      doc.rect(0, 0, 210, 35, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont(undefined, 'bold')
      doc.text('RAPPORT D\'INTERVENTION', 105, 15, { align: 'center' })

      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      doc.text('Green Life - Nettoyage Froid', 105, 25, { align: 'center' })

      yPosition = 45

      doc.setFillColor(29, 53, 87)
      doc.rect(15, yPosition - 5, 180, 28, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.text('CHANTIER:', 20, yPosition + 2)
      doc.text('CLIENT:', 20, yPosition + 9)
      doc.text('ZONE:', 20, yPosition + 16)

      doc.setFont(undefined, 'normal')
      doc.text(`${selectedChantier?.name || 'N/A'}`, 55, yPosition + 2)
      doc.text(`${client.name}`, 55, yPosition + 9)
      doc.text(`${selectedIntervention?.categories?.name || 'N/A'}`, 55, yPosition + 16)

      yPosition += 35

      for (const section of sections) {
        if (!section.notes && (!section.photos || section.photos.length === 0)) {
          continue
        }

        if (yPosition > 230) {
          addFooter(doc, pageNumber)
          doc.addPage()
          yPosition = 20
          pageNumber++
        }

        doc.setFillColor(34, 177, 76)
        doc.rect(20, yPosition - 2, 170, 8, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(11)
        doc.setFont(undefined, 'bold')
        doc.text(SECTION_LABELS[section.section_type], 25, yPosition + 3)

        yPosition += 10

        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'normal')

        if (section.notes) {
          doc.setFontSize(9)
          doc.setTextColor(29, 53, 87)
          doc.setFont(undefined, 'bold')
          doc.text('Notes:', 25, yPosition)
          yPosition += 5

          doc.setFont(undefined, 'normal')
          doc.setTextColor(60, 60, 60)
          const lines = doc.splitTextToSize(section.notes, 160)
          doc.text(lines, 25, yPosition)
          yPosition += lines.length * 4 + 6
        }

        if (section.photos && section.photos.length > 0) {
          doc.setTextColor(29, 53, 87)
          doc.setFont(undefined, 'bold')
          doc.setFontSize(9)
          doc.text(`Photos (${section.photos.length}):`, 25, yPosition)
          yPosition += 6

          for (const photo of section.photos) {
            if (yPosition > 205) {
              addFooter(doc, pageNumber)
              doc.addPage()
              yPosition = 20
              pageNumber++
            }

            try {
              const imgData = await loadImageAsBase64(photo.photo_url)
              const imgWidth = 75
              const imgHeight = 56

              doc.setDrawColor(34, 177, 76)
              doc.setLineWidth(0.5)
              doc.rect(24, yPosition - 1, imgWidth + 2, imgHeight + 2)

              doc.addImage(imgData, 'JPEG', 25, yPosition, imgWidth, imgHeight)
              yPosition += imgHeight + 7
            } catch (error) {
              console.error('Erreur chargement image:', error)
              doc.setTextColor(180, 180, 180)
              doc.text('Image non disponible', 25, yPosition)
              yPosition += 8
            }
          }
        }

        yPosition += 6
      }

      addFooter(doc, pageNumber)

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
            Accès non autorisé
          </h2>
          <p style={{ color: '#718096' }}>
            Le code d'accès est invalide. Veuillez vérifier votre lien.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc' }}>
      <header style={{
        background: 'linear-gradient(135deg, #22b14c 0%, #1d3557 100%)',
        color: 'white',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <img
            src="/logo_fin.png"
            alt="Green Life Logo"
            style={{
              width: '60px',
              height: '60px',
              objectFit: 'contain',
              background: 'white',
              borderRadius: '12px',
              padding: '8px'
            }}
          />
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              Portail Client
            </h1>
            <p style={{ fontSize: '16px', opacity: 0.9 }}>
              {client.name}
            </p>
          </div>
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
                        background: 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)',
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
                        background: 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)',
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
                {generatingPDF ? 'Génération du PDF...' : 'Télécharger le rapport PDF'}
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
