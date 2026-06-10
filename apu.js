// ==========================================
// apu.js — Módulo APU Civil + Partidas de Obra
// Linaro Arquitectura
// ==========================================
// Este archivo reemplaza el bloque <script> de APU/Partidas
// que estaba al final de index.html.
//
// AUTO-GUARDADO: Ya no usa monkeypatching frágil.
// Cualquier función que mute apuData o partidasData
// despacha: document.dispatchEvent(new CustomEvent('linaro:obra:change'))
// Un único listener en este archivo llama obraSaveToSupabase() con debounce.
// ==========================================

// ==========================================
// APU CIVIL — Motor completo
// ==========================================
let apuData = [];       // Array de APUs
let apuSelected = null; // APU activa

// ── Estructura de una APU ──────────────────────────────────────────
function apuNew(code, name, unit, category, rendimiento) {
  return { id: Date.now() + Math.random(), code, name, unit, category,
           rendimiento: parseFloat(rendimiento)||1, resources: [] };
}
function apuTotals(apu) {
  const r = apu.rendimiento || 1;
  let mat=0, mo=0, eq=0;
  (apu.resources||[]).forEach(res => {
    const sub = (parseFloat(res.qty)||0) * (parseFloat(res.price)||0);
    if (res.type==='material') mat += sub;
    else if (res.type==='mano_obra') mo += sub;
    else if (res.type==='equipo') eq += sub;
  });
  const direct = mat + mo + eq;
  return { mat, mo, eq, direct, unitCost: r ? direct/r : 0 };
}

function apuNewModal() {
  const m = document.getElementById('apuModal');
  if (m) { document.getElementById('apuModalTitle').textContent='Nueva APU';
    ['apuMCode','apuMName','apuMUnit','apuMRend'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const sel=document.getElementById('apuMCat'); if(sel) sel.value='Movimiento de tierra';
    document.getElementById('apuMId').value='';
    m.style.display='flex'; }
}
function apuCreateNew() {
  const code=document.getElementById('apuMCode').value.trim();
  const name=document.getElementById('apuMName').value.trim();
  const unit=document.getElementById('apuMUnit').value.trim()||'m²';
  const cat =document.getElementById('apuMCat').value;
  const rend=parseFloat(document.getElementById('apuMRend').value)||1;
  const eid =document.getElementById('apuMId').value;
  if(!name){showToast('Ingresa un nombre para la APU');return;}
  if(eid){
    const a=apuData.find(x=>String(x.id)===eid);
    if(a){a.code=code;a.name=name;a.unit=unit;a.category=cat;a.rendimiento=rend;}
  } else {
    const apu=apuNew(code,name,unit,cat,rend);
    apuData.push(apu);
    apuSelected=apu.id;
  }
  document.getElementById('apuModal').style.display='none';
  apuRenderList();
  apuRenderDetail();
  document.dispatchEvent(new CustomEvent('linaro:obra:change'));
}
function apuRenderList() {
  const el=document.getElementById('apuList'); if(!el)return;
  if(!apuData.length){el.innerHTML='<p style="color:var(--text2);font-size:13px;padding:8px">Sin APUs creadas. Crea una nueva o carga las base.</p>';return;}
  const cats=[...new Set(apuData.map(a=>a.category))].sort();
  el.innerHTML=cats.map(cat=>{
    const items=apuData.filter(a=>a.category===cat);
    return `<div style="margin-bottom:10px">
      <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;padding:4px 0 6px">${cat}</div>
      ${items.map(a=>{
        const t=apuTotals(a);
        const sel=String(apuSelected)===String(a.id);
        return `<div onclick="apuSelectAPU('${a.id}')" style="padding:8px 10px;border-radius:6px;cursor:pointer;margin-bottom:4px;border:.5px solid ${sel?'var(--gold)':'var(--border)'};background:${sel?'rgba(186,117,23,.1)':'var(--bg2)'};transition:all .15s">
          <div style="font-size:12px;font-weight:600;color:${sel?'var(--gold)':'var(--text)'}">${a.code?`[${a.code}] `:''}${a.name}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${a.unit} · $${t.unitCost.toFixed(2)}/u · R=${a.rendimiento}</div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
}
function apuSelectAPU(id) {
  apuSelected=id;
  apuRenderList();
  apuRenderDetail();
}
function apuRenderDetail() {
  const panel=document.getElementById('apuDetail'); if(!panel)return;
  const apu=apuData.find(a=>String(a.id)===String(apuSelected));
  if(!apu){panel.innerHTML='<p style="color:var(--text2);font-size:13px;padding:16px">Selecciona una APU de la lista para ver su detalle.</p>';return;}
  const t=apuTotals(apu);
  const rows=(apu.resources||[]).map((r,i)=>`
    <tr>
      <td style="padding:6px 8px"><select onchange="apuUpdateRes('${apu.id}','${r.id}','type',this.value)" style="background:var(--bg3);border:.5px solid var(--border);border-radius:4px;color:var(--text);font-size:11px;padding:3px 4px">
        <option value="material" ${r.type==='material'?'selected':''}>Material</option>
        <option value="mano_obra" ${r.type==='mano_obra'?'selected':''}>Mano de obra</option>
        <option value="equipo" ${r.type==='equipo'?'selected':''}>Equipo</option>
      </select></td>
      <td style="padding:6px 8px"><input value="${r.name||''}" onchange="apuUpdateRes('${apu.id}','${r.id}','name',this.value)" style="width:100%;background:var(--bg3);border:.5px solid var(--border);border-radius:4px;color:var(--text);font-size:12px;padding:4px 6px"></td>
      <td style="padding:6px 8px"><input value="${r.unit||''}" onchange="apuUpdateRes('${apu.id}','${r.id}','unit',this.value)" style="width:60px;background:var(--bg3);border:.5px solid var(--border);border-radius:4px;color:var(--text);font-size:12px;padding:4px 6px;text-align:center"></td>
      <td style="padding:6px 8px"><input type="number" value="${r.qty||0}" onchange="apuUpdateRes('${apu.id}','${r.id}','qty',this.value)" style="width:70px;background:var(--bg3);border:.5px solid var(--border);border-radius:4px;color:var(--text);font-size:12px;padding:4px 6px;text-align:right"></td>
      <td style="padding:6px 8px"><input type="number" value="${r.price||0}" onchange="apuUpdateRes('${apu.id}','${r.id}','price',this.value)" style="width:80px;background:var(--bg3);border:.5px solid var(--border);border-radius:4px;color:var(--text);font-size:12px;padding:4px 6px;text-align:right"></td>
      <td style="padding:6px 8px;text-align:right;font-size:12px;color:var(--gold);font-weight:600">$${((parseFloat(r.qty)||0)*(parseFloat(r.price)||0)).toFixed(2)}</td>
      <td style="padding:6px 8px;text-align:center"><button onclick="apuDeleteRes('${apu.id}','${r.id}')" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:14px;padding:2px 6px" title="Eliminar">✕</button></td>
    </tr>`).join('');
  panel.innerHTML=`
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <div>
        <div style="font-size:16px;font-weight:700;color:var(--text)">${apu.code?`<span style="color:var(--text2)">[${apu.code}]</span> `:''}${apu.name}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:4px">${apu.category} · Unidad: <b>${apu.unit}</b> · Rendimiento: <b>${apu.rendimiento} ${apu.unit}/día</b></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="apuEditModal('${apu.id}')" class="btn btn-sm">✏️ Editar</button>
        <button onclick="apuOpenResModal('${apu.id}','material')" class="btn btn-sm btn-gold">+ Recurso</button>
        <button onclick="apuSendToBudget()" class="btn btn-sm" style="background:var(--green-l);border-color:var(--green-b);color:var(--green)">→ Presupuesto</button>
        <button onclick="apuDeleteAPU('${apu.id}')" class="btn btn-sm" style="background:#fdf2f2;border-color:#f5c6c6;color:#c0392b">🗑</button>
      </div>
    </div>
    <div style="background:var(--bg2);border-radius:8px;padding:12px;margin-bottom:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">
      <div class="metric"><div class="mlabel">Materiales</div><div class="mval" style="font-size:16px">$${t.mat.toFixed(2)}</div></div>
      <div class="metric"><div class="mlabel">Mano de Obra</div><div class="mval" style="font-size:16px">$${t.mo.toFixed(2)}</div></div>
      <div class="metric"><div class="mlabel">Equipos</div><div class="mval" style="font-size:16px">$${t.eq.toFixed(2)}</div></div>
      <div class="metric"><div class="mlabel">Costo directo</div><div class="mval tgold" style="font-size:16px">$${t.direct.toFixed(2)}</div></div>
      <div class="metric"><div class="mlabel">Costo unitario</div><div class="mval tgold" style="font-size:18px;font-weight:700">$${t.unitCost.toFixed(2)}/${apu.unit}</div></div>
    </div>
    <div id="apuResourceTable" style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:var(--bg3)">
          <th style="padding:8px;text-align:left;color:var(--text2);font-weight:600;white-space:nowrap">Tipo</th>
          <th style="padding:8px;text-align:left;color:var(--text2);font-weight:600">Descripción</th>
          <th style="padding:8px;text-align:center;color:var(--text2);font-weight:600">Unidad</th>
          <th style="padding:8px;text-align:right;color:var(--text2);font-weight:600">Cantidad</th>
          <th style="padding:8px;text-align:right;color:var(--text2);font-weight:600">Precio unit.</th>
          <th style="padding:8px;text-align:right;color:var(--text2);font-weight:600">Subtotal</th>
          <th style="padding:8px"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="margin-top:12px;display:flex;justify-content:flex-end">
      <button onclick="apuOpenResModal('${apu.id}','material')" class="btn btn-gold">+ Agregar recurso</button>
    </div>`;
}
function apuOpenResModal(apuId, type) {
  document.getElementById('apuResApuId').value=apuId;
  document.getElementById('apuResType').value=type||'material';
  ['apuResName','apuResUnit','apuResQty','apuResPrice'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('apuResModal').style.display='flex';
}
function apuResTypeChanged() {}
function apuAddResource() {
  const apuId=document.getElementById('apuResApuId').value;
  const apu=apuData.find(a=>String(a.id)===String(apuId));
  if(!apu)return;
  const res={
    id: Date.now()+Math.random(),
    type: document.getElementById('apuResType').value,
    name: document.getElementById('apuResName').value.trim(),
    unit: document.getElementById('apuResUnit').value.trim()||'und',
    qty:  parseFloat(document.getElementById('apuResQty').value)||0,
    price:parseFloat(document.getElementById('apuResPrice').value)||0
  };
  if(!res.name){showToast('Ingresa el nombre del recurso');return;}
  apu.resources.push(res);
  document.getElementById('apuResModal').style.display='none';
  apuRenderDetail();
  document.dispatchEvent(new CustomEvent('linaro:obra:change'));
}
function apuUpdateRes(apuId, resId, field, value) {
  const apu=apuData.find(a=>String(a.id)===String(apuId)); if(!apu)return;
  const res=apu.resources.find(r=>String(r.id)===String(resId)); if(!res)return;
  res[field]=(field==='qty'||field==='price')?parseFloat(value)||0:value;
  apuRenderDetail();
  document.dispatchEvent(new CustomEvent('linaro:obra:change'));
}
function apuDeleteRes(apuId, resId) {
  const apu=apuData.find(a=>String(a.id)===String(apuId)); if(!apu)return;
  apu.resources=apu.resources.filter(r=>String(r.id)!==String(resId));
  apuRenderDetail();
  document.dispatchEvent(new CustomEvent('linaro:obra:change'));
}
function apuDeleteAPU(id) {
  if(!confirm('¿Eliminar esta APU?'))return;
  apuData=apuData.filter(a=>String(a.id)!==String(id));
  apuSelected=apuData.length?apuData[0].id:null;
  apuRenderList();
  apuRenderDetail();
  document.dispatchEvent(new CustomEvent('linaro:obra:change'));
}
function apuEditModal(id) {
  const apu=apuData.find(a=>String(a.id)===String(id)); if(!apu)return;
  document.getElementById('apuModalTitle').textContent='Editar APU';
  document.getElementById('apuMCode').value=apu.code||'';
  document.getElementById('apuMName').value=apu.name||'';
  document.getElementById('apuMUnit').value=apu.unit||'';
  document.getElementById('apuMRend').value=apu.rendimiento||1;
  document.getElementById('apuMCat').value=apu.category||'Movimiento de tierra';
  document.getElementById('apuMId').value=String(apu.id);
  document.getElementById('apuModal').style.display='flex';
}
function apuSendToBudget() {
  const apu=apuData.find(a=>String(a.id)===String(apuSelected)); if(!apu)return;
  const t=apuTotals(apu);
  const item={
    id: Date.now(),
    name: `[APU] ${apu.name}`,
    unit: apu.unit,
    qty: 1,
    price: parseFloat(t.unitCost.toFixed(2)),
    cat: 'obras'
  };
  if(typeof projectData!=='undefined') {
    projectData.items.push(item);
    if(typeof recalc==='function') recalc();
    if(typeof renderBudgetTable==='function') renderBudgetTable();
    showToast(`✓ APU enviada al presupuesto: $${t.unitCost.toFixed(2)}/${apu.unit}`);
  }
}
function apuExportPDF() {
  if(typeof window.jspdf==='undefined'){showToast('jsPDF no cargado aún');return;}
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF();
  const pName=document.getElementById('pName')?.value||'Sin nombre';
  const pClient=document.getElementById('pClient')?.value||'—';

  if(typeof pdfDrawHeader==='function') pdfDrawHeader(doc,'ANÁLISIS DE PRECIOS UNITARIOS','Obras Civiles y Remodelaciones');
  if(typeof pdfInfoBlock==='function') pdfInfoBlock(doc,[
    {label:'Proyecto',value:pName},{label:'Cliente',value:pClient},
    {label:'Fecha',value:new Date().toLocaleDateString('es-VE')},
    {label:'Moneda',value:'USD'}
  ], 52);

  let y=90;
  apuData.forEach(apu=>{
    if(y>260){doc.addPage();y=20;}
    const t=apuTotals(apu);
    doc.setFontSize(10);doc.setFont('helvetica','bold');
    doc.text(`${apu.code?`[${apu.code}] `:''}${apu.name}`,14,y);
    doc.setFont('helvetica','normal');doc.setFontSize(9);
    doc.text(`Categoría: ${apu.category} | Unidad: ${apu.unit} | Rendimiento: ${apu.rendimiento} ${apu.unit}/día | Costo unitario: $${t.unitCost.toFixed(2)}/${apu.unit}`,14,y+5);
    y+=10;
    if(apu.resources&&apu.resources.length){
      doc.autoTable({
        startY:y,
        head:[['Tipo','Descripción','Unidad','Cantidad','P.Unit ($)','Subtotal ($)']],
        body:apu.resources.map(r=>[
          r.type==='material'?'Material':r.type==='mano_obra'?'Mano de obra':'Equipo',
          r.name,r.unit,r.qty,parseFloat(r.price).toFixed(2),
          ((parseFloat(r.qty)||0)*(parseFloat(r.price)||0)).toFixed(2)
        ]),
        foot:[['','','','','Costo directo','$'+t.direct.toFixed(2)]],
        styles:{fontSize:8,cellPadding:2},
        headStyles:{fillColor:[186,117,23],textColor:255},
        footStyles:{fillColor:[245,240,230],textColor:[80,60,20],fontStyle:'bold'},
        margin:{left:14,right:14}
      });
      y=doc.lastAutoTable.finalY+8;
    }
  });

  const totalPages=doc.internal.getNumberOfPages();
  if(typeof pdfDrawFooter==='function'){
    for(let i=1;i<=totalPages;i++){doc.setPage(i);pdfDrawFooter(doc,i,totalPages);}
  }
  doc.save(`APU_ObrasCiviles_Linaro_${pName.replace(/\s+/g,'_')}.pdf`);
  showToast('PDF exportado con éxito ✓');
}

// ── APUs base predefinidas ─────────────────────────────────────────
function apuLoadDefaults() {
  if(apuData.length>0&&!confirm('Esto agregará las APUs base al catálogo actual. ¿Continuar?'))return;
  const base=[
    // ══════════════════════════════════════════
    // MOVIMIENTO DE TIERRA
    // ══════════════════════════════════════════
    {id:1001,code:'MT-001',name:'Excavación manual en tierra blanda',unit:'m³',category:'Movimiento de tierra',rendimiento:4,
      resources:[{id:'r1001a',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.25,price:15},{id:'r1001b',type:'equipo',name:'Pico y pala',unit:'día',qty:0.25,price:3}]},
    {id:1002,code:'MT-002',name:'Excavación con retroexcavadora',unit:'m³',category:'Movimiento de tierra',rendimiento:120,
      resources:[{id:'r1002a',type:'equipo',name:'Retroexcavadora Cat 416',unit:'hora',qty:0.5,price:85},{id:'r1002b',type:'mano_obra',name:'Operador de maquinaria',unit:'hora',qty:0.5,price:12}]},
    {id:1003,code:'MT-003',name:'Relleno y compactación con material selecto',unit:'m³',category:'Movimiento de tierra',rendimiento:20,
      resources:[{id:'r1003a',type:'material',name:'Material selecto (tosca)',unit:'m³',qty:1.2,price:18},{id:'r1003b',type:'equipo',name:'Compactadora vibratoria',unit:'hora',qty:0.4,price:25},{id:'r1003c',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.4,price:15}]},
    // ══════════════════════════════════════════
    // CONCRETO ESTRUCTURAL
    // ══════════════════════════════════════════
    {id:2001,code:'CE-001',name:'Concreto f\'c=210 kg/cm² vaciado en columnas',unit:'m³',category:'Concreto estructural',rendimiento:6,
      resources:[{id:'r2001a',type:'material',name:'Cemento Portland tipo I',unit:'saco 42kg',qty:7.5,price:9.5},{id:'r2001b',type:'material',name:'Arena lavada',unit:'m³',qty:0.55,price:22},{id:'r2001c',type:'material',name:'Piedra triturada 3/4"',unit:'m³',qty:0.85,price:28},{id:'r2001d',type:'material',name:'Agua',unit:'m³',qty:0.18,price:2},{id:'r2001e',type:'mano_obra',name:'Albañil',unit:'jornal',qty:1.2,price:18},{id:'r2001f',type:'mano_obra',name:'Obrero',unit:'jornal',qty:2.4,price:15},{id:'r2001g',type:'equipo',name:'Mezcladora 1 saco',unit:'hora',qty:2,price:8}]},
    {id:2002,code:'CE-002',name:'Concreto f\'c=175 kg/cm² en losa de piso',unit:'m³',category:'Concreto estructural',rendimiento:8,
      resources:[{id:'r2002a',type:'material',name:'Cemento Portland tipo I',unit:'saco',qty:6.5,price:9.5},{id:'r2002b',type:'material',name:'Arena lavada',unit:'m³',qty:0.6,price:22},{id:'r2002c',type:'material',name:'Piedra triturada 3/4"',unit:'m³',qty:0.9,price:28},{id:'r2002d',type:'mano_obra',name:'Albañil',unit:'jornal',qty:1,price:18},{id:'r2002e',type:'mano_obra',name:'Obrero',unit:'jornal',qty:2,price:15},{id:'r2002f',type:'equipo',name:'Mezcladora',unit:'hora',qty:1.5,price:8}]},
    {id:2003,code:'CE-003',name:'Encofrado metálico para columnas',unit:'m²',category:'Concreto estructural',rendimiento:12,
      resources:[{id:'r2003a',type:'material',name:'Encofrado metálico (alquiler)',unit:'m²/uso',qty:1,price:4},{id:'r2003b',type:'mano_obra',name:'Carpintero encofrador',unit:'jornal',qty:0.5,price:20},{id:'r2003c',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.5,price:15}]},
    // ══════════════════════════════════════════
    // ACERO DE REFUERZO
    // ══════════════════════════════════════════
    {id:3001,code:'AR-001',name:'Acero de refuerzo fy=4200 kg/cm² colocado',unit:'kg',category:'Acero de refuerzo',rendimiento:150,
      resources:[{id:'r3001a',type:'material',name:'Cabilla corrugada',unit:'kg',qty:1.05,price:1.45},{id:'r3001b',type:'material',name:'Alambre de amarre #18',unit:'kg',qty:0.02,price:2.2},{id:'r3001c',type:'mano_obra',name:'Fierrero',unit:'jornal',qty:0.4,price:20},{id:'r3001d',type:'mano_obra',name:'Obrero ayudante',unit:'jornal',qty:0.2,price:15}]},
    // ══════════════════════════════════════════
    // MAMPOSTERÍA
    // ══════════════════════════════════════════
    {id:4001,code:'MA-001',name:'Pared de bloque de arcilla 0.12m',unit:'m²',category:'Mampostería',rendimiento:8,
      resources:[{id:'r4001a',type:'material',name:'Bloque de arcilla 12x20x40cm',unit:'und',qty:12.5,price:0.65},{id:'r4001b',type:'material',name:'Cemento Portland',unit:'saco',qty:0.25,price:9.5},{id:'r4001c',type:'material',name:'Arena de pega',unit:'m³',qty:0.04,price:20},{id:'r4001d',type:'mano_obra',name:'Albañil',unit:'jornal',qty:1,price:18},{id:'r4001e',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.5,price:15}]},
    {id:4002,code:'MA-002',name:'Pared de bloque de arcilla 0.15m',unit:'m²',category:'Mampostería',rendimiento:7,
      resources:[{id:'r4002a',type:'material',name:'Bloque de arcilla 15x20x40cm',unit:'und',qty:12.5,price:0.85},{id:'r4002b',type:'material',name:'Cemento Portland',unit:'saco',qty:0.28,price:9.5},{id:'r4002c',type:'material',name:'Arena de pega',unit:'m³',qty:0.045,price:20},{id:'r4002d',type:'mano_obra',name:'Albañil',unit:'jornal',qty:1.1,price:18},{id:'r4002e',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.55,price:15}]},
    // ══════════════════════════════════════════
    // REVESTIMIENTOS
    // ══════════════════════════════════════════
    {id:5001,code:'RE-001',name:'Friso interior de paredes (dos capas)',unit:'m²',category:'Revestimientos',rendimiento:12,
      resources:[{id:'r5001a',type:'material',name:'Cemento Portland',unit:'saco',qty:0.18,price:9.5},{id:'r5001b',type:'material',name:'Arena fina cernida',unit:'m³',qty:0.03,price:22},{id:'r5001c',type:'mano_obra',name:'Albañil frisador',unit:'jornal',qty:0.6,price:20},{id:'r5001d',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.3,price:15}]},
    {id:5002,code:'RE-002',name:'Enchape de cerámica en piso 30x30cm',unit:'m²',category:'Revestimientos',rendimiento:6,
      resources:[{id:'r5002a',type:'material',name:'Cerámica 30x30cm',unit:'m²',qty:1.05,price:9},{id:'r5002b',type:'material',name:'Pega para cerámica',unit:'saco 20kg',qty:0.4,price:8},{id:'r5002c',type:'material',name:'Fragua de junta',unit:'kg',qty:0.3,price:3},{id:'r5002d',type:'mano_obra',name:'Pegador de cerámica',unit:'jornal',qty:1.2,price:22},{id:'r5002e',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.6,price:15}]},
    {id:5003,code:'RE-003',name:'Enchape de porcelanato 60x60cm',unit:'m²',category:'Revestimientos',rendimiento:5,
      resources:[{id:'r5003a',type:'material',name:'Porcelanato 60x60cm',unit:'m²',qty:1.05,price:24},{id:'r5003b',type:'material',name:'Pega flexible',unit:'saco',qty:0.5,price:12},{id:'r5003c',type:'material',name:'Fragua de junta',unit:'kg',qty:0.25,price:4},{id:'r5003d',type:'mano_obra',name:'Pegador especializado',unit:'jornal',qty:1.5,price:25},{id:'r5003e',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.75,price:15}]},
    // ══════════════════════════════════════════
    // PINTURA
    // ══════════════════════════════════════════
    {id:6001,code:'PI-001',name:'Pintura vinílica interior dos manos',unit:'m²',category:'Pintura',rendimiento:25,
      resources:[{id:'r6001a',type:'material',name:'Pintura vinílica',unit:'galón',qty:0.08,price:18},{id:'r6001b',type:'material',name:'Sellador de paredes',unit:'galón',qty:0.04,price:15},{id:'r6001c',type:'material',name:'Lija y consumibles',unit:'global',qty:1,price:0.5},{id:'r6001d',type:'mano_obra',name:'Pintor',unit:'jornal',qty:0.3,price:20}]},
    {id:6002,code:'PI-002',name:'Pintura caucho exterior alta calidad',unit:'m²',category:'Pintura',rendimiento:20,
      resources:[{id:'r6002a',type:'material',name:'Pintura caucho exterior',unit:'galón',qty:0.1,price:25},{id:'r6002b',type:'material',name:'Sellador exterior',unit:'galón',qty:0.05,price:18},{id:'r6002c',type:'mano_obra',name:'Pintor',unit:'jornal',qty:0.35,price:20}]},
    // ══════════════════════════════════════════
    // INSTALACIONES SANITARIAS
    // ══════════════════════════════════════════
    {id:7001,code:'IS-001',name:'Tubería PVC sanitaria 4" instalada',unit:'ml',category:'Instalaciones sanitarias',rendimiento:15,
      resources:[{id:'r7001a',type:'material',name:'Tubo PVC sanitario 4"',unit:'ml',qty:1.05,price:4.5},{id:'r7001b',type:'material',name:'Accesorios y pegamento',unit:'global',qty:1,price:1.2},{id:'r7001c',type:'mano_obra',name:'Plomero',unit:'jornal',qty:0.5,price:22},{id:'r7001d',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.25,price:15}]},
    {id:7002,code:'IS-002',name:'Punto sanitario completo (bajante+sifón)',unit:'pto',category:'Instalaciones sanitarias',rendimiento:3,
      resources:[{id:'r7002a',type:'material',name:'Tubo y accesorios PVC',unit:'global',qty:1,price:18},{id:'r7002b',type:'mano_obra',name:'Plomero',unit:'jornal',qty:0.25,price:22}]},
    // ══════════════════════════════════════════
    // INSTALACIONES ELÉCTRICAS
    // ══════════════════════════════════════════
    {id:8001,code:'IE-001',name:'Punto eléctrico 110V (toma o apagador)',unit:'pto',category:'Instalaciones eléctricas',rendimiento:4,
      resources:[{id:'r8001a',type:'material',name:'Caja metálica 2x4',unit:'und',qty:1,price:1.8},{id:'r8001b',type:'material',name:'Conduit PVC 3/4"',unit:'ml',qty:3,price:0.9},{id:'r8001c',type:'material',name:'Cable TTU 12 AWG',unit:'ml',qty:6,price:1.2},{id:'r8001d',type:'material',name:'Toma o apagador',unit:'und',qty:1,price:3.5},{id:'r8001e',type:'mano_obra',name:'Electricista',unit:'jornal',qty:0.2,price:22}]},
    {id:8002,code:'IE-002',name:'Tablero de distribución 8 circuitos',unit:'und',category:'Instalaciones eléctricas',rendimiento:1,
      resources:[{id:'r8002a',type:'material',name:'Tablero 8 ctos c/breakers',unit:'und',qty:1,price:95},{id:'r8002b',type:'material',name:'Cable THW 8 AWG alimentador',unit:'ml',qty:8,price:3.5},{id:'r8002c',type:'mano_obra',name:'Electricista',unit:'jornal',qty:1,price:22},{id:'r8002d',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.5,price:15}]},
    // ══════════════════════════════════════════
    // CARPINTERÍA GENERAL
    // ══════════════════════════════════════════
    {id:9001,code:'CG-001',name:'Puerta de madera sólida 0.90x2.10m',unit:'und',category:'Carpintería general',rendimiento:2,
      resources:[{id:'r9001a',type:'material',name:'Puerta de madera machihembrada',unit:'und',qty:1,price:180},{id:'r9001b',type:'material',name:'Marco de madera pino 3"x2"',unit:'und',qty:1,price:35},{id:'r9001c',type:'material',name:'Cerradura y bisagras',unit:'jgo',qty:1,price:25},{id:'r9001d',type:'mano_obra',name:'Carpintero',unit:'jornal',qty:0.5,price:22}]},
    {id:9002,code:'CG-002',name:'Ventana de aluminio serie 25 c/vidrio 4mm',unit:'m²',category:'Carpintería general',rendimiento:4,
      resources:[{id:'r9002a',type:'material',name:'Ventana aluminio con vidrio',unit:'m²',qty:1,price:65},{id:'r9002b',type:'mano_obra',name:'Instalador aluminio',unit:'jornal',qty:0.25,price:22}]},
    // ══════════════════════════════════════════
    // TECHOS Y CUBIERTAS
    // ══════════════════════════════════════════
    {id:10001,code:'TC-001',name:'Losa maciza de concreto e=12cm',unit:'m²',category:'Techos y cubiertas',rendimiento:15,
      resources:[{id:'r10001a',type:'material',name:'Cemento Portland',unit:'saco',qty:0.9,price:9.5},{id:'r10001b',type:'material',name:'Arena lavada',unit:'m³',qty:0.07,price:22},{id:'r10001c',type:'material',name:'Piedra picada 3/4"',unit:'m³',qty:0.1,price:28},{id:'r10001d',type:'material',name:'Cabilla 3/8" y 1/4"',unit:'kg',qty:8,price:1.45},{id:'r10001e',type:'material',name:'Encofrado tabla+puntales',unit:'m²',qty:1,price:8},{id:'r10001f',type:'mano_obra',name:'Albañil',unit:'jornal',qty:1.2,price:18},{id:'r10001g',type:'mano_obra',name:'Obrero',unit:'jornal',qty:2.5,price:15},{id:'r10001h',type:'equipo',name:'Mezcladora',unit:'hora',qty:1.5,price:8}]},
    {id:10002,code:'TC-002',name:'Cubierta zinc liso cal.28 con correas',unit:'m²',category:'Techos y cubiertas',rendimiento:20,
      resources:[{id:'r10002a',type:'material',name:'Lámina zinc liso cal.28',unit:'m²',qty:1.1,price:8},{id:'r10002b',type:'material',name:'Correa metálica 2"x4"',unit:'kg',qty:3,price:1.8},{id:'r10002c',type:'material',name:'Tornillos autoperforantes',unit:'und',qty:8,price:0.15},{id:'r10002d',type:'mano_obra',name:'Techador',unit:'jornal',qty:0.4,price:20},{id:'r10002e',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.2,price:15}]},
    // ══════════════════════════════════════════
    // OBRAS EXTERIORES
    // ══════════════════════════════════════════
    {id:11001,code:'OE-001',name:'Acera de concreto simple f\'c=175 e=10cm',unit:'m²',category:'Obras exteriores',rendimiento:25,
      resources:[{id:'r11001a',type:'material',name:'Cemento Portland',unit:'saco',qty:0.5,price:9.5},{id:'r11001b',type:'material',name:'Arena lavada',unit:'m³',qty:0.055,price:22},{id:'r11001c',type:'material',name:'Piedra picada',unit:'m³',qty:0.075,price:28},{id:'r11001d',type:'mano_obra',name:'Albañil',unit:'jornal',qty:0.3,price:18},{id:'r11001e',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.5,price:15},{id:'r11001f',type:'equipo',name:'Mezcladora',unit:'hora',qty:0.3,price:8}]},
    {id:11002,code:'OE-002',name:'Cuneta de concreto triangular 0.30x0.30m',unit:'ml',category:'Obras exteriores',rendimiento:15,
      resources:[{id:'r11002a',type:'material',name:'Cemento Portland',unit:'saco',qty:0.2,price:9.5},{id:'r11002b',type:'material',name:'Arena lavada',unit:'m³',qty:0.025,price:22},{id:'r11002c',type:'material',name:'Piedra picada',unit:'m³',qty:0.035,price:28},{id:'r11002d',type:'mano_obra',name:'Albañil',unit:'jornal',qty:0.4,price:18},{id:'r11002e',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.4,price:15}]},
    {id:11003,code:'OE-003',name:'Cerco perimetral malla ciclón 2" cal.12 h=2m',unit:'ml',category:'Obras exteriores',rendimiento:20,
      resources:[{id:'r11003a',type:'material',name:'Malla ciclón 2" cal.12 h=2m',unit:'m²',qty:2,price:6.5},{id:'r11003b',type:'material',name:'Tubo galvanizado 2" poste',unit:'und',qty:0.5,price:12},{id:'r11003c',type:'material',name:'Concreto poste',unit:'m³',qty:0.01,price:85},{id:'r11003d',type:'mano_obra',name:'Albañil',unit:'jornal',qty:0.3,price:18},{id:'r11003e',type:'mano_obra',name:'Obrero',unit:'jornal',qty:0.6,price:15}]}
  ];
  apuData=[...apuData,...base];
  if(apuData.length) apuSelected=apuData[0].id;
  apuRenderList();
  apuRenderDetail();
  showToast(`✓ ${base.length} APUs cargadas — actualiza los precios con tus valores reales`);
  document.dispatchEvent(new CustomEvent('linaro:obra:change'));
}

// ==========================================
// PARTIDAS DE OBRA — Motor completo
// ==========================================
let partidasData = [];   // [{ id, num, name, desc, items:[], collapsed:false }]

// ── helpers ───────────────────────────────────────────────────────
function prtItemCost(item) {
  return (parseFloat(item.metrado)||0) * (parseFloat(item.price)||0);
}
function prtTotalCost(p) {
  return (p.items||[]).reduce((s,i)=>s+prtItemCost(i),0);
}
function prtItemDuration(item) {
  if(item.apuId){
    const apu=apuData.find(a=>String(a.id)===String(item.apuId));
    if(apu&&apu.rendimiento>0) return Math.ceil((parseFloat(item.metrado)||0)/apu.rendimiento);
  }
  return parseInt(item.duration)||1;
}
function prtPartidaDuration(p) {
  if(!(p.items&&p.items.length)) return 0;
  const starts=p.items.map(i=>parseInt(i.startDay)||1);
  const ends=p.items.map(i=>(parseInt(i.startDay)||1)+prtItemDuration(i)-1);
  return Math.max(...ends)-Math.min(...starts)+1;
}
function prtTotalDuration() {
  if(!partidasData.length) return 0;
  const ends=partidasData.map(p=>{
    const s=parseInt(p.startDay)||1;
    return s+prtPartidaDuration(p)-1;
  });
  return Math.max(...ends,0);
}

// ── sub-tab switcher ──────────────────────────────────────────────
function apuSwitchMain(tab, btn) {
  document.querySelectorAll('.apu-main-tab').forEach(b=>{
    b.style.color='var(--text2)';b.style.borderBottomColor='transparent';b.style.fontWeight='500';
  });
  if(btn){btn.style.color='var(--gold)';btn.style.borderBottomColor='var(--gold)';btn.style.fontWeight='700';}
  document.getElementById('apuPanelApus').style.display=tab==='apus'?'flex':'none';
  document.getElementById('apuPanelPartidas').style.display=tab==='partidas'?'block':'none';
  if(tab==='apus'){apuRenderList();apuRenderDetail();}
  if(tab==='partidas'){prtRender();prtRenderGantt();}
}

// ── modales ───────────────────────────────────────────────────────
function prtNewModal() {
  const m=document.getElementById('prtModal'); if(!m)return;
  document.getElementById('prtMName').value='';
  document.getElementById('prtMDesc').value='';
  document.getElementById('prtMNum').value=`C${(partidasData.length+1).toString().padStart(2,'0')}`;
  document.getElementById('prtMStartDay').value=1;
  document.getElementById('prtMId').value='';
  m.style.display='flex';
}
function prtCreate() {
  const name=document.getElementById('prtMName').value.trim();
  if(!name){showToast('Ingresa un nombre para la partida');return;}
  const eid=document.getElementById('prtMId').value;
  if(eid){
    const p=partidasData.find(x=>String(x.id)===eid);
    if(p){
      p.num=document.getElementById('prtMNum').value.trim();
      p.name=name;
      p.desc=document.getElementById('prtMDesc').value.trim();
      p.startDay=parseInt(document.getElementById('prtMStartDay').value)||1;
    }
  } else {
    partidasData.push({
      id:String(Date.now()),
      num:document.getElementById('prtMNum').value.trim()||`C${partidasData.length+1}`,
      name,
      desc:document.getElementById('prtMDesc').value.trim(),
      startDay:parseInt(document.getElementById('prtMStartDay').value)||1,
      items:[],
      collapsed:false
    });
  }
  document.getElementById('prtModal').style.display='none';
  prtRender();prtRenderGantt();
  document.dispatchEvent(new CustomEvent('linaro:obra:change'));
}

let _prtActivePartidaId = null;
function prtOpenItemModal(partidaId) {
  _prtActivePartidaId=partidaId;
  const m=document.getElementById('prtItemModal'); if(!m)return;
  document.getElementById('prtIMName').value='';
  document.getElementById('prtIMUnit').value='m²';
  document.getElementById('prtIMMetrado').value='';
  document.getElementById('prtIMPrice').value='';
  document.getElementById('prtIMStartDay').value=prtNextStartDay(partidaId);
  document.getElementById('prtIMApu').value='';
  prtItemAPUChanged();
  // Poblar select de APUs
  const sel=document.getElementById('prtIMApu');
  sel.innerHTML='<option value="">— Sin APU (manual) —</option>'+
    apuData.map(a=>`<option value="${a.id}">${a.code?`[${a.code}] `:''}${a.name} — $${apuTotals(a).unitCost.toFixed(2)}/${a.unit}</option>`).join('');
  m.style.display='flex';
}
function prtNextStartDay(partidaId) {
  const p=partidasData.find(x=>String(x.id)===String(partidaId));
  if(!p||!p.items.length) return p?parseInt(p.startDay)||1:1;
  const ends=p.items.map(i=>(parseInt(i.startDay)||1)+prtItemDuration(i));
  return Math.max(...ends);
}
function prtItemAPUChanged() {
  const apuId=document.getElementById('prtIMApu')?.value;
  const priceEl=document.getElementById('prtIMPrice');
  const unitEl=document.getElementById('prtIMUnit');
  const nameEl=document.getElementById('prtIMName');
  if(apuId){
    const apu=apuData.find(a=>String(a.id)===String(apuId));
    if(apu){
      const t=apuTotals(apu);
      if(priceEl) priceEl.value=t.unitCost.toFixed(2);
      if(unitEl) unitEl.value=apu.unit;
      if(nameEl&&!nameEl.value) nameEl.value=apu.name;
    }
  }
}
function prtItemAdd() {
  const p=partidasData.find(x=>String(x.id)===String(_prtActivePartidaId));
  if(!p){showToast('Partida no encontrada');return;}
  const name=document.getElementById('prtIMName').value.trim();
  if(!name){showToast('Ingresa descripción del ítem');return;}
  const apuId=document.getElementById('prtIMApu').value;
  p.items.push({
    id:String(Date.now()),
    name,
    unit:document.getElementById('prtIMUnit').value||'m²',
    metrado:parseFloat(document.getElementById('prtIMMetrado').value)||0,
    price:parseFloat(document.getElementById('prtIMPrice').value)||0,
    startDay:parseInt(document.getElementById('prtIMStartDay').value)||1,
    apuId:apuId||null
  });
  document.getElementById('prtItemModal').style.display='none';
  prtRender();prtRenderGantt();
  document.dispatchEvent(new CustomEvent('linaro:obra:change'));
}

// ── render tabla partidas ─────────────────────────────────────────
function prtRender() {
  const cont=document.getElementById('prtList'); if(!cont)return;
  if(!partidasData.length){
    cont.innerHTML='<p style="color:var(--text2);font-size:13px;padding:8px">Sin partidas. Crea la primera con el botón + Nueva Partida.</p>';
    prtUpdateSummary();return;
  }
  cont.innerHTML=partidasData.map(p=>{
    const cost=prtTotalCost(p);
    const dur=prtPartidaDuration(p);
    return `<div style="background:var(--bg2);border:.5px solid var(--border);border-radius:10px;margin-bottom:10px;overflow:hidden">
      <div style="padding:10px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;background:var(--bg3)" onclick="prtToggle('${p.id}')">
        <span style="font-size:12px;color:var(--text2);font-weight:700;min-width:36px">${p.num||''}</span>
        <span style="font-weight:600;color:var(--text);flex:1">${p.name}</span>
        <span style="font-size:12px;color:var(--text2)">${dur}d</span>
        <span style="font-size:13px;font-weight:700;color:var(--gold)">$${cost.toFixed(2)}</span>
        <div style="display:flex;gap:6px">
          <button onclick="event.stopPropagation();prtOpenItemModal('${p.id}')" class="btn btn-sm btn-gold" style="padding:3px 8px;font-size:11px">+ Ítem</button>
          <button onclick="event.stopPropagation();prtEditPartida('${p.id}')" class="btn btn-sm" style="padding:3px 8px;font-size:11px">✏️</button>
          <button onclick="event.stopPropagation();prtDeletePartida('${p.id}')" class="btn btn-sm" style="padding:3px 8px;font-size:11px;background:#fdf2f2;border-color:#f5c6c6;color:#c0392b">🗑</button>
        </div>
        <span style="color:var(--text2);font-size:14px">${p.collapsed?'▶':'▼'}</span>
      </div>
      ${!p.collapsed&&p.items.length?`<div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg)">
            <th style="padding:6px 10px;text-align:left;color:var(--text2);font-weight:600">Descripción</th>
            <th style="padding:6px;text-align:center;color:var(--text2);font-weight:600">Unid.</th>
            <th style="padding:6px;text-align:right;color:var(--text2);font-weight:600">Metrado</th>
            <th style="padding:6px;text-align:right;color:var(--text2);font-weight:600">P.Unit ($)</th>
            <th style="padding:6px;text-align:right;color:var(--text2);font-weight:600">Total ($)</th>
            <th style="padding:6px;text-align:right;color:var(--text2);font-weight:600">Días</th>
            <th style="padding:6px"></th>
          </tr></thead>
          <tbody>${p.items.map(item=>`<tr style="border-top:.5px solid var(--border)">
            <td style="padding:6px 10px"><input value="${item.name}" onchange="prtUpdateItem('${p.id}','${item.id}','name',this.value)" style="width:100%;background:transparent;border:none;color:var(--text);font-size:12px">${item.apuId?`<span style="font-size:10px;color:var(--text2)"> [APU]</span>`:''}</td>
            <td style="padding:6px;text-align:center"><input value="${item.unit}" onchange="prtUpdateItem('${p.id}','${item.id}','unit',this.value)" style="width:50px;background:transparent;border:none;color:var(--text);font-size:12px;text-align:center"></td>
            <td style="padding:6px;text-align:right"><input type="number" value="${item.metrado}" onchange="prtUpdateItem('${p.id}','${item.id}','metrado',this.value)" style="width:70px;background:transparent;border:none;color:var(--text);font-size:12px;text-align:right"></td>
            <td style="padding:6px;text-align:right"><input type="number" value="${item.price}" onchange="prtUpdateItem('${p.id}','${item.id}','price',this.value)" style="width:75px;background:transparent;border:none;color:var(--text);font-size:12px;text-align:right"></td>
            <td style="padding:6px;text-align:right;font-weight:600;color:var(--gold)">$${prtItemCost(item).toFixed(2)}</td>
            <td style="padding:6px;text-align:right;color:var(--text2)">${prtItemDuration(item)}</td>
            <td style="padding:6px;text-align:center"><button onclick="prtDeleteItem('${p.id}','${item.id}')" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:13px">✕</button></td>
          </tr>`).join('')}</tbody>
        </table></div>`:''}
      ${!p.collapsed&&!p.items.length?`<div style="padding:10px 14px;color:var(--text2);font-size:12px">Sin ítems. Haz clic en <b>+ Ítem</b> para agregar.</div>`:''}
    </div>`;
  }).join('');
  prtUpdateSummary();
}
function prtUpdateSummary() {
  const total=partidasData.reduce((s,p)=>s+prtTotalCost(p),0);
  const days=prtTotalDuration();
  const elC=document.getElementById('prtMetCosto');if(elC)elC.textContent='$'+total.toFixed(2);
  const elD=document.getElementById('prtMetDias');if(elD)elD.textContent=days+'d';
  const elP=document.getElementById('prtMetPartidas');if(elP)elP.textContent=partidasData.length;
}
function prtToggle(id) {
  const p=partidasData.find(x=>String(x.id)===String(id));
  if(p){p.collapsed=!p.collapsed;prtRender();}
}
function prtUpdateItem(partidaId, itemId, field, value) {
  const p=partidasData.find(x=>String(x.id)===String(partidaId)); if(!p)return;
  const item=p.items.find(x=>String(x.id)===String(itemId)); if(!item)return;
  item[field]=(field==='metrado'||field==='price')?parseFloat(value)||0:value;
  prtRender();prtRenderGantt();
  document.dispatchEvent(new CustomEvent('linaro:obra:change'));
}
function prtDeleteItem(partidaId, itemId) {
  const p=partidasData.find(x=>String(x.id)===String(partidaId)); if(!p)return;
  p.items=p.items.filter(x=>String(x.id)!==String(itemId));
  prtRender();prtRenderGantt();
  document.dispatchEvent(new CustomEvent('linaro:obra:change'));
}
function prtDeletePartida(id) {
  if(!confirm('¿Eliminar esta partida y todos sus ítems?'))return;
  partidasData=partidasData.filter(x=>String(x.id)!==String(id));
  prtRender();prtRenderGantt();
  document.dispatchEvent(new CustomEvent('linaro:obra:change'));
}
function prtEditPartida(id) {
  const p=partidasData.find(x=>String(x.id)===String(id)); if(!p)return;
  document.getElementById('prtMNum').value=p.num||'';
  document.getElementById('prtMName').value=p.name||'';
  document.getElementById('prtMDesc').value=p.desc||'';
  document.getElementById('prtMStartDay').value=p.startDay||1;
  document.getElementById('prtMId').value=String(p.id);
  document.getElementById('prtModal').style.display='flex';
}

// ── Cronograma Gantt ──────────────────────────────────────────────
function prtRenderGantt() {
  const el=document.getElementById('prtGantt'); if(!el)return;
  if(!partidasData.length||!partidasData.some(p=>p.items&&p.items.length)){
    el.innerHTML='<p style="color:var(--text2);font-size:12px;text-align:center;padding:16px">Sin ítems para mostrar en el cronograma.</p>';return;
  }
  const totalDays=Math.max(prtTotalDuration(),7);
  const cellW=Math.max(20,Math.min(40,Math.floor(700/totalDays)));
  const cols=Array.from({length:totalDays},(_,i)=>i+1);
  const headerCells=cols.map(d=>`<th style="padding:4px 2px;text-align:center;font-size:10px;color:var(--text2);min-width:${cellW}px;font-weight:${d%7===0||d%7===1?'700':'400'}">${d}</th>`).join('');
  const rows=partidasData.map(p=>{
    const ps=parseInt(p.startDay)||1;
    const cells=cols.map(d=>{
      const hasItem=p.items.some(item=>{
        const is=parseInt(item.startDay)||ps;
        const ie=is+prtItemDuration(item)-1;
        return d>=is&&d<=ie;
      });
      return `<td style="padding:2px;text-align:center">
        ${hasItem?`<div style="height:14px;background:var(--gold);border-radius:3px;opacity:.85"></div>`:`<div style="height:14px"></div>`}
      </td>`;
    }).join('');
    return `<tr>
      <td style="padding:4px 8px;font-size:11px;color:var(--text);white-space:nowrap;min-width:130px;max-width:180px;overflow:hidden;text-overflow:ellipsis" title="${p.name}">${p.num?`<b>${p.num}</b> `:''}${p.name}</td>
      <td style="padding:4px 6px;font-size:11px;color:var(--text2);text-align:right;white-space:nowrap">$${prtTotalCost(p).toFixed(0)}</td>
      ${cells}
    </tr>`;
  }).join('');
  el.innerHTML=`<table style="border-collapse:collapse;font-size:11px;width:100%">
    <thead><tr>
      <th style="padding:4px 8px;text-align:left;color:var(--text2);font-weight:600;min-width:130px">Partida</th>
      <th style="padding:4px 6px;text-align:right;color:var(--text2);font-weight:600;white-space:nowrap">Costo</th>
      ${headerCells}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function prtSendToBudget() {
  if(!partidasData.length){showToast('Sin partidas para enviar');return;}
  if(!confirm('¿Enviar todas las partidas al Presupuesto principal?'))return;
  let count=0;
  partidasData.forEach(p=>{
    p.items.forEach(item=>{
      projectData.items.push({
        id:Date.now()+Math.random(),
        name:`[${p.num||'P'}] ${item.name}`,
        unit:item.unit,
        qty:parseFloat(item.metrado)||0,
        price:parseFloat(item.price)||0,
        cat:'obras'
      });
      count++;
    });
  });
  if(typeof recalc==='function') recalc();
  if(typeof renderBudgetTable==='function') renderBudgetTable();
  showToast(`✓ ${count} ítems enviados al presupuesto`);
}

function prtExportPDF() {
  if(typeof window.jspdf==='undefined'){showToast('jsPDF no cargado aún');return;}
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF();
  const pName=document.getElementById('pName')?.value||'Sin nombre';
  const pClient=document.getElementById('pClient')?.value||'—';
  const pLoc=document.getElementById('pLocation')?.value||'—';

  if(typeof pdfDrawHeader==='function') pdfDrawHeader(doc,'PARTIDAS DE OBRA','Presupuesto Civil — Capítulos y Cronograma');
  if(typeof pdfInfoBlock==='function') pdfInfoBlock(doc,[
    {label:'Proyecto',value:pName},{label:'Cliente',value:pClient},
    {label:'Ubicación',value:pLoc},{label:'Fecha',value:new Date().toLocaleDateString('es-VE')},
    {label:'Moneda',value:'USD'},{label:'Duración total',value:prtTotalDuration()+' días'}
  ],52);

  let y=95;
  let grandTotal=0;
  partidasData.forEach((p,pi)=>{
    if(y>250){doc.addPage();y=20;}
    const cost=prtTotalCost(p);
    grandTotal+=cost;
    doc.setFontSize(10);doc.setFont('helvetica','bold');
    doc.setFillColor(245,240,230);
    doc.rect(14,y-4,182,8,'F');
    doc.text(`${p.num||`C${pi+1}`}. ${p.name}`,16,y);
    doc.text(`$${cost.toFixed(2)}`,196,y,{align:'right'});
    doc.setFont('helvetica','normal');
    y+=6;
    if(p.items&&p.items.length){
      doc.autoTable({
        startY:y,
        head:[['Descripción','Unid.','Metrado','P.Unit($)','Total($)','Días']],
        body:p.items.map(item=>[
          item.name,item.unit,
          (parseFloat(item.metrado)||0).toFixed(2),
          (parseFloat(item.price)||0).toFixed(2),
          prtItemCost(item).toFixed(2),
          prtItemDuration(item)
        ]),
        styles:{fontSize:8,cellPadding:2},
        headStyles:{fillColor:[186,117,23],textColor:255},
        columnStyles:{0:{cellWidth:70},5:{halign:'center'}},
        margin:{left:14,right:14}
      });
      y=doc.lastAutoTable.finalY+6;
    }
  });

  if(y>250){doc.addPage();y=20;}
  doc.setFontSize(11);doc.setFont('helvetica','bold');
  doc.setFillColor(186,117,23);doc.setTextColor(255,255,255);
  doc.rect(14,y-4,182,9,'F');
  doc.text('TOTAL GENERAL',16,y+1);
  doc.text('$'+grandTotal.toFixed(2),196,y+1,{align:'right'});
  doc.setTextColor(0,0,0);

  const totalPages=doc.internal.getNumberOfPages();
  if(typeof pdfDrawFooter==='function'){
    for(let i=1;i<=totalPages;i++){doc.setPage(i);pdfDrawFooter(doc,i,totalPages);}
  }
  doc.save(`Partidas_Obra_Linaro_${pName.replace(/\s+/g,'_')}.pdf`);
  showToast('PDF exportado con éxito ✓');
}

// ==========================================
// SUPABASE SYNC — APU y Partidas
// Sistema de eventos limpio (sin monkeypatching)
// ==========================================
let _obraSaveTimer = null;

async function obraSaveToSupabase() {
  const uid = window.currentUser?.id;
  if (!uid) return;
  clearTimeout(_obraSaveTimer);
  _obraSaveTimer = setTimeout(async () => {
    const ind = document.getElementById('obraSaveIndicator');
    try {
      const urlBase = 'https://iufichpykfkhjednfljy.supabase.co/rest/v1/linaro_obra_data';
      const token   = window.supabaseClient._token;
      const KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZmljaHB5a2ZraGplZG5mbGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDI3NzMsImV4cCI6MjA5NDYxODc3M30.0OG0e2Oj_5-uJckF-a0duPDgBmgyYr-3VLJm3HvQRVM';
      const headers = {
        'apikey': KEY,
        'Authorization': 'Bearer ' + (token || KEY),
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      };
      const payload = {
        user_id:       uid,
        apu_data:      JSON.stringify(apuData),
        partidas_data: JSON.stringify(partidasData),
        updated_at:    new Date().toISOString()
      };
      const r = await fetch(urlBase + '?on_conflict=user_id', {
        method: 'POST', headers, body: JSON.stringify(payload)
      });
      if (r.ok) {
        const now = new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'});
        if (ind) {
          ind.textContent = `✓ Guardado ${now}`;
          ind.style.color = '#27ae60';
          ind.style.opacity = '1';
          setTimeout(() => { ind.style.opacity = '0'; ind.style.color = '#BA7517'; }, 3000);
        }
      } else {
        if (ind) {
          ind.textContent = '⚠ Error al guardar';
          ind.style.color = '#e74c3c';
          ind.style.opacity = '1';
          setTimeout(() => { ind.style.opacity = '0'; ind.style.color = '#BA7517'; }, 4000);
        }
        const err = await r.json().catch(()=>({}));
        console.warn('Supabase APU save error:', err);
      }
    } catch(e) {
      if (ind) {
        ind.textContent = '📵 Sin conexión — datos locales';
        ind.style.color = '#e67e22';
        ind.style.opacity = '1';
        setTimeout(() => { ind.style.opacity = '0'; ind.style.color = '#BA7517'; }, 5000);
      }
      console.warn('obraSaveToSupabase:', e);
    }
  }, 1500);
}

async function obraLoadFromSupabase() {
  const uid = window.currentUser?.id;
  if (!uid) return;
  const ind = document.getElementById('obraSaveIndicator');
  try {
    if (ind) { ind.textContent = '↻ Cargando datos...'; ind.style.opacity = '1'; }
    const KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZmljaHB5a2ZraGplZG5mbGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDI3NzMsImV4cCI6MjA5NDYxODc3M30.0OG0e2Oj_5-uJckF-a0duPDgBmgyYr-3VLJm3HvQRVM';
    const token = window.supabaseClient._token;
    const r = await fetch(
      `https://iufichpykfkhjednfljy.supabase.co/rest/v1/linaro_obra_data?user_id=eq.${uid}&select=apu_data,partidas_data`,
      { headers: { 'apikey': KEY, 'Authorization': 'Bearer '+(token||KEY), 'Accept': 'application/vnd.pgrst.object+json' } }
    );
    if (!r.ok) {
      if (ind) { ind.style.opacity = '0'; }
      return;
    }
    const row = await r.json();
    if (row && row.apu_data) {
      const parsed = typeof row.apu_data==='string' ? JSON.parse(row.apu_data) : row.apu_data;
      if (Array.isArray(parsed)) { apuData = parsed; apuRenderList(); }
    }
    if (row && row.partidas_data) {
      const parsed = typeof row.partidas_data==='string' ? JSON.parse(row.partidas_data) : row.partidas_data;
      if (Array.isArray(parsed)) { partidasData = parsed; if (typeof prtRender==='function') prtRender(); }
    }
    if (ind) { ind.style.opacity = '0'; }
    if (row?.apu_data || row?.partidas_data) showToast('Datos de Obras cargados ✓');
  } catch(e) {
    if (ind) {
      ind.textContent = '📵 Modo offline';
      ind.style.color = '#e67e22';
      ind.style.opacity = '1';
      setTimeout(() => { ind.style.opacity = '0'; ind.style.color = '#BA7517'; }, 4000);
    }
    console.warn('obraLoadFromSupabase:', e);
  }
}

// ==========================================
// AUTO-GUARDADO — Sistema de eventos limpio
// Reemplaza el monkeypatching anterior.
// Cualquier función que muta datos dispara:
//   document.dispatchEvent(new CustomEvent('linaro:obra:change'))
// Este listener único maneja el guardado con debounce.
// ==========================================
document.addEventListener('linaro:obra:change', function() {
  obraSaveToSupabase();
});

// Guardar al editar recursos inline (inputs dentro de tablas APU/Partidas)
document.addEventListener('input', function(e) {
  if (e.target.closest && (
    e.target.closest('#apuResourceTable') ||
    e.target.closest('#prtList')
  )) {
    document.dispatchEvent(new CustomEvent('linaro:obra:change'));
  }
});

// ==========================================
// INTEGRACIÓN CON goTab y initApp
// Reemplaza los monkeypatches del index.html original.
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
  // Patch goTab para mostrar/ocultar módulo APU correctamente
  if (typeof goTab === 'function') {
    const _origGoTab = goTab;
    goTab = function(tabId, btn) {
      const apuMod = document.getElementById('apu');
      if (apuMod) {
        if (tabId === 'apu') {
          apuMod.style.display = 'block';
          document.querySelectorAll('.nt').forEach(b => b.classList.remove('on'));
          if (btn) btn.classList.add('on');
          apuRenderList();
          return;
        } else {
          apuMod.style.display = 'none';
        }
      }
      _origGoTab(tabId, btn);
    };
  }

  // Patch initApp para cargar datos al iniciar sesión
  if (typeof initApp === 'function') {
    const _initApp_orig = initApp;
    initApp = function() {
      _initApp_orig();
      obraLoadFromSupabase();
    };
  }
});
