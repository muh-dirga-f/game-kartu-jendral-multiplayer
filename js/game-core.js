// ═══════════════════════════════════════════
//  APP MODE / SHARED HELPERS
// ═══════════════════════════════════════════
window.APP_MODE = "single";
window.__SILENT_MULTIPLAYER_SYNC__ = false;

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════
//  MODALS & AUDIO ENGINE
// ═══════════════════════════════════════════
document.getElementById('rules-btn').onclick = () => { document.getElementById('rules-modal').style.display = 'flex'; };
document.getElementById('close-rules-btn').onclick = () => { document.getElementById('rules-modal').style.display = 'none'; };

document.getElementById('ingame-restart-btn').onclick = () => {
    sfx.select();
    document.getElementById('confirm-modal').style.display = 'flex';
};
document.getElementById('confirm-no').onclick = () => {
    sfx.unselect();
    document.getElementById('confirm-modal').style.display = 'none';
};
document.getElementById('confirm-yes').onclick = () => {
    sfx.select();
    document.getElementById('confirm-modal').style.display = 'none';
    startNewRound();
};

const CustomAudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

const sfx = {
    playTone: (freq, type, duration, vol=0.1) => {
        if(!audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + duration);
        } catch (e) {} 
    },
    hover: () => sfx.playTone(600, 'sine', 0.1, 0.05),
    select: () => { sfx.playTone(800, 'sine', 0.05, 0.1); setTimeout(()=>sfx.playTone(1200, 'sine', 0.1, 0.1), 50); },
    unselect: () => { sfx.playTone(600, 'sine', 0.05, 0.1); setTimeout(()=>sfx.playTone(400, 'sine', 0.1, 0.1), 50); },
    playCard: () => { sfx.playTone(150, 'triangle', 0.15, 0.3); setTimeout(()=>sfx.playTone(100, 'square', 0.2, 0.2), 50); },
    dealCard: () => sfx.playTone(700, 'triangle', 0.03, 0.02),
    turnChange: () => sfx.playTone(1000, 'sine', 0.3, 0.1),
    error: () => { sfx.playTone(200, 'sawtooth', 0.1, 0.2); setTimeout(()=>sfx.playTone(150, 'sawtooth', 0.2, 0.2), 100); },
    gameover: () => { sfx.playTone(400, 'sine', 0.2, 0.2); setTimeout(()=>sfx.playTone(600, 'sine', 0.2, 0.2), 200); setTimeout(()=>sfx.playTone(800, 'sine', 0.5, 0.2), 400); },
    bgmLoop: () => {
        if(!audioCtx) return;
        const notes = [261.63, 311.13, 392.00, 466.16]; 
        setInterval(() => {
            if(Math.random() > 0.3) {
                const note = notes[Math.floor(Math.random() * notes.length)];
                sfx.playTone(note, 'sine', 0.5, 0.03);
            }
        }, 500);
    }
};

// ═══════════════════════════════════════════
//  3D ENGINE & SCENE
// ═══════════════════════════════════════════
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050b14); 
scene.fog = new THREE.FogExp2(0x050b14, 0.015);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, 19, 16);
camera.lookAt(0, -1, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.6); scene.add(ambient);
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); hemiLight.position.set(0, 20, 0); scene.add(hemiLight);
const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(10, 20, 10); sun.castShadow = true; scene.add(sun);
const fillLight = new THREE.DirectionalLight(0xaabbff, 0.8); fillLight.position.set(-10, 10, -10); scene.add(fillLight);

const tableMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.9, metalness: 0.1 });
const table = new THREE.Mesh(new THREE.CylinderGeometry(10, 10.5, 0.8, 64), tableMat);
table.receiveShadow = true;
scene.add(table);

const particlesGeo = new THREE.BufferGeometry();
const particlesCount = 800;
const posArray = new Float32Array(particlesCount * 3);
for(let i = 0; i < particlesCount * 3; i++) { posArray[i] = (Math.random() - 0.5) * 40; }
particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMat = new THREE.PointsMaterial({ size: 0.08, color: 0x38bdf8, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
scene.add(particlesMesh);

renderer.render(scene, camera);

// ═══════════════════════════════════════════
//  GAME DATA & UTILS
// ═══════════════════════════════════════════
const SUITS = [
    {key:'club', label:'♣', red:false}, {key:'diamond', label:'♦', red:true},
    {key:'heart', label:'♥', red:true}, {key:'spade', label:'♠', red:false}
];
const SUIT_ORDER = { 'club': 1, 'diamond': 2, 'heart': 3, 'spade': 4, 'joker_black': 5, 'joker_red': 6 };

function isBlackCard(suit) { return suit === 'club' || suit === 'spade'; }
function isRedCard(suit) { return suit === 'diamond' || suit === 'heart'; }

function getReadableCard(c) {
    if(c.isJoker) return c.red ? "Joker Merah" : "Joker Hitam";
    const val = {11:'J',12:'Q',13:'K',14:'A',15:'2'}[c.rank] || c.rank;
    const label = {club:'♣', diamond:'♦', heart:'♥', spade:'♠'}[c.suit];
    return `${val}${label}`;
}

function getShortCardName(c) {
    if(c.isJoker) return c.red ? "🃏Merah" : "🃏Hitam";
    const val = {11:'J',12:'Q',13:'K',14:'A',15:'2'}[c.rank] || c.rank;
    const label = {club:'♣', diamond:'♦', heart:'♥', spade:'♠'}[c.suit];
    return `${val}${label}`;
}

function createCardTexture(card) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 360; const ctx = cv.getContext('2d');
    if(card.isJoker) {
        const grd = ctx.createLinearGradient(0,0,0,360);
        grd.addColorStop(0, card.red ? '#fffbeb' : '#f1f5f9'); 
        grd.addColorStop(0.5, card.red ? '#fcd34d' : '#94a3b8');
        grd.addColorStop(1, card.red ? '#b45309' : '#1e293b');
        ctx.fillStyle = grd; ctx.fillRect(0,0,256,360);
        ctx.strokeStyle = card.red ? '#b45309' : '#1e293b';
        ctx.lineWidth = 15;
        ctx.strokeRect(20,20,216,320);
        ctx.fillStyle = card.red ? '#78350f' : '#0f172a';
        ctx.font = 'bold 30px sans-serif'; ctx.textAlign='center'; 
        ctx.fillText(card.red ? 'RED JOKER' : 'BLACK JOKER', 128, 70);
        ctx.fillText(card.red ? 'RED JOKER' : 'BLACK JOKER', 128, 330);
        ctx.font = '220px serif'; ctx.fillText('🃏', 128, 250);
    } else {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 360);
        ctx.fillStyle = card.red ? '#e11d48' : '#0f172a';
        const val = {11:'J',12:'Q',13:'K',14:'A',15:'2'}[card.rank] || card.rank;
        ctx.font = 'bold 85px sans-serif'; ctx.fillText(val, 25, 90);
        ctx.font = '170px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(card.label, 128, 240);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 8; ctx.strokeRect(4,4,248,352);
    return new THREE.CanvasTexture(cv);
}

const BACK_TEX = (()=>{
    const cv = document.createElement('canvas'); cv.width=256; cv.height=360; const ctx = cv.getContext('2d');
    ctx.fillStyle='#0f172a'; ctx.fillRect(0,0,256,360);
    ctx.strokeStyle='#38bdf8'; ctx.lineWidth=10; ctx.strokeRect(15,15,226,330);
    ctx.fillStyle='#38bdf8';
    for(let i=0;i<8;i++) for(let j=0;j<11;j++) { ctx.beginPath(); ctx.arc(35 + i*26, 35 + j*29, 4, 0, Math.PI*2); ctx.fill(); }
    return new THREE.CanvasTexture(cv);
})();

function createAvatar(p) {
    const group = new THREE.Group();
    const armorMat = new THREE.MeshPhysicalMaterial({ color: p.color, metalness: 0.85, roughness: 0.15, clearcoat: 1.0 });
    const darkMat = new THREE.MeshStandardMaterial({color: 0x111115, metalness: 0.9, roughness: 0.3});
    const glowMat = new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: 1.5 });

    const headGroup = new THREE.Group(); headGroup.position.y = 2.0;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.6, 32), darkMat); head.castShadow = true; headGroup.add(head);
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 32, 1, false, -Math.PI/2, Math.PI), glowMat); visor.position.y = 0.05; headGroup.add(visor);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 16, 64), glowMat); halo.rotation.x = Math.PI / 2; halo.position.y = 0.5; headGroup.add(halo);
    group.add(headGroup);

    const bodyGroup = new THREE.Group(); bodyGroup.position.y = 1.0;
    const chest = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.2, 4), armorMat); chest.rotation.y = Math.PI / 4; chest.rotation.x = Math.PI; chest.castShadow = true; bodyGroup.add(chest);
    const coreNode = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), glowMat); coreNode.position.y = -0.65; bodyGroup.add(coreNode);
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.03, 16, 64), darkMat); const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.015, 16, 64), glowMat); bodyGroup.add(ring1, ring2);
    group.add(bodyGroup);

    const handGeo = new THREE.BoxGeometry(0.2, 0.35, 0.25);
    const LHand = new THREE.Mesh(handGeo, darkMat); LHand.position.set(-0.8, 1.1, 0.3); LHand.castShadow = true;
    const RHand = LHand.clone(); RHand.position.x = 0.8; group.add(LHand, RHand);

    const handVisual = new THREE.Group(); handVisual.position.set(0, 0.8, 0.8); group.add(handVisual); p.handVisual = handVisual;

    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xffea00 })); arrow.rotation.x = Math.PI; arrow.position.y = 3.2; arrow.visible = false; group.add(arrow); 
    
    group.userData = { arrow: arrow, headGroup: headGroup, halo: halo, ring1: ring1, ring2: ring2, coreNode: coreNode, hands: [LHand, RHand], offset: Math.random() * 100 };
    group.position.copy(p.pos); group.lookAt(0, 0, 0); scene.add(group); return group;
}

// ═══════════════════════════════════════════
//  GAME STATE & LOGIC
// ═══════════════════════════════════════════
let players = [
    { name: "Anda", color: 0x38bdf8, pos: new THREE.Vector3(0, 0, 8), hand: [], isHuman: true, personality: "human" },
    { name: "AI Budi", color: 0xfbbf24, pos: new THREE.Vector3(9.5, 0, 0), hand: [], isHuman: false, personality: "normal" },
    { name: "AI Sari", color: 0xfb7185, pos: new THREE.Vector3(0, 0, -9.5), hand: [], isHuman: false, personality: "smart" },
    { name: "AI Rama", color: 0x34d399, pos: new THREE.Vector3(-9.5, 0, 0), hand: [], isHuman: false, personality: "aggressive" }
];
const avatars = [];
let gameState = { cur: 0, lastMove: null, winners: [], history: [], tableY: 0.45, groupCounter: 1, passCount: 0 };
let selectedCards = new Set();
let aiTimeout = null;

// ═══════════════════════════════════════════
//  FIX DRAG: State terpusat untuk drag & drop
// ═══════════════════════════════════════════
let draggedCardIdx = null;  // Index kartu yang sedang di-drag
let pendingUIUpdate = false; // Flag: ada update UI yang menunggu setelah dragend

function analyzePlay(cards) {
    if (!cards || cards.length === 0) return { type: 'invalid' };
    if (cards.length === 1) return { type: 'single', card: cards[0], rank: cards[0].rank };
    
    if (cards.length === 3 && cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank && !cards.some(c=>c.isJoker)) return { type: 'tris', rank: cards[0].rank };
    
    if (cards.length === 5 && !cards.some(c=>c.isJoker)) {
        let ranks = {}; cards.forEach(c => ranks[c.rank] = (ranks[c.rank] || 0) + 1);
        let vals = Object.values(ranks);
        if (vals.includes(3) && vals.includes(2)) {
            let trisRank = parseInt(Object.keys(ranks).find(k => ranks[k] === 3));
            let pairRank = parseInt(Object.keys(ranks).find(k => ranks[k] === 2));
            if (pairRank < trisRank) {
                return { type: 'fullhouse', rank: trisRank };
            }
        }
    }
    
    if (cards.length >= 3 && !cards.some(c=>c.isJoker)) {
        let suit = cards[0].suit;
        if (cards.every(c => c.suit === suit)) {
            let sorted = [...cards].sort((a,b) => a.rank - b.rank);
            let isSeq = true;
            for (let i = 0; i < sorted.length - 1; i++) { if (sorted[i+1].rank !== sorted[i].rank + 1) isSeq = false; }
            if (isSeq) return { type: 'seri', rank: sorted[sorted.length-1].rank, length: cards.length, suit: suit };
        }
    }
    return { type: 'invalid' };
}

function sortAndGroup() {
    sfx.playCard(); 
    const hand = players[0].hand;
    hand.forEach(c => delete c.groupId);

    hand.sort((a, b) => {
        if (a.isJoker && !b.isJoker) return 1;
        if (!a.isJoker && b.isJoker) return -1;
        if (a.isJoker && b.isJoker) return a.suit === 'joker_red' ? 1 : -1;
        if (a.suit !== b.suit) return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
        return a.rank - b.rank;
    });

    const suits = ['club', 'diamond', 'heart', 'spade'];
    suits.forEach(suit => {
        let suitCards = hand.filter(c => !c.groupId && c.suit === suit && !c.isJoker);
        let series = [];
        for(let i=0; i<suitCards.length; i++) {
            if(series.length === 0) series.push(suitCards[i]);
            else {
                if(suitCards[i].rank === series[series.length-1].rank + 1) series.push(suitCards[i]);
                else if (suitCards[i].rank !== series[series.length-1].rank) {
                    if(series.length >= 3) { series.forEach(c => c.groupId = `seri_${gameState.groupCounter}`); gameState.groupCounter++; }
                    series = [suitCards[i]];
                }
            }
        }
        if(series.length >= 3) { series.forEach(c => c.groupId = `seri_${gameState.groupCounter}`); gameState.groupCounter++; }
    });

    for(let r=3; r<=15; r++) {
        let matches = hand.filter(c => !c.groupId && c.rank === r && !c.isJoker);
        if(matches.length >= 3) {
            let trisCards = matches.slice(0,3);
            let pairCards = [];
            for(let pr=3; pr<=15; pr++) {
                if(pr < r) {
                    let pairs = hand.filter(c => !c.groupId && c.rank === pr && !c.isJoker);
                    if(pairs.length >= 2) { pairCards = pairs.slice(0,2); break; }
                }
            }
            trisCards.forEach(c => c.groupId = `tris_${gameState.groupCounter}`);
            if(pairCards.length > 0) pairCards.forEach(c => c.groupId = `tris_${gameState.groupCounter}`);
            gameState.groupCounter++;
        }
    }
    selectedCards.clear(); updateUI();
}

function pecahGroup(gid) {
    sfx.unselect(); 
    players[0].hand.forEach(c => { if(c.groupId === gid) delete c.groupId; });
    selectedCards.clear(); updateUI();
}

function updateHandVisuals(idx) {
    try {
        const p = players[idx];
        if (!p) return;

        // Ensure hand is an array
        if (!Array.isArray(p.hand)) p.hand = [];

        // Try to obtain hand visual group
        let g = p.handVisual;
        if (!g && avatars[idx]) {
            // attempt to find a suitable group in avatar children
            const found = avatars[idx].children.find(c => c.type === 'Group' && Math.abs((c.position && c.position.y) - 0.8) < 0.01);
            if (found) {
                g = found;
                p.handVisual = g;
            }
        }
        if (!g) return;

        // Clear existing visuals
        while (g.children && g.children.length > 0) g.remove(g.children[0]);
        if (p.hand.length === 0) return;

        const count = p.hand.length; const arc = Math.PI * 0.4;
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), new THREE.MeshPhysicalMaterial({ map: BACK_TEX, side: THREE.DoubleSide }));
            const angle = (i / (count - 1 || 1) - 0.5) * arc;
            mesh.position.set(Math.sin(angle) * 0.7, Math.cos(angle) * 0.1, i * 0.015);
            mesh.rotation.z = -angle; mesh.castShadow = true; g.add(mesh);
        }
    } catch (err) {
        console.error('updateHandVisuals error:', err);
    }
}

function updateUI() {
    const h = document.getElementById('hand'); h.innerHTML = '';
    const hand = players[0].hand;
    const groups = {}; const singles = [];
    
    hand.forEach((c, index) => {
        const obj = {...c, origIdx: index};
        if(c.groupId) { if(!groups[c.groupId]) groups[c.groupId] = []; groups[c.groupId].push(obj); } 
        else singles.push(obj);
    });

    Object.keys(groups).forEach(gid => {
        if(gid.startsWith('tris_')) {
            let counts = {}; groups[gid].forEach(c => counts[c.rank] = (counts[c.rank] || 0) + 1);
            groups[gid].sort((a,b) => counts[b.rank] - counts[a.rank]);
        }
        const b = document.createElement('div'); b.className = 'bracket';
        let labelTxt = gid.startsWith('seri_') ? "SERI BUNGA" : (groups[gid].length > 3 ? "FULL HOUSE" : "TRIS");
        
        const label = document.createElement('div'); label.className = 'bracket-label'; label.textContent = labelTxt; b.appendChild(label);
        const xBtn = document.createElement('button'); xBtn.className = 'break-btn'; xBtn.innerHTML = 'BONGKAR';
        xBtn.onmouseenter = () => sfx.hover(); xBtn.onclick = (e) => { e.stopPropagation(); pecahGroup(gid); }; b.appendChild(xBtn);
        groups[gid].forEach(c => b.appendChild(createCardDOM(c))); h.appendChild(b);
    });

    singles.forEach(c => h.appendChild(createCardDOM(c)));
    
    // FIX: Tambahkan drag handler pada container #hand agar drop ke area kosong juga bekerja
    h.ondragover = (e) => { e.preventDefault(); };
    h.ondrop = (e) => {
        // Hanya proses jika drop target langsung adalah #hand (bukan kartu)
        if (e.target === h) {
            e.preventDefault();
            if (draggedCardIdx !== null) {
                // Pindah kartu ke akhir tangan
                const hand = players[0].hand;
                delete hand[draggedCardIdx].groupId;
                const movedCard = hand.splice(draggedCardIdx, 1)[0];
                hand.push(movedCard);
                selectedCards.clear();
                pendingUIUpdate = true;
            }
        }
    };

    document.getElementById('stats').innerHTML = players.map(p => 
        `<div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span style="color:${gameState.cur===players.indexOf(p)?'#fbbf24':'#fff'}">${p.name}</span>
            <span style="font-weight:bold">${p.hand.length} Krt</span>
        </div>`
    ).join('');
}

function createCardDOM(c) {
    const d = document.createElement('div');
    const jkr = c.isJoker ? (c.red ? 'joker-red' : 'joker-black') : '';
    d.className = `crd ${c.red?'red':''} ${jkr} ${selectedCards.has(c.origIdx)?'sel':''}`; d.draggable = true;
    const val = c.isJoker ? (c.red?'RED':'BLK') : ({11:'J',12:'Q',13:'K',14:'A',15:'2'}[c.rank]||c.rank);
    d.innerHTML = `<span>${val}</span><span style="font-size:2em;text-align:center">${c.label}</span>`;
    
    d.onmouseenter = () => { if(gameState.cur === 0) sfx.hover(); };
    d.onclick = () => {
        if(gameState.cur !== 0) return;
        if(c.groupId) {
            const groupIdxs = players[0].hand.map((card, i) => card.groupId === c.groupId ? i : -1).filter(i => i !== -1);
            const allSel = groupIdxs.every(i => selectedCards.has(i));
            if(allSel) { groupIdxs.forEach(i => selectedCards.delete(i)); sfx.unselect(); }
            else { groupIdxs.forEach(i => selectedCards.add(i)); sfx.select(); }
        } else {
            if(selectedCards.has(c.origIdx)) { selectedCards.delete(c.origIdx); sfx.unselect(); }
            else { selectedCards.add(c.origIdx); sfx.select(); }
        }
        updateUI();
    };

    // ═══════════════════════════════════════
    // FIX DRAG: Urutan event dijamin: ondrop → ondragend → updateUI()
    // Kunci utama: updateUI() HANYA dipanggil dari ondragend, bukan dari ondrop.
    // Ini mencegah elemen HTML dihancurkan saat browser masih dalam siklus drag,
    // yang menjadi akar penyebab tombol tidak bisa diklik setelah drag.
    // ═══════════════════════════════════════
    d.ondragstart = (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', c.origIdx.toString()); // Wajib untuk Firefox
        draggedCardIdx = c.origIdx;
        setTimeout(() => { d.style.opacity = '0.4'; }, 0);
        sfx.hover();
        document.getElementById('hand').classList.add('drag-active');
    };

    d.ondragend = () => {
        // JANGAN gunakan e.preventDefault() di sini!
        // Itu yang menyebabkan browser tidak mereset state drag dengan benar,
        // sehingga tombol tidak bisa diklik setelah drag selesai.
        d.style.opacity = '1';
        document.getElementById('hand').classList.remove('drag-active');
        draggedCardIdx = null;

        // Sekarang aman untuk rebuild DOM karena siklus drag sudah 100% selesai
        if (pendingUIUpdate) {
            pendingUIUpdate = false;
            updateUI();
        }
    };

    d.ondragenter = (e) => { e.preventDefault(); };
    d.ondragover = (e) => { e.preventDefault(); d.style.outline = '2px solid #fbbf24'; };
    d.ondragleave = () => { d.style.outline = ''; };

    d.ondrop = (e) => {
        e.preventDefault();
        d.style.outline = '';

        // Ambil fromIdx dari memori global (lebih andal dari dataTransfer)
        let fromIdx = draggedCardIdx;
        if (fromIdx === null) {
            const data = e.dataTransfer.getData('text/plain');
            if (data) fromIdx = parseInt(data);
        }

        const toIdx = c.origIdx;

        if (fromIdx !== null && !isNaN(fromIdx) && fromIdx !== toIdx) {
            sfx.playCard();
            const hand = players[0].hand;
            delete hand[fromIdx].groupId;

            const movedCard = hand.splice(fromIdx, 1)[0];
            // Hitung posisi sisipan yang benar setelah splice
            let insertIdx = (fromIdx < toIdx) ? toIdx - 1 : toIdx;
            hand.splice(insertIdx, 0, movedCard);

            selectedCards.clear();

            // FIX: Tandai bahwa UI perlu diperbarui, tapi JANGAN panggil updateUI() di sini.
            // Biarkan ondragend yang memanggilnya setelah siklus drag benar-benar selesai.
            pendingUIUpdate = true;
        }
        // draggedCardIdx akan di-reset oleh ondragend
    };

    return d;
}

function playMove(cards) {
    sfx.playCard(); gameState.passCount = 0; 
    
    const p = players[gameState.cur];
    if(gameState.history.length >= 6) { const oldest = gameState.history.shift(); oldest.forEach(m => scene.remove(m)); }

    const currentGroup = [];
    cards.forEach((card, i) => {
        const mat = new THREE.MeshPhysicalMaterial({ map: createCardTexture(card), side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.3), mat); mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.position.copy(p.pos).add(new THREE.Vector3(0, 2, 0)); scene.add(mesh); currentGroup.push(mesh);

        const rndX = (i * 0.4 - (cards.length-1)*0.2) + (Math.random()-0.5)*0.3; const rndZ = (Math.random()-0.5)*0.3; const rndRot = (Math.random()-0.5)*0.6;
        gameState.tableY += 0.02; const targetPos = new THREE.Vector3(rndX, gameState.tableY, rndZ);
        
        const start = mesh.position.clone(); let t = 0;
        function animCard() {
            t += 0.05; mesh.position.lerpVectors(start, targetPos, t); mesh.position.y += Math.sin(t * Math.PI) * 3; mesh.rotation.x = -Math.PI/2; mesh.rotation.z = t * rndRot;
            if(t < 1) requestAnimationFrame(animCard); else { mesh.position.copy(targetPos); mesh.rotation.z = rndRot; }
        } animCard();
    });

    gameState.history.push(currentGroup); gameState.lastMove = { player: gameState.cur, cards: cards };
    p.hand = p.hand.filter(c => !cards.includes(c)); updateHandVisuals(gameState.cur);
    
    addLog(`${p.name} jalan: ${cards.map(getShortCardName).join(', ')}`, p.isHuman ? "#38bdf8" : "#cbd5e1");

    if(p.hand.length === 0 && !gameState.winners.includes(gameState.cur)) { 
        gameState.winners.push(gameState.cur); addLog(`🏆 ${p.name} Selesai!`, "#fbbf24"); 
    }
    
    gameState.cur = (gameState.cur + 1) % 4; 
    while(gameState.winners.includes(gameState.cur) && gameState.winners.length < 4) { 
        gameState.cur = (gameState.cur + 1) % 4; 
    }
    
    setTimeout(() => { sfx.turnChange(); checkTurn(); }, 1000);
    window.JendralCore && window.JendralCore.notifyStateChange && window.JendralCore.notifyStateChange();
}

function handlePass(playerIdx) {
    sfx.playTone(300, 'sine', 0.1); addLog(`${players[playerIdx].name} Pass`, "#64748b"); gameState.passCount++;
    
    let isLastWinner = gameState.lastMove && gameState.winners.includes(gameState.lastMove.player);
    let activePlayersCount = 4 - gameState.winners.length;
    let requiredPasses = isLastWinner ? activePlayersCount : (activePlayersCount - 1);
    
    if (gameState.passCount >= requiredPasses) { 
        let winnerOfTrick = gameState.lastMove.player;
        gameState.lastMove = null; 
        gameState.passCount = 0; 
        
        gameState.cur = winnerOfTrick;
        while(gameState.winners.includes(gameState.cur) && gameState.winners.length < 4) { 
            gameState.cur = (gameState.cur + 1) % 4; 
        }
        
        if (isLastWinner) {
            addLog(`🌟 Hak Waris Meja jatuh kepada ${players[gameState.cur].name}!`, "#fbbf24");
        } else {
            addLog("Semua Pass. Meja dibersihkan.", "#fbbf24");
        }
        
        setTimeout(() => { sfx.turnChange(); checkTurn(); }, 500);
    window.JendralCore && window.JendralCore.notifyStateChange && window.JendralCore.notifyStateChange();
        return;
    }
    
    gameState.cur = (gameState.cur + 1) % 4; 
    while(gameState.winners.includes(gameState.cur) && gameState.winners.length < 4) { 
        gameState.cur = (gameState.cur + 1) % 4; 
    }
    setTimeout(() => { sfx.turnChange(); checkTurn(); }, 500);
}

function showLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    const medals = ['🥇 Juara 1', '🥈 Juara 2', '🥉 Juara 3', '💀 Kalah (Cangkulan)'];
    
    gameState.winners.forEach((pIdx, rank) => {
        const p = players[pIdx];
        const div = document.createElement('div');
        div.className = `rank-item rank-${rank+1}`;
        div.innerHTML = `<span>${medals[rank]}</span> <span>${p.name}</span>`;
        list.appendChild(div);
    });
    
    document.getElementById('game-over-modal').style.display = 'flex';
    sfx.gameover();
}

function checkTurn() {
    // Defensive: pastikan `gameState` dan `winners` terdefinisi sebelum digunakan
    if (!gameState || typeof gameState !== 'object') {
        gameState = { cur: 0, lastMove: null, winners: [], history: [], tableY: 0.45, groupCounter: 1, passCount: 0 };
    }
    if (!Array.isArray(gameState.winners)) {
        gameState.winners = [];
    }

    if (gameState.winners.length === 3) {
        let loserIdx = players.findIndex((p, i) => !gameState.winners.includes(i));
        if(loserIdx !== -1) {
            gameState.winners.push(loserIdx);
            addLog(`💀 ${players[loserIdx].name} Kalah (Cangkulan)!`, "#ef4444");
        }
    }

    if (gameState.winners.length >= 4) {
        document.getElementById('status').textContent = `Permainan Selesai!`;
        showLeaderboard();
        return;
    }

    updateUI(); 
    avatars.forEach((av, i) => av.userData.arrow.visible = (gameState.cur === i));
    
    if(!players[gameState.cur].isHuman) {
        document.getElementById('status').textContent = `AI ${players[gameState.cur].name} Berpikir...`;
        aiTimeout = setTimeout(aiPlay, 1500);
    } else { document.getElementById('status').textContent = `Giliran Anda!`; }
}

// ═══════════════════════════════════════════
//  MESIN AI
// ═══════════════════════════════════════════
function getValidMoves(hand, lastPlayInfo) {
    let moves = [];
    let ranks = {}; hand.forEach(c => { if(!c.isJoker) { ranks[c.rank] = ranks[c.rank] || []; ranks[c.rank].push(c); }});
    
    if (lastPlayInfo.type === 'single') {
        const lastC = lastPlayInfo.card;
        hand.forEach(c => {
            if (c.isJoker) {
                if (c.suit === 'joker_black' && !lastC.isJoker && isBlackCard(lastC.suit)) moves.push([c]);
                if (c.suit === 'joker_red' && ((!lastC.isJoker && isRedCard(lastC.suit)) || lastC.suit === 'joker_black')) moves.push([c]);
            } else if (!lastC.isJoker) {
                if (c.rank === 15 && lastC.rank === 15 && SUIT_ORDER[c.suit] > SUIT_ORDER[lastC.suit]) moves.push([c]);
                else if (c.suit === lastC.suit && c.rank > lastC.rank) moves.push([c]);
            }
        });
    } else if (lastPlayInfo.type === 'tris') {
        Object.values(ranks).forEach(grp => { if(grp.length >= 3 && grp[0].rank > lastPlayInfo.rank) moves.push(grp.slice(0,3)); });
    } else if (lastPlayInfo.type === 'fullhouse') {
        Object.values(ranks).forEach(trisGrp => {
            if (trisGrp.length >= 3 && trisGrp[0].rank > lastPlayInfo.rank) {
                let pairGrps = Object.values(ranks).filter(g => g.length >= 2 && g[0].rank < trisGrp[0].rank);
                if(pairGrps.length > 0) {
                    pairGrps.sort((a,b) => a[0].rank - b[0].rank); 
                    moves.push([...trisGrp.slice(0,3), ...pairGrps[0].slice(0,2)]); 
                }
            }
        });
    } else if (lastPlayInfo.type === 'seri') {
        const suits = ['club', 'diamond', 'heart', 'spade'];
        suits.forEach(suit => {
            let suitCards = hand.filter(c => c.suit === suit && !c.isJoker).sort((a,b)=>a.rank-b.rank);
            for(let i=0; i<=suitCards.length - lastPlayInfo.length; i++) {
                let series = [suitCards[i]];
                for(let j=1; j<lastPlayInfo.length; j++) {
                    if(suitCards[i+j] && suitCards[i+j].rank === series[series.length-1].rank + 1) series.push(suitCards[i+j]); else break;
                }
                if(series.length === lastPlayInfo.length && series[series.length-1].rank > lastPlayInfo.rank) moves.push(series);
            }
        });
    }
    return moves.sort((a,b) => { let maxA = Math.max(...a.map(c=>c.rank)); let maxB = Math.max(...b.map(c=>c.rank)); return maxA - maxB; });
}

function aiPlay() {
    const p = players[gameState.cur];
    let toPlay = null;
    
    if (gameState.history.length === 0) {
        const threeClub = p.hand.find(c => c.rank === 3 && c.suit === 'club');
        if(threeClub) {
            let ranks = {}; p.hand.forEach(c => { if(!c.isJoker) { ranks[c.rank] = ranks[c.rank] || []; ranks[c.rank].push(c); }});
            if (ranks[3] && ranks[3].length >= 3) toPlay = ranks[3].slice(0,3);
            else toPlay = [threeClub];
            playMove(toPlay); return;
        }
    }

    if (!gameState.lastMove || gameState.lastMove.player === gameState.cur) {
        let singles = p.hand.map(c => [c]).sort((a,b) => a[0].rank - b[0].rank);
        let tris = getValidMoves(p.hand, {type:'tris', rank:0});
        let seris = getValidMoves(p.hand, {type:'seri', rank:0, length:3});
        let fullhouses = getValidMoves(p.hand, {type:'fullhouse', rank:0});

        if (p.personality === 'smart') {
            if (seris.length > 0) toPlay = seris[0];
            else if (fullhouses.length > 0) toPlay = fullhouses[0];
            else if (tris.length > 0) toPlay = tris[0];
            else toPlay = singles[0];
        } else if (p.personality === 'aggressive') {
            if (fullhouses.length > 0 && Math.random() > 0.5) toPlay = fullhouses[fullhouses.length - 1];
            else toPlay = singles[singles.length - 1];
        } else {
            if (fullhouses.length > 0 && Math.random() > 0.4) toPlay = fullhouses[0];
            else toPlay = singles[0];
        }
    } else {
        let validMoves = getValidMoves(p.hand, analyzePlay(gameState.lastMove.cards));
        if(validMoves.length > 0) {
            if (p.personality === 'smart') {
                let move = validMoves[0]; 
                let topRank = Math.max(...move.map(c=>c.rank));
                if((topRank >= 15 || move[0].isJoker) && p.hand.length > 3) {
                    if(Math.random() < 0.7) toPlay = null; 
                    else toPlay = move;
                } else {
                    toPlay = move; 
                }
            } else if (p.personality === 'aggressive') {
                toPlay = validMoves[validMoves.length - 1];
            } else {
                toPlay = validMoves[0];
            }
        }
    }
    
    if(toPlay) playMove(toPlay);
    else handlePass(gameState.cur);
}

// ═══════════════════════════════════════════
//  INIT & DEALING ANIMATION
// ═══════════════════════════════════════════
document.getElementById('start-game-btn').onclick = () => {
    try { if(CustomAudioContext) audioCtx = new CustomAudioContext(); sfx.bgmLoop(); } catch(e) {}
    document.getElementById('start-screen').style.display = 'none'; document.getElementById('ui').style.display = 'block';
    
    if (avatars.length === 0) {
        players.forEach((p) => { avatars.push(createAvatar(p)); });
        anim();
    }
    startNewRound();
};

document.getElementById('restart-btn').onclick = () => {
    sfx.select();
    document.getElementById('game-over-modal').style.display = 'none';
    startNewRound();
};

function startNewRound() {
    if(aiTimeout) clearTimeout(aiTimeout);
    pendingUIUpdate = false;
    draggedCardIdx = null;

    document.getElementById('controls').style.transform = 'translateY(100px)';
    gameState.history.flat().forEach(m => scene.remove(m));
    gameState = { cur: 0, lastMove: null, winners: [], history: [], tableY: 0.45, groupCounter: 1, passCount: 0 };
    selectedCards.clear();
    document.getElementById('log-panel').innerHTML = '';
    document.getElementById('status').textContent = `Dealer Mengocok Kartu...`;
    
    players.forEach(p => { p.hand = []; updateHandVisuals(players.indexOf(p)); });
    document.getElementById('hand').innerHTML = '';
    
    let deck = [];
    for(let r=3; r<=15; r++) SUITS.forEach(s => deck.push({ rank:r, suit:s.key, label:s.label, red:s.red, isJoker:false }));
    deck.push({ rank:16, suit:'joker_black', label:'🃏', red:false, isJoker:true }); 
    deck.push({ rank:17, suit:'joker_red', label:'🃏', red:true, isJoker:true });
    deck.sort(() => Math.random() - 0.5);

    let dealStartIdx = Math.floor(Math.random() * 4);
    
    const tempHands = [[], [], [], []];
    while(deck.length > 0) {
        for(let i=0; i<4; i++) {
            let targetIdx = (dealStartIdx + i) % 4;
            if(deck.length > 0) tempHands[targetIdx].push(deck.pop());
        }
    }

    const totalCards = 54;
    let cardsLanded = 0;

    function shootCard(pIdx, cardData) {
        sfx.dealCard();
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), new THREE.MeshPhysicalMaterial({ map: BACK_TEX, side: THREE.DoubleSide }));
        mesh.position.set(0, 1.5, 0); 
        mesh.castShadow = true;
        scene.add(mesh);

        let targetPos = players[pIdx].pos.clone().add(new THREE.Vector3(0, 1, 0));
        let t = 0;
        let startPos = mesh.position.clone();

        function animateFly() {
            t += 0.15;
            mesh.position.lerpVectors(startPos, targetPos, t);
            mesh.rotation.z += 0.5;
            mesh.rotation.x += 0.2;
            
            if(t < 1) {
                requestAnimationFrame(animateFly);
            } else {
                scene.remove(mesh);
                players[pIdx].hand.push(cardData);
                updateHandVisuals(pIdx);
                cardsLanded++;
                if(cardsLanded === totalCards) { finalizeDealing(); }
            }
        }
        animateFly();
    }

    let delay = 0;
    for(let i=0; i<14; i++) {
        for(let j=0; j<4; j++) {
            let pIdx = (dealStartIdx + j) % 4;
            let cardToDeal = tempHands[pIdx].shift();
            if(cardToDeal) {
                setTimeout(() => shootCard(pIdx, cardToDeal), delay);
                delay += 50;
            }
        }
    }

    function finalizeDealing() {
        players.forEach((p) => {
            p.hand.sort((a, b) => { if (a.suit !== b.suit) return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]; return a.rank - b.rank; });
        });
        
        sortAndGroup();
        document.getElementById('controls').style.transform = 'translateY(0)';
        
        gameState.cur = players.findIndex(p => p.hand.some(c => c.rank === 3 && c.suit === 'club')); 
        if(gameState.cur === -1) gameState.cur = 0;
        
        addLog("Game Mulai (Pembuka: 3♣)", "#10b981"); 
        sfx.turnChange(); 
        checkTurn();
    }
}

function anim() {
    requestAnimationFrame(anim); const time = Date.now() * 0.002; particlesMesh.rotation.y = time * 0.1;
    avatars.forEach((av, i) => {
        const data = av.userData; const t = time + data.offset;
        data.headGroup.position.y = 2.0 + Math.sin(t * 2) * 0.05; data.halo.rotation.z = t; data.halo.rotation.x = Math.PI/2 + Math.sin(t * 3) * 0.1;
        data.ring1.rotation.x = Math.PI / 2 + Math.sin(t) * 0.2; data.ring1.rotation.y = t * 0.5; data.ring2.rotation.x = Math.PI / 2 + Math.cos(t * 1.2) * 0.2; data.ring2.rotation.y = -t * 0.7;
        const scale = 1.0 + Math.sin(t * 5) * 0.15; data.coreNode.scale.set(scale, scale, scale);
        
        if (players[i].hand.length > 0) {
            data.hands[0].position.y = 1.1 + Math.sin(t * 3) * 0.1; data.hands[1].position.y = 1.1 + Math.cos(t * 3) * 0.1;
        } else {
            data.hands[0].position.y = 0.5; data.hands[1].position.y = 0.5; 
        }

        if(data.arrow.visible) { data.arrow.position.y = 3.2 + Math.sin(time * 4) * 0.15; data.arrow.rotation.y += 0.05; }
    });
    renderer.render(scene, camera);
}

function addLog(m, c="#fff") { const l = document.getElementById('log-panel'); const d = document.createElement('div'); d.style.color = c; d.textContent = `> ${m}`; l.prepend(d); }
function showTip(t, c) { sfx.error(); const el = document.getElementById('tip'); el.textContent = t; el.style.color = c; el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 2000); }

document.getElementById('playBtn').onmouseenter = () => sfx.hover();
document.getElementById('playBtn').onclick = () => {
    if(gameState.cur !== 0 || selectedCards.size === 0) return;
    const cards = Array.from(selectedCards).map(idx => players[0].hand[idx]);
    
    if(gameState.history.length === 0) {
        const has3Club = players[0].hand.some(c => c.rank === 3 && c.suit === 'club');
        if (has3Club && !cards.some(c => c.rank === 3 && c.suit === 'club')) { showTip("Wajib keluarkan 3 Keriting!", "#ef4444"); return; }
    }

    const myPlay = analyzePlay(cards); if(myPlay.type === 'invalid') { showTip("Kombinasi kartu tidak valid!", "#ef4444"); return; }

    let ok = false;
    if(!gameState.lastMove || gameState.lastMove.player === 0) { ok = true; } 
    else {
        const lastPlay = analyzePlay(gameState.lastMove.cards);
        if (myPlay.type === lastPlay.type) {
            if (myPlay.type === 'single') {
                const myC = myPlay.card; const lastC = lastPlay.card;
                if (myC.isJoker) {
                    if (myC.suit === 'joker_black') ok = !lastC.isJoker && isBlackCard(lastC.suit);
                    else if (myC.suit === 'joker_red') ok = (!lastC.isJoker && isRedCard(lastC.suit)) || lastC.suit === 'joker_black';
                } else if (!lastC.isJoker) {
                    if (myC.rank === 15 && lastC.rank === 15) ok = SUIT_ORDER[myC.suit] > SUIT_ORDER[lastC.suit];
                    else ok = myC.suit === lastC.suit && myC.rank > lastC.rank;
                }
            } 
            else if (myPlay.type === 'tris' || myPlay.type === 'fullhouse') { ok = myPlay.rank > lastPlay.rank; } 
            else if (myPlay.type === 'seri') { if (myPlay.length === lastPlay.length) ok = myPlay.rank > lastPlay.rank; }
        } else { showTip(`Harus membalas dengan ${lastPlay.type.toUpperCase()}`, "#ef4444"); return; }
    }
    
    if(ok) { selectedCards.clear(); playMove(cards); } else showTip("KARTU TIDAK VALID!", "#ef4444");
};

document.getElementById('passBtn').onmouseenter = () => sfx.hover();
document.getElementById('passBtn').onclick = () => { if(gameState.cur === 0 && gameState.lastMove) { handlePass(0); window.JendralCore && window.JendralCore.notifyStateChange && window.JendralCore.notifyStateChange(); } };
document.getElementById('sortBtn').onmouseenter = () => sfx.hover();
document.getElementById('sortBtn').onclick = () => { sortAndGroup(); window.JendralCore && window.JendralCore.notifyStateChange && window.JendralCore.notifyStateChange(); };

function serializeState() {
    return deepClone({
        players: players.map(p => ({
            name: p.name,
            color: p.color,
            pos: { x: p.pos.x, y: p.pos.y, z: p.pos.z },
            hand: p.hand,
            isHuman: p.isHuman,
            personality: p.personality
        })),
        gameState,
        selectedCards: Array.from(selectedCards),
        ui: {
            status: document.getElementById('status').textContent,
            controlsVisible: document.getElementById('controls').style.transform !== 'translateY(100px)'
        }
    });
}

function restoreState(snapshot, uids) {
    if (!snapshot || !snapshot.players || !snapshot.gameState) return;
    // Unwrap if caller passed { state, uids }
    let payload = snapshot;
    if (snapshot.state && snapshot.uids) {
        payload = snapshot.state;
        uids = snapshot.uids;
    }

    window.__SILENT_MULTIPLAYER_SYNC__ = true;
    try {
        // Recreate players array from payload
        let incomingPlayers = (payload.players || []).map((p) => ({
            ...p,
            pos: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z),
            hand: p.hand || []
        }));

        // Ensure default gameState structure
        const defaultGameState = { cur: 0, lastMove: null, winners: [], history: [], tableY: 0.45, groupCounter: 1, passCount: 0 };
        let incomingGameState = Object.assign({}, defaultGameState, payload.gameState || {});
        if (!Array.isArray(incomingGameState.winners)) incomingGameState.winners = [];

        // If we have UID ordering, rotate players so local user becomes index 0
        let localIdx = -1;
        if (Array.isArray(uids) && window.CURRENT_USER_UID) {
            const n = incomingPlayers.length;
            localIdx = uids.indexOf(window.CURRENT_USER_UID);
            if (localIdx > 0 && n > 0) {
                // Rotate players array
                const rotated = incomingPlayers.slice(localIdx).concat(incomingPlayers.slice(0, localIdx));
                incomingPlayers = rotated;

                // Adjust current turn index and winners indices
                incomingGameState.cur = ((incomingGameState.cur - localIdx) % n + n) % n;
                incomingGameState.winners = (incomingGameState.winners || []).map(w => ((w - localIdx) % n + n) % n);
            }
            // If localIdx === -1, client is a spectator; do not rotate.
        }

        // Assign final players and gameState
        players = incomingPlayers;

        // If this client is a participant, mark index 0 as human
        if (localIdx >= 0) {
            players.forEach((p, i) => p.isHuman = (i === 0));
        }

        gameState = incomingGameState;

        // Clear selected cards on multiplayer restore (local selection shouldn't be synced)
        selectedCards = new Set();

        // Rebuild avatars to match players
        try {
            avatars.forEach(av => { if (av && av.parent) scene.remove(av); });
        } catch (e) {}
        avatars.length = 0;
        players.forEach(p => avatars.push(createAvatar(p)));

        // Update visuals
        updateUI();
        for (let i = 0; i < players.length; i++) updateHandVisuals(i);
        avatars.forEach((av, i) => { if (av && av.userData && av.userData.arrow) av.userData.arrow.visible = (gameState.cur === i); });
        checkTurn();
    } finally {
        window.__SILENT_MULTIPLAYER_SYNC__ = false;
    }
}

window.JendralCore = {
    startNewRound,
    sortAndGroup,
    pecahGroup,
    analyzePlay,
    getValidMoves,
    playMove,
    handlePass,
    checkTurn,
    updateUI,
    addLog,
    showTip,
    serializeState,
    restoreState,
    notifyStateChange: function() {
        if (window.__SILENT_MULTIPLAYER_SYNC__) return;
        window.dispatchEvent(new CustomEvent('jendral:state-change', { detail: serializeState() }));
    }
};

window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });