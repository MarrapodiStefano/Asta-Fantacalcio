/* =========================
   CAMPETTI – SERIE A 2026/27
========================= */

const CAMPI_SERIE_A = [
  ['atalanta','Atalanta','ATA'],
  ['bologna','Bologna','BOL'],
  ['cagliari','Cagliari','CAG'],
  ['como','Como','COM'],
  ['fiorentina','Fiorentina','FIO'],
  ['frosinone','Frosinone','FRO'],
  ['genoa','Genoa','GEN'],
  ['inter','Inter','INT'],
  ['juventus','Juventus','JUV'],
  ['lazio','Lazio','LAZ'],
  ['lecce','Lecce','LEC'],
  ['milan','Milan','MIL'],
  ['monza','Monza','MON'],
  ['napoli','Napoli','NAP'],
  ['parma','Parma','PAR'],
  ['roma','Roma','ROM'],
  ['sassuolo','Sassuolo','SAS'],
  ['torino','Torino','TOR'],
  ['udinese','Udinese','UDI'],
  ['venezia','Venezia','VEN']
].map(([id,name,code])=>({id,name,code}));

function renderCampetti(){
  const grid=document.getElementById('campettiGrid');
  if(!grid) return;

  grid.innerHTML=CAMPI_SERIE_A.map(team=>`
    <button class="campetti-team campetti-${team.id}"
      type="button"
      onclick="openCampetto('${team.id}')"
      aria-label="Apri campetto ${team.name}">
      <span class="campetti-crest" aria-hidden="true">${team.code}</span>
      <span class="campetti-team-name">${team.name}</span>
    </button>
  `).join('');
}

function openCampetto(teamId){
  const team=CAMPI_SERIE_A.find(t=>t.id===teamId);
  if(!team) return;

  const viewer=document.getElementById('campettiViewer');
  const title=document.getElementById('campettiViewerTitle');
  const image=document.getElementById('campettiViewerImage');
  const empty=document.getElementById('campettiViewerEmpty');

  if(!viewer||!title||!image||!empty) return;

  title.textContent=team.name;
  viewer.classList.add('show');
  document.body.classList.add('campetti-open');

  campettiResetZoom();

  if(team.id==='atalanta'){
    image.src='./assets/campetti/atalanta.jpg';
    image.alt='Campetto Atalanta';
    image.style.display='block';
    empty.style.display='none';

    image.onerror=()=>{
      image.style.display='none';
      empty.innerHTML='<div class="campetti-empty-icon">⚽</div><b>Immagine Atalanta da caricare</b><span>La schermata è pronta: appena l’immagine viene inserita nella cartella dedicata comparirà qui.</span>';
      empty.style.display='flex';
    };
  }else{
    image.removeAttribute('src');
    image.style.display='none';
    empty.innerHTML='<div class="campetti-empty-icon">⚽</div><b>Campetto '+team.name+'</b><span>Immagine non ancora caricata.</span>';
    empty.style.display='flex';
  }
}

function closeCampetto(){
  const viewer=document.getElementById('campettiViewer');
  if(viewer) viewer.classList.remove('show');
  document.body.classList.remove('campetti-open');
  campettiResetZoom();
}

let campettiScale=1;
let campettiX=0;
let campettiY=0;
let campettiStartDist=0;
let campettiStartScale=1;
let campettiStartX=0;
let campettiStartY=0;
let campettiPanning=false;
let campettiPinching=false;

function campettiApplyTransform(){
  const image=document.getElementById('campettiViewerImage');
  if(!image) return;
  image.style.transform='translate('+campettiX+'px,'+campettiY+'px) scale('+campettiScale+')';
}

function campettiResetZoom(){
  campettiScale=1;
  campettiX=0;
  campettiY=0;
  campettiApplyTransform();
}

function campettiDistance(touches){
  const dx=touches[0].clientX-touches[1].clientX;
  const dy=touches[0].clientY-touches[1].clientY;
  return Math.hypot(dx,dy);
}

function initCampettiZoom(){
  const area=document.getElementById('campettiImageStage');
  if(!area||area.dataset.zoomReady) return;
  area.dataset.zoomReady='1';

  area.addEventListener('touchstart',e=>{
    if(e.touches.length===2){
      campettiPinching=true;
      campettiPanning=false;
      campettiStartDist=campettiDistance(e.touches);
      campettiStartScale=campettiScale;
    }else if(e.touches.length===1 && campettiScale>1){
      campettiPanning=true;
      campettiStartX=e.touches[0].clientX-campettiX;
      campettiStartY=e.touches[0].clientY-campettiY;
    }
  },{passive:false});

  area.addEventListener('touchmove',e=>{
    if(e.touches.length===2 && campettiPinching){
      e.preventDefault();
      const ratio=campettiDistance(e.touches)/campettiStartDist;
      campettiScale=Math.min(4,Math.max(1,campettiStartScale*ratio));
      campettiApplyTransform();
    }else if(e.touches.length===1 && campettiPanning){
      e.preventDefault();
      campettiX=e.touches[0].clientX-campettiStartX;
      campettiY=e.touches[0].clientY-campettiStartY;
      campettiApplyTransform();
    }
  },{passive:false});

  area.addEventListener('touchend',e=>{
    if(e.touches.length<2) campettiPinching=false;
    if(!e.touches.length) campettiPanning=false;
    if(campettiScale<=1.02) campettiResetZoom();
  });

  area.addEventListener('dblclick',()=>{
    if(campettiScale===1){
      campettiScale=2;
    }else{
      campettiResetZoom();
      return;
    }
    campettiApplyTransform();
  });
}

window.addEventListener('DOMContentLoaded',()=>{
  initCampettiZoom();
});
