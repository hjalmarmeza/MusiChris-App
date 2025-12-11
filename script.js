/**
 * MusiChris App V35.0 - SHARE FIX & IPHONE BYPASS
 * - Fix Login Eye CSS (estaba en style.css).
 * - Fix Modal Scroll (estaba en style.css).
 * - Deep Linking: ?s=ID abre la canción.
 * - iPhone Bypass: Botón "Reproducir Compartida" tras login.
 */

const API_BASE_URL = "https://api.jsonbin.io/v3/b/";
const DEFAULT_COVER = "https://i.ibb.co/3WqP7tX/default-cover.png";
const PERMANENT_BIN_ID = "69349a76ae596e708f880e31"; 
const PERMANENT_API_KEY = "$2a$10$ME7fO8Oqq2iWhHkYQKGQsu0M6PqJ8d1ymFBxHVhhxFJ70BcAg1FZe";
const ADMIN_AVATAR = "https://api.dicebear.com/9.x/avataaars/svg?seed=Chris"; 

let appConfig = {
    BIN_ID: PERMANENT_BIN_ID, API_KEY: PERMANENT_API_KEY,
    data: null, user: null, isLoggedIn: false, isAdmin: false, currentSong: null,
    tempPlaylist: [], editingAlbumIndex: null, pendingSongId: null
};

const dom = {};
const norm = (str) => (str || '').toString().toLowerCase().trim().replace(/\s+/g, ' '); 

document.addEventListener('DOMContentLoaded', () => {
    // CAPTURAR CANCIÓN COMPARTIDA DE LA URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('s');
    if(sharedId) appConfig.pendingSongId = parseInt(sharedId);

    const ids = [
        'view-login', 'view-admin', 'view-user', 'loginEmail', 'loginPass', 'btnLoginBtn', 
        'audioElement', 'customToast', 'statsTotalSongs', 'statsTotalUsers', 'adminAvatar', 
        'adminNameDisplay', 'userAvatarImg', 'userGreeting', 'mainPlayer', 'pTitle', 
        'pArtist', 'pCover', 'iconPlay', 'btnTogglePass', 'dom_modal_pl_detail', 
        'plDetailTitle', 'plDetailList', 'dom_modal_profile', 'profileName', 'profileEmail', 'profilePreview',
        'dom_modal_upload', 'upTitle', 'upGenre', 'upAlbum', 'upUrl', 
        'dom_modal_album', 'newAlbName', 'newAlbArtist', 'newAlbCoverUrl',
        'dom_modal_settings', 'cfgBinId', 'cfgApiKey',
        'dom_modal_announcement', 'announcementInput', 'userAnnouncement', 'announcementText',
        'dom_modal_edit_album', 'editAlbName', 'editAlbArtist', 'editAlbCover',
        'dom_modal_date_filter', 'filterStart', 'filterEnd',
        'view-guest-player', 'guestTitle', 'guestArtist', 'guestCover', 'iconPlayBig', 'pLikeBtn', 'guestLikeBtn',
        'adminPlaylistGrid', 'userPlaylistGrid'
    ];
    ids.forEach(id => { const el = document.getElementById(id); if(el) dom[id] = el; });

    if (dom.mainPlayer) dom.mainPlayer.style.display = 'none';

    if (dom.btnLoginBtn) dom.btnLoginBtn.addEventListener('click', handleLoginAttempt);
    if (dom.btnTogglePass) dom.btnTogglePass.addEventListener('click', () => {
        const p = dom.loginPass; p.type = p.type === "password" ? "text" : "password";
        dom.btnTogglePass.textContent = p.type === "password" ? "visibility_off" : "visibility";
        // Cambio de color para feedback visual
        dom.btnTogglePass.style.color = p.type === "text" ? "var(--accent)" : "#888"; 
    });
    
    if (dom.audioElement) {
        dom.audioElement.addEventListener('play', () => togglePlayIcon(true));
        dom.audioElement.addEventListener('pause', () => togglePlayIcon(false));
    }
    
    appConfig.BIN_ID = PERMANENT_BIN_ID;
    appConfig.API_KEY = PERMANENT_API_KEY;
    loadConfig();
});

function showToast(msg, type = 'info') {
    const t = document.getElementById('customToast');
    if(t) { t.textContent = msg; t.className = `customToast show ${type}`; setTimeout(() => t.className = t.className.replace(" show",""), 3000); }
}

function getArt(item) {
    if (!item) return DEFAULT_COVER;
    return item.cover || item.img || item.image || item.coverUrl || DEFAULT_COVER;
}

function getSongArt(song) {
    let art = song.cover || song.img || song.image;
    if (art) return art;
    if (song.album && appConfig.data && appConfig.data.albums) {
        const target = norm(song.album);
        const album = appConfig.data.albums.find(a => norm(a.title || a.name).includes(target) || target.includes(norm(a.title || a.name)));
        if (album) return getArt(album);
    }
    return DEFAULT_COVER;
}

function showView(viewId) {
    ['view-login','view-admin','view-user','view-guest-player'].forEach(id => {
        const el = document.getElementById(id); if(el) { el.style.display='none'; el.classList.remove('active'); }
    });
    const t = document.getElementById(viewId);
    if(t) { 
        t.style.display = (viewId === 'view-login' || viewId === 'view-guest-player') ? 'flex' : 'block'; 
        setTimeout(()=>t.classList.add('active'),10); 
    }
}

async function loadAppData() {
    try {
        const res = await fetch(`${API_BASE_URL}${PERMANENT_BIN_ID}`, { headers: {'X-Master-Key': PERMANENT_API_KEY} });
        if(!res.ok) throw new Error("API Error");
        const json = await res.json();
        appConfig.data = json.record;
        
        if(!appConfig.data.songs) appConfig.data.songs = [];
        if(!appConfig.data.users) appConfig.data.users = [];
        if(!appConfig.data.albums) appConfig.data.albums = [];
        appConfig.data.songs.forEach(s => { if(!s.likes) s.likes = []; if(!s.plays) s.plays = 0; });

        updateUI();

        // ** CHEQUEO DE CANCIÓN COMPARTIDA AL CARGAR DATOS **
        if(appConfig.pendingSongId) {
            checkPendingShare();
        }

    } catch(e) { console.error(e); showToast("Conectando...", 'info'); }
}

function checkPendingShare() {
    const song = appConfig.data.songs.find(s => s.id === appConfig.pendingSongId);
    if(song) {
        // En lugar de autoplay (que falla en iPhone), mostramos un Modal de confirmación
        // Reutilizamos el modal de detalles para mostrar "Canción Compartida"
        const modal = dom.dom_modal_pl_detail; 
        if(modal) {
            if(dom.plDetailTitle) dom.plDetailTitle.textContent = "Canción Compartida 🎵";
            const list = dom.plDetailList; 
            list.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <div style="width:100px; height:100px; background-image:url('${getSongArt(song)}'); background-size:cover; border-radius:15px; margin:0 auto 15px auto;"></div>
                    <h3>${song.title}</h3>
                    <p style="color:#aaa">${song.genre}</p>
                    <button class="btn-submit" onclick="playSharedAndClose(${song.id})">REPRODUCIR AHORA</button>
                </div>
            `;
            modal.style.display = 'flex';
        }
        appConfig.pendingSongId = null; // Limpiar
    }
}

// Helper para el botón del modal compartido
window.playSharedAndClose = (id) => {
    playSongId(id);
    closeModal('dom_modal_pl_detail');
}

function updateUI(songListOverride = null) {
    if(dom.statsTotalSongs && appConfig.data) dom.statsTotalSongs.textContent = appConfig.data.songs.length;
    if(dom.statsTotalUsers && appConfig.data) dom.statsTotalUsers.textContent = appConfig.data.users.length;
    
    const songsToShow = songListOverride || appConfig.data.songs;

    renderSongList(appConfig.isAdmin ? 'adminSongList' : 'userSongList', songsToShow);
    renderAlbumGrid(appConfig.isAdmin ? 'adminAlbumGrid' : 'userAlbumGrid', appConfig.data.albums);
    renderSmartPlaylists(appConfig.isAdmin ? 'adminPlaylistGrid' : 'userPlaylistGrid');
    if(appConfig.isAdmin) renderUserList('usersListGrid', appConfig.data.users);
    
    const avatar = appConfig.user?.avatar || ADMIN_AVATAR;
    if(dom.adminAvatar) dom.adminAvatar.src = avatar;
    if(dom.userAvatarImg) dom.userAvatarImg.src = avatar;
    if(dom.adminNameDisplay) dom.adminNameDisplay.textContent = appConfig.user?.name || 'Admin';
    if(dom.userGreeting) dom.userGreeting.textContent = `Hola, ${appConfig.user?.name || 'Usuario'}`;

    if(dom.userAnnouncement && dom.announcementText && appConfig.data.announcement) {
        dom.userAnnouncement.style.display = 'block';
        dom.announcementText.textContent = appConfig.data.announcement;
    } else if (dom.userAnnouncement) dom.userAnnouncement.style.display = 'none';
}

function renderSongList(id, songs) {
    const c = document.getElementById(id); if(!c) return; c.innerHTML = '';
    if(songs.length === 0) { c.innerHTML = '<div style="text-align:center;padding:20px;color:#666">No hay canciones</div>'; return; }
    songs.forEach((s) => { 
        const div = document.createElement('div'); div.className = 'song-list-item';
        const art = getSongArt(s);
        let deleteBtn = '';
        if(appConfig.isAdmin) deleteBtn = `<button class="btn-list-action" style="background:rgba(255,71,87,0.2);color:#ff4757" onclick="deleteSong(event, ${s.id})"><span class="material-icons-round">delete</span></button>`;
        div.innerHTML = `<div class="song-cover" style="background-image: url('${art}')"></div><div class="song-info"><div class="song-title">${s.title || 'Sin Título'}</div><div class="song-artist">${s.genre || s.album || 'General'}</div></div><div class="song-actions"><button class="btn-list-action" onclick="playSongId(${s.id})"><span class="material-icons-round">play_arrow</span></button>${deleteBtn}</div>`;
        div.onclick = (e) => { if(e.target.tagName === 'BUTTON' || e.target.closest('button')) return; playSong(s); };
        c.appendChild(div);
    });
}

function renderAlbumGrid(id, albums) {
    const c = document.getElementById(id); if(!c) return; c.innerHTML = '';
    albums.forEach((a, index) => {
        const div = document.createElement('div'); div.className = 'collection-card';
        const art = getArt(a);
        const name = a.title || a.name || 'Álbum';
        let adminBtns = '';
        if(appConfig.isAdmin) adminBtns = `<div style="display:flex; justify-content:center; gap:10px; margin-top:5px; z-index:10; position:relative"><button class="btn-icon" style="width:25px;height:25px;background:#333;border-radius:50%;border:none;color:white" onclick="editAlbum(event, ${index})">✏️</button><button class="btn-icon" style="width:25px;height:25px;background:#ff4757;border-radius:50%;border:none;color:white" onclick="deleteAlbum(event, ${index})">🗑️</button></div>`;
        div.innerHTML = `<div class="collection-cover" style="background-image: url('${art}')"></div><h4>${name}</h4><p>${a.artist || 'Varios'}</p>${adminBtns}`;
        div.onclick = (e) => { if(e.target.tagName === 'BUTTON') return; openAlbumDetail(a); };
        c.appendChild(div);
    });
}

function openAlbumDetail(album) {
    const modal = dom.dom_modal_pl_detail; if(!modal) return;
    const target = norm(album.title || album.name);
    // BÚSQUEDA LAXA
    let songs = appConfig.data.songs.filter(s => norm(s.album).includes(target) || target.includes(norm(s.album)));
    
    appConfig.tempPlaylist = songs;
    if(dom.plDetailTitle) dom.plDetailTitle.textContent = album.title || album.name;
    const list = dom.plDetailList; list.innerHTML = '';
    
    if(songs.length === 0) list.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Álbum vacío.</div>';
    else {
        songs.forEach(s => {
            const item = document.createElement('div'); item.className = 'pl-song-item';
            item.innerHTML = `<div class="pl-song-info"><div class="pl-song-title">${s.title}</div><div class="pl-song-artist">${s.genre}</div></div><span class="material-icons-round" style="color:var(--accent)">play_circle</span>`;
            item.onclick = () => { playSong(s); closeModal('dom_modal_pl_detail'); };
            list.appendChild(item);
        });
    }
    modal.style.display = 'flex';
}

// === COMPARTIR CON DEEP LINKING ===
window.shareCurrentSong = async function() {
    if(!appConfig.currentSong) return;
    
    // Construir URL con ID
    const shareUrl = `${window.location.origin}${window.location.pathname}?s=${appConfig.currentSong.id}`;
    const data = { title: 'MusiChris', text: `Escucha: ${appConfig.currentSong.title}`, url: shareUrl };
    
    try {
        if(navigator.share) await navigator.share(data);
        else {
            await navigator.clipboard.writeText(shareUrl);
            showToast("Enlace copiado", 'success');
        }
    } catch(e) { console.log("Share cancelado"); }
}

window.openFullScreenPlayer = function() {
    if(!appConfig.currentSong) return;
    const song = appConfig.currentSong;
    const art = getSongArt(song);
    if(dom.guestTitle) dom.guestTitle.textContent = song.title;
    if(dom.guestArtist) dom.guestArtist.textContent = song.genre;
    if(dom.guestCover) dom.guestCover.style.backgroundImage = `url('${art}')`;
    updateLikeIcon();
    showView('view-guest-player');
}
window.exitFullScreenPlayer = function() { showView(appConfig.isAdmin ? 'view-admin' : 'view-user'); }

function playSong(song) {
    appConfig.currentSong = song;
    if(dom.mainPlayer) dom.mainPlayer.style.display = 'flex';
    const art = getSongArt(song);
    if(dom.pTitle) dom.pTitle.textContent = song.title;
    if(dom.pArtist) dom.pArtist.textContent = song.genre;
    if(dom.pCover) dom.pCover.style.backgroundImage = `url('${art}')`;
    updateLikeIcon();
    if(dom.audioElement && song.url) {
        dom.audioElement.src = song.url;
        dom.audioElement.play().catch(e=>console.error(e));
        togglePlayIcon(true);
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: song.genre, album: song.album || "MusiChris", artwork: [{ src: art, sizes: '512x512', type: 'image/png' }] });
            navigator.mediaSession.setActionHandler('play', () => { dom.audioElement.play(); });
            navigator.mediaSession.setActionHandler('pause', () => { dom.audioElement.pause(); });
        }
    }
    const idx = appConfig.data.songs.findIndex(s => s.id === song.id);
    if(idx !== -1) { if(!appConfig.data.songs[idx].plays) appConfig.data.songs[idx].plays = 0; appConfig.data.songs[idx].plays++; saveDataSilent(); }
}

function renderSmartPlaylists(id) {
    const c = document.getElementById(id); if(!c) return; c.innerHTML = '';
    const createCard = (t,s,img,fn) => { const d=document.createElement('div'); d.className='collection-card'; d.innerHTML=`<div class="collection-cover" style="background-image:url('${img}');background-color:#222"></div><h4>${t}</h4><p>${s}</p>`; d.onclick=fn; return d; };
    c.appendChild(createCard("❤️ Favoritos", "Tus Likes", "https://i.ibb.co/C9bMh2Q/heart-cover.png", () => openSmartList('fav')));
    c.appendChild(createCard("🆕 Recientes", "Últimas", "https://i.ibb.co/hRj0k7w/new-cover.png", () => openSmartList('recent')));
}

function openSmartList(type) {
    const modal = dom.dom_modal_pl_detail; if(!modal) return;
    let songs = []; let title = "";
    if(type === 'fav') { title = "❤️ Favoritos"; const email = appConfig.user.email; songs = appConfig.data.songs.filter(s => s.likes && s.likes.includes(email)); }
    else if (type === 'recent') { title = "🆕 Recientes"; songs = [...appConfig.data.songs].sort((a,b) => b.id - a.id).slice(0, 15); }
    appConfig.tempPlaylist = songs;
    if(dom.plDetailTitle) dom.plDetailTitle.textContent = title;
    const list = dom.plDetailList; list.innerHTML = '';
    songs.forEach(s => { const item = document.createElement('div'); item.className = 'pl-song-item'; item.innerHTML = `<div class="pl-song-info"><div class="pl-song-title">${s.title}</div><div class="pl-song-artist">${s.genre}</div></div><span class="material-icons-round" style="color:var(--accent)">play_circle</span>`; item.onclick = () => { playSong(s); closeModal('dom_modal_pl_detail'); }; list.appendChild(item); });
    modal.style.display = 'flex';
}

function updateLikeIcon() {
    if(!appConfig.currentSong) return;
    const userEmail = appConfig.user.email;
    const likes = appConfig.currentSong.likes || [];
    const isLiked = likes.includes(userEmail);
    const iconName = isLiked ? 'favorite' : 'favorite_border';
    const color = isLiked ? 'var(--accent)' : '#aaa';
    if(dom.pLikeBtn) { dom.pLikeBtn.textContent = iconName; dom.pLikeBtn.style.color = color; }
    if(dom.guestLikeBtn) { dom.guestLikeBtn.querySelector('span').textContent = iconName; dom.guestLikeBtn.style.color = color; }
}
window.toggleLikeCurrent = async function() {
    if(!appConfig.currentSong) return;
    const songId = appConfig.currentSong.id;
    const songIdx = appConfig.data.songs.findIndex(s => s.id === songId);
    if(songIdx === -1) return;
    const userEmail = appConfig.user.email;
    let likes = appConfig.data.songs[songIdx].likes || [];
    if(likes.includes(userEmail)) likes = likes.filter(e => e !== userEmail); else likes.push(userEmail);
    appConfig.data.songs[songIdx].likes = likes; appConfig.currentSong.likes = likes;
    updateLikeIcon(); await saveData();
}

// Helpers Standard
window.playSongId = (id) => { const s = appConfig.data.songs.find(x => x.id === id); if(s) playSong(s); };
function togglePlayIcon(isPlaying) { const txt = isPlaying ? 'pause' : 'play_arrow'; if(dom.iconPlay) dom.iconPlay.textContent = txt; const iconBig = document.getElementById('iconPlay'); if(iconBig) iconBig.textContent = txt; }
async function saveData() { try { await fetch(`${API_BASE_URL}${PERMANENT_BIN_ID}`, { method: 'PUT', headers: { 'X-Master-Key': PERMANENT_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(appConfig.data) }); } catch(e) { showToast("Error guardando", 'error'); } }
async function saveDataSilent() { try { await fetch(`${API_BASE_URL}${PERMANENT_BIN_ID}`, { method: 'PUT', headers: { 'X-Master-Key': PERMANENT_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(appConfig.data) }); } catch(e) {} }

window.deleteSong = async function(e, songId) { e.stopPropagation(); if(!confirm("¿Eliminar?")) return; appConfig.data.songs = appConfig.data.songs.filter(s => s.id !== songId); await saveData(); showToast("Eliminado", 'success'); updateUI(); }
window.editAlbum = function(e, index) { e.stopPropagation(); const album = appConfig.data.albums[index]; appConfig.editingAlbumIndex = index; if(dom.editAlbName) dom.editAlbName.value = album.title || album.name || ''; if(dom.editAlbArtist) dom.editAlbArtist.value = album.artist || ''; if(dom.editAlbCover) dom.editAlbCover.value = album.cover || album.img || ''; openModal('dom_modal_edit_album'); }
window.doSaveEditAlbum = async function() { const idx = appConfig.editingAlbumIndex; if(idx === null) return; appConfig.data.albums[idx] = { ...appConfig.data.albums[idx], title: dom.editAlbName.value, artist: dom.editAlbArtist.value, cover: dom.editAlbCover.value }; await saveData(); showToast("Álbum actualizado", 'success'); updateUI(); closeModal('dom_modal_edit_album'); }
window.do_create_album = async function() { const name = dom.newAlbName.value.trim(); if(!name) return; appConfig.data.albums.push({ title: name, artist: dom.newAlbArtist.value, cover: dom.newAlbCoverUrl.value || DEFAULT_COVER }); await saveData(); showToast("Creado", 'success'); updateUI(); closeModal('dom_modal_album'); }
window.do_upload = async function() { const title = dom.upTitle.value.trim(); if(!title) return; appConfig.data.songs.push({ id: Date.now(), title, genre: dom.upGenre.value, album: dom.upAlbum.value, url: dom.upUrl.value, cover: '', plays: 0, likes: [] }); await saveData(); showToast("Subida", 'success'); updateUI(); closeModal('dom_modal_upload'); }
async function handleLoginAttempt() { const email = dom.loginEmail.value.trim().toLowerCase(); const pass = dom.loginPass.value.trim(); if (email === 'hjalmar' && pass === '258632') { doLogin({ name: 'Hjalmar', email: 'hjalmar@gmail.com', role: 'admin', avatar: ADMIN_AVATAR }); return; } if (!appConfig.data) await loadAppData(); const user = appConfig.data?.users?.find(u => u.email.toLowerCase() === email); if (user && pass === (user.password || '123')) doLogin(user); else showToast("Error", 'error'); }
function doLogin(user) { appConfig.user = user; appConfig.isLoggedIn = true; appConfig.isAdmin = (user.role === 'admin'); localStorage.setItem('appConfig', JSON.stringify({ user, isLoggedIn: true, isAdmin: appConfig.isAdmin })); showView(appConfig.isAdmin ? 'view-admin' : 'view-user'); loadAppData(); }
window.app_logout = () => { if(dom.audioElement) dom.audioElement.pause(); if(dom.mainPlayer) dom.mainPlayer.style.display='none'; localStorage.removeItem('appConfig'); location.reload(); };

// EXPORTS
window.toggle_play = () => { if(dom.audioElement.paused) dom.audioElement.play(); else dom.audioElement.pause(); };
window.playCollection = () => { if(appConfig.tempPlaylist[0]) { playSong(appConfig.tempPlaylist[0]); closeModal('dom_modal_pl_detail'); }};
window.do_save_announce = async function() { appConfig.data.announcement = document.getElementById('announcementInput').value; await saveData(); updateUI(); closeModal('dom_modal_announcement'); };
window.applyDateFilter = window.applyDateFilter = function() { closeModal('dom_modal_date_filter'); }; 
window.clearDateFilter = function() { closeModal('dom_modal_date_filter'); };
window.openModal = (id) => { const e = document.getElementById(id); if(e) e.style.display='flex'; if(id === 'dom_modal_upload') { const sel = document.getElementById('upAlbum'); if(sel) { sel.innerHTML = '<option value="">Sin Álbum</option>'; appConfig.data.albums.forEach(a => { const opt = document.createElement('option'); opt.value = a.title || a.name; opt.textContent = a.title || a.name; sel.appendChild(opt); }); }}};
window.closeModal = (id) => document.getElementById(id).style.display='none';
window.openUpload = () => window.openModal('dom_modal_upload');
window.switchTab = (id, btn) => { document.querySelectorAll('.list-tab-content, .tab-btn').forEach(e => e.classList.remove('active')); document.getElementById(id).classList.add('active'); btn.classList.add('active'); if(id.includes('albums')) renderAlbumGrid(appConfig.isAdmin?'adminAlbumGrid':'userAlbumGrid', appConfig.data?.albums); if(id.includes('playlists')) renderSmartPlaylists(appConfig.isAdmin?'adminPlaylistGrid':'userPlaylistGrid'); if(id.includes('users')) renderUserList('usersListGrid', appConfig.data?.users);};
window.do_save_settings = () => closeModal('dom_modal_settings');
window.openProfile = function() { openModal('dom_modal_profile'); }
window.changeAvatar = function() { appConfig.user.avatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${Math.floor(Math.random()*999)}`; if(dom.profilePreview) dom.profilePreview.src = appConfig.user.avatar; }
window.do_save_profile = async function() { appConfig.data.users.find(u => u.email === appConfig.user.email).avatar = appConfig.user.avatar; await saveData(); closeModal('dom_modal_profile'); }
window.deleteAlbum = async function(e, i) { e.stopPropagation(); if(confirm("¿Borrar?")) { appConfig.data.albums.splice(i,1); await saveData(); updateUI(); } }
window.deleteUser = async function(i) { if(confirm("¿Borrar?")) { appConfig.data.users.splice(i,1); await saveData(); updateUI(); } }
function renderUserList(id, users) { const c = document.getElementById(id); if(!c) return; c.innerHTML = ''; users.forEach((u, index) => { const div = document.createElement('div'); div.className = 'user-list-item'; div.innerHTML = `<div class="user-info"><img src="${u.avatar || DEFAULT_COVER}" style="width:30px;height:30px;border-radius:50%;margin-right:10px;object-fit:cover"><span>${u.name}</span><span class="user-role role-${u.role}" style="font-size:0.7rem;margin-left:5px;padding:2px 6px;border-radius:4px;background:${u.role==='admin'?'var(--accent)':'#3498db'}">${u.role}</span></div><div style="display:flex;gap:5px"><button class="btn-icon" style="width:30px;height:30px;background:var(--danger)" onclick="deleteUser(${index})"><span class="material-icons-round">delete</span></button></div>`; c.appendChild(div); }); }
