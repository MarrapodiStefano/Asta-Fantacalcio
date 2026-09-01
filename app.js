let db = JSON.parse(
    localStorage.getItem('AF_DB') || '[]'
);

let current = JSON.parse(
    localStorage.getItem('AF_CURRENT') || 'null'
);

let objRole = 'P';

let objStatus = 'available';


const $ = id => document.getElementById(id);



/* =========================
   SICUREZZA TESTO
========================= */

function esc(s){

    return String(s ?? '').replace(/[&<>"']/g, c => ({

        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#039;'

    }[c]));

}



/* =========================
   SALVATAGGIO
========================= */

function persist(){

    localStorage.setItem(
        'AF_DB',
        JSON.stringify(db)
    );

    localStorage.setItem(
        'AF_CURRENT',
        JSON.stringify(current)
    );

    render();

}



/* =========================
   NAVIGAZIONE
========================= */

function go(id){

    document
        .querySelectorAll('.screen')
        .forEach(x => x.classList.remove('active'));


    $(id).classList.add('active');


    document
        .querySelectorAll('.nav')
        .forEach(x =>
            x.classList.toggle(
                'active',
                x.dataset.s === id
            )
        );


    render();

}



/* =========================
   MODALE
========================= */

function openModal(h){

    $('sheet').innerHTML = h;

    $('modal').classList.add('show');

}


function closeModal(){

    $('modal').classList.remove('show');

}


$('modal').onclick = e => {

    if(e.target.id === 'modal'){

        closeModal();

    }

};



/* =========================
   NUOVA ASTA
========================= */

function newAuction(){

    openModal(`

        <div class="h2">
            ➕ Nuova asta
        </div>


        <label>
            Nome asta
        </label>

        <input
            id="aname"
            placeholder="Es. Asta 2026">


        <label>
            Data
        </label>

        <input
            id="adate"
            type="date"
            value="${new Date().toISOString().slice(0,10)}">


        <label>
            Numero squadre
        </label>

        <select id="anum">

            ${Array
                .from({length:9},(_,i)=>i+2)
                .map(n => `
                    <option
                        value="${n}"
                        ${n===10?'selected':''}>
                        ${n}
                    </option>
                `)
                .join('')}

        </select>


        <label>
            Crediti iniziali per squadra
        </label>

        <input
            id="acred"
            type="number"
            min="1"
            value="1200">


        <label>
            Giocatori da acquistare per ruolo
        </label>

        <div class="rolelimits">
            <div><span>Portieri</span><input id="alimP" type="number" min="0" value="2"></div>
            <div><span>Difensori</span><input id="alimD" type="number" min="0" value="9"></div>
            <div><span>Centrocampisti</span><input id="alimC" type="number" min="0" value="9"></div>
            <div><span>Attaccanti</span><input id="alimA" type="number" min="0" value="7"></div>
        </div>


        <label>
            Nomi squadre
        </label>

        <div id="teamInputs"></div>


        <button
            class="btn primary"
            style="width:100%;margin-top:12px"
            onclick="createAuction()">

            Crea asta

        </button>


        <button
            class="btn secondary"
            style="width:100%;margin-top:8px"
            onclick="closeModal()">

            Annulla

        </button>

    `);


    $('anum').onchange = makeInputs;


    makeInputs();

}



function makeInputs(){

    let n = +$('anum').value;


    $('teamInputs').innerHTML = Array
        .from({length:n},(_,i)=>`

            <input
                class="tn"
                style="margin:4px 0"
                value="Squadra ${i+1}"
                placeholder="Squadra ${i+1}">

        `)
        .join('');

}



/* =========================
   CREA ASTA
========================= */

function createAuction(){

    let c = +$('acred').value || 1200;


    let names =
        [...document.querySelectorAll('.tn')]
        .map((x,i) =>
            x.value.trim() ||
            `Squadra ${i+1}`
        );


    current = {

        id:Date.now(),

        name:
            $('aname').value.trim() ||
            'Asta Fantacalcio',

        date:$('adate').value,

        initialCredits:c,

        roleLimits:{
            P:Math.max(0, +$('alimP').value || 0),
            D:Math.max(0, +$('alimD').value || 0),
            C:Math.max(0, +$('alimC').value || 0),
            A:Math.max(0, +$('alimA').value || 0)
        },


        myTeamId:0,


        teams:names.map((name,id)=>({

            id,

            name,

            spent:0,

            players:[]

        })),


        objectives:[],

        objectivePriorities:{},

        playerNotes:{},

        history:[]

    };


    db = [
        current,
        ...db
    ];


    persist();


    closeModal();


    go('auction');

}



/* =========================
   LIMITI ROSA
========================= */

function roleLimits(){

    return current?.roleLimits || {
        P:2,
        D:9,
        C:9,
        A:7
    };

}


/* =========================
   CONTEGGIO RUOLI
========================= */

function counts(t){

    let c = {

        P:0,
        D:0,
        C:0,
        A:0

    };


    t.players.forEach(p => {

        c[p.role]++;

    });


    return `

        <span class="countpill">
            <b>P</b>${c.P}/${roleLimits().P}
        </span>

        <span class="countpill">
            <b>D</b>${c.D}/${roleLimits().D}
        </span>

        <span class="countpill">
            <b>C</b>${c.C}/${roleLimits().C}
        </span>

        <span class="countpill">
            <b>A</b>${c.A}/${roleLimits().A}
        </span>

        <span class="totalcount">
            · ${t.players.length} tot.
        </span>

    `;

}



/* =========================
   BUDGET
========================= */

function budget(t){

    return current.initialCredits - t.spent;

}


/*
   CREDITI MINIMI DA TENERE DA PARTE

   Ogni giocatore ancora necessario per completare
   la rosa deve poter essere acquistato almeno a 1 credito.
*/

function totalSlots(){

    const limits = roleLimits();

    return limits.P + limits.D + limits.C + limits.A;

}


function remainingPlayers(t){

    return Math.max(
        0,
        totalSlots() - t.players.length
    );

}


/*
   CREDITI REALMENTE SPENDIBILI

   Se mancano ancora N giocatori, bisogna conservare
   almeno N - 1 crediti per poter completare la rosa
   dopo il prossimo acquisto.
*/

function spendableBudget(t){

    return Math.max(
        0,
        budget(t) - Math.max(0, remainingPlayers(t) - 1)
    );

}



/* =========================
   RIGA SQUADRA
========================= */

function teamRow(t){

    return `

        <div class="teamrow">

            <div>

                <div class="teamname">
                    ${esc(t.name)}
                </div>


                <div class="counts">

                    ${counts(t)}

                </div>

            </div>


            <div class="budget">

                ${spendableBudget(t)}

            </div>

        </div>

    `;

}



/* FORMAZIONI - FASE 1 */
const FORMATION_MODULES={'3-4-3':[3,4,3],'3-5-2':[3,5,2],'4-3-3':[4,3,3],'4-4-2':[4,4,2],'4-5-1':[4,5,1],'5-3-2':[5,3,2],'5-4-1':[5,4,1]};
let formationTeamId=null;
function openFormation(teamId){formationTeamId=teamId;go('formation')}
function formationAutoLine(players,role,needed){return players.filter(p=>p.role===role).sort((a,b)=>b.price-a.price).slice(0,needed)}
function pitchArtwork(){
  return '<img class="pitch-art" src="./assets/campetto.JPG" alt="">';
}

function renderFormation(){
 const title=$('formationTitle'),select=$('formationModule'),pitch=$('pitch'),bench=$('formationBench');
 if(!current||formationTeamId===null){title.textContent='⚽ Formazione';pitch.innerHTML='';bench.innerHTML='';return}
 const team=current.teams.find(t=>t.id===formationTeamId);if(!team){pitch.innerHTML='';return}
 title.textContent='⚽ '+team.name;const saved=team.formationModule||'3-4-3';
 select.innerHTML=Object.keys(FORMATION_MODULES).map(m=>'<option value="'+m+'"'+(m===saved?' selected':'')+'>'+m+'</option>').join('');
 const mod=FORMATION_MODULES[saved];
 const starters=[formationAutoLine(team.players,'P',1),formationAutoLine(team.players,'D',mod[0]),formationAutoLine(team.players,'C',mod[1]),formationAutoLine(team.players,'A',mod[2])];
 const used=new Set(starters.flat().map(p=>p.id)),positions=['82%','61%','39%','16%'];
 pitch.className='pitch';pitch.innerHTML=pitchArtwork()+starters.map((line,i)=>'<div class="formation-line" style="top:'+positions[i]+'">'+line.map(p=>'<div class="formation-player"><div class="formation-shirt">'+p.role+'</div><div class="formation-player-name">'+esc(p.name)+'</div><div class="formation-player-price">'+p.price+'</div></div>').join('')+'</div>').join('');
 const remaining=team.players.filter(p=>!used.has(p.id)).sort((a,b)=>b.price-a.price);
 bench.innerHTML=remaining.length?'<div class="bench-list">'+remaining.map(p=>'<div class="bench-player">'+esc(p.name)+'<small>'+p.role+' · '+p.price+'</small></div>').join('')+'</div>':'<div class="empty">Nessun giocatore in panchina.</div>';
}
function setFormationModule(module){if(!current||formationTeamId===null)return;const team=current.teams.find(t=>t.id===formationTeamId);if(!team)return;team.formationModule=module;persist()}

/* =========================
   RENDER GENERALE
========================= */

function render(){


    /* HOME */

    if(!current){

        $('sub').textContent =
            'Nessuna asta aperta';

        $('welcome').textContent =
            'Benvenuto';

        $('homeDash').innerHTML = '';

    }

    else{

        $('sub').textContent =
            `${current.name} · ${current.date}`;


        $('welcome').textContent =
            current.name;


        $('homeDash').innerHTML = `

            <div class="card">

                <div class="h2">
                    Situazione asta
                </div>

                ${current.teams
                    .map(teamRow)
                    .join('')}

            </div>

        `;

    }



    /* ASTA - SQUADRE */

    $('miniTeams').innerHTML = current

        ? [...current.teams]
            .sort((a,b) => {

                const diff = spendableBudget(b) - spendableBudget(a);

                return diff || a.id - b.id;

            })
            .map(teamRow)
            .join('')

        : `
            <div class="empty">
                Crea prima un’asta.
            </div>
        `;



    /* DETTAGLIO SQUADRE */

    $('teamsList').innerHTML = current

        ? current.teams.map(t => `

            <div class="card">

                <div class="head">

                    <div>

                        <div
                            class="h2"
                            style="margin:0">

                            ${esc(t.name)}

                        </div>


                        <div class="counts">

                            ${counts(t)}

                        </div>

                    </div>


                    <div class="teamrow-actions">
                        <div class="budget">${spendableBudget(t)}</div>
                        <button class="ball-btn" onclick="openFormation(${t.id})" aria-label="Apri formazione">⚽</button>
                    </div>

                </div>


                ${
                    t.players.length

                    ? t.players.map(p => `

                        <div class="teamrow">

                            <div>

                                ${esc(p.name)}

                                <span class="tag">
                                    ${p.role}
                                </span>

                            </div>


                            <b>
                                ${p.price}
                            </b>

                        </div>

                    `).join('')


                    : `

                        <div class="empty">

                            Nessun acquisto

                        </div>

                    `
                }

            </div>

        `).join('')


        : `

            <div class="empty">
                Nessuna asta.
            </div>

        `;



    renderFormation();

    renderObjectives();

    renderArchive();

}



/* =========================
   RICERCA GIOCATORI
========================= */

function searchPlayers(){

    if(!current) return;


    let q =
        ($('q').value || '')
        .trim()
        .toLowerCase();


    if(!q){

        $('results').innerHTML = '';

        return;

    }


    let sold = new Map();


    current.teams.forEach(t => {

        t.players.forEach(p => {

            sold.set(
                p.id,
                t.name
            );

        });

    });


    let arr =
        PLAYERS
        .filter(p =>
            p.name
            .toLowerCase()
            .includes(q)
        )
        .slice(0,20);



    $('results').innerHTML = arr.length

        ? arr.map(p => `

            <div
                class="result"
                onclick="openPlayer(${p.id})">


                <div class="name">

                    ${esc(p.name)}

                </div>


                <div class="meta">

                    <span class="tag">
                        ${p.role}
                    </span>


                    ${esc(p.team)}


                    ${
                        current.objectives.includes(p.id)

                        ? `
                            <span class="tag goal">
                                🎯 Obiettivo
                            </span>
                          `

                        : ''
                    }


                    ${
                        sold.has(p.id)

                        ? `
                            <span class="tag">
                                Acquistato:
                                ${esc(sold.get(p.id))}
                            </span>
                          `

                        : ''
                    }

                </div>

            </div>

        `).join('')


        : `

            <div class="empty">

                Nessun calciatore trovato.

            </div>

        `;

}



/* =========================
   PERCENTUALI
========================= */

function pct(v){

    if(v == null || v === ''){

        return '—';

    }


    return (
        Number(v) * 100
    ).toFixed(2) + '%';

}



/* =========================
   MODALITÀ ASTA LIVE
========================= */

function liveTeamRows(player){
    return [...current.teams].sort((a,b)=>spendableBudget(b)-spendableBudget(a)).map(t=>{
        const max=spendableBudget(t);
        const roleFull=t.players.filter(x=>x.role===player.role).length>=roleLimits()[player.role];
        const blocked=max<1||roleFull;
        return '<button class="live-team '+(blocked?'blocked':'')+'" '+(blocked?'disabled':'')+' onclick="selectLiveTeam('+t.id+',this)"><span><b>'+esc(t.name)+'</b><small>'+(roleFull?'Ruolo completo':'Offerta massima')+'</small></span><strong>'+(roleFull?'—':max)+'</strong></button>';
    }).join('');
}

function selectLiveTeam(teamId,button){
    document.querySelectorAll('.live-team').forEach(x=>x.classList.remove('selected'));
    button.classList.add('selected');
    $('buyer').value=teamId;
    const max=spendableBudget(current.teams.find(t=>t.id===+teamId));
    if(+$('price').value>max) $('price').value=max;
}

/* =========================
   NOTE CALCIATORI
========================= */

function playerNote(id){
    if(!current.playerNotes) current.playerNotes = {};
    return current.playerNotes[id] || '';
}

function savePlayerNote(id){
    if(!current.playerNotes) current.playerNotes = {};
    const field = $('playerNote');
    if(!field) return;
    const note = field.value.trim();
    if(note) current.playerNotes[id] = note;
    else delete current.playerNotes[id];
    persist();
    const status = $('noteStatus');
    if(status){
        status.textContent = '✓ Nota salvata';
        setTimeout(function(){
            if($('noteStatus')) $('noteStatus').textContent = '';
        },1800);
    }
}

/* =========================
   CONTEGGIO OBIETTIVI EQUIVALENTI
========================= */

function availableObjectiveCount(role, priority){
    if(!current) return 0;

    const sold = new Set();

    current.teams.forEach(t => {
        t.players.forEach(p => sold.add(p.id));
    });

    return PLAYERS.filter(p =>
        p.role === role &&
        current.objectives.includes(p.id) &&
        !sold.has(p.id) &&
        objectivePriority(p.id) === priority
    ).length;
}

function objectiveRemainingHtml(player){

    if(!current.objectives.includes(player.id)) return '';

    const priority = objectivePriority(player.id);
    const count = availableObjectiveCount(player.role, priority);
    const data = PRIORITIES[priority];

    const message = count === 1
        ? 'È l’ultimo obiettivo ancora disponibile in questa categoria.'
        : count + ' obiettivi ancora disponibili in questa categoria.';

    return '<div class="objective-remaining">' +
        '<div class="objective-remaining-main">' +
            '<span>' + data.icon + ' ' + data.label + ' · ' + player.role + '</span>' +
            '<strong>' + count + '</strong>' +
        '</div>' +
        '<small>' + message + '</small>' +
    '</div>';
}


/* =========================
   CONSIGLIO OFFERTA
========================= */

function myTeam(){

    if(!current) return null;

    const id = Number.isFinite(+current.myTeamId)
        ? +current.myTeamId
        : 0;

    return current.teams.find(t => t.id === id)
        || current.teams[0]
        || null;

}


function recommendedOffer(player){

    const credits = Number(player.credits);
    const pmv = Number(player.pmv);

    /* Se il PMV non è disponibile, usiamo la tua valutazione. */
    let base;

    if(Number.isFinite(credits) && Number.isFinite(pmv)){
        base = credits * 0.70 + pmv * 0.30;
    }
    else if(Number.isFinite(credits)){
        base = credits;
    }
    else if(Number.isFinite(pmv)){
        base = pmv;
    }
    else{
        return null;
    }


    let multiplier = 1;

    if(current.objectives?.includes(player.id)){

        const priority = objectivePriority(player.id);

        if(priority === 'max') multiplier = 1.10;
        if(priority === 'high') multiplier = 1.05;

    }


    const advice = Math.max(1, Math.round(base * multiplier));

    const team = myTeam();

    if(!team) return advice;

    return Math.min(advice, spendableBudget(team));

}


/* =========================
   SCHEDA CALCIATORE
========================= */

function openPlayer(id, source){

    let p =
        PLAYERS.find(x => x.id == id);


    let owner = null;

    let rec = null;



    current.teams.forEach(t => {

        let r =
            t.players.find(
                x => x.id == id
            );


        if(r){

            owner = t;

            rec = r;

        }

    });



    openModal(`


        <div class="head">

            <div>

                <div class="playername">

                    ${esc(p.name)}

                </div>


                <div class="meta">

                    ${p.role}
                    ·
                    ${esc(p.team)}

                </div>

            </div>


            ${
                current.objectives.includes(p.id)

                ? `
                    <span class="tag goal" title="${PRIORITIES[objectivePriority(p.id)].label}">
                        ${PRIORITIES[objectivePriority(p.id)].icon}
                    </span>
                  `

                : ''
            }

        </div>



        <div class="kv">


            <div class="kvbox">

                <small>Crediti</small>

                <b>
                    ${p.credits ?? '—'}
                </b>

            </div>



            <div class="kvbox">

                <small>% crediti</small>

                <b>
                    ${pct(p.pct)}
                </b>

            </div>



            <div class="kvbox">

                <small>PMV</small>

                <b>
                    ${p.pmv ?? '—'}
                </b>

            </div>



            <div class="kvbox">

                <small>Appetibilità</small>

                <b>
                    ${p.appeal ?? '—'}
                </b>

            </div>


        </div>


        ${objectiveRemainingHtml(p)}


        <div class="offer-advice">

            <div class="offer-advice-row">

                <span>💰 Puoi spendere fino a</span>

                <strong>
                    ${myTeam() ? spendableBudget(myTeam()) : '—'}
                </strong>

            </div>

            <div class="offer-advice-row offer-recommended">

                <span>💡 Offerta consigliata</span>

                <strong>
                    ${recommendedOffer(p) ?? '—'}
                </strong>

            </div>

            <small>
                La proposta combina CREDITI (70%), PMV (30%) e la priorità del giocatore, senza mai superare il budget realmente spendibile.
            </small>

        </div>


        <div class="player-notes">

            <label>
                📝 Note personali
            </label>

            <textarea
                id="playerNote"
                rows="3"
                placeholder="Scrivi una nota su questo giocatore...">${esc(playerNote(p.id))}</textarea>

            <div class="note-actions">

                <button
                    class="btn secondary"
                    onclick="savePlayerNote(${p.id})">

                    💾 Salva nota

                </button>

                <span
                    id="noteStatus"
                    class="small muted">

                </span>

            </div>

        </div>


        ${ 
            source === 'objectives'

            ? ''

            : rec

            ? `


                <div
                    class="card"
                    style="background:var(--greenbg);border:0">


                    <b>
                        ACQUISTATO
                    </b>


                    <div style="margin-top:5px">

                        ${esc(owner.name)}
                        ·
                        ${rec.price}
                        crediti

                    </div>

                </div>



                <button
                    class="btn primary"
                    style="width:100%"
                    onclick="editPurchase(${p.id})">

                    ✏️ Modifica acquisto

                </button>


              `


            : `


                <div class="live-title">🔥 Asta Live</div>
                <div class="live-player-note">Seleziona la squadra vincitrice e inserisci il prezzo finale.</div>

                <label>Squadre ancora in gioco</label>
                <div class="live-teams">
                    ${liveTeamRows(p)}
                </div>

                <input id="buyer" type="hidden" value="">

                <label>Prezzo finale di acquisto</label>
                <input id="price" type="number" min="1" value="${p.credits || 1}" placeholder="Inserisci il prezzo finale">

                <button
                    class="btn primary"
                    style="width:100%;margin-top:12px"
                    onclick="assignPlayer(${p.id})">

                    🏆 Assegna giocatore

                </button>


              `
        }



        <button
            class="btn secondary"
            style="width:100%;margin-top:8px"
            onclick="closeModal()">

            Chiudi

        </button>


    `);

}



/* =========================
   ASSEGNA CALCIATORE
========================= */

function assignPlayer(id){

    if(!Array.isArray(current.history)){
        current.history = [];
    }

    let p =
        PLAYERS.find(x => x.id == id);


    const buyerValue = $('buyer').value;

    if(buyerValue === ''){
        return alert('Seleziona prima la squadra che ha acquistato il giocatore.');
    }

    let t =
        current.teams.find(
            x => x.id === +buyerValue
        );


    let price =
        +$('price').value;



    if(!price || price < 1){

        return alert(
            'Inserisci un prezzo valido.'
        );

    }



    if(price > spendableBudget(t)){

        return alert(
            `Puoi spendere al massimo ${spendableBudget(t)} crediti, così resterà almeno 1 credito per ogni giocatore ancora necessario a completare la rosa.`
        );

    }



    const limits = roleLimits();

    if(
        t.players.filter(x => x.role === p.role).length >= limits[p.role]
    ){

        return alert(
            'Hai già raggiunto il numero massimo previsto per questo ruolo.'
        );

    }


    if(
        current.teams.some(
            t => t.players.some(
                p => p.id == id
            )
        )
    ){

        return alert(
            'Calciatore già acquistato.'
        );

    }



    t.players.push({

        id:p.id,

        name:p.name,

        role:p.role,

        price

    });



    t.spent += price;


    /* REGISTRA OPERAZIONE NELLO STORICO */

    current.history.push({
        playerId: p.id,
        name: p.name,
        role: p.role,
        realTeam: p.team || '',
        teamId: t.id,
        teamName: t.name,
        price,
        timestamp: Date.now()
    });


    persist();


    /* PULIZIA RICERCA */

    clearSearch();


    closeModal();

}



/* =========================
   STORICO ASTA
========================= */

function openHistory(){

    if(!current) return;

    openModal(`

        <div class="h2">
            📜 Storico asta
        </div>

        <div class="small muted">
            Cerca un calciatore oppure annulla un acquisto.
        </div>

        <input
            id="historySearch"
            type="text"
            placeholder="🔍 Cerca calciatore"
            autocomplete="off"
            oninput="renderHistoryList()">

        <div
            id="historyResults"
            class="history-list"
            style="margin-top:10px">

        </div>

        <button
            class="btn secondary"
            style="width:100%;margin-top:8px"
            onclick="closeModal()">

            Chiudi

        </button>

    `);

    renderHistoryList();

}


function renderHistoryList(){

    const box = $('historyResults');

    if(!box) return;


    const query = ($('historySearch')?.value || '')
        .trim()
        .toLowerCase();


    const sold = Array.isArray(current.history)
        ? [...current.history]
            .sort((a,b) => b.timestamp - a.timestamp)
            .filter(x =>
                !query ||
                x.name.toLowerCase().includes(query)
            )
        : [];


    box.innerHTML = sold.length

        ? sold.map(x => `

            <div
                class="history-row"
                style="cursor:pointer"
                onclick="undoPurchase('${x.timestamp}')">

                <div>

                    <div class="name">
                        ${esc(x.name)}
                    </div>

                    <div class="meta">
                        ${esc(x.teamName)}
                        ·
                        ${x.role}
                        ${
                            x.realTeam
                            ? ' · ' + esc(x.realTeam)
                            : ''
                        }
                    </div>

                </div>

                <div style="text-align:right">

                    <strong>
                        ${x.price}
                    </strong>

                    <div class="small muted">
                        Tocca per annullare
                    </div>

                </div>

            </div>

        `).join('')

        : '<div class="empty">Nessun giocatore trovato nello storico.</div>';

}


function undoLastPurchase(){

    if(!Array.isArray(current.history) || !current.history.length){

        return alert('Non ci sono acquisti da annullare.');

    }


    const last = [...current.history]
        .sort((a,b) => b.timestamp - a.timestamp)[0];


    undoPurchase(last.timestamp);

}


function undoPurchase(timestamp){

    if(!Array.isArray(current.history)) return;


    const purchase = current.history.find(
        x => String(x.timestamp) === String(timestamp)
    );


    if(!purchase){

        return alert('Acquisto non trovato.');

    }


    if(!confirm(
        'Vuoi annullare questo acquisto?\n\n' +
        purchase.name + ' — ' + purchase.teamName +
        ' — ' + purchase.price + ' crediti'
    )){

        return;

    }


    const team = current.teams.find(
        t => t.id === purchase.teamId
    );


    if(!team){

        return alert('Squadra non trovata.');

    }


    const playerIndex = team.players.findIndex(
        p => p.id == purchase.playerId
    );


    if(playerIndex >= 0){

        team.players.splice(playerIndex,1);

    }


    team.spent = Math.max(
        0,
        team.spent - purchase.price
    );


    current.history = current.history.filter(
        x => x !== purchase
    );


    persist();

    renderHistoryList();

}


/* =========================
   PULIZIA RICERCA
========================= */

function clearSearch(){

    const q = $('q');

    const results = $('results');


    if(q){

        q.value = '';

    }


    if(results){

        results.innerHTML = '';

    }

}



/* =========================
   MODIFICA ACQUISTO
========================= */

function editPurchase(id){

    let old =
        current.teams.find(
            t => t.players.some(
                p => p.id == id
            )
        );


    let rec =
        old.players.find(
            p => p.id == id
        );



    openModal(`


        <div class="h2">

            ✏️ Modifica acquisto

        </div>


        <div class="small muted">

            ${esc(rec.name)}

        </div>



        <label>
            Squadra acquirente
        </label>


        <select id="buyer">

            ${current.teams.map(t => `

                <option
                    value="${t.id}"
                    ${t.id === old.id ? 'selected' : ''}>

                    ${esc(t.name)}

                </option>

            `).join('')}

        </select>



        <label>
            Prezzo di acquisto
        </label>


        <input
            id="price"
            type="number"
            min="1"
            value="${rec.price}">



        <button
            class="btn primary"
            style="width:100%;margin-top:12px"
            onclick="savePurchaseEdit(${id},${old.id})">

            Salva modifica

        </button>



        <button
            class="btn danger"
            style="width:100%;margin-top:8px"
            onclick="removePurchase(${id},${old.id})">

            Elimina acquisto

        </button>



        <button
            class="btn secondary"
            style="width:100%;margin-top:8px"
            onclick="closeModal()">

            Annulla

        </button>


    `);

}



/* =========================
   SALVA MODIFICA
========================= */

function savePurchaseEdit(id,oldId){

    let old =
        current.teams.find(
            t => t.id === oldId
        );


    let i =
        old.players.findIndex(
            p => p.id == id
        );


    let rec =
        old.players[i];


    let neu =
        current.teams.find(
            t => t.id === +$('buyer').value
        );


    let price =
        +$('price').value;



    if(!price || price < 1){

        return alert(
            'Prezzo non valido.'
        );

    }



    /*
       Calcoliamo il credito disponibile
       tenendo conto del vecchio acquisto.
    */

    let available =
        spendableBudget(neu);


    if(neu.id === old.id){

        available += rec.price;

    }


    if(price > available){

        return alert(
            `Puoi spendere al massimo ${available} crediti, così la squadra potrà comunque completare la rosa.`
        );

    }



    /* Rimuove vecchio acquisto */

    old.spent -= rec.price;

    old.players.splice(i,1);



    /* Aggiorna */

    rec.price = price;



    /* Inserisce nella nuova squadra */

    neu.players.push(rec);

    neu.spent += price;



    persist();


    closeModal();

}



/* =========================
   ELIMINA ACQUISTO
========================= */

function removePurchase(id,tid){

    let t =
        current.teams.find(
            t => t.id === tid
        );


    let i =
        t.players.findIndex(
            p => p.id == id
        );


    if(i >= 0){

        t.spent -=
            t.players[i].price;


        t.players.splice(i,1);


        persist();

    }


    closeModal();

}



/* =========================
   OBIETTIVI - RUOLO
========================= */

function setRole(r,el){

    objRole = r;


    document
        .querySelectorAll('#objectives .chip')
        .forEach(x =>
            x.classList.remove('active')
        );


    el.classList.add('active');


    renderObjectives();

}



/* =========================
   OBIETTIVI - DISPONIBILITÀ
========================= */

function setObjectiveStatus(status,el){

    objStatus = status;


    document
        .querySelectorAll('.objective-tab')
        .forEach(x =>
            x.classList.remove('active')
        );


    el.classList.add('active');


    renderObjectives();

}



/* =========================
   MODIFICA OBIETTIVI
========================= */

function editObjectives(){

    openModal(`


        <div class="h2">

            🎯 Imposta obiettivi

        </div>


        <div class="small muted">

            Tocca ☆ per aggiungere
            o ★ per togliere un obiettivo.

        </div>



        <div
            class="chips"
            style="margin-top:12px">


            <button
                class="chip active"
                onclick="setupRole('P',this)">
                P
            </button>


            <button
                class="chip"
                onclick="setupRole('D',this)">
                D
            </button>


            <button
                class="chip"
                onclick="setupRole('C',this)">
                C
            </button>


            <button
                class="chip"
                onclick="setupRole('A',this)">
                A
            </button>


        </div>



        <label>
            Cerca
        </label>


        <input
            id="oq"
            placeholder="Nome calciatore…"
            oninput="renderSetup()">



        <div id="setupList"></div>



        <button
            class="btn primary"
            style="width:100%;margin-top:12px"
            onclick="closeModal()">

            Fatto

        </button>


    `);



    window.setupR = 'P';


    renderSetup();

}



function setupRole(r,el){

    window.setupR = r;


    document
        .querySelectorAll('.sheet .chip')
        .forEach(x =>
            x.classList.remove('active')
        );


    el.classList.add('active');


    renderSetup();

}



function renderSetup(){

    let q =
        ($('oq')?.value || '')
        .toLowerCase();


    let r =
        window.setupR || 'P';


    let arr =
        PLAYERS
        .filter(p =>
            p.role === r &&
            (
                !q ||
                p.name
                .toLowerCase()
                .includes(q)
            )
        )
        .slice(0,100);



    $('setupList').innerHTML =
        arr.map(p => `

            <div
                class="result"
                onclick="toggleObjective(${p.id})">


                <div class="head">


                    <div>

                        <div class="name">

                            ${esc(p.name)}

                        </div>


                        <div class="meta">

                            ${esc(p.team)}
                            ·
                            Appetibilità:
                            ${p.appeal ?? '—'}

                        </div>

                    </div>


                    <div style="font-size:25px">

                        ${
                            current.objectives.includes(p.id)

                            ? '★'

                            : '☆'
                        }

                    </div>


                </div>

            </div>

        `).join('');

}



/* =========================
   AGGIUNGI / TOGLI OBIETTIVO
========================= */

function toggleObjective(id){

    let i =
        current.objectives.indexOf(id);


    if(i < 0){

        current.objectives.push(id);

    }

    else{

        current.objectives.splice(i,1);

    }


    /* Salva senza ridisegnare tutta l'app:
       così la finestra "Imposta obiettivi" resta aperta. */

    localStorage.setItem(
        'AF_DB',
        JSON.stringify(db)
    );

    localStorage.setItem(
        'AF_CURRENT',
        JSON.stringify(current)
    );


    /* Aggiorna subito la lista degli obiettivi visibile,
       senza chiudere la finestra di selezione. */

    renderSetup();

    if(typeof renderObjectives === 'function'){
        renderObjectives();
    }

}



/* =========================
   PRIORITÀ OBIETTIVI
========================= */

const PRIORITIES = {
    max:  { icon:'🔥', label:'Priorità massima', order:3 },
    high: { icon:'⭐', label:'Priorità alta', order:2 },
    low:  { icon:'👍', label:'Interessante', order:1 }
};

function objectivePriority(id){
    if(!current.objectivePriorities) current.objectivePriorities = {};
    return current.objectivePriorities[id] || 'low';
}

function cycleObjectivePriority(id,event){
    if(event) event.stopPropagation();
    if(!current.objectivePriorities) current.objectivePriorities = {};
    const next={low:'high',high:'max',max:'low'};
    current.objectivePriorities[id]=next[objectivePriority(id)];
    persist();
    renderObjectives();
}

/* =========================
   LISTA OBIETTIVI
========================= */

function renderObjectives(){

    if(!current) return;


    let sold = new Set();


    current.teams.forEach(t => {

        t.players.forEach(p => {

            sold.add(p.id);

        });

    });



    let arr =
        PLAYERS
        .filter(p =>
            p.role === objRole &&
            current.objectives.includes(p.id) &&
            (
                objStatus === 'available'
                    ? !sold.has(p.id)
                    : sold.has(p.id)
            )
        )
        .sort((a,b) => {
            const pa = PRIORITIES[objectivePriority(a.id)].order;
            const pb = PRIORITIES[objectivePriority(b.id)].order;
            if(pb !== pa) return pb - pa;
            return (b.appeal ?? -1) - (a.appeal ?? -1);
        });



    $('objList').innerHTML =
        arr.length

        ? arr.map(p => `

            <div
                class="result"
                onclick="openPlayer(${p.id}, 'objectives')">


                <div class="head">


                    <div>

                        <div class="name">

                            ${esc(p.name)}

                        </div>


                        <div class="meta">

                            ${esc(p.team)}
                            ·

                            ${
                                sold.has(p.id)

                                ? `
                                    <span class="tag">
                                        Non disponibile
                                    </span>
                                  `

                                : `
                                    <span class="tag avail">
                                        Disponibile
                                    </span>
                                  `
                            }

                        </div>

                    </div>


                    <div
                        class="objective-priority"
                        onclick="cycleObjectivePriority(${p.id}, event)"
                        title="Tocca per cambiare priorità">

                        <span>
                            ${PRIORITIES[objectivePriority(p.id)].icon}
                        </span>

                        <small>
                            ${PRIORITIES[objectivePriority(p.id)].label}
                        </small>

                    </div>


                </div>

            </div>

        `).join('')


        : `

            <div class="empty">

                ${objStatus === 'available'
                    ? 'Nessun obiettivo disponibile.'
                    : 'Nessun obiettivo non disponibile.'}

            </div>

        `;

}



/* =========================
   APRI ASTA DALL'ARCHIVIO
========================= */

function openSaved(id){

    let auction =
        db.find(x => x.id === id);


    if(!auction) return;


    current = auction;


    persist();


    go('auction');

}



/* =========================
   ELIMINA ASTA
========================= */

function deleteAuction(id){

    let a =
        db.find(x => x.id === id);


    if(!a) return;


    if(
        !confirm(
            `Eliminare definitivamente l'asta "${a.name}"?\n\n` +
            `Saranno eliminati anche tutti gli acquisti e gli obiettivi salvati in quella asta.`
        )
    ){

        return;

    }



    db =
        db.filter(x => x.id !== id);



    if(
        current &&
        current.id === id
    ){

        current =
            db.length
            ? db[0]
            : null;

    }


    persist();

}



/* =========================
   ARCHIVIO
========================= */

function renderArchive(){

    $('archiveList').innerHTML =
        db.length

        ? db.map(a => `

            <div class="card">


                <div class="head">


                    <div>

                        <div
                            class="h2"
                            style="margin:0">

                            ${esc(a.name)}

                        </div>


                        <div class="meta">

                            ${a.date}
                            ·
                            ${a.teams.length} squadre
                            ·
                            ${a.initialCredits} crediti

                        </div>

                    </div>



                    <div
                        style="display:flex;gap:7px">


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


        : `

            <div class="empty">

                Nessuna asta salvata.

            </div>

        `;

}



/* =========================
   AVVIO APP
========================= */

render();

checkListoneVersion();


/* =========================
   CONTROLLO AGGIORNAMENTO LISTONE
========================= */

async function checkListoneVersion(){

    try{

        const res = await fetch(
            `./listone-version.json?ts=${Date.now()}`,
            { cache:'no-store' }
        );

        if(!res.ok) return;

        const info = await res.json();

        const version = String(
            info.version || ''
        );

        if(!version) return;

        const key = 'AF_LISTONE_VERSION';

        const previous = localStorage.getItem(key);


        /* Primo avvio: memorizza la versione senza disturbare */

        if(!previous){

            localStorage.setItem(key, version);

            return;

        }


        /* Nuovo listone disponibile */

        if(previous !== version){

            localStorage.setItem(key, version);

            alert(
                'È disponibile un nuovo Listone.\n\n' +
                'L’app verrà aggiornata mantenendo tutte le tue aste, gli acquisti e gli obiettivi salvati.'
            );

            window.location.reload();

        }

    }

    catch(e){

        /* Offline o controllo non disponibile: l'app continua normalmente */

    }

}


/* SERVICE WORKER */

if("serviceWorker" in navigator){

    navigator
        .serviceWorker
        .register("./sw.js")
        .catch(() => {});

}
