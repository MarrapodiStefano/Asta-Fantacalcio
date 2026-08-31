let db=JSON.parse(localStorage.getItem('AF_DB')||'[]'),current=JSON.parse(localStorage.getItem('AF_CURRENT')||'null'),objRole='P';
const $=id=>document.getElementById(id);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function persist(){localStorage.setItem('AF_DB',JSON.stringify(db));localStorage.setItem('AF_CURRENT',JSON.stringify(current));render()}
function go(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.s===id));render()}
function openModal(h){$('sheet').innerHTML=h;$('modal').classList.add('show')}
function closeModal(){$('modal').classList.remove('show')}
$('modal').onclick=e=>{if(e.target.id==='modal')closeModal()}
function newAuction(){openModal(`<div class="h2">➕ Nuova asta</div><label>Nome asta</label><input id="aname" placeholder="Es. Asta 2026"><label>Data</label><input id="adate" type="date" value="${new Date().toISOString().slice(0,10)}"><label>Numero squadre</label><select id="anum">${Array.from({length:9},(_,i)=>i+2).map(n=>`<option value="${n}" ${n===10?'selected':''}>${n}</option>`).join('')}</select><label>Crediti iniziali per squadra</label><input id="acred" type="number" min="1" value="1200"><label>Nomi squadre</label><div id="teamInputs"></div><button class="btn primary" style="width:100%;margin-top:12px" onclick="createAuction()">Crea asta</button><button class="btn secondary" style="width:100%;margin-top:8px" onclick="closeModal()">Annulla</button>`);$('anum').onchange=makeInputs;makeInputs()}
function makeInputs(){let n=+$('anum').value;$('teamInputs').innerHTML=Array.from({length:n},(_,i)=>`<input class="tn" style="margin:4px 0" value="Squadra ${i+1}" placeholder="Squadra ${i+1}">`).join('')}
function createAuction(){let n=+$('anum').value,c=+$('acred').value||1200,names=[...document.querySelectorAll('.tn')].map((x,i)=>x.value.trim()||`Squadra ${i+1}`);current={id:Date.now(),name:$('aname').value.trim()||'Asta Fantacalcio',date:$('adate').value,initialCredits:c,teams:names.map((name,id)=>({id,name,spent:0,players:[]})),objectives:[]};db=[current,...db];persist();closeModal();go('auction')}
function counts(t){let c={P:0,D:0,C:0,A:0};t.players.forEach(p=>c[p.role]++);return `<span class="countpill"><b>P</b>${c.P}</span><span class="countpill"><b>D</b>${c.D}</span><span class="countpill"><b>C</b>${c.C}</span><span class="countpill"><b>A</b>${c.A}</span><span class="totalcount">· ${t.players.length} tot.</span>`}
function budget(t){return current.initialCredits-t.spent}
function teamRow(t){return `<div class="teamrow"><div><div class="teamname">${esc(t.name)}</div><div class="counts">${counts(t)}</div></div><div class="budget">${budget(t)}</div></div>`}
function render(){if(!current){$('sub').textContent='Nessuna asta aperta';$('welcome').textContent='Benvenuto';$('homeDash').innerHTML=''}else{$('sub').textContent=`${current.name} · ${current.date}`;$('welcome').textContent=current.name;$('homeDash').innerHTML=`<div class="card"><div class="h2">Situazione asta</div>${current.teams.map(teamRow).join('')}</div>`} $('miniTeams').innerHTML=current?current.teams.map(teamRow).join(''):'<div class="empty">Crea prima un’asta.</div>'; $('teamsList').innerHTML=current?current.teams.map(t=>`<div class="card"><div class="head"><div><div class="h2" style="margin:0">${esc(t.name)}</div><div class="counts">${counts(t)}</div></div><div class="budget">${budget(t)} cr</div></div>${t.players.length?t.players.map(p=>`<div class="teamrow"><div>${esc(p.name)} <span class="tag">${p.role}</span></div><b>${p.price} cr</b></div>`).join(''):'<div class="empty">Nessun acquisto</div>'}</div>`).join(''):'<div class="empty">Nessuna asta.</div>';renderObjectives();renderArchive()}
function searchPlayers(){if(!current)return;let q=($('q').value||'').trim().toLowerCase();if(!q){$('results').innerHTML='';return}let sold=new Map();current.teams.forEach(t=>t.players.forEach(p=>sold.set(p.id,t.name)));let arr=PLAYERS.filter(p=>p.name.toLowerCase().includes(q)).slice(0,20);$('results').innerHTML=arr.length?arr.map(p=>`<div class="result" onclick="openPlayer(${p.id})"><div class="name">${esc(p.name)}</div><div class="meta"><span class="tag">${p.role}</span>${esc(p.team)} ${current.objectives.includes(p.id)?'<span class="tag goal">🎯 Obiettivo</span>':''} ${sold.has(p.id)?`<span class="tag">Acquistato: ${esc(sold.get(p.id))}</span>`:''}</div></div>`).join(''):'<div class="empty">Nessun calciatore trovato.</div>'}
function pct(v){return v==null||v===''?'—':(Number(v)*100).toFixed(2)+'%'}
function openPlayer(id){let p=PLAYERS.find(x=>x.id==id),owner=null,rec=null;current.teams.forEach(t=>{let r=t.players.find(x=>x.id==id);if(r){owner=t;rec=r}});openModal(`<div class="head"><div><div class="playername">${esc(p.name)}</div><div class="meta">${p.role} · ${esc(p.team)}</div></div>${current.objectives.includes(p.id)?'<span class="tag goal">🎯 OBIETTIVO</span>':''}</div><div class="kv"><div class="kvbox"><small>Crediti</small><b>${p.credits??'—'}</b></div><div class="kvbox"><small>% crediti</small><b>${pct(p.pct)}</b></div><div class="kvbox"><small>Prezzo medio %</small><b>${pct(p.pmv)}</b></div><div class="kvbox"><small>Appetibilità</small><b>${p.appeal??'—'}</b></div></div>${rec?`<div class="card" style="background:var(--greenbg);border:0"><b>ACQUISTATO</b><div style="margin-top:5px">${esc(owner.name)} · ${rec.price} crediti</div></div><button class="btn primary" style="width:100%" onclick="editPurchase(${p.id})">✏️ Modifica acquisto</button>`:`<label>Squadra acquirente</label><select id="buyer">${current.teams.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><label>Prezzo di acquisto</label><input id="price" type="number" min="1" value="${p.credits||1}"><button class="btn primary" style="width:100%;margin-top:12px" onclick="assignPlayer(${p.id})">✓ Conferma acquisto</button>`}<button class="btn secondary" style="width:100%;margin-top:8px" onclick="closeModal()">Chiudi</button>`)}
function assignPlayer(id){let p=PLAYERS.find(x=>x.id==id),t=current.teams.find(x=>x.id===+$('buyer').value),price=+$('price').value;if(!price||price<1)return alert('Inserisci un prezzo valido.');if(price>budget(t))return alert('Credito insufficiente.');if(current.teams.some(t=>t.players.some(p=>p.id==id)))return alert('Calciatore già acquistato.');t.players.push({id:p.id,name:p.name,role:p.role,price});t.spent+=price;persist();clearSearch();closeModal()}
function clearSearch(){
    const q=$('q');
    const results=$('results');

    if(q) q.value='';
    if(results) results.innerHTML='';
}
function editPurchase(id){let old=current.teams.find(t=>t.players.some(p=>p.id==id)),rec=old.players.find(p=>p.id==id);openModal(`<div class="h2">✏️ Modifica acquisto</div><div class="small muted">${esc(rec.name)}</div><label>Squadra acquirente</label><select id="buyer">${current.teams.map(t=>`<option value="${t.id}" ${t.id===old.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select><label>Prezzo di acquisto</label><input id="price" type="number" min="1" value="${rec.price}"><button class="btn primary" style="width:100%;margin-top:12px" onclick="savePurchaseEdit(${id},${old.id})">Salva modifica</button><button class="btn danger" style="width:100%;margin-top:8px" onclick="removePurchase(${id},${old.id})">Elimina acquisto</button><button class="btn secondary" style="width:100%;margin-top:8px" onclick="closeModal()">Annulla</button>`)}
function savePurchaseEdit(id,oldId){let old=current.teams.find(t=>t.id===oldId),i=old.players.findIndex(p=>p.id==id),rec=old.players[i],neu=current.teams.find(t=>t.id===+$('buyer').value),price=+$('price').value;if(!price||price<1)return alert('Prezzo non valido.');if(neu.id!==old.id&&price>budget(neu))return alert('Credito insufficiente per la nuova squadra.');old.spent-=rec.price;old.players.splice(i,1);rec.price=price;neu.players.push(rec);neu.spent+=price;persist();closeModal()}
function removePurchase(id,tid){let t=current.teams.find(t=>t.id===tid),i=t.players.findIndex(p=>p.id==id);if(i>=0){t.spent-=t.players[i].price;t.players.splice(i,1);persist()}closeModal()}
function setRole(r,el){objRole=r;document.querySelectorAll('#objectives .chip').forEach(x=>x.classList.remove('active'));el.classList.add('active');renderObjectives()}
function editObjectives(){openModal(`<div class="h2">🎯 Imposta obiettivi</div><div class="small muted">Tocca ☆ per aggiungere o ★ per togliere un obiettivo.</div><div class="chips" style="margin-top:12px"><button class="chip active" onclick="setupRole('P',this)">P</button><button class="chip" onclick="setupRole('D',this)">D</button><button class="chip" onclick="setupRole('C',this)">C</button><button class="chip" onclick="setupRole('A',this)">A</button></div><label>Cerca</label><input id="oq" placeholder="Nome calciatore…" oninput="renderSetup()"><div id="setupList"></div><button class="btn primary" style="width:100%;margin-top:12px" onclick="closeModal()">Fatto</button>`);window.setupR='P';renderSetup()}
function setupRole(r,el){window.setupR=r;document.querySelectorAll('.sheet .chip').forEach(x=>x.classList.remove('active'));el.classList.add('active');renderSetup()}
function renderSetup(){let q=($('oq')?.value||'').toLowerCase(),r=window.setupR||'P',arr=PLAYERS.filter(p=>p.role===r&&(!q||p.name.toLowerCase().includes(q))).slice(0,100);$('setupList').innerHTML=arr.map(p=>`<div class="result" onclick="toggleObjective(${p.id})"><div class="head"><div><div class="name">${esc(p.name)}</div><div class="meta">${esc(p.team)} · Appetibilità: ${p.appeal??'—'}</div></div><div style="font-size:25px">${current.objectives.includes(p.id)?'★':'☆'}</div></div></div>`).join('')}
function toggleObjective(id){let i=current.objectives.indexOf(id);if(i<0)current.objectives.push(id);else current.objectives.splice(i,1);persist();renderSetup()}
function renderObjectives(){if(!current)return;let sold=new Set();current.teams.forEach(t=>t.players.forEach(p=>sold.add(p.id)));let arr=PLAYERS.filter(p=>p.role===objRole&&current.objectives.includes(p.id)).sort((a,b)=>(b.appeal??-1)-(a.appeal??-1));$('objList').innerHTML=arr.length?arr.map(p=>`<div class="result" onclick="openPlayer(${p.id})"><div class="head"><div><div class="name">${esc(p.name)}</div><div class="meta">${esc(p.team)} · ${sold.has(p.id)?'<span class="tag">Non disponibile</span>':'<span class="tag avail">Disponibile</span>'}</div></div><b>${p.appeal??'—'}</b></div></div>`).join(''):'<div class="empty">Nessun obiettivo impostato.</div>'}
function deleteAuction(id){
    let a=db.find(x=>x.id===id);
    if(!a)return;

    if(!confirm(`Eliminare definitivamente l'asta "${a.name}"?\n\nSaranno eliminati anche tutti gli acquisti e gli obiettivi salvati in quella asta.`))
        return;

    db=db.filter(x=>x.id!==id);

    if(current && current.id===id){
        current=db.length?db[0]:null;
    }

    persist();
}

function renderArchive(){
    $('archiveList').innerHTML=db.length
    ?db.map(a=>`
        <div class="card">
            <div class="head">
                <div>
                    <div class="h2" style="margin:0">${esc(a.name)}</div>
                    <div class="meta">
                        ${a.date} · ${a.teams.length} squadre · ${a.initialCredits} crediti
                    </div>
                </div>

                <div style="display:flex;gap:7px">
                    <button
                        class="btn primary"
                        style="min-height:42px;padding:8px 11px"
                        onclick="openSaved(${a.id})">
                        Apri
                    </button>

                    <button
                        class="btn danger"
                        style="min-height:42px;padding:8px 11px"
                        onclick="deleteAuction(${a.id})"
                        aria-label="Elimina asta">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    `).join('')
    :'<div class="empty">Nessuna asta salvata.</div>'
}
render();
if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js").catch(()=>{});}
