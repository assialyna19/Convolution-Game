/* =====================================================
   LES FILTRES MAGIQUES : un nom d'enfant pour chacun, et une explication SANS mathématiques.
   C'est ici (et seulement ici) qu'on change un nom ou un texte : les cartes, l'encadré INFO, les bulles et l'aide s'en servent.
   Dans le code, les filtres gardent leur nom technique (flou, ouverture, fermeture, gaussien, nettete, contours).
     Brume    = flou        : mélange les couleurs voisines
     Faucille = ouverture   : coupe ce qui est plus fin que la carte
     Mortier  = fermeture   : bouche les trous plus petits que la carte
     Berceuse = gaussien    : calme ce qui s'agite
     Lynx     = netteté     : fait ressortir les détails
     Fusain   = contours    : ne dessine que les bords
   ===================================================== */
const FILTRES_JEU = {
  lunettes:  { nom: 'Lunettes', art: 'les ', icone: '👓', touche: 'L', court: "Voir les pièges", info: "Elles montrent les pièges et les trésors cachés." },
  flou:      { nom: 'Brume',    art: 'la ',  icone: '🌫️', touche: 1, court: "Mélange les voisins", info: "Mélange les couleurs voisines. Le sable devient solide !" },
  ouverture: { nom: 'Faucille', art: 'la ',  icone: '🌿', touche: 2, court: "Coupe ce qui est fin", info: "Coupe ce qui est plus fin que ta carte. Les buissons s'ouvrent !" },
  fermeture: { nom: 'Mortier',  art: 'le ',  icone: '🧱', touche: 3, court: "Bouche les petits trous", info: "Bouche les trous plus petits que ta carte." },
  gaussien:  { nom: 'Berceuse', art: 'la ',  icone: '🌀', touche: 4, court: "Calme ce qui s'agite", info: "Calme ce qui s'agite. Ni trop petite, ni trop grande !" },
  nettete:   { nom: 'Lynx',     art: 'le ',  icone: '🔎', touche: 5, court: "Fait voir les détails", info: "Fait ressortir les détails cachés dans le brouillard." },
  contours:  { nom: 'Fusain',   art: 'le ',  icone: '✏️', touche: 6, court: "Dessine les bords", info: "Dessine seulement les bords : il révèle les portes secrètes." },
  vapeur:    { nom: 'Vapeur',   art: 'la ',  icone: '💨', touche: 7, court: "Soigne les humains", info: "Soigne les humains contaminés. Vise bien !" }
};
const INFO_DEFAUT = "Choisis une carte, puis un filtre !";