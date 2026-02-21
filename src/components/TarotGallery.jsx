import TarotCard from './TarotCard'

export default function TarotGallery({ cards, onCardClick }) {
  return (
    <div className="gallery">
      {cards.map((card) => (
        <TarotCard key={card.id} card={card} onClick={() => onCardClick(card)} />
      ))}
    </div>
  )
}