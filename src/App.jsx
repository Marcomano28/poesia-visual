import { useState } from 'react'
import TarotGallery from './components/TarotGallery'
import CanvasRainyOverlay from './components/CanvasRainyOverlay'
import './App.css'

export default function App() {
  const [activeCard, setActiveCard] = useState(null)
  const [theme, setTheme] = useState('dark')

  const toggleTheme = () => {
  const next = theme === 'dark' ? 'light' : 'dark'
  setTheme(next)
  document.documentElement.setAttribute('data-theme', next)
  }

  const cards = [
    {
      id: 'rain',
      title: 'La Lluvia',
      subtitle: 'II · El Umbral',
      images: ['/images/Card-1/img01.webp', '/images/Card-1/img02.webp', '/images/Card-1/img03.webp', '/images/Card-1/img04.webp', '/images/Card-1/img05.webp',, '/images/Card-1/img06.webp',
               '/images/Card-1/img07.webp', '/images/Card-1/img08.webp', '/images/Card-1/img09.webp', '/images/Card-1/img10.webp', '/images/Card-1/img11.webp', '/images/Card-1/img12.webp','/images/Card-1/img13.webp'],
      effect: 'rain',
      verse: 'Las gotas corren como el tiempo, borrando los recuerdos.',
    },
    {
      id: 'fog',
      title: 'La Niebla',
      subtitle: 'VII · El Velo',
      images: ['/images/Card-2/img01.webp', '/images/Card-2/img02.jpg', '/images/Card-2/img03.webp', '/images/Card-2/img04.webp','/images/Card-2/img05.webp','/images/Card-2/img06.webp',
               '/images/Card-2/img07.webp','/images/Card-2/img08.webp', '/images/Card-2/img09.webp','/images/Card-2/img10.webp'],
      effect: 'fog',
      verse: 'En la penumbra flotan los espíritus sin nombre.',
    },
    {
       id: 'sand',
      title: 'El Espejo',
      subtitle: 'XIII · La Fractura',
      images: ['/images/Card-3/img0.webp','/images/Card-3/img00.webp', '/images/Card-3/img01.webp', '/images/Card-3/img02.webp', '/images/Card-3/img03.webp', '/images/Card-3/img04.webp', '/images/Card-3/img05.webp',
               '/images/Card-3/img06.webp', '/images/Card-3/img07.webp', '/images/Card-3/img08.webp', '/images/Card-3/img09.webp', '/images/Card-3/img10.webp'],
      effect: 'sand',
      verse: 'Sopla sobre el espejo enterrado. La verdad emerge de la arena.',
    },
  ]

return (
  <div className={`app ${activeCard ? 'overlay-open' : ''}`}>
    <div className="watercolor-bg" />
    <div className="paper-texture" />
    <button className="theme-toggle" onClick={toggleTheme}>
      {theme === 'dark' ? '◑' : '◐'}
    </button>

    <header className="app-header">
      <h1 className="app-title">LEJANO</h1>
      <p className="app-subtitle">Entra al umbral.</p>
    </header>

    <TarotGallery cards={cards} onCardClick={setActiveCard} />

    {activeCard && (
      <CanvasRainyOverlay
        card={activeCard}
        onClose={() => setActiveCard(null)}
      />
    )}
  </div>
)
}
