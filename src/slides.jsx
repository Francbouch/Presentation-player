import { useState } from 'react';

function Welcome() {
  return <div className="slide-copy"><span className="eyebrow">UNE NOUVELLE PERSPECTIVE</span><h2>Les idées prennent<br />une autre dimension.</h2><p>Une présentation immersive, à votre rythme.</p><span className="slide-label">STUDIO / COLLECTION 01</span></div>;
}

function Atmospheres() {
  return <div className="slide-copy"><span className="eyebrow">À VOUS DE JOUER</span><h2>Changez<br />d’atmosphère.</h2><p>Trois univers. Une même idée. Choisissez votre décor.</p></div>;
}

function Closing() {
  const [liked, setLiked] = useState(false);
  return <div className="slide-copy"><span className="eyebrow">LE DÉBUT DE LA SUITE</span><h2>Faites place<br />à vos idées.</h2><p>Chaque diapositive est un espace à personnaliser.</p><button className="closing-button" onClick={() => setLiked(!liked)} aria-pressed={liked}>{liked ? 'Merci pour votre visite ✓' : 'Prêt à créer ? ↗'}</button></div>;
}

// Chaque diapositive possède son image, son composant et sa transition sortante.
// Exemple MP4 : transitionVideo: '/transitions/01-02.mp4'.
export const slides = [
  { id: 'welcome', title: 'Une nouvelle perspective', image: '/slides/aurora.png', Component: Welcome, transitionVideo: '/transitions/01-02.mp4' },
  { id: 'atmospheres', title: 'Changez d’atmosphère', image: '/slides/aurora.png', Component: Atmospheres, transitionVideo: null },
  { id: 'closing', title: 'Faites place à vos idées', image: '/slides/ocean.png', Component: Closing, transitionVideo: null },
];

export const demoComponents = { welcome: Welcome, atmospheres: Atmospheres, closing: Closing };
