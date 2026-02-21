export default function TarotCard({ card, onClick }) {
  return (
    <div className="tarot-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="card-frame">
        <img className="card-image" src={card.images ? card.images[0] : card.images} alt={card.title} />
        <div className="card-vignette" />
        <div className="card-glow" />

        {/* <div className="card-top-text">
          <span className="card-roman">{card.subtitle}</span>
        </div> */}

        <div className="card-text">
          <div className="card-subtitle">{card.subtitle}</div>
          <div className="card-title">{card.title}</div>
        </div>

        <div className="card-inner-border" />
      </div>
      <span className="card-hint">· entrar ·</span>
    </div>
  )
}
