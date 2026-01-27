import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { jsPDF } from 'jspdf'

const SECTION_LABELS = {
  'implantation': 'Implantation',
  'bac_condensat': 'Bac à condensat',
  'echangeur': 'Échangeur',
  'evacuation': 'Évacuation',
  'observations': 'Observations'
}

export default function ClientPortal() {
  const navigate = useNavigate()
  const [email, setEmail] = useState(null)
  const [client, setClient] = useState(null)
  const [chantiers, setChantiers] = useState([])
  const [selectedChantier, setSelectedChantier] = useState(null)
  const [interventions, setInterventions] = useState([])
  const [selectedIntervention, setSelectedIntervention] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('clientEmail')
    if (!storedEmail) {
      navigate('/portail/connexion')
      return
    }
    setEmail(storedEmail)
  }, [navigate])

  useEffect(() => {
    if (email) {
      loadClientData()
    }
  }, [email])

  const loadClientData = async () => {
    try {
      const apiUrl = `${supabaseUrl}/functions/v1/client-portal-api?email=${encodeURIComponent(email)}&action=get_chantiers`

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
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
      const apiUrl = `${supabaseUrl}/functions/v1/client-portal-api?email=${encodeURIComponent(email)}&action=get_interventions&chantier_id=${chantierId}`

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
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
      const apiUrl = `${supabaseUrl}/functions/v1/client-portal-api?email=${encodeURIComponent(email)}&action=get_intervention_details&intervention_id=${interventionId}`

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
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
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5f0 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #22b14c',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#4a5568', fontSize: '16px', fontWeight: '500' }}>Chargement de votre espace...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
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
        padding: '20px',
        background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5f0 100%)'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '600px',
          background: 'white',
          padding: '60px 40px',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #fee 0%, #fdd 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '40px'
          }}>
            🔒
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px', color: '#1a202c', lineHeight: '1.3' }}>
            Accès restreint
          </h2>
          <p style={{ color: '#718096', fontSize: '16px', lineHeight: '1.6' }}>
            L'adresse email utilisée n'est pas valide ou n'est pas enregistrée dans notre système. Veuillez contacter votre interlocuteur chez Green Life.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5f0 100%)' }}>
      <header style={{
        background: 'white',
        borderBottom: '1px solid rgba(34, 177, 76, 0.1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '20px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img
              src="/logo_fin.png"
              alt="Green Life Logo"
              style={{
                width: '70px',
                height: '70px',
                objectFit: 'contain'
              }}
            />
            <div>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#22b14c',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '4px'
              }}>
                Espace Client Sécurisé
              </div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1a202c',
                margin: 0
              }}>
                {client.name}
              </h1>
            </div>
          </div>
          <div style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>✓</span>
            <span style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>Accès vérifié</span>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '48px 40px'
      }}>
        {!selectedChantier && !selectedIntervention ? (
          <div>
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{
                fontSize: '36px',
                fontWeight: '700',
                marginBottom: '12px',
                color: '#1a202c',
                lineHeight: '1.2'
              }}>
                Vos Projets
              </h2>
              <p style={{
                fontSize: '18px',
                color: '#718096',
                lineHeight: '1.6'
              }}>
                Consultez l'historique complet de vos interventions et téléchargez vos rapports
              </p>
            </div>

            {chantiers.length === 0 ? (
              <div style={{
                background: 'white',
                padding: '80px 40px',
                borderRadius: '20px',
                textAlign: 'center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
                border: '2px dashed #e2e8f0'
              }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  background: 'linear-gradient(135deg, #e8f5f0 0%, #d4ede3 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  fontSize: '48px'
                }}>
                  📋
                </div>
                <p style={{ fontSize: '22px', fontWeight: '600', marginBottom: '12px', color: '#2d3748' }}>
                  Aucun projet disponible
                </p>
                <p style={{ fontSize: '16px', color: '#718096', lineHeight: '1.6' }}>
                  Vos projets terminés apparaîtront ici avec tous les détails de nos interventions
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: '28px'
              }}>
                {chantiers.map((chantier) => (
                  <div
                    key={chantier.id}
                    onClick={() => loadChantierInterventions(chantier.id)}
                    style={{
                      background: 'white',
                      padding: '32px',
                      borderRadius: '16px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(34, 177, 76, 0.1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px)'
                      e.currentTarget.style.boxShadow = '0 20px 50px rgba(34, 177, 76, 0.15)'
                      e.currentTarget.style.borderColor = 'rgba(34, 177, 76, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'
                      e.currentTarget.style.borderColor = 'rgba(34, 177, 76, 0.1)'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '100px',
                      height: '100px',
                      background: 'linear-gradient(135deg, rgba(34, 177, 76, 0.05) 0%, rgba(29, 158, 62, 0.02) 100%)',
                      borderRadius: '0 0 0 100%'
                    }} />
                    <div style={{
                      fontSize: '40px',
                      marginBottom: '20px'
                    }}>
                      🏢
                    </div>
                    <h3 style={{
                      fontSize: '22px',
                      fontWeight: '700',
                      color: '#1a202c',
                      marginBottom: '16px',
                      lineHeight: '1.3'
                    }}>
                      {chantier.name}
                    </h3>
                    {chantier.address && (
                      <div style={{
                        color: '#718096',
                        fontSize: '15px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '18px' }}>📍</span>
                        {chantier.address}
                      </div>
                    )}
                    {chantier.description && (
                      <div style={{
                        color: '#4a5568',
                        fontSize: '15px',
                        marginTop: '16px',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #f8fffe 0%, #f0faf7 100%)',
                        borderRadius: '10px',
                        lineHeight: '1.6',
                        borderLeft: '3px solid #22b14c'
                      }}>
                        {chantier.description}
                      </div>
                    )}
                    <button
                      style={{
                        marginTop: '24px',
                        width: '100%',
                        padding: '14px 20px',
                        background: 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)',
                        color: 'white',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(34, 177, 76, 0.3)'
                      }}
                    >
                      Consulter les interventions →
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
                background: 'white',
                color: '#4a5568',
                padding: '12px 20px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                marginBottom: '32px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f7fafc'
                e.target.style.borderColor = '#cbd5e0'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white'
                e.target.style.borderColor = '#e2e8f0'
              }}
            >
              ← Retour aux projets
            </button>

            <div style={{
              background: 'white',
              padding: '40px',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              marginBottom: '40px',
              border: '1px solid rgba(34, 177, 76, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '48px' }}>🏢</div>
                <div>
                  <h2 style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    color: '#1a202c',
                    lineHeight: '1.2'
                  }}>
                    {selectedChantier.name}
                  </h2>
                  <p style={{
                    fontSize: '16px',
                    color: '#718096',
                    margin: 0
                  }}>
                    Historique des interventions terminées
                  </p>
                </div>
              </div>
            </div>

            {interventions.length === 0 ? (
              <div style={{
                background: 'white',
                padding: '80px 40px',
                borderRadius: '20px',
                textAlign: 'center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
                border: '2px dashed #e2e8f0'
              }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  background: 'linear-gradient(135deg, #e8f5f0 0%, #d4ede3 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  fontSize: '48px'
                }}>
                  📄
                </div>
                <p style={{ fontSize: '22px', fontWeight: '600', marginBottom: '12px', color: '#2d3748' }}>
                  Aucune intervention disponible
                </p>
                <p style={{ fontSize: '16px', color: '#718096', lineHeight: '1.6' }}>
                  Les interventions terminées sur ce chantier apparaîtront ici
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '24px'
              }}>
                {interventions.map((intervention) => (
                  <div
                    key={intervention.id}
                    onClick={() => loadInterventionDetails(intervention.id)}
                    style={{
                      background: 'white',
                      padding: '28px',
                      borderRadius: '16px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(34, 177, 76, 0.1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-6px)'
                      e.currentTarget.style.boxShadow = '0 20px 50px rgba(34, 177, 76, 0.15)'
                      e.currentTarget.style.borderColor = 'rgba(34, 177, 76, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'
                      e.currentTarget.style.borderColor = 'rgba(34, 177, 76, 0.1)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '20px'
                    }}>
                      <div>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
                        <h3 style={{
                          fontSize: '20px',
                          fontWeight: '700',
                          color: '#1a202c',
                          lineHeight: '1.3'
                        }}>
                          {intervention.categories?.name || 'Sans rubrique'}
                        </h3>
                      </div>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%)',
                        color: '#22543d',
                        fontSize: '13px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Terminé
                      </span>
                    </div>
                    <div style={{
                      color: '#718096',
                      fontSize: '15px',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '18px' }}>📅</span>
                      {new Date(intervention.intervention_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <button
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)',
                        color: 'white',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(34, 177, 76, 0.3)'
                      }}
                    >
                      Voir le rapport complet →
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
                background: 'white',
                color: '#4a5568',
                padding: '12px 20px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                marginBottom: '32px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f7fafc'
                e.target.style.borderColor = '#cbd5e0'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white'
                e.target.style.borderColor = '#e2e8f0'
              }}
            >
              ← Retour aux interventions
            </button>

            <div style={{
              background: 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)',
              padding: '40px',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(34, 177, 76, 0.2)',
              marginBottom: '32px',
              color: 'white'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '24px'
              }}>
                <div style={{ flex: '1', minWidth: '300px' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    opacity: 0.9
                  }}>
                    Rapport d'intervention
                  </div>
                  <h2 style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    marginBottom: '16px',
                    lineHeight: '1.2'
                  }}>
                    {selectedIntervention.categories?.name}
                  </h2>
                  <div style={{
                    fontSize: '16px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: 0.95
                  }}>
                    <span style={{ fontSize: '20px' }}>📅</span>
                    {new Date(selectedIntervention.intervention_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    background: 'rgba(255, 255, 255, 0.25)',
                    fontSize: '14px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    ✓ Terminé
                  </div>
                </div>
                <button
                  onClick={generatePDF}
                  disabled={generatingPDF}
                  style={{
                    padding: '16px 32px',
                    background: generatingPDF ? 'rgba(255, 255, 255, 0.3)' : 'white',
                    color: generatingPDF ? 'rgba(255, 255, 255, 0.7)' : '#22b14c',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: generatingPDF ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: generatingPDF ? 'none' : '0 8px 24px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => !generatingPDF && (e.target.style.transform = 'translateY(-3px)', e.target.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)')}
                  onMouseLeave={(e) => !generatingPDF && (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)')}
                >
                  <span style={{ fontSize: '24px' }}>{generatingPDF ? '⏳' : '📄'}</span>
                  {generatingPDF ? 'Génération...' : 'Télécharger PDF'}
                </button>
              </div>
            </div>

            {sections.map((section) => (
              <div
                key={section.id}
                style={{
                  background: 'white',
                  padding: '32px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  marginBottom: '24px',
                  border: '1px solid rgba(34, 177, 76, 0.1)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '24px',
                  paddingBottom: '20px',
                  borderBottom: '2px solid #f0faf7'
                }}>
                  <span style={{ fontSize: '32px' }}>📋</span>
                  <h4 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1a202c',
                    margin: 0
                  }}>
                    {SECTION_LABELS[section.section_type]}
                  </h4>
                </div>

                {section.notes && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{
                      color: '#22b14c',
                      fontWeight: '700',
                      marginBottom: '12px',
                      fontSize: '15px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Notes d'intervention
                    </div>
                    <div style={{
                      color: '#4a5568',
                      padding: '20px',
                      background: 'linear-gradient(135deg, #f8fffe 0%, #f0faf7 100%)',
                      borderRadius: '12px',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.7',
                      fontSize: '15px',
                      borderLeft: '4px solid #22b14c'
                    }}>
                      {section.notes}
                    </div>
                  </div>
                )}

                {section.photos && section.photos.length > 0 && (
                  <div>
                    <div style={{
                      color: '#22b14c',
                      fontWeight: '700',
                      marginBottom: '16px',
                      fontSize: '15px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '20px' }}>📸</span>
                      Documentation photographique ({section.photos.length})
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: '16px'
                    }}>
                      {section.photos.map((photo) => (
                        <div
                          key={photo.id}
                          style={{
                            position: 'relative',
                            paddingTop: '75%',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                            transition: 'all 0.3s',
                            border: '2px solid transparent'
                          }}
                          onClick={() => window.open(photo.photo_url, '_blank')}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.03)'
                            e.currentTarget.style.boxShadow = '0 12px 32px rgba(34, 177, 76, 0.2)'
                            e.currentTarget.style.borderColor = '#22b14c'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
                            e.currentTarget.style.borderColor = 'transparent'
                          }}
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
                          <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'rgba(34, 177, 76, 0.9)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            Agrandir 🔍
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!section.photos || section.photos.length === 0) && !section.notes && (
                  <div style={{
                    color: '#a0aec0',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    padding: '40px 20px',
                    background: '#f7fafc',
                    borderRadius: '10px'
                  }}>
                    Aucune donnée pour cette section
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={{
        background: 'white',
        borderTop: '1px solid rgba(34, 177, 76, 0.1)',
        padding: '40px 40px',
        marginTop: '80px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src="/logo_fin.png"
              alt="Green Life Logo"
              style={{
                width: '50px',
                height: '50px',
                objectFit: 'contain'
              }}
            />
            <div>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '4px'
              }}>
                Green Life
              </div>
              <div style={{
                fontSize: '14px',
                color: '#718096'
              }}>
                Nettoyage Froid Professionnel
              </div>
            </div>
          </div>
          <div style={{
            fontSize: '14px',
            color: '#718096',
            textAlign: 'right'
          }}>
            <div style={{ marginBottom: '4px' }}>
              Portail Client Sécurisé
            </div>
            <div>
              © {new Date().getFullYear()} Green Life. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
