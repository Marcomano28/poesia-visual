import { Suspense, useEffect, useRef } from 'react'
import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import RainyEffect from './effects/RainyEffect'
import FogEffect from './effects/FogEffect'
import SandEffect2 from './effects/SandEffect'

const THREE_EFFECTS = { fog: FogEffect, sand: SandEffect2 }

export default function CanvasRainyOverlay({ card, onClose }) {
  const ThreeEffect = THREE_EFFECTS[card.effect]
  const [ready, setReady] = useState(false)

   useEffect(() => {
  const id = setTimeout(() => setReady(true), 700) // duración de overlay-in
  return () => clearTimeout(id)
   }, [])
   
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  
  return (
    <div className="overlay">

      {card.effect === 'rain' && (
        <RainyEffect images={card.images} />
      )}

      {ThreeEffect && (
        <Canvas
           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
           resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            // Evita pérdida de contexto al desmontar
            preserveDrawingBuffer: false,
          }}
          dpr={Math.min(window.devicePixelRatio, 1.5)}
          frameloop="always"
          onCreated={({ gl }) => {
            // Listener para recuperar contexto si se pierde
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault()
              console.warn('WebGL context lost — intentando recuperar')
            })
          }}
        >
          <Suspense fallback={null}>
            <ThreeEffect images={card.images} />
          </Suspense>
        </Canvas>
      )}

      {/* <div className="overlay-content">
        <div className="overlay-subtitle">{card.subtitle}</div>
        <h2 className="overlay-title">{card.title}</h2>
        <p className="overlay-verse">{card.verse}</p>
      </div> */}

      <button className="overlay-close" onClick={onClose}>
        ✕ &nbsp; CERRAR
      </button>
    </div>
  )
}
