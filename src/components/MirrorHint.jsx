import { useState, useEffect, useRef } from 'react'

// ── FingerHint – mobile ───────────────────────────────────────────────────────
function FingerHint({ visible }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: '18%',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      opacity: visible ? 1 : 0,
      transition: 'opacity 1.2s ease',
      pointerEvents: 'none',
    }}>
      {/* Finger SVG */}
      <div style={{ animation: 'swipe 2s ease-in-out infinite' }}>
        <svg width="36" height="60" viewBox="0 0 36 60" fill="none">
          {/* Palm */}
          <rect x="10" y="28" width="16" height="22" rx="8" fill="rgba(255,255,255,0.55)" />
          {/* Finger */}
          <rect x="14" y="8" width="8" height="26" rx="4" fill="rgba(255,255,255,0.75)" />
          {/* Knuckle hint */}
          <rect x="14" y="20" width="8" height="2" rx="1" fill="rgba(255,255,255,0.3)" />
        </svg>
      </div>

      {/* Trail line under finger */}
      <div style={{
        width: '48px',
        height: '2px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
        animation: 'trailPulse 2s ease-in-out infinite',
        borderRadius: '2px',
      }} />

      <style>{`
        @keyframes swipe {
          0%   { transform: translateX(-18px) rotate(-8deg); }
          50%  { transform: translateX( 18px) rotate( 8deg); }
          100% { transform: translateX(-18px) rotate(-8deg); }
        }
        @keyframes trailPulse {
          0%, 100% { opacity: 0.2; width: 28px; }
          50%       { opacity: 0.6; width: 52px; }
        }
      `}</style>
    </div>
  )
}

// ── TextHint – desktop ────────────────────────────────────────────────────────
function TextHint({ visible }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: '14%',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      opacity: visible ? 1 : 0,
      transition: 'opacity 1.4s ease',
      pointerEvents: 'none',
    }}>
      {/* Arrow SVG – apunta arriba, bouncing */}
      <div style={{ animation: 'floatUp 1.8s ease-in-out infinite' }}>
        <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
          {/* Stem */}
          <line x1="14" y1="34" x2="14" y2="12" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Arrowhead */}
          <path d="M5 18 L14 4 L23 18" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          {/* Second arrowhead faded - da sensación de movimiento */}
          <path d="M8 24 L14 14 L20 24" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </div>

      {/* Texto */}
      <p style={{
        margin: 0,
        fontFamily: '"Cormorant Garamond", "Georgia", serif',
        fontStyle: 'italic',
        fontSize: '22px',
        letterSpacing: '0.18em',
        color: 'rgba(255,255,255,0.55)',
        textTransform: 'lowercase',
        whiteSpace: 'nowrap',
        animation: 'breathe 3s ease-in-out infinite',
      }}>
        limpia el espejo
      </p>

      <style>{`
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px);  opacity: 0.7; }
          50%       { transform: translateY(-7px); opacity: 1;   }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.75; }
        }
      `}</style>
    </div>
  )
}

// ── MirrorHint – wrapper principal ───────────────────────────────────────────
// Uso: <MirrorHint onDismiss={() => {}} />
export default function MirrorHint({ onDismiss }) {
  const [visible, setVisible]   = useState(false)
  const [mounted, setMounted]   = useState(true)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Fade in al montar
  useEffect(() => {
    const fadeIn = setTimeout(() => setVisible(true), 300)

    // Auto-desaparece a los 8s
    const fadeOut = setTimeout(() => {
      setVisible(false)
      setTimeout(() => { setMounted(false); onDismiss?.() }, 1400)
    }, 8000)

    return () => { clearTimeout(fadeIn); clearTimeout(fadeOut) }
  }, [])

  // Desaparece al primer movimiento/toque
  const dismiss = () => {
    if (!visible) return
    setVisible(false)
    setTimeout(() => { setMounted(false); onDismiss?.() }, 400)
  }

  if (!mounted) return null

  return (
    <div
      onMouseMove={dismiss}
      onTouchStart={dismiss}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}
    >
      {isMobile
        ? <FingerHint visible={visible} />
        : <TextHint   visible={visible} />
      }
    </div>
  )
}
