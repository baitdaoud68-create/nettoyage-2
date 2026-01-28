import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { jsPDF } from 'jspdf'

const SECTION_LABELS = {
  'implantation': 'Implantation',
  'bac_condensat': 'Bac à condensat',
  'echangeur': 'Échangeur',
  'evacuation': 'Évacuation',
  'observations': 'Observations'
}

export default function InterventionDetails() {
  const { interventionId } = useParams()
  const navigate = useNavigate()
  const [intervention, setIntervention] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    loadInterventionDetails()
  }, [interventionId])

  const loadInterventionDetails = async () => {
    const { data: interventionData } = await supabase
      .from('interventions')
      .select(`
        *,
        clients (name, email),
        categories (name)
      `)
      .eq('id', interventionId)
      .single()

    if (interventionData) {
      setIntervention(interventionData)
    }

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

    setLoading(false)
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

  const loadLogo = async () => {
    try {
      const logoUrl = '/logo_fin.png'
      return await loadImageAsBase64(logoUrl)
    } catch (error) {
      console.error('Erreur chargement logo:', error)
      return null
    }
  }

  const addFooter = (doc, pageNumber, logoData) => {
    const pageHeight = doc.internal.pageSize.height
    const pageWidth = doc.internal.pageSize.width

    if (logoData) {
      try {
        const logoSize = 10
        doc.addImage(logoData, 'PNG', 15, pageHeight - 15, logoSize, logoSize)
      } catch (error) {
        console.error('Erreur ajout logo footer:', error)
      }
    }

    doc.setTextColor(150, 150, 150)
    doc.setFontSize(8)
    doc.text('Green Life - Nettoyage Froid', pageWidth / 2, pageHeight - 10, { align: 'center' })
    doc.text(`Page ${pageNumber}`, pageWidth - 20, pageHeight - 10, { align: 'right' })
  }

  const handleDeleteIntervention = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
      return
    }

    setDeleting(true)

    const { error } = await supabase
      .from('interventions')
      .delete()
      .eq('id', interventionId)

    if (!error) {
      navigate('/technicien')
    } else {
      alert('Erreur lors de la suppression')
      setDeleting(false)
    }
  }

  const handleCloseIntervention = async () => {
    if (!confirm('Êtes-vous sûr de vouloir cloturer cette intervention ? Elle deviendra visible pour le client.')) {
      return
    }

    setClosing(true)

    const { error } = await supabase
      .from('interventions')
      .update({ is_closed: true })
      .eq('id', interventionId)

    if (!error) {
      setIntervention({ ...intervention, is_closed: true })
    } else {
      alert('Erreur lors de la clôture')
    }

    setClosing(false)
  }

  const generatePDF = async () => {
    setGeneratingPDF(true)
    try {
      const logoData = await loadLogo()

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
      doc.text('CLIENT:', 20, yPosition + 2)
      doc.text('ZONE:', 20, yPosition + 9)
      doc.text('DATE:', 20, yPosition + 16)

      doc.setFont(undefined, 'normal')
      doc.text(`${intervention?.clients?.name || 'N/A'}`, 50, yPosition + 2)
      doc.text(`${intervention?.categories?.name || 'N/A'}`, 50, yPosition + 9)
      doc.text(`${new Date(intervention?.intervention_date).toLocaleDateString('fr-FR')}`, 50, yPosition + 16)

      yPosition += 35

      const sectionsWithContent = sections.filter(section =>
        section.notes || (section.photos && section.photos.length > 0)
      )

      for (const section of sectionsWithContent) {
        if (yPosition > 230) {
          addFooter(doc, pageNumber, logoData)
          doc.addPage()
          yPosition = 20
          pageNumber++
        }

        doc.setFillColor(0, 144, 231)
        doc.rect(15, yPosition - 3, 180, 10, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(13)
        doc.setFont(undefined, 'bold')
        doc.text(SECTION_LABELS[section.section_type], 20, yPosition + 3)

        yPosition += 12

        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'normal')

        if (section.notes) {
          doc.setFontSize(10)
          doc.setTextColor(29, 53, 87)
          doc.setFont(undefined, 'bold')
          doc.text('Notes:', 20, yPosition)
          yPosition += 6

          doc.setFont(undefined, 'normal')
          doc.setTextColor(60, 60, 60)
          const lines = doc.splitTextToSize(section.notes, 170)
          doc.text(lines, 20, yPosition)
          yPosition += lines.length * 5 + 8
        }

        if (section.photos && section.photos.length > 0) {
          doc.setTextColor(29, 53, 87)
          doc.setFont(undefined, 'bold')
          doc.setFontSize(10)
          doc.text(`Photos (${section.photos.length}):`, 20, yPosition)
          yPosition += 7

          for (const photo of section.photos) {
            if (yPosition > 205) {
              addFooter(doc, pageNumber, logoData)
              doc.addPage()
              yPosition = 20
              pageNumber++
            }

            try {
              const imgData = await loadImageAsBase64(photo.photo_url)
              const imgWidth = 85
              const imgHeight = 64

              doc.setDrawColor(34, 177, 76)
              doc.setLineWidth(0.5)
              doc.rect(19, yPosition - 1, imgWidth + 2, imgHeight + 2)

              const format = photo.photo_url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG'
              doc.addImage(imgData, format, 20, yPosition, imgWidth, imgHeight)
              yPosition += imgHeight + 8
            } catch (error) {
              console.error('Erreur chargement image:', error, photo.photo_url)
              doc.setTextColor(180, 180, 180)
              doc.setFontSize(9)
              doc.text('Image non disponible', 20, yPosition)
              yPosition += 10
            }
          }
        }

        yPosition += 8
      }

      addFooter(doc, pageNumber)

      const fileName = `Intervention_${intervention?.clients?.name}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      alert('Erreur lors de la génération du PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  if (loading) {
    return <div>Chargement...</div>
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
        ← Retour
      </button>

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
          Détails de l'intervention
        </h2>
        <div style={{ color: '#718096', marginBottom: '8px' }}>
          <strong>Client:</strong> {intervention?.clients?.name}
        </div>
        <div style={{ color: '#718096', marginBottom: '8px' }}>
          <strong>Zone:</strong> {intervention?.categories?.name}
        </div>
        <div style={{ color: '#718096', marginBottom: '8px' }}>
          <strong>Date:</strong> {new Date(intervention?.intervention_date).toLocaleDateString('fr-FR')}
        </div>
        <div style={{ color: '#718096', marginBottom: '8px' }}>
          <strong>Statut:</strong>{' '}
          <span style={{
            padding: '4px 12px',
            borderRadius: '12px',
            background: intervention?.status === 'termine' ? '#c6f6d5' : '#fed7d7',
            color: intervention?.status === 'termine' ? '#22543d' : '#742a2a',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {intervention?.status === 'termine' ? 'Terminé' : 'En cours'}
          </span>
        </div>

        <div style={{ color: '#718096', marginBottom: '16px' }}>
          <strong>Visible client:</strong>{' '}
          <span style={{
            padding: '4px 12px',
            borderRadius: '12px',
            background: intervention?.is_closed ? '#bee3f8' : '#fed7d7',
            color: intervention?.is_closed ? '#2c5282' : '#742a2a',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {intervention?.is_closed ? 'Oui (Clôturée)' : 'Non'}
          </span>
        </div>

        {intervention?.status === 'termine' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={generatePDF}
              disabled={generatingPDF}
              style={{
                flex: 1,
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
              {generatingPDF ? 'Génération du PDF...' : 'Générer le PDF'}
            </button>
            <button
              onClick={intervention?.is_closed ? null : handleCloseIntervention}
              disabled={closing || intervention?.is_closed}
              style={{
                padding: '14px 24px',
                background: intervention?.is_closed
                  ? '#e2e8f0'
                  : closing
                    ? '#a0aec0'
                    : 'linear-gradient(135deg, #3182ce 0%, #2c5282 100%)',
                color: intervention?.is_closed ? '#4a5568' : 'white',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'transform 0.2s',
                cursor: intervention?.is_closed ? 'not-allowed' : 'pointer',
                opacity: intervention?.is_closed ? 0.7 : 1
              }}
              onMouseEnter={(e) => !closing && !intervention?.is_closed && (e.target.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {intervention?.is_closed
                ? 'Déjà clôturée'
                : closing
                  ? 'Clôture en cours...'
                  : 'Cloturer'}
            </button>
            <button
              onClick={handleDeleteIntervention}
              disabled={deleting}
              style={{
                padding: '14px 24px',
                background: deleting ? '#a0aec0' : '#fed7d7',
                color: '#742a2a',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => !deleting && (e.target.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        )}
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
                borderRadius: '8px'
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
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(photo.photo_url, '_blank')}
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
  )
}
