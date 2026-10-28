/* =====================================================
   LA PRINCESSE (même style que le prince : dégradés, plis, lumière)
   Elle apparaît dans l'histoire d'introduction, puis au bout du dernier niveau.
   Elle regarde vers la gauche (vers le prince qui arrive). Les fonctions piece() et degrade() viennent de prince.js.
   ===================================================== */
const ROBE = [[0, '#5a1038'], [0.45, '#c23a78'], [0.8, '#ff9cc4'], [1, '#9a2a60']];
const ROBE_CLAIRE = [[0, '#8a2a58'], [0.5, '#e86a9c'], [1, '#ffc4d8']];

function dessinerPrincesse(sx, sy, t) {
  const sway = Math.sin(t * 1.6) * 2, brise = Math.sin(t * 2.2), K = 0.95;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(-K, K); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 2, 36, 5, 0, 0, Math.PI * 2); ctx.fill();
  // la longue chevelure blonde, derrière
  ctx.beginPath(); ctx.moveTo(-4, -120); ctx.quadraticCurveTo(-30 + brise * 3, -100, -26 + brise * 5, -52); ctx.quadraticCurveTo(-22, -34, -12 + brise * 3, -38); ctx.quadraticCurveTo(-8, -80, 2, -100); ctx.closePath();
  ctx.fillStyle = degrade(-26, -120, 10, -30, [[0, '#8a5a1a'], [0.5, '#d9a24a'], [1, '#f6d27a']]); ctx.fill(); ctx.strokeStyle = 'rgba(40,20,5,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  // la robe : jupe évasée qui ondule, galon doré, plis
  ctx.beginPath(); ctx.moveTo(-11, -64); ctx.quadraticCurveTo(-30 + sway, -30, -40 + sway, 0); ctx.quadraticCurveTo(0, 7, 40 + sway, 0); ctx.quadraticCurveTo(30 + sway, -30, 11, -64); ctx.closePath();
  ctx.fillStyle = degrade(-40, 0, 40, 0, ROBE); ctx.fill(); ctx.strokeStyle = 'rgba(30,5,20,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(40,5,25,0.35)'; ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 4, -62); ctx.quadraticCurveTo(i * 9 + sway * 0.5, -30, i * 15 + sway, 2); ctx.stroke(); }
  ctx.strokeStyle = degrade(-40, 0, 40, 0, OR_METAL); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40 + sway, -1); ctx.quadraticCurveTo(0, 7, 40 + sway, -1); ctx.stroke();
  // le corsage, la ceinture, les manches
  ctx.beginPath(); ctx.moveTo(-11, -64); ctx.lineTo(-12, -92); ctx.quadraticCurveTo(0, -100, 12, -92); ctx.lineTo(11, -64); ctx.closePath();
  ctx.fillStyle = degrade(-12, 0, 12, 0, ROBE_CLAIRE); ctx.fill(); ctx.strokeStyle = 'rgba(30,5,20,0.8)'; ctx.stroke();
  ctx.fillStyle = degrade(-11, -68, 11, -62, OR_METAL); ctx.fillRect(-11, -68, 22, 5);
  ctx.strokeStyle = degrade(-12, -95, 12, -90, OR_METAL); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-9, -93); ctx.quadraticCurveTo(0, -86, 9, -93); ctx.stroke();      // décolleté doré
  piece(8, -90, 9, -72, 8, 7, ROBE_CLAIRE); piece(9, -72, 6, -64, 7, 6, ROBE_CLAIRE);                                                                                 // bras
  ctx.beginPath(); ctx.arc(6, -62, 4.2, 0, Math.PI * 2); ctx.fillStyle = degrade(2, -66, 10, -58, PEAU_P); ctx.fill();                                                  // mains jointes
  ctx.beginPath(); ctx.ellipse(10, -90, 7, 9, 0.3, 0, Math.PI * 2); ctx.fillStyle = degrade(3, -96, 17, -82, ROBE_CLAIRE); ctx.fill(); ctx.stroke();                     // manche ballon
  piece(2, -96, 3, -103, 8, 7, PEAU_P);                                                                                                                              // cou
  // la tête : visage de profil, regard doux, couronne dorée
  ctx.save(); ctx.translate(4, -113);
  ctx.beginPath(); ctx.moveTo(-7, -7); ctx.quadraticCurveTo(5, -14, 9, -6); ctx.lineTo(10.6, 0.5); ctx.lineTo(9, 2.6); ctx.lineTo(9.6, 4.6); ctx.quadraticCurveTo(9, 10, 4, 12); ctx.quadraticCurveTo(-3, 11, -7, 5); ctx.closePath();
  const vis = ctx.createRadialGradient(5, -3, 1, 2, 2, 16); vis.addColorStop(0, '#fde4cf'); vis.addColorStop(0.55, '#eeb894'); vis.addColorStop(1, '#b8805c');
  ctx.fillStyle = vis; ctx.fill(); ctx.strokeStyle = 'rgba(40,20,10,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(226,120,130,0.28)'; ctx.beginPath(); ctx.ellipse(3, 4, 3.8, 2.8, 0, 0, Math.PI * 2); ctx.fill();                                     // joue rosée
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(5.6, -1.6, 2.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a8a6a'; ctx.beginPath(); ctx.arc(6.3, -1.6, 1.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0a0f1a'; ctx.beginPath(); ctx.arc(6.5, -1.6, 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a160a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(3, -4.8); ctx.quadraticCurveTo(5.6, -6.2, 8.4, -5); ctx.moveTo(3.6, -2.4); ctx.lineTo(2.4, -3.6); ctx.stroke();   // sourcil et cil
  ctx.strokeStyle = '#c8405a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(6.4, 6.6); ctx.quadraticCurveTo(8.4, 7.6, 9.6, 6); ctx.stroke();                              // sourire
  ctx.fillStyle = degrade(-10, -14, 10, 2, [[0, '#8a5a1a'], [0.5, '#d9a24a'], [1, '#f6d27a']]);
  ctx.beginPath(); ctx.moveTo(-9, 4); ctx.quadraticCurveTo(-14, -8, -4, -13); ctx.quadraticCurveTo(8, -17, 10, -7); ctx.quadraticCurveTo(3, -9, -3, -5); ctx.quadraticCurveTo(-7, 0, -9, 4); ctx.fill();   // cheveux
  ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-5, -18); ctx.lineTo(-1, -12); ctx.lineTo(3, -21); ctx.lineTo(7, -12); ctx.lineTo(11, -18); ctx.lineTo(12, -9); ctx.closePath();            // couronne
  ctx.fillStyle = degrade(-8, -20, 12, -9, OR_METAL); ctx.fill(); ctx.strokeStyle = 'rgba(70,40,5,0.8)'; ctx.lineWidth = 1; ctx.stroke();
  [[3, -17, '#5ab8ff'], [-5, -14, '#ff5a7a'], [10, -14, '#ff5a7a']].forEach(([x, y, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
  ctx.restore();
}