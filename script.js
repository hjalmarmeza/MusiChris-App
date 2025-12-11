/**
 * MusiChris App V67.0 - FINAL FIX
 * - Login: Direct element access (Robust against init fails).
 * - Audio: Forced .load() for streams.
 * - Files: Preview handlers added.
 */

const API_BASE_URL = "https://api.jsonbin.io/v3/b/";
const DEFAULT_COVER = "https://i.ibb.co/3WqP7tX/default-cover.png";
const PERMANENT_BIN_ID = "69349a76ae596e708f880e31"; 
const PERMANENT_API_KEY = "$2a$10$ME7fO8Oqq2iWhHkYQKGQsu0M6PqJ8d1ymFBxHVhhxFJ70BcAg1FZe";
const ADMIN_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=Chris"; 

let appConfig = {
    BIN_ID: PERMANENT_BIN_ID, API_KEY: PERMANENT_API_KEY,
    data: null, user: null, isLoggedIn: false, isAdmin: false, currentSong: null,
    tempPlaylist: [], editingAlbumIndex: null, pendingSongId: null, isGuest: false,
    editingSongId: null, isShuffle: false, isRepeat: false
};

const dom = {};
const norm = (str) => (str || '').toString().toLowerCase().trim().replace(/\s+/g, ' '); 

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('s');
    if(sharedId) { appConfig.pendingSongId = parseInt(sharedId); appConfig.isGuest = true; }

    const ids = [
        'view-login', 'view-admin', 'view-user', 'loginEmail', 'loginPass', 'btnLoginBtn', 
        'audioElement', 'customToast', 'statsTotalSongs', 'statsTotalUsers', 'statsCloud',
        'adminAvatar', 'adminNameDisplay', 'userAvatarImg', 'userGreeting', 'mainPlayer', 'pTitle', 
        'pArtist', 'pCover', 'pCoverMini', 'iconPlay', 'btnTogglePass', 'dom_modal_pl_detail', 
        'plDetailTitle', 'plDetailList', 'dom_modal_profile', 'profileName', 'profileEmail', 'profilePreview',
        'dom_modal_upload', 'upTitle', 'upGenre', 'upAlbum', 'upUrl', 'btnUploadSubmit', 'modalUploadTitle', 
        'dom_modal_album', 'newAlbName', 'newAlbArtist', 'newAlbCoverUrl', 'newAlbCoverFile',
        'dom_modal_new_user', 'newUser_Name', 'newUser_Email', 'newUser_Pass',
        'dom_modal_settings', 'cfgBinId', 'cfgApiKey',
        'dom_modal_announcement', 'announcementInput', 'userAnnouncement', 'announcementText',
        'dom_modal_edit_album', 'editAlbName', 'editAlbArtist', 'editAlbCover', 'editAlbCoverFile',
        'dom_modal_date_filter', 'filterStart', 'filterEnd',
        'view-guest-player', 'guestTitle', 'guestArtist', 'guestCover', 'iconPlayBig', 'pLikeBtn', 'guestLikeBtn',
        'adminPlaylistGrid', 'userPlaylistGrid', 'usersListGrid',
        'btnAddAlbum', 'btnAddUser', 'seekSlider',
        'searchInputAdmin', 'searchInputUser', 'dom_modal_eq', 'btnAddPlaylist'
    ];
    ids.forEach(id => { const el = document.getElementById(id); if(el) dom[id] = el; });

    if (!dom.audioElement) {
        dom.audioElement = document.createElement('audio');
        dom.audioElement.id = 'audioElement';
        document.body.appendChild(dom.audioElement);
    }

    if (dom.mainPlayer) dom.mainPlayer.style.display = 'none';

    // PASSWORD TOGGLE
    if (dom.btnTogglePass) dom.btnTogglePass.addEventListener('click', () => {
        const p = document.getElementById('loginPass');
        p.type = p.type === "password" ? "text" : "password";
        dom.btnTogglePass.textContent = p.type === "password" ? "visibility_off" : "visibility";
    });
    
    // AUDIO
    if (dom.audioElement) {
        dom.audioElement.addEventListener('play', () => togglePlayIcon(true));
        dom.audioElement.addEventListener('pause', () => togglePlayIcon(false));
        dom.audioElement.addEventListener('timeupdate', updateProgress);
        dom.audioElement.addEventListener('ended', () => togglePlayIcon(false));
        dom.audioElement.addEventListener('error', (e) => {
            console.error("Audio Error:", e);
            showToast("Error de audio. Revisa el enlace.", 'error');
            togglePlayIcon(false);
        });
    }
    if(dom.seekSlider) dom.seekSlider.addEventListener('input', seekAudio);
    
    if(dom.searchInputAdmin) dom.searchInputAdmin.addEventListener('keyup', (e) => filterSongs(e.target.value));
    if(dom.searchInputUser) dom.searchInputUser.addEventListener('keyup', (e) => filterSongs(e.target.value));

    appConfig.BIN_ID = PERMANENT_BIN_ID;
    appConfig.API_KEY = PERMANENT_API_KEY;
    
    if(appConfig.isGuest) { loadAppData(); } else { loadConfig(); }
});

// --- HELPER PARA SUBIR ARCHIVOS (COVER) ---
window.previewFile = function(input, targetId) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { document.getElementById(targetId).value = e.target.result; showToast("Imagen lista", "success"); };
    reader.readAsDataURL(file);
}

// --- FUNCIÓN LOGIN BLINDADA ---
window.handleLoginAttempt = async function() {
    // Usamos getElementById directo para no depender de la inicialización de 'dom'
    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPass');
    
    if(!emailEl || !passEl) return;
    
    const email = emailEl.value.trim().toLowerCase();
    const pass = passEl.value.trim();

    if (email === 'hjalmar' && pass === '258632') { 
        doLogin({ name: 'Hjalmar', email: 'admin@musichris.com', role: 'admin', avatar: ADMIN_AVATAR }); 
        return; 
    }
    
    if (!appConfig.data) {
        showToast("Conectando base de datos...", 'info');
        await loadAppData();
    }
    
    const user = appConfig.data?.users?.find(u => u.email.toLowerCase() === email);
    if (user && pass === (user.password || '123')) {
        doLogin(user);
    } else {
        showToast("Credenciales incorrectas", 'error');
    }
}

function doLogin(user) { 
    appConfig.user = user; 
    appConfig.isLoggedIn = true; 
    appConfig.isAdmin = (user.role === 'admin'); 
    localStorage.setItem('appConfig', JSON.stringify({ user, isLoggedIn: true, isAdmin: appConfig.isAdmin })); 
    showView(appConfig.isAdmin ? 'view-admin' : 'view-user'); 
    loadAppData(); 
}

function loadConfig() { 
    const saved = localStorage.getItem('appConfig'); 
    if (saved) { 
        const p = JSON.parse(saved); 
        appConfig.user = p.user; 
        appConfig.isLoggedIn = p.isLoggedIn; 
        appConfig.isAdmin = p.isAdmin; 
    } 
    if (appConfig.isLoggedIn && appConfig.user) { 
        showView(appConfig.isAdmin ? 'view-admin' : 'view-user'); 
        loadAppData(); 
    } else { 
        showView('view-login'); 
    } 
}

// --- AUDIO ---
function playSong(song) {
    appConfig.currentSong = song;
    if(dom.mainPlayer) { dom.mainPlayer.style.display = 'flex'; dom.mainPlayer.classList.remove('hidden'); }
    
    const art = getSongArt(song);
    if(dom.pTitle) dom.pTitle.textContent = song.title;
    if(dom.pArtist) dom.pArtist.textContent = song.genre;
    
    // Mini cover fix
    const mini = document.getElementById('pCoverMini');
    if(mini) mini.src = art;

    updateLikeIcon();
    
    if(dom.audioElement && song.url) {
        dom.audioElement.pause();
        dom.audioElement.src = song.url;
        dom.audioElement.load(); // FORCE LOAD
        
        const p = dom.audioElement.play();
        if (p !== undefined) {
            p.then(_ => togglePlayIcon(true))
            .catch(error => { console.error(error); togglePlayIcon(false); });
        }
    } else {
        showToast("Sin URL de audio", 'error');
    }
    
    const idx = appConfig.data.songs.findIndex(s => s.id === song.id);
    if(idx !== -1) { 
        if(!appConfig.data.songs[idx].plays) appConfig.data.songs[idx].plays = 0;
        appConfig.data.songs[idx].plays++; 
        saveDataSilent(); 
    }
}

// ... FUNCIONES RESTANTES MANTENIDAS ...
async function loadAppData() {
    try {
        const res = await fetch(`${API_BASE_URL}${PERMANENT_BIN_ID}`, { headers: {'X-Master-Key': PERMANENT_API_KEY} });
        if(!res.ok) throw new Error("API Error");
        const json = await res.json();
        appConfig.data = json.record;
        if(!appConfig.data.songs) appConfig.data.songs = [];
        if(!appConfig.data.users) appConfig.data.users = [];
        if(!appConfig.data.albums) appConfig.data.albums = [];
        if(!appConfig.data.playlists) appConfig.data.playlists = [];
        appConfig.data.songs.forEach(s => { if(!s.likes) s.likes = []; if(!s.plays) s.plays = 0; });
        if(appConfig.isGuest && appConfig.pendingSongId) activateGuestMode(); else updateUI();
    } catch(e) { console.error(e); showToast("Revisa conexión", 'info'); }
}
function updateUI(songListOverride = null) {
    if(dom.statsTotalSongs && appConfig.data) dom.statsTotalSongs.textContent = appConfig.data.songs.length;
    if(dom.statsTotalUsers && appConfig.data) dom.statsTotalUsers.textContent = appConfig.data.users.length;
    if(dom.statsCloud && appConfig.data) {
        const pct = Math.min((appConfig.data.songs.length * 5 / 25000) * 100, 100).toFixed(2);
        dom.statsCloud.textContent = pct + "%";
    }
    const songs = songListOverride || appConfig.data.songs;
    renderSongList(appConfig.isAdmin ? 'adminSongList' : 'userSongList', songs);
    renderAlbumGrid(appConfig.isAdmin ? 'adminAlbumGrid' : 'userAlbumGrid', appConfig.data.albums);
    renderSmartPlaylists(appConfig.isAdmin ? 'adminPlaylistGrid' : 'userPlaylistGrid');
    if(appConfig.isAdmin) renderUserList('usersListGrid', appConfig.data.users);
    
    if(appConfig.user) {
        if(dom.adminAvatar) dom.adminAvatar.src = appConfig.user.avatar || ADMIN_AVATAR;
        if(dom.userAvatarImg) dom.userAvatarImg.src = appConfig.user.avatar || ADMIN_AVATAR;
        if(dom.adminNameDisplay) dom.adminNameDisplay.textContent = appConfig.user.name;
        if(dom.userGreeting) dom.userGreeting.textContent = `Hola ${appConfig.user.name}`;
    }

    if(dom.userAnnouncement && dom.announcementText && appConfig.data.announcement) {
        dom.userAnnouncement.style.display = 'block';
        dom.announcementText.textContent = appConfig.data.announcement;
    } else if (dom.userAnnouncement) dom.userAnnouncement.style.display = 'none';
}

function renderSongList(id, songs) {
    const c = document.getElementById(id); if(!c) return; c.innerHTML = '';
    songs.forEach((s) => { 
        const div = document.createElement('div'); div.className = 'song-list-item';
        const art = getSongArt(s);
        let adminBtns = '';
        if(appConfig.isAdmin) {
             adminBtns = `<button class="btn-list-action" style="margin-right:5px;background:rgba(255,255,255,0.1)" onclick="editSong(event, ${s.id})"><span class="material-icons-round" style="font-size:1rem">edit</span></button><button class="btn-list-action" style="background:var(--danger)" onclick="deleteSong(event, ${s.id})"><span class="material-icons-round">delete</span></button>`;
        }
        div.innerHTML = `<div class="song-cover" style="background-image: url('${art}')"></div><div class="song-info"><div class="song-title">${s.title}</div><div class="song-artist">${s.genre}</div></div><div class="song-actions"><button class="btn-list-action" onclick="playSongId(${s.id})"><span class="material-icons-round">play_arrow</span></button>${adminBtns}</div>`;
        div.onclick = (e) => { if(e.target.tagName === 'BUTTON' || e.target.closest('button')) return; playSong(s); };
        c.appendChild(div);
    });
}

function getSongArt(song) {
    let art = song.cover || song.img || song.image;
    if (art && !art.includes("imgbb") && !art.includes("image not found")) return art; 
    if (song.album && appConfig.data && appConfig.data.albums) {
        const target = norm(song.album);
        const album = appConfig.data.albums.find(a => norm(a.title || a.name).includes(target) || target.includes(norm(a.title || a.name)));
        if (album) return getArt(album);
    }
    return DEFAULT_COVER;
}
function getArt(item) { if (!item) return DEFAULT_COVER; const url = item.cover || item.img || item.image || item.coverUrl; return url || DEFAULT_COVER; }

// ACTIONS
window.do_upload = async function() { 
    const title = dom.upTitle.value.trim(); 
    const url = dom.upUrl.value.trim();
    if(!title) return showToast("Falta título", 'error');
    if(!url && !appConfig.editingSongId) return showToast("Falta URL", 'error');
    
    showToast("Guardando...", "info");

    if(appConfig.editingSongId) {
        const idx = appConfig.data.songs.findIndex(s => s.id === appConfig.editingSongId);
        if(idx !== -1) {
            appConfig.data.songs[idx].title = title;
            appConfig.data.songs[idx].genre = dom.upGenre.value;
            appConfig.data.songs[idx].album = dom.upAlbum.value;
            if(url) appConfig.data.songs[idx].url = url; 
            showToast("Actualizado", 'success');
        }
    } else {
        appConfig.data.songs.push({ id: Date.now(), title, genre: dom.upGenre.value, album: dom.upAlbum.value, url: url, cover: '', plays: 0, likes: [] });
        showToast("Subido", 'success');
    }
    await saveData(); updateUI(); closeModal('dom_modal_upload'); 
}

window.openUpload = function() {
    appConfig.editingSongId = null;
    if(dom.modalUploadTitle) dom.modalUploadTitle.textContent = "Subir Canción";
    if(dom.btnUploadSubmit) dom.btnUploadSubmit.textContent = "Subir";
    dom.upTitle.value = ''; dom.upGenre.value = ''; dom.upUrl.value = '';
    const sel = document.getElementById('upAlbum');
    sel.innerHTML = '<option value="">Sin Álbum</option>';
    if(appConfig.data.albums) {
        appConfig.data.albums.forEach(a => { const opt = document.createElement('option'); opt.value = a.title; opt.textContent = a.title; sel.appendChild(opt); });
    }
    openModal('dom_modal_upload');
}

window.editSong = function(e, id) {
    e.stopPropagation();
    const song = appConfig.data.songs.find(s => s.id === id);
    if(!song) return;
    appConfig.editingSongId = id;
    if(dom.modalUploadTitle) dom.modalUploadTitle.textContent = "Editar Canción";
    if(dom.btnUploadSubmit) dom.btnUploadSubmit.textContent = "Guardar Cambios";
    dom.upTitle.value = song.title;
    dom.upGenre.value = song.genre;
    dom.upAlbum.value = song.album;
    dom.upUrl.value = song.url || '';
    const sel = document.getElementById('upAlbum');
    sel.innerHTML = '<option value="">Sin Álbum</option>';
    if(appConfig.data.albums) {
        appConfig.data.albums.forEach(a => { const opt = document.createElement('option'); opt.value = a.title; opt.textContent = a.title; sel.appendChild(opt); });
    }
    sel.value = song.album || "";
    openModal('dom_modal_upload');
}

window.doCreatePlaylist = function() {
    const name = prompt("Nombre Playlist:");
    if(name) {
        if(!appConfig.data.playlists) appConfig.data.playlists = [];
        appConfig.data.playlists.push({name:name, songs:[]});
        saveData(); updateUI();
    }
}

window.do_create_user_modal = async function() {
    const name = document.getElementById('newUser_Name').value.trim();
    const email = document.getElementById('newUser_Email').value.trim();
    const pass = document.getElementById('newUser_Pass').value;
    
    if(!name || !email || !pass) return showToast("Faltan datos", 'error');
    if(appConfig.data.users.find(u => u.email === email || u.name === name)) return showToast("Usuario ya existe", 'error');
    
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
    appConfig.data.users.push({ id: Date.now(), name, email, password: pass, role: 'user', avatar: avatarUrl });
    
    await saveData();
    showToast("Usuario registrado", 'success');
    closeModal('dom_modal_new_user');
    updateUI();
}

function renderAlbumGrid(id, albums) {
    const c = document.getElementById(id); if(!c) return; c.innerHTML = '';
    albums.forEach((a, index) => {
        const div = document.createElement('div'); div.className = 'collection-card';
        const art = getArt(a);
        const name = a.title || a.name || 'Álbum';
        let adminBtns = '';
        if(appConfig.isAdmin) adminBtns = `<div class="album-admin-tools"><button class="btn-alb-tool" style="background:#333" onclick="editAlbum(event, ${index})">✏️</button><button class="btn-alb-tool" style="background:var(--danger)" onclick="deleteAlbum(event, ${index})">🗑️</button></div>`;
        div.innerHTML = `<div class="collection-cover" style="background-image: url('${art}')"></div><h4>${name}</h4>${adminBtns}`;
        div.onclick = (e) => { if(e.target.tagName === 'BUTTON') return; openAlbumDetail(a); };
        c.appendChild(div);
    });
}
function openAlbumDetail(album) {
    const modal = dom.dom_modal_pl_detail; if(!modal) return;
    const target = norm(album.title || album.name);
    let songs = appConfig.data.songs.filter(s => s.album && norm(s.album) === target); // STRICT
    appConfig.tempPlaylist = songs;
    if(dom.plDetailTitle) dom.plDetailTitle.textContent = album.title || album.name;
    const list = dom.plDetailList; list.innerHTML = '';
    if(songs.length === 0) list.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Álbum vacío.</div>';
    else { songs.forEach(s => { const item = document.createElement('div'); item.className = 'song-list-item'; item.innerHTML = `<div class="song-info"><div class="song-title">${s.title}</div><div class="song-artist">${s.genre}</div></div><span class="material-icons-round" style="color:var(--accent)">play_circle</span>`; item.onclick = () => { playSong(s); closeModal('dom_modal_pl_detail'); }; list.appendChild(item); }); }
    modal.style.display = 'flex';
}
function renderSmartPlaylists(id) {
    const c = document.getElementById(id); if(!c) return; c.innerHTML = '';
    const createCard = (t,s,img,grad,fn) => { const d=document.createElement('div'); d.className='collection-card'; d.innerHTML=`<div class="collection-cover pl-icon-bg ${grad}" style="background-image:url('${img}')"></div><h4>${t}</h4>`; d.onclick=fn; return d; };
    c.appendChild(createCard("Favoritos", "https://cdn-icons-png.flaticon.com/512/833/833472.png", "grad-1", () => openSmartList('fav')));
    c.appendChild(createCard("Recientes", "https://cdn-icons-png.flaticon.com/512/2972/2972531.png", "grad-2", () => openSmartList('recent')));
    c.appendChild(createCard("Top Hits", "https://cdn-icons-png.flaticon.com/512/651/651717.png", "grad-3", () => openSmartList('top')));
    
    if(appConfig.data.playlists) {
        appConfig.data.playlists.forEach(pl => {
             const d = document.createElement('div'); d.className='collection-card';
             d.innerHTML=`<div class="collection-cover pl-icon-bg grad-2" style="background-image:url('https://cdn-icons-png.flaticon.com/512/1179/1179069.png')"></div><h4>${pl.name}</h4>`;
             d.onclick=()=>showToast("Lista vacía (Demo)", 'info');
             c.appendChild(d);
        });
    }
}
function openSmartList(type) {
    const modal = dom.dom_modal_pl_detail; if(!modal) return;
    let songs = []; let title = "";
    if(type === 'fav') { title = "Favoritos"; const email = appConfig.user.email; songs = appConfig.data.songs.filter(s => s.likes && s.likes.includes(email)); }
    else if (type === 'recent') { title = "Recientes"; songs = [...appConfig.data.songs].sort((a,b) => b.id - a.id).slice(0, 15); }
    else if (type === 'top') { title = "Top Hits"; songs = [...appConfig.data.songs].sort((a,b) => (b.plays || 0) - (a.plays || 0)).slice(0, 20); }
    appConfig.tempPlaylist = songs;
    if(dom.plDetailTitle) dom.plDetailTitle.textContent = title;
    const list = dom.plDetailList; list.innerHTML = '';
    songs.forEach(s => { const item = document.createElement('div'); item.className = 'song-list-item'; item.innerHTML = `<div class="song-info"><div class="song-title">${s.title}</div></div><span class="material-icons-round" style="color:var(--accent)">play_circle</span>`; item.onclick = () => { playSong(s); closeModal('dom_modal_pl_detail'); }; list.appendChild(item); });
    modal.style.display = 'flex';
}

window.openFullScreenPlayer = function() {
    if(!appConfig.currentSong) return;
    document.getElementById('view-guest-player').style.display='flex';
    if(dom.mainPlayer) dom.mainPlayer.classList.add('hidden');
    
    document.getElementById('guestTitle').textContent = appConfig.currentSong.title;
    document.getElementById('guestArtist').textContent = appConfig.currentSong.genre;
    document.getElementById('guestCover').style.backgroundImage = `url('${getSongArt(appConfig.currentSong)}')`;
    
    // Inyectar Barra
    const area = document.querySelector('.guest-info-area');
    area.querySelectorAll('.progress-container').forEach(e=>e.remove());
    const d = document.createElement('div'); d.className='progress-container';
    d.innerHTML = `<span id="expCurTime" class="time-display">0:00</span><input type="range" id="expandedSeekSlider" value="0" max="100"><span id="expTotTime" class="time-display">0:00</span>`;
    area.appendChild(d);
    document.getElementById('expandedSeekSlider').addEventListener('input', seekAudio);

    // Inyectar Controles
    const ctrls = document.querySelector('.guest-controls-main');
    ctrls.innerHTML = `
        <span class="material-icons-round btn-guest-action" onclick="toggleShuffle()">shuffle</span>
        <span class="material-icons-round btn-guest-action" style="font-size:3rem" onclick="prev()">skip_previous</span>
        <span class="material-icons-round btn-guest-action" id="iconPlayBig" style="font-size:4.5rem" onclick="toggle_play()">pause</span>
        <span class="material-icons-round btn-guest-action" style="font-size:3rem" onclick="next()">skip_next</span>
        <span class="material-icons-round btn-guest-action" onclick="toggleRepeat()">repeat</span>
    `;
}

window.toggleShuffle = () => { appConfig.isShuffle = !appConfig.isShuffle; openFullScreenPlayer(); };
window.toggleRepeat = () => { appConfig.isRepeat = !appConfig.isRepeat; openFullScreenPlayer(); };
window.prev = () => showToast("Anterior", 'info');
window.next = () => showToast("Siguiente", 'info');
window.closePlayer = function() {
    const fs = document.getElementById('view-guest-player');
    if(fs && fs.style.display === 'flex') {
        showView(appConfig.isAdmin ? 'view-admin' : 'view-user');
        if(dom.mainPlayer) dom.mainPlayer.classList.remove('hidden');
    } else {
        if(dom.mainPlayer) dom.mainPlayer.style.display='none';
        dom.audioElement.pause();
    }
}
window.exitFullScreenPlayer = window.closePlayer;

function togglePlayIcon(isPlaying) {
    const txt = isPlaying ? 'pause' : 'play_arrow';
    if(dom.iconPlay) dom.iconPlay.textContent = txt;
    const iconBig = document.getElementById('iconPlayBig'); if(iconBig) iconBig.textContent = txt;
    const iconMin = document.getElementById('iconPlayMin'); if(iconMin) iconMin.textContent = txt;
}

window.app_logout = () => { if(dom.audioElement) dom.audioElement.pause(); if(dom.mainPlayer) dom.mainPlayer.style.display='none'; localStorage.removeItem('appConfig'); location.reload(); };
window.playCollection = () => { if(appConfig.tempPlaylist[0]) { playSong(appConfig.tempPlaylist[0]); closeModal('dom_modal_pl_detail'); }};
window.do_save_announce = async function() { appConfig.data.announcement = document.getElementById('announcementInput').value; await saveData(); updateUI(); closeModal('dom_modal_announcement'); };
window.applyDateFilter = window.applyDateFilter = function() { closeModal('dom_modal_date_filter'); }; 
window.clearDateFilter = function() { closeModal('dom_modal_date_filter'); };
window.do_create_album = async function() { const name = dom.newAlbName.value.trim(); if(!name) return; const cover = dom.newAlbCoverUrl.value || DEFAULT_COVER; appConfig.data.albums.push({ title: name, artist: dom.newAlbArtist.value, cover: cover }); await saveData(); showToast("Álbum creado", 'success'); updateUI(); closeModal('dom_modal_album'); }
window.doSaveEditAlbum = async function() { const idx = appConfig.editingAlbumIndex; if(idx === null) return; const cover = dom.editAlbCover.value || appConfig.data.albums[idx].cover; appConfig.data.albums[idx] = { ...appConfig.data.albums[idx], title: dom.editAlbName.value, artist: dom.editAlbArtist.value, cover: cover }; await saveData(); showToast("Álbum actualizado", 'success'); updateUI(); closeModal('dom_modal_edit_album'); }
window.do_create_album = async function() { const name = dom.newAlbName.value.trim(); if(!name) return; appConfig.data.albums.push({ title: name, artist: dom.newAlbArtist.value, cover: dom.newAlbCoverUrl.value || DEFAULT_COVER }); await saveData(); showToast("Creado", 'success'); updateUI(); closeModal('dom_modal_album'); }
window.shareCurrentSong = async function() { if(!appConfig.currentSong) return; const shareUrl = `${window.location.origin}${window.location.pathname}?s=${appConfig.currentSong.id}`; const textMsg = `Esta canción ministró mi vida y tienes que escucharla:\n\n🎵 ${appConfig.currentSong.title}\n— En MusiChris App\n\nEntra directo con este pase de invitado:\n${shareUrl}`; const data = { title: 'MusiChris', text: textMsg, url: shareUrl }; try { if(navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(textMsg); showToast("Mensaje copiado", 'success'); } } catch(e) {} }
window.toggle_play = () => { if(dom.audioElement.paused) dom.audioElement.play(); else dom.audioElement.pause(); };
window.openModal = (id) => document.getElementById(id).style.display='flex';
window.closeModal = (id) => document.getElementById(id).style.display='none';
window.switchTab = (id, btn) => { document.querySelectorAll('.list-tab-content, .tab-btn').forEach(e => e.classList.remove('active')); document.getElementById(id).classList.add('active'); btn.classList.add('active'); updateUI(); };
window.do_save_settings = () => closeModal('dom_modal_settings');
window.openProfile = function() { openModal('dom_modal_profile'); }
window.changeAvatar = function() { appConfig.user.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.floor(Math.random()*999)}`; if(dom.profilePreview) dom.profilePreview.src = appConfig.user.avatar; }
window.do_save_profile = async function() { const idx = appConfig.data.users.findIndex(u => u.email === appConfig.user.email); if(idx !== -1) { appConfig.data.users[idx].name = dom.profileName.value; appConfig.data.users[idx].avatar = appConfig.user.avatar; appConfig.user.name = dom.profileName.value; await saveData(); localStorage.setItem('appConfig', JSON.stringify({ user: appConfig.user, isLoggedIn: true, isAdmin: appConfig.isAdmin })); closeModal('dom_modal_profile'); showToast("Perfil actualizado", 'success'); updateUI(); } }
window.deleteAlbum = async function(e, i) { e.stopPropagation(); if(confirm("¿Borrar?")) { appConfig.data.albums.splice(i,1); await saveData(); updateUI(); } }
window.deleteUser = async function(i) { if(confirm("¿Borrar?")) { appConfig.data.users.splice(i,1); await saveData(); updateUI(); } }
function renderUserList(id, users) { const c = document.getElementById(id); if(!c) return; c.innerHTML = ''; users.forEach((u, index) => { const div = document.createElement('div'); div.className = 'user-list-item'; div.innerHTML = `<div class="user-info"><img src="${u.avatar || DEFAULT_COVER}" style="width:30px;height:30px;border-radius:50%;margin-right:10px;object-fit:cover"><span>${u.name}</span><span class="role-badge ${u.role==='admin'?'role-admin':''}">${u.role}</span></div><div style="display:flex;gap:5px"><button class="btn-delete-user" onclick="deleteUser(${index})"><span class="material-icons-round">delete</span></button></div>`; c.appendChild(div); }); }
async function saveData() { try { await fetch(`${API_BASE_URL}${PERMANENT_BIN_ID}`, { method: 'PUT', headers: { 'X-Master-Key': PERMANENT_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(appConfig.data) }); } catch(e) { showToast("Error guardando", 'error'); } }
async function saveDataSilent() { try { await fetch(`${API_BASE_URL}${PERMANENT_BIN_ID}`, { method: 'PUT', headers: { 'X-Master-Key': PERMANENT_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(appConfig.data) }); } catch(e) {} }
