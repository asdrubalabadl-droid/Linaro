// ==========================================
// kitchen.js — Asistente de Cocina + Event delegation Inventario
// Linaro Arquitectura
// ==========================================

// ── Event delegation seguro para inventario (evita UUID en inline JS) ──
document.addEventListener('click', async function(e) {
  const btn = e.target.closest('button[data-inv-del], button[data-inv-save]');
  if (!btn) return;
  if (btn.dataset.invDel) {
    await deleteInvItem(btn.dataset.invDel, btn.dataset.invId);
    return;
  }
  if (btn.dataset.invSave) {
    const input = document.getElementById(btn.dataset.invField);
    if (input) await updateInvPrice(btn.dataset.invSave, btn.dataset.invTable, btn.dataset.invId, input.value);
    return;
  }
});
document.addEventListener('keydown', async function(e) {
  if (e.key !== 'Enter') return;
  const input = e.target.closest('input[data-inv-enter]');
  if (!input) return;
  await updateInvPrice(input.dataset.invEnter, input.dataset.invTable, input.dataset.invId, input.value);
});

// ============================================================
// ASISTENTE DE COCINA — Lógica completa
// ============================================================
let kaCurrentType = 'linear';

function openKitchenAssistant() {
  const modal = document.getElementById('kaModal');
  modal.style.display = 'flex';
  kaUpdatePreview();
}

function kaSetType(type, btn) {
  kaCurrentType = type;
  document.querySelectorAll('.ka-type-btn').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');

  // Mostrar/ocultar campos según tipo
  const w2 = document.getElementById('kaW2Field');
  const w3 = document.getElementById('kaW3Field');
  if (w2) w2.style.display = (type === 'l' || type === 'u') ? 'block' : 'none';
  if (w3) w3.style.display = (type === 'u') ? 'block' : 'none';

  kaUpdatePreview();
}

function kaUpdatePreview() {
  const w1     = parseFloat(document.getElementById('kaW1')?.value)    || 3.6;
  const w2     = parseFloat(document.getElementById('kaW2')?.value)    || 2.7;
  const w3     = parseFloat(document.getElementById('kaW3')?.value)    || 2.7;
  const roomD  = parseFloat(document.getElementById('kaRoomD')?.value) || 3.2;
  const hasFridge   = document.getElementById('kaFridge')?.checked;
  const hasStove    = document.getElementById('kaStove')?.checked;
  const hasTower    = document.getElementById('kaTower')?.checked;
  const hasIsland   = document.getElementById('kaIsland')?.checked;
  const hasWallCabs = document.getElementById('kaWallCabs')?.checked;

  // Calcular estadísticas
  const stats = kaComputeStats(w1, w2, w3, roomD, { hasFridge, hasStove, hasTower, hasIsland, hasWallCabs });

  const statsEl = document.getElementById('kaStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div><span style="font-weight:700;color:var(--gold);font-size:15px">${stats.baseMods}</span><br>Módulos bajos</div>
        <div><span style="font-weight:700;color:var(--gold);font-size:15px">${stats.highMods}</span><br>Módulos altos</div>
        <div><span style="font-weight:700;font-size:15px">${stats.totalML.toFixed(1)} ml</span><br>Metros lineales</div>
        <div><span style="font-weight:700;font-size:15px">${stats.clearance}</span><br>Pasillo libre</div>
      </div>
      ${stats.warning ? `<div style="margin-top:8px;padding:6px 8px;background:#FFF8E0;border-radius:6px;color:#7A5A00;font-size:11px">⚠️ ${stats.warning}</div>` : ''}
      ${stats.ok     ? `<div style="margin-top:8px;padding:6px 8px;background:var(--green-l);border-radius:6px;color:var(--green);font-size:11px">✓ ${stats.ok}</div>` : ''}
    `;
  }

  // Dibujar preview SVG
  kaDrawPreview(w1, w2, w3, roomD, stats);
}

function kaComputeStats(w1, w2, w3, roomD, opts) {
  const BASE_DEPTH = 0.55, HIGH_DEPTH = 0.35, MOD_W = 0.60;
  let baseMods = 0, highMods = 0, totalML = 0;

  // Pared 1 (siempre)
  const seq1 = kaBuildSequence(w1, opts);
  baseMods += seq1.length;
  totalML  += w1;

  // Pared 2 (L, U)
  if (kaCurrentType === 'l' || kaCurrentType === 'u') {
    const seq2 = kaBuildSequence(w2, {});
    baseMods += seq2.length;
    totalML  += w2;
  }

  // Pared 3 (U)
  if (kaCurrentType === 'u') {
    const seq3 = kaBuildSequence(w3, {});
    baseMods += seq3.length;
    totalML  += w3;
  }

  if (opts.hasIsland) { baseMods += 1; totalML += 1.2; }

  // Muebles altos (mismas paredes, sin nevera/torre/horno)
  if (opts.hasWallCabs) {
    highMods = Math.floor(w1 / MOD_W);
    if (kaCurrentType === 'l' || kaCurrentType === 'u') highMods += Math.floor(w2 / MOD_W);
    if (kaCurrentType === 'u') highMods += Math.floor(w3 / MOD_W);
  }

  // Pasillo libre (cocina en U o isla)
  const usedDepth = (kaCurrentType === 'u' || kaCurrentType === 'island') ? BASE_DEPTH * 2 : BASE_DEPTH;
  const clearanceM = roomD - usedDepth;
  const clearance = clearanceM.toFixed(1) + ' m';

  let warning = null, ok = null;
  if (clearanceM < 1.0) warning = 'Pasillo libre menor a 1m. Considera ampliar el espacio.';
  else if (clearanceM >= 1.2) ok = `Pasillo libre de ${clearance} — cumple norma mínima (≥1.2m).`;

  return { baseMods, highMods, totalML, clearance, warning, ok };
}

function kaDrawPreview(w1, w2, w3, roomD, stats) {
  const svg = document.getElementById('kaPreviewSvg');
  if (!svg) return;

  const container = svg.parentElement;
  const PW = container.clientWidth  || 280;
  const PH = container.clientHeight || 260;

  // Escala para que la cocina quepa bien
  const roomW = (kaCurrentType === 'u') ? w1 : (kaCurrentType === 'l') ? Math.max(w1, w2 + 0.6) : w1;
  const scaleX = (PW - 40) / roomW;
  const scaleY = (PH - 40) / roomD;
  const sc = Math.min(scaleX, scaleY, 60);

  const ox = 20, oy = 20; // origen

  let html = `<svg viewBox="0 0 ${PW} ${PH}" xmlns="http://www.w3.org/2000/svg">`;

  // Fondo del espacio
  const rW = roomW * sc, rH = roomD * sc;
  html += `<rect x="${ox}" y="${oy}" width="${rW}" height="${rH}" fill="#FAF9F5" stroke="#222" stroke-width="2.5" rx="2"/>`;

  const BASE_D = 0.55 * sc, HIGH_D = 0.35 * sc;
  const GOLD = '#BA7517', LIGHT = '#FFF5E0', HIGH_C = '#FFF3E0';

  // Helper: draw module row
  function drawWall(seqArr, side) {
    let off = 0;
    seqArr.forEach(m => {
      const mw = m.w * sc;
      let rx2, ry2, mwv, mhv;
      if (side === 'bottom') {
        rx2 = ox + off; ry2 = oy + rH - BASE_D; mwv = mw; mhv = BASE_D;
      } else if (side === 'top') {
        rx2 = ox + off; ry2 = oy; mwv = mw; mhv = BASE_D;
      } else if (side === 'left') {
        rx2 = ox; ry2 = oy + rH - BASE_D - off - mw; mwv = BASE_D; mhv = mw;
      } else if (side === 'right') {
        rx2 = ox + rW - BASE_D; ry2 = oy + off; mwv = BASE_D; mhv = mw;
      }
      const fill = m.type==='freg'?'#E6F1FB': m.type==='refri'?'#EEEEEE': m.type==='tornohorno'?'#F0EBE8': m.type==='estufa'?'#FCEBEB': LIGHT;
      const stroke = m.type==='freg'?'#185FA5': m.type==='refri'?'#666': m.type==='tornohorno'?'#5D4037': m.type==='estufa'?'#A32D2D': GOLD;
      html += `<rect x="${rx2.toFixed(1)}" y="${ry2.toFixed(1)}" width="${mwv.toFixed(1)}" height="${mhv.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" rx="1"/>`;
      off += mw;
    });
  }

  const seq1 = kaBuildSequence(w1, {
    hasFridge: document.getElementById('kaFridge')?.checked,
    hasStove:  document.getElementById('kaStove')?.checked,
    hasTower:  document.getElementById('kaTower')?.checked
  });
  drawWall(seq1, 'bottom');

  if (kaCurrentType === 'l' || kaCurrentType === 'u') {
    const seq2 = kaBuildSequence(w2, {});
    drawWall(seq2, 'left');
  }
  if (kaCurrentType === 'u') {
    const seq3 = kaBuildSequence(w3, {});
    drawWall(seq3, 'right');
  }

  // Island
  if (document.getElementById('kaIsland')?.checked) {
    const iw = 1.2*sc, ih = 0.9*sc;
    const ix = ox + rW/2 - iw/2, iy = oy + rH/2 - ih/2;
    html += `<rect x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}" fill="#EAF3DE" stroke="#3B6D11" stroke-width="1.2" rx="2"/>`;
    html += `<text x="${(ix+iw/2).toFixed(1)}" y="${(iy+ih/2+3).toFixed(1)}" text-anchor="middle" font-size="9" fill="#3B6D11" font-family="sans-serif">Isla</text>`;
  }

  html += `</svg>`;
  svg.outerHTML = html; // replaces the svg element with the new one
  // Actually we can't outerHTML svg like that, let's use innerHTML on parent
  container.innerHTML = html;
}

function kaBuildSequence(wallLen, { hasFridge=false, hasStove=false, hasTower=false } = {}) {
  const seq = [];
  let remaining = wallLen;

  // Reservar espacios fijos
  const fridgeW = 0.70, stoveW = 0.60, towerW = 0.60, sinkW = 0.80;
  let rFridge = hasFridge && remaining >= fridgeW ? fridgeW : 0;
  let rTower  = hasTower  && remaining >= towerW  ? towerW  : 0;
  let rStove  = hasStove  && remaining >= stoveW  ? stoveW  : 0;
  let rSink   = remaining >= sinkW ? sinkW : remaining;

  remaining -= (rFridge + rTower + rStove + rSink);
  const fill = Math.max(0, Math.floor(remaining / 0.60));
  const fillL = Math.ceil(fill / 2), fillR = fill - fillL;

  // LEFT END: nevera
  if (rFridge) seq.push({ type:'refri',      name:'Refrigerador', w:fridgeW });
  // Fill izq
  for (let i=0; i<fillL; i++) seq.push({ type:'mb1p', name:`Bajo ${seq.length+1}`, w:0.60 });
  // Centro: sink
  seq.push({ type:'freg', name:'Fregadero', w:sinkW });
  // Estufa cerca del sink
  if (rStove) seq.push({ type:'estufa', name:'Estufa', w:stoveW });
  // Fill der
  for (let i=0; i<fillR; i++) seq.push({ type:'mb1p', name:`Bajo ${seq.length+1}`, w:0.60 });
  // RIGHT END: torre horno
  if (rTower) seq.push({ type:'tornohorno', name:'Torre Horno', w:towerW });

  return seq;
}

function generateKitchen() {
  const w1     = parseFloat(document.getElementById('kaW1')?.value)    || 3.6;
  const w2     = parseFloat(document.getElementById('kaW2')?.value)    || 2.7;
  const w3     = parseFloat(document.getElementById('kaW3')?.value)    || 2.7;
  const roomD  = parseFloat(document.getElementById('kaRoomD')?.value) || 3.2;
  const hasFridge   = document.getElementById('kaFridge')?.checked   || false;
  const hasStove    = document.getElementById('kaStove')?.checked    || false;
  const hasTower    = document.getElementById('kaTower')?.checked    || false;
  const hasIsland   = document.getElementById('kaIsland')?.checked   || false;
  const hasWallCabs = document.getElementById('kaWallCabs')?.checked || false;
  const doReplace   = document.getElementById('kaReplace')?.checked  || false;

  // Dimensiones del cuarto
  const roomW = (kaCurrentType === 'u') ? w1 : (kaCurrentType === 'l') ? Math.max(w1, w2 + 0.6) : w1 + 0.2;
  const room = {
    id: Date.now(), name: 'Cocina', w: Math.max(roomW, w1),
    h: roomD, type: 'kitchen', x: 80, y: 60
  };
  planarRooms.push(room);

  if (doReplace) planarFurniture = [];

  const sc = svgScale;
  const rx = room.x, ry = room.y;
  const rW = room.w * sc, rH = room.h * sc;
  const newF = [];

  // ── Función de colocación ──────────────────────────────
  function placeWall(seq, side) {
    const BASE_D = 0.55;
    let offset = 0;
    seq.forEach((mod, i) => {
      const template = furnitureCatalog[mod.type] || furnitureCatalog.mb1p;
      let fx, fy, angle = 0;
      const mw = mod.w;
      const md = mod.type === 'tornohorno' ? 0.60 : BASE_D;

      if (side === 'bottom') {
        fx = rx + offset * sc + mw * sc / 2;
        fy = ry + rH - md * sc / 2;
        angle = 0;
      } else if (side === 'top') {
        fx = rx + offset * sc + mw * sc / 2;
        fy = ry + md * sc / 2;
        angle = 0;
      } else if (side === 'left') {
        fx = rx + md * sc / 2;
        fy = ry + rH - offset * sc - mw * sc / 2;
        angle = 90;
      } else if (side === 'right') {
        fx = rx + rW - md * sc / 2;
        fy = ry + offset * sc + mw * sc / 2;
        angle = -90;
      }

      const hasDoor = !['freg','refri','isla','estufa'].includes(mod.type);
      newF.push({
        id: Date.now() + i + Math.round(Math.random()*9999),
        type: mod.type,
        name: mod.name,
        w: mw, h: md,
        fill: template.fill || '#FAEEDA',
        stroke: template.stroke || '#BA7517',
        door: hasDoor ? { count: Math.max(1, Math.round(mw / 0.6)) } : null,
        x: fx, y: fy, angle,
        height3d: getFurniture3DHeight(mod.name).h,
        doors: hasDoor ? Math.max(1, Math.round(mw / 0.6)) : 0,
        shelves: 1, drawers: 0, thickness: 18,
        materialId: null, tapacantId: null
      });
      offset += mw;
    });
  }

  // ── Función de muebles altos (aéreos) ─────────────────
  function placeHighWall(wallLen, side) {
    const HIGH_D = 0.35, MOD_W = 0.60;
    const count = Math.floor(wallLen / MOD_W);
    let offset = 0;
    for (let i = 0; i < count; i++) {
      let fx, fy, angle = 0;
      if (side === 'bottom') {
        fx = rx + offset * sc + MOD_W * sc / 2;
        fy = ry + rH - HIGH_D * sc / 2;
        angle = 0;
      } else if (side === 'top') {
        fx = rx + offset * sc + MOD_W * sc / 2;
        fy = ry + HIGH_D * sc / 2;
        angle = 0;
      } else if (side === 'left') {
        fx = rx + HIGH_D * sc / 2;
        fy = ry + rH - offset * sc - MOD_W * sc / 2;
        angle = 90;
      } else if (side === 'right') {
        fx = rx + rW - HIGH_D * sc / 2;
        fy = ry + offset * sc + MOD_W * sc / 2;
        angle = -90;
      }
      const t = furnitureCatalog.ma1p;
      newF.push({
        id: Date.now() + i + 50000 + Math.round(Math.random()*9999),
        type: 'ma1p', name: `Aéreo ${i+1}`,
        w: MOD_W, h: HIGH_D,
        fill: t.fill, stroke: t.stroke,
        door: { count: 1 },
        x: fx, y: fy, angle,
        height3d: 0.75,
        doors: 1, shelves: 1, drawers: 0, thickness: 18,
        materialId: null, tapacantId: null
      });
      offset += MOD_W;
    }
  }

  // ── Generar paredes ────────────────────────────────────
  const seq1 = kaBuildSequence(w1, { hasFridge, hasStove, hasTower });
  placeWall(seq1, 'bottom');
  if (hasWallCabs) placeHighWall(w1, 'bottom');

  if (kaCurrentType === 'l' || kaCurrentType === 'u') {
    const seq2 = kaBuildSequence(w2, {});
    placeWall(seq2, 'left');
    if (hasWallCabs) placeHighWall(w2, 'left');
  }
  if (kaCurrentType === 'u') {
    const seq3 = kaBuildSequence(w3, {});
    placeWall(seq3, 'right');
    if (hasWallCabs) placeHighWall(w3, 'right');
  }

  // ── Isla ──────────────────────────────────────────────
  if (hasIsland || kaCurrentType === 'island') {
    const t = furnitureCatalog.isla;
    newF.push({
      id: Date.now() + 99999,
      type: 'isla', name: 'Isla central',
      w: 1.20, h: 0.90,
      fill: t.fill, stroke: t.stroke, door: null,
      x: rx + rW / 2,
      y: ry + rH / 2,
      angle: 0,
      height3d: 0.90,
      doors: 0, shelves: 1, drawers: 0, thickness: 18,
      materialId: null, tapacantId: null
    });
  }

  planarFurniture.push(...newF);

  // Cerrar modal y renderizar
  document.getElementById('kaModal').style.display = 'none';
  goTab('plans', document.querySelector('.nt[onclick*="plans"]'));
  renderPlans();
  showToast(`✓ Cocina generada: ${newF.length} módulos colocados en el plano`);
}

