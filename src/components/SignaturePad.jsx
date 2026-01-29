import { useRef, useState, useEffect } from 'react'

export default function SignaturePad({ onSave, initialSignature }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(!!initialSignature)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (initialSignature) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      img.src = initialSignature
    }
  }, [initialSignature])

  const startDrawing = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')

    setIsDrawing(true)
    setHasSignature(true)

    const x = (e.clientX || e.touches[0].clientX) - rect.left
    const y = (e.clientY || e.touches[0].clientY) - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawing) return

    e.preventDefault()

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')

    const x = (e.clientX || e.touches[0].clientX) - rect.left
    const y = (e.clientY || e.touches[0].clientY) - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const save = () => {
    const canvas = canvasRef.current
    const signatureData = canvas.toDataURL('image/png')
    onSave(signatureData)
  }

  return (
    <div>
      <div style={{
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'white',
        marginBottom: '16px'
      }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            touchAction: 'none',
            cursor: 'crosshair'
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="button"
          onClick={clear}
          style={{
            padding: '10px 20px',
            background: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            color: '#4a5568',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
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
          Effacer
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasSignature}
          style={{
            padding: '10px 20px',
            background: hasSignature ? 'linear-gradient(135deg, #22b14c 0%, #1d9e3e 100%)' : '#a0aec0',
            color: 'white',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: hasSignature ? 'pointer' : 'not-allowed',
            border: 'none',
            transition: 'all 0.2s',
            boxShadow: hasSignature ? '0 4px 12px rgba(34, 177, 76, 0.3)' : 'none'
          }}
        >
          Enregistrer la signature
        </button>
      </div>
    </div>
  )
}
