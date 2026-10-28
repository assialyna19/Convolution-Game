/* =====================================================
   L'INTRODUCTION : l'histoire en 5 écrans
   Les deux écrans du milieu expliquent la convolution avec une petite animation :
   une fenêtre glisse sur une grille de carrés colorés, et chaque case devient la moyenne de ses voisines.
   Derrière le texte, le jeu montre le prince, la princesse, puis le sortilège qui l'emporte.
   ===================================================== */
let introOuvert = false, introSlide = 0, introT = 0, introVue = false;
try { introVue = localStorage.getItem('quete-intro-vue') === '1'; } catch (e) { /* tant pis */ }

const SLIDES = [
  { titre: 'Il était une fois…', texte: "Dans un royaume paisible vivaient un prince courageux et une princesse au grand cœur. Tout le monde était heureux." },
  { titre: 'Mais un jour…', texte: "Un terrible sortilège enlève la princesse ! Elle est prisonnière tout au bout d'un long chemin, à travers cinq mondes pleins de pièges." },
  { titre: 'Les lunettes magiques', texte: "Un vieux sage donne au prince des LUNETTES MAGIQUES. Avec elles, le monde devient une grille de petits carrés de couleur… et le prince peut les changer grâce à ses CARTES MAGIQUES !", demo: true },
  { titre: 'Une carte qui glisse', texte: "Chaque filtre utilise une petite carte qui glisse sur les carrés. Pour chaque case, elle regarde ses voisines, puis choisit la nouvelle couleur. C'est ça, la convolution !", demo: true },
  { titre: 'À toi de jouer !', texte: "Aide le prince à traverser 5 mondes dangereux : choisis la bonne carte et sauve la princesse !" }
];
const elIntro = document.getElementById('intro'), elIntroCanvas = document.getElementById('intro-canvas'), ig = elIntroCanvas.getContext('2d');
const IG = { w: 8, h: 5, cs: 24 };
let introGrille = null, introSortie = null;               // fabriquées à l'ouverture (rng vient de jeu.js)

function ouvrirIntro() {
  introOuvert = true; introSlide = 0; introT = 0; accueilOuvert = false;
  if (!jeuEnCours) chargerNiveau(0);                         // le décor du niveau 1 sert de scène
  document.body.classList.add('accueil'); majAccueil(); document.body.classList.add('accueil');
  const r = rng(42), c = [[255, 209, 102], [122, 90, 216], [255, 138, 168], [90, 200, 220]];
  introGrille = Array.from({ length: IG.w * IG.h }, () => c[Math.floor(r() * 4)]);
  introSortie = balayer(introGrille, IG.w, IG.h, 3, 'moyenne');      // le vrai calcul de convolution, fait une fois
  elIntro.classList.add('ouvert'); majSlide();
}
function majSlide() {
  const s = SLIDES[introSlide];
  document.getElementById('intro-titre').textContent = s.titre; document.getElementById('intro-texte').textContent = s.texte;
  elIntroCanvas.style.display = s.demo ? 'block' : 'none';
  document.getElementById('intro-suivant').textContent = introSlide === SLIDES.length - 1 ? '▶ Jouer' : 'Suivant ▶';
  document.getElementById('intro-points').textContent = SLIDES.map((_, i) => i === introSlide ? '●' : '○').join(' ');
}
function finIntro() {
  introOuvert = false; elIntro.classList.remove('ouvert'); introVue = true;
  try { localStorage.setItem('quete-intro-vue', '1'); } catch (e) { /* tant pis */ }
  if (jeuEnCours) ouvrirAccueil(); else demarrer(0);
}
function quitterIntro() {                                  // la petite croix : on ferme l'histoire et on revient à l'accueil
  introOuvert = false; elIntro.classList.remove('ouvert'); introVue = true;
  try { localStorage.setItem('quete-intro-vue', '1'); } catch (e) { /* tant pis */ }
  ouvrirAccueil();
}
function suivantIntro() { if (introSlide < SLIDES.length - 1) { introSlide++; introT = 0; majSlide(); } else finIntro(); }

function majIntro(dt) {                                    // la petite animation de la convolution (écrans 3 et 4)
  introT += dt;
  if (!SLIDES[introSlide].demo) return;
  const total = IG.w * IG.h, k = Math.floor(introT * 7) % (total + 14), cs = IG.cs, ox = 20, ox2 = 300, oy = 18;
  ig.clearRect(0, 0, 520, 150);
  const col = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  for (let y = 0; y < IG.h; y++) for (let x = 0; x < IG.w; x++) {
    const i = y * IG.w + x;
    ig.fillStyle = col(introGrille[i]); ig.fillRect(ox + x * cs, oy + y * cs, cs - 1, cs - 1);
    ig.fillStyle = i < k ? col(introSortie[i]) : 'rgba(255,255,255,0.08)'; ig.fillRect(ox2 + x * cs - 110, oy + y * cs, cs - 1, cs - 1);
  }
  ig.fillStyle = '#ffd166'; ig.font = "600 30px 'Baloo 2', system-ui, sans-serif"; ig.fillText('→', 218, 78);
  ig.font = "600 14px 'Baloo 2', system-ui, sans-serif"; ig.fillStyle = '#fff4dc'; ig.fillText('Avant', ox, 12); ig.fillText('Après', ox2 - 110, 12);
  if (k < total) {
    const x = k % IG.w, y = Math.floor(k / IG.w);
    ig.fillStyle = 'rgba(255,255,255,0.2)'; ig.fillRect(ox + (x - 1) * cs, oy + (y - 1) * cs, 3 * cs - 1, 3 * cs - 1);
    ig.strokeStyle = '#ffd166'; ig.lineWidth = 3; ig.strokeRect(ox + (x - 1) * cs, oy + (y - 1) * cs, 3 * cs - 1, 3 * cs - 1);
    ig.strokeStyle = '#ffd166'; ig.lineWidth = 2; ig.strokeRect(ox2 - 110 + x * cs - 1, oy + y * cs - 1, cs + 1, cs + 1);
  }
}

function dessinerIntroScene(t) {                           // derrière le texte : la princesse (écran 1), puis un nuage sombre (écran 2)
  if (!introOuvert) return;
  const sx = heros.x - camX + 190, sy = SOL_Y + 10, tt = t / 1000;
  if (introSlide === 0) dessinerPrincesse(sx, sy, tt);
  else if (introSlide === 1) {
    ctx.save();
    for (let i = 0; i < 14; i++) {
      const u = (tt * 0.5 + i / 14) % 1, x = sx + Math.sin(i * 2.3 + tt) * 30, y = sy - 20 - u * 150, r = 14 + u * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(90,40,140,${0.55 * (1 - u)})`); g.addColorStop(1, 'rgba(40,10,70,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    ctx.restore();
  }
}

document.getElementById('intro-suivant').addEventListener('click', e => { suivantIntro(); e.currentTarget.blur(); });
document.getElementById('intro-fermer').addEventListener('click', e => { quitterIntro(); e.currentTarget.blur(); });
addEventListener('keydown', e => {
  if (!introOuvert || e.repeat) return;
  if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') { suivantIntro(); e.preventDefault(); }
  else if (e.key === 'Escape') { quitterIntro(); e.escUtilise = true; }
});