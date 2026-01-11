import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { jsPDF } from 'jspdf'

const SECTION_TYPES = [
  { id: 'implantation', label: 'Implantation' },
  { id: 'bac_condensat', label: 'Bac à condensat' },
  { id: 'echangeur', label: 'Échangeur' },
  { id: 'evacuation', label: 'Évacuation' },
  { id: 'observations', label: 'Observations' }
]

export default function InterventionForm() {
  const { chantierId } = useParams()
  const navigate = useNavigate()
  const [chantier, setChantier] = useState(null)
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [editedCategoryName, setEditedCategoryName] = useState('')
  const [intervention, setIntervention] = useState(null)
  const [sections, setSections] = useState({})
  const [uploading, setUploading] = useState({})
  const [saving, setSaving] = useState(false)
  const [generatingGlobalPDF, setGeneratingGlobalPDF] = useState(false)
  const [generatingZonePDF, setGeneratingZonePDF] = useState(null)

  useEffect(() => {
    loadChantierAndCategories()
  }, [chantierId])

  const loadChantierAndCategories = async () => {
    const { data: chantierData } = await supabase
      .from('chantiers')
      .select('*, clients(name, email)')
      .eq('id', chantierId)
      .single()

    if (chantierData) {
      setChantier(chantierData)
    }

    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('chantier_id', chantierId)
      .order('created_at', { ascending: false })

    if (categoriesData) {
      setCategories(categoriesData)
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: newCategoryName, chantier_id: chantierId }])
      .select()

    if (!error && data) {
      setCategories([data[0], ...categories])
      setNewCategoryName('')
      setShowAddCategory(false)
    }
  }

  const handleEditCategory = (category, e) => {
    e.stopPropagation()
    setEditingCategory(category)
    setEditedCategoryName(category.name)
  }

  const handleUpdateCategory = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase
      .from('categories')
      .update({ name: editedCategoryName })
      .eq('id', editingCategory.id)
      .select()

    if (!error && data) {
      setCategories(categories.map(c => c.id === editingCategory.id ? data[0] : c))
      setEditingCategory(null)
      setEditedCategoryName('')
    }
  }

  const handleDeleteCategory = async (categoryId, e) => {
    e.stopPropagation()
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) return

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)

    if (!error) {
      setCategories(categories.filter(c => c.id !== categoryId))
    }
  }

  const startIntervention = async (categoryId) => {
    const { data: user } = await supabase.auth.getUser()

    const { data: existingIntervention } = await supabase
      .from('interventions')
      .select('*')
      .eq('chantier_id', chantierId)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let interventionData = existingIntervention

    if (existingIntervention && existingIntervention.status === 'termine') {
      await supabase
        .from('interventions')
        .update({ status: 'en_cours' })
        .eq('id', existingIntervention.id)

      interventionData = { ...existingIntervention, status: 'en_cours' }
    } else if (!existingIntervention) {
      const { data, error } = await supabase
        .from('interventions')
        .insert([{
          client_id: chantier.client_id,
          chantier_id: chantierId,
          category_id: categoryId,
          technician_id: user.user.id,
          status: 'en_cours'
        }])
        .select()

      if (!error && data) {
        interventionData = data[0]
      }
    }

    if (interventionData) {
      setIntervention(interventionData)
      setSelectedCategory(categoryId)

      const { data: existingSections } = await supabase
        .from('intervention_sections')
        .select('*')
        .eq('intervention_id', interventionData.id)

      const sectionsObj = {}
      const existingSectionTypes = new Set(existingSections?.map(s => s.section_type) || [])

      // Charger les sections existantes avec leurs photos
      if (existingSections && existingSections.length > 0) {
        for (const section of existingSections) {
          const { data: photos } = await supabase
            .from('section_photos')
            .select('*')
            .eq('section_id', section.id)
            .order('created_at', { ascending: true })

          sectionsObj[section.section_type] = {
            ...section,
            photos: photos || []
          }
        }
      }

      // Créer les sections manquantes
      for (const sectionType of SECTION_TYPES) {
        if (!existingSectionTypes.has(sectionType.id)) {
          const { data: sectionData } = await supabase
            .from('intervention_sections')
            .insert([{
              intervention_id: interventionData.id,
              section_type: sectionType.id,
              notes: ''
            }])
            .select()

          if (sectionData) {
            sectionsObj[sectionType.id] = {
              ...sectionData[0],
              photos: []
            }
          }
        }
      }

      setSections(sectionsObj)
    }
  }

  const handlePhotoUpload = async (sectionType, event) => {
    const files = Array.from(event.target.files)
    if (files.length === 0) return

    if (!sections[sectionType] || !sections[sectionType].id) {
      alert('Erreur: La section n\'est pas initialisée. Veuillez recharger la page.')
      return
    }

    setUploading({ ...uploading, [sectionType]: true })

    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${intervention.id}/${sectionType}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('intervention-photos')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Erreur upload:', uploadError)
        alert(`Erreur upload: ${uploadError.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('intervention-photos')
        .getPublicUrl(filePath)

      const { data: photoData, error: insertError } = await supabase
        .from('section_photos')
        .insert([{
          section_id: sections[sectionType].id,
          photo_url: publicUrl
        }])
        .select()

      if (insertError) {
        console.error('Erreur insertion:', insertError)
        alert(`Erreur enregistrement: ${insertError.message}`)
        continue
      }

      if (photoData && photoData.length > 0) {
        setSections({
          ...sections,
          [sectionType]: {
            ...sections[sectionType],
            photos: [...sections[sectionType].photos, photoData[0]]
          }
        })
      }
    }

    setUploading({ ...uploading, [sectionType]: false })
  }

  const handleUpdateNotes = async (sectionType, notes) => {
    await supabase
      .from('intervention_sections')
      .update({ notes })
      .eq('id', sections[sectionType].id)

    setSections({
      ...sections,
      [sectionType]: {
        ...sections[sectionType],
        notes
      }
    })
  }

  const handleDeletePhoto = async (sectionType, photoId, photoUrl) => {
    const filePath = photoUrl.split('/intervention-photos/')[1]
    await supabase.storage.from('intervention-photos').remove([filePath])
    await supabase.from('section_photos').delete().eq('id', photoId)

    setSections({
      ...sections,
      [sectionType]: {
        ...sections[sectionType],
        photos: sections[sectionType].photos.filter(p => p.id !== photoId)
      }
    })
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

  const loadLogoAsBase64 = () => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = '/logo_green_life_(1).webp'
    })
  }

  const addFooter = (doc, logoData, pageNumber) => {
    const pageHeight = doc.internal.pageSize.height
    const pageWidth = doc.internal.pageSize.width

    doc.addImage(logoData, 'PNG', 15, pageHeight - 25, 20, 20)

    doc.setTextColor(150, 150, 150)
    doc.setFontSize(8)
    doc.text('Green Life - Nettoyage Froid', pageWidth / 2, pageHeight - 10, { align: 'center' })
    doc.text(`Page ${pageNumber}`, pageWidth - 20, pageHeight - 10, { align: 'right' })
  }

  const generateGlobalPDF = async () => {
    setGeneratingGlobalPDF(true)
    try {
      const { data: interventions } = await supabase
        .from('interventions')
        .select(`
          *,
          categories (name)
        `)
        .eq('chantier_id', chantierId)
        .eq('status', 'termine')
        .not('category_id', 'is', null)
        .order('intervention_date', { ascending: false })

      if (!interventions || interventions.length === 0) {
        alert('Aucune intervention terminée à inclure dans le PDF')
        setGeneratingGlobalPDF(false)
        return
      }

      const logoData = await loadLogoAsBase64()
      const doc = new jsPDF()
      let yPosition = 15
      let pageNumber = 1

      doc.setFillColor(34, 177, 76)
      doc.rect(0, 0, 210, 35, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont(undefined, 'bold')
      doc.text('RAPPORT GLOBAL', 105, 15, { align: 'center' })

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
      doc.text('DATE:', 20, yPosition + 16)

      doc.setFont(undefined, 'normal')
      doc.text(`${chantier.name}`, 55, yPosition + 2)
      doc.text(`${chantier.clients?.name || 'N/A'}`, 55, yPosition + 9)
      doc.text(`${new Date().toLocaleDateString('fr-FR')}`, 55, yPosition + 16)

      yPosition += 30

      for (const interv of interventions) {
        if (yPosition > 225) {
          addFooter(doc, logoData, pageNumber)
          doc.addPage()
          yPosition = 20
          pageNumber++
        }

        doc.setFillColor(34, 177, 76)
        doc.rect(15, yPosition - 3, 180, 12, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text(`ZONE: ${interv.categories?.name || 'N/A'}`, 20, yPosition + 4)

        yPosition += 14

        yPosition += 2

        const { data: sectionsData } = await supabase
          .from('intervention_sections')
          .select('*')
          .eq('intervention_id', interv.id)

        if (sectionsData) {
          for (const section of sectionsData) {
            const { data: photos } = await supabase
              .from('section_photos')
              .select('*')
              .eq('section_id', section.id)

            if (!section.notes && (!photos || photos.length === 0)) {
              continue
            }

            if (yPosition > 230) {
              addFooter(doc, logoData, pageNumber)
              doc.addPage()
              yPosition = 20
              pageNumber++
            }

            const sectionLabel = SECTION_TYPES.find(s => s.id === section.section_type)?.label || section.section_type

            doc.setFillColor(0, 144, 231)
            doc.rect(20, yPosition - 2, 170, 8, 'F')

            doc.setTextColor(255, 255, 255)
            doc.setFontSize(11)
            doc.setFont(undefined, 'bold')
            doc.text(sectionLabel, 25, yPosition + 3)

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

            if (photos && photos.length > 0) {
              doc.setTextColor(29, 53, 87)
              doc.setFont(undefined, 'bold')
              doc.setFontSize(9)
              doc.text(`Photos (${photos.length}):`, 25, yPosition)
              yPosition += 6

              for (const photo of photos) {
                if (yPosition > 205) {
                  addFooter(doc, logoData, pageNumber)
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
        }

        yPosition += 12
      }

      addFooter(doc, logoData, pageNumber)

      const fileName = `Rapport_Global_${chantier.name}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Erreur génération PDF global:', error)
      alert('Erreur lors de la génération du PDF')
    } finally {
      setGeneratingGlobalPDF(false)
    }
  }

  const generateZonePDF = async (categoryId, categoryName) => {
    setGeneratingZonePDF(categoryId)
    try {
      const { data: interventions } = await supabase
        .from('interventions')
        .select(`
          *,
          categories (name)
        `)
        .eq('chantier_id', chantierId)
        .eq('category_id', categoryId)
        .eq('status', 'termine')
        .order('intervention_date', { ascending: false })

      if (!interventions || interventions.length === 0) {
        alert('Aucune intervention terminée pour cette zone')
        setGeneratingZonePDF(null)
        return
      }

      const logoData = await loadLogoAsBase64()
      const doc = new jsPDF()
      let yPosition = 15
      let pageNumber = 1

      doc.setFillColor(34, 177, 76)
      doc.rect(0, 0, 210, 35, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont(undefined, 'bold')
      doc.text('RAPPORT PAR ZONE', 105, 15, { align: 'center' })

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
      doc.text(`${chantier.name}`, 55, yPosition + 2)
      doc.text(`${chantier.clients?.name || 'N/A'}`, 55, yPosition + 9)
      doc.text(`${categoryName}`, 55, yPosition + 16)

      doc.setFont(undefined, 'bold')
      doc.text('DATE:', 130, yPosition + 2)
      doc.setFont(undefined, 'normal')
      doc.text(`${new Date().toLocaleDateString('fr-FR')}`, 155, yPosition + 2)

      yPosition += 35

      for (const interv of interventions) {
        if (yPosition > 230) {
          addFooter(doc, logoData, pageNumber)
          doc.addPage()
          yPosition = 20
          pageNumber++
        }

        doc.setTextColor(29, 53, 87)
        doc.setFontSize(11)
        doc.setFont(undefined, 'bold')
        doc.text(`Intervention du ${new Date(interv.intervention_date).toLocaleDateString('fr-FR')}`, 20, yPosition)
        yPosition += 10

        const { data: sectionsData } = await supabase
          .from('intervention_sections')
          .select('*')
          .eq('intervention_id', interv.id)

        if (sectionsData) {
          for (const section of sectionsData) {
            const { data: photos } = await supabase
              .from('section_photos')
              .select('*')
              .eq('section_id', section.id)

            if (!section.notes && (!photos || photos.length === 0)) {
              continue
            }

            if (yPosition > 230) {
              addFooter(doc, logoData, pageNumber)
              doc.addPage()
              yPosition = 20
              pageNumber++
            }

            const sectionLabel = SECTION_TYPES.find(s => s.id === section.section_type)?.label || section.section_type

            doc.setFillColor(0, 144, 231)
            doc.rect(20, yPosition - 2, 170, 8, 'F')

            doc.setTextColor(255, 255, 255)
            doc.setFontSize(11)
            doc.setFont(undefined, 'bold')
            doc.text(sectionLabel, 25, yPosition + 3)

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

            if (photos && photos.length > 0) {
              doc.setTextColor(29, 53, 87)
              doc.setFont(undefined, 'bold')
              doc.setFontSize(9)
              doc.text(`Photos (${photos.length}):`, 25, yPosition)
              yPosition += 6

              for (const photo of photos) {
                if (yPosition > 205) {
                  addFooter(doc, logoData, pageNumber)
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
        }

        yPosition += 12
      }

      addFooter(doc, logoData, pageNumber)

      const fileName = `Rapport_Zone_${categoryName}_${chantier.name}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Erreur génération PDF zone:', error)
      alert('Erreur lors de la génération du PDF')
    } finally {
      setGeneratingZonePDF(null)
    }
  }

  const handleFinishIntervention = async () => {
    setSaving(true)
    await supabase
      .from('interventions')
      .update({ status: 'termine' })
      .eq('id', intervention.id)

    setIntervention(null)
    setSections({})
    setSelectedCategory(null)
    setSaving(false)
  }

  if (!chantier) return <div>Chargement...</div>

  return (
    <div>
      <button
        onClick={() => navigate(`/technicien/client/${chantier.client_id}/chantiers`)}
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
          {chantier.name}
        </h2>
        <p style={{ color: '#718096', fontSize: '14px' }}>
          Client: {chantier.clients?.name}
        </p>
        {chantier.address && (
          <p style={{ color: '#718096', fontSize: '14px' }}>
            📍 {chantier.address}
          </p>
        )}
      </div>

      {!intervention ? (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700' }}>
              Sélectionner une zone
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={generateGlobalPDF}
                disabled={generatingGlobalPDF}
                style={{
                  background: generatingGlobalPDF ? '#a0aec0' : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {generatingGlobalPDF ? 'Génération...' : '📋 PDF Global'}
              </button>
              <button
                onClick={() => setShowAddCategory(true)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                + Nouvelle Zone
              </button>
            </div>
          </div>

          {showAddCategory && (
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '16px'
            }}>
              <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nom de la zone (ex: Climatisation Bureau 1)"
                  required
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  style={{
                    background: '#e2e8f0',
                    color: '#4a5568',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Annuler
                </button>
              </form>
            </div>
          )}

          {editingCategory && (
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '16px'
            }}>
              <form onSubmit={handleUpdateCategory} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={editedCategoryName}
                  onChange={(e) => setEditedCategoryName(e.target.value)}
                  placeholder="Nom de la zone"
                  required
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  style={{
                    background: '#e2e8f0',
                    color: '#4a5568',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Annuler
                </button>
              </form>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            {categories.map((category) => (
              <div
                key={category.id}
                style={{
                  background: 'white',
                  padding: '20px',
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
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1a202c', marginBottom: '12px' }}>
                  {category.name}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button
                    onClick={() => startIntervention(category.id)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Démarrer
                  </button>
                  <button
                    onClick={(e) => handleEditCategory(category, e)}
                    style={{
                      padding: '8px 12px',
                      background: '#e2e8f0',
                      color: '#4a5568',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => handleDeleteCategory(category.id, e)}
                    style={{
                      padding: '8px 12px',
                      background: '#fed7d7',
                      color: '#c53030',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    🗑️
                  </button>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    generateZonePDF(category.id, category.name)
                  }}
                  disabled={generatingZonePDF === category.id}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: generatingZonePDF === category.id ? '#a0aec0' : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {generatingZonePDF === category.id ? 'Génération...' : `📋 PDF ${category.name}`}
                </button>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#718096',
              background: 'white',
              borderRadius: '12px'
            }}>
              Aucune zone. Créez-en une pour commencer.
            </div>
          )}
        </div>
      ) : (
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>
            Intervention en cours
          </h3>

          {SECTION_TYPES.map((sectionType) => (
            <div
              key={sectionType.id}
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
                {sectionType.label}
              </h4>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Notes
                </label>
                <textarea
                  value={sections[sectionType.id]?.notes || ''}
                  onChange={(e) => handleUpdateNotes(sectionType.id, e.target.value)}
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                  placeholder="Ajouter des notes..."
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  Photos
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => handlePhotoUpload(sectionType.id, e)}
                  style={{ display: 'none' }}
                  id={`photo-${sectionType.id}`}
                />
                <label
                  htmlFor={`photo-${sectionType.id}`}
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {uploading[sectionType.id] ? 'Upload...' : '📷 Ajouter des photos'}
                </label>
              </div>

              {sections[sectionType.id]?.photos && sections[sectionType.id].photos.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '12px',
                  marginTop: '16px'
                }}>
                  {sections[sectionType.id].photos.map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        position: 'relative',
                        paddingTop: '100%',
                        borderRadius: '8px',
                        overflow: 'hidden'
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
                      <button
                        onClick={() => handleDeletePhoto(sectionType.id, photo.id, photo.photo_url)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(220, 38, 38, 0.9)',
                          color: 'white',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div style={{
            position: 'sticky',
            bottom: '20px',
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 -2px 16px rgba(0,0,0,0.1)'
          }}>
            <button
              onClick={handleFinishIntervention}
              disabled={saving}
              style={{
                width: '100%',
                padding: '16px',
                background: saving ? '#a0aec0' : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                color: 'white',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '700'
              }}
            >
              {saving ? 'Enregistrement...' : 'Retour à zone'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
