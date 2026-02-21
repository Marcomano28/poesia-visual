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
      images: ['/images/Card-1/img01.jpg', '/images/Card-1/img02.jpg', '/images/Card-1/img03.jpg', '/images/Card-1/img04.jpg', '/images/Card-1/img05.jpg',, '/images/Card-1/img06.jpg',
               '/images/Card-1/img07.jpg', '/images/Card-1/img08.jpg', '/images/Card-1/img09.jpg', '/images/Card-1/img10.jpg', '/images/Card-1/img11.jpg', '/images/Card-1/img12.jpg'],
      effect: 'rain',
      verse: 'Las gotas corren como el tiempo, borrando los recuerdos.',
    },
    {
      id: 'fog',
      title: 'La Niebla',
      subtitle: 'VII · El Velo',
      images: ['/images/Card-2/img28.jpg', '/images/Card-2/img29.jpg', '/images/Card-2/img25.jpg', '/images/Card-2/img26.jpg', '/images/Card-2/img27.jpg'],
      effect: 'fog',
      verse: 'En la penumbra flotan los espíritus sin nombre.',
    },
    {
       id: 'sand',
      title: 'El Espejo',
      subtitle: 'XIII · La Fractura',
      images: ['/images/Card-3/img13.jpg', '/images/Card-3/img14.jpg', '/images/Card-3/img15.jpg', '/images/Card-3/img16.jpg', '/images/Card-3/img17.jpg', '/images/Card-3/img18.jpg',
               '/images/Card-3/img19.jpg', '/images/Card-3/img20.jpg', '/images/Card-3/img21.jpg', '/images/Card-3/img22.jpg', '/images/Card-3/img23.jpg', '/images/Card-3/img24.jpg'],
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
