/**
 * MusiChris App V47.0 - FINAL FIX
 * - Removes Ghost Buttons.
 * - Single Progress Bar logic.
 * - Strict Album Filtering (Partial match fallback).
 * - Create User logic enabled.
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
        'pArtist', 'pCover', 'iconPlay', 'btnTogglePass', 'dom_modal_pl_detail', 
        'plDetailTitle', 'plDetailList', 'dom_modal_profile', 'profileName', 'profileEmail', 'profilePreview',
        'dom_modal_upload', 'upTitle', 'upGenre', 'upAlbum', 'upUrl', 'btnUploadSubmit', 'modalUploadTitle', 
        'dom_modal_album', 'newAlbName', 'newAlbArtist', 'newAlbCoverUrl',
        'dom_modal_new_user', 'newUser_Name', 'newUser_Email', 'newUser_Pass',
        'dom_modal_settings', 'cfgBinId', 'cfgApiKey',
        'dom_modal_announcement', 'announcementInput', 'userAnnouncement', 'announcementText',
        'dom_modal_edit_album', 'editAlbName', 'editAlbArtist', 'editAlbCover',
        'dom_modal_date_filter', 'filterStart', 'filterEnd',
        'view-guest-player', 'guestTitle', 'guestArtist', 'guestCover', 'iconPlayBig', 'pLikeBtn', 'guestLikeBtn',
        'adminPlaylistGrid', 'userPlaylistGrid', 'usersListGrid',
        'btnAddSong', 'btnAddAlbum', 'btnAddUser', 'seekSlider',
        'searchInputAdmin', 'searchInputUser'
    ];
    ids.forEach(id => { const el = document.getElementById(id); if(el) dom[id] = el; });

    if (dom.mainPlayer) dom.mainPlayer.style.display = 'none';

    if (dom.btnLoginBtn) dom.btnLoginBtn.addEventListener('click', handleLoginAttempt);
    if (dom.btnTogglePass) dom.btnTogglePass.addEventListener('click', () => {
        const p = dom.loginPass; p.type = p.type === "password" ? "text" : "password";
        dom.btnTogglePass.textContent = p.type === "password" ? "visibility_off" : "visibility";
    });
    
    if (dom.audioElement) {
        dom.audioElement.addEventListener('play', () => togglePlayIcon(true));
        dom.audioElement.addEventListener('pause', () => togglePlayIcon(false));
        dom.audioElement.addEventListener('timeupdate', updateProgress);
        dom.audioElement.addEventListener('ended', () => togglePlayIcon(false));
    }
    if(dom.seekSlider) dom.seekSlider.addEventListener('input', seekAudio);
    
    // LISTENERS BOTONES
    if(dom.btnAddSong) dom.btnAddSong.addEventListener('click', () => openUpload());
    if(dom.btnAddAlbum) dom.btnAddAlbum.addEventListener('click', () => openModal('dom_modal_album'));
    if(dom.btnAddUser) dom.btnAddUser.addEventListener('click', () => openModal('dom_modal_new_user'));

    // BUSCADOR
    if(dom.searchInputAdmin) dom.searchInputAdmin.addEventListener('keyup', (e) => filterSongs(e.target.value));
    if(dom.searchInputUser) dom.searchInputUser.addEventListener('keyup', (e) => filterSongs(e.target.value));

    appConfig.BIN_ID = PERMANENT_BIN_ID;
    appConfig.API_KEY = PERMANENT_API_KEY;
    
    if(appConfig.isGuest) { loadAppData(); } else { loadConfig(); }
});

function filterSongs(query) {
    const target = norm(query);
    const filtered = appConfig.data.songs.filter(s => norm(s.title).includes(target) || norm(s.genre).includes(target) || norm(s.album).includes(target));
    renderSongList(appConfig.isAdmin ? 'adminSongList' : 'userSongList', filtered);
}

function updateProgress() {
    const au = dom.audioElement;
    if(!au || isNaN(au.duration)) return;
    const pct = (au.currentTime / au.duration) * 100;
    if(dom.seekSlider) dom.seekSlider.value = pct;
    
    const expSlider = document.getElementById('expandedSeekSlider');
    const curTime = document.getElementById('expCurTime');
    const totTime = document.getElementById('expTotTime');
    if(expSlider) expSlider.value = pct;
    if(curTime) curTime.textContent = formatTime(au.currentTime);
    if(totTime) totTime.textContent = formatTime(au.duration);
}
function seekAudio(e) {
    const au = dom.audioElement;
    if(!au || isNaN(au.duration)) return;
    au.currentTime = au.duration * (e.target.value / 100);
}
function formatTime(s) {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec < 10 ? '0'+sec : sec}`;
}

function showToast(msg, type = 'info') {
    const t = document.getElementById('customToast');
    if(t) { t.textContent = msg; t.className = `customToast show ${type}`; setTimeout(() => t.className = t.className.replace(" show",""), 3000); }
}

function getArt(item) {
    if (!item) return DEFAULT_COVER;
    const url = item.cover || item.img || item.image || item.coverUrl;
    if (url && !url.includes("imgbb") && !url.includes("image not found")) return url;
    return DEFAULT_COVER;
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

function showView(viewId) {
    ['view-login','view-admin','view-user','view-guest-player'].forEach(id => {
        const el = document.getElementById(id); if(el) { el.style.display='none'; el.classList.remove('active'); }
    });
    const t = document.getElementById(viewId);
    if(t) { 
        t.style.display = (viewId === 'view-login' || viewId === 'view-guest-player') ? 'flex' : 'block'; 
        if(viewId !== 'view-guest-player' && appConfig.currentSong && dom.mainPlayer) {
             dom.mainPlayer.classList.remove('hidden');
        }
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

        if(appConfig.isGuest && appConfig.pendingSongId) activateGuestMode(); else updateUI();

    } catch(e) { console.error(e); showToast("Conectando...", 'info'); }
}

function activateGuestMode() {
    const song = appConfig.data.songs.find(s => s.id === appConfig.pendingSongId);
    if (!song) { showToast("Link expirado", 'error'); appConfig.isGuest = false; showView('view-login'); return; }
    
    const loginView = document.getElementById('view-login');
    loginView.innerHTML = `
        <div class="login-card">
            <div style="width:120px; height:120px; background-image:url('${getSongArt(song)}'); background-size:cover; border-radius:15px; margin:0 auto 15px auto; box-shadow:0 10px 30px rgba(0,0,0,0.5);"></div>
            <h3 style="margin:0 0 5px 0">${song.title}</h3>
            <p style="color:#aaa; margin:0 0 20px 0">${song.genre}</p>
            <p style="color:#FF9F43; font-size:0.9rem; margin-bottom:20px;">Te han dedicado esta canción ❤️</p>
            <button class="btn-login" onclick="playGuestSong(${song.id})">▶ ESCUCHAR AHORA</button>
            <button style="background:transparent; border:none; color:#666; margin-top:20px; cursor:pointer;" onclick="location.href=location.pathname">Volver al Inicio</button>
        </div>`;
    showView('view-login');
}

window.playGuestSong = function(id) {
    appConfig.user = { name: "Invitado", email: "guest", role: "user" };
    appConfig.isLoggedIn = true;
    const song = appConfig.data.songs.find(s => s.id === id);
    showView('view-user');
    updateUI();
    document.querySelector('.tabs').style.display = 'none';
    playSong(song);
    openFullScreenPlayer();
}

function updateUI(songListOverride = null) {
    if(dom.statsTotalSongs && appConfig.data) dom.statsTotalSongs.textContent = appConfig.data.songs.length;
    if(dom.statsTotalUsers && appConfig.data) dom.statsTotalUsers.textContent = appConfig.data.users.length;
    if(dom.statsCloud && appConfig.data) dom.statsCloud.textContent = Math.min(appConfig.data.songs.length * 2, 100) + "%";
    
    const songsToShow = songListOverride || appConfig.data.songs;

    renderSongList(appConfig.isAdmin ? 'adminSongList' : 'userSongList', songsToShow);
    renderAlbumGrid(appConfig.isAdmin ? 'adminAlbumGrid' : 'userAlbumGrid', appConfig.data.albums);
    renderSmartPlaylists(appConfig.isAdmin ? 'adminPlaylistGrid' : 'userPlaylistGrid');
    if(appConfig.isAdmin) renderUserList('usersListGrid', appConfig.data.users);
    
    const avatar = appConfig.user?.avatar || ADMIN_AVATAR;
    if(dom.adminAvatar) dom.adminAvatar.src = avatar;
    if(dom.userAvatarImg) dom.userAvatarImg.src = avatar;
    if(dom.adminNameDisplay) dom.adminNameDisplay.innerHTML = `<span id="adminNameDisplay">${appConfig.user?.name || 'Admin'}</span>`;
    if(dom.userGreeting) dom.userGreeting.innerHTML = `Hola <span id="userGreetingName">${appConfig.user?.name || 'Usuario'}</span>`;

    if(dom.userAnnouncement && dom.announcementText && appConfig.data.announcement) {
        dom.userAnnouncement.style.display = 'block';
        dom.announcementText.textContent = appConfig.data.announcement;
    } else if (dom.userAnnouncement) dom.userAnnouncement.style.display = 'none';
    
    // BOTÓN AÑADIR CANCIÓN SI NO EXISTE
    if(appConfig.isAdmin) {
        const container = document.getElementById('admin-music');
        if(container && !document.getElementById('btnAddSongDynamic')) {
            const btn = document.createElement('div');
            btn.id = 'btnAddSongDynamic';
            btn.className = 'btn-add-content';
            btn.textContent = '+ Subir Canción';
            btn.onclick = () => openUpload(); 
            const search = document.getElementById('searchInputAdmin');
            if(search) container.insertBefore(btn, search);
        }
    }
}

function renderSongList(id, songs) {
    const c = document.getElementById(id); if(!c) return; c.innerHTML = '';
    if(songs.length === 0) { c.innerHTML = '<div style="text-align:center;padding:20px;color:#666">No hay canciones</div>'; return; }
    songs.forEach((s) => { 
        const div = document.createElement('div'); div.className = 'song-list-item';
        const art = getSongArt(s);
        let adminBtns = '';
        if(appConfig.isAdmin) {
            adminBtns = `
                <button class="btn-list-action" style="background:rgba(255,255,255,0.1); margin-right:5px" onclick="editSong(event, ${s.id})"><span class="material-icons-round" style="font-size:1.1rem">edit</span></button>
                <button class="btn-list-action" style="background:rgba(255,71,87,0.1);color:#ff4757" onclick="deleteSong(event, ${s.id})"><span class="material-icons-round">delete</span></button>
            `;
        }
        div.innerHTML = `<div class="song-cover" style="background-image: url('${art}')" onerror="this.style.backgroundImage='url(${DEFAULT_COVER})'"></div><div class="song-info"><div class="song-title">${s.title || 'Sin Título'}</div><div class="song-artist">${s.genre || s.album || 'General'}</div></div><div class="song-actions"><button class="btn-list-action" onclick="playSongId(${s.id})"><span class="material-icons-round">play_arrow</span></button>${adminBtns}</div>`;
        div.onclick = (e) => { if(e.target.tagName === 'BUTTON' || e.target.closest('button')) return; playSong(s); };
        c.appendChild(div);
    });
}

// UPLOAD & EDIT
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
            showToast("Canción actualizada", 'success');
        }
    } else {
        appConfig.data.songs.push({ id: Date.now(), title, genre: dom.upGenre.value, album: dom.upAlbum.value, url: url, cover: '', plays: 0, likes: [] });
        showToast("Canción subida", 'success');
    }
    
    await saveData(); 
    updateUI(); 
    closeModal('dom_modal_upload'); 
}

window.openUpload = function() {
    appConfig.editingSongId = null;
    if(dom.modalUploadTitle) dom.modalUploadTitle.textContent = "Subir Canción";
    if(dom.btnUploadSubmit) dom.btnUploadSubmit.textContent = "Subir";
    dom.upTitle.value = ''; dom.upGenre.value = ''; dom.upUrl.value = '';
    
    const sel = document.getElementById('upAlbum');
    sel.innerHTML = '<option value="">Sin Álbum</option>';
    appConfig.data.albums.forEach(a => { const opt = document.createElement('option'); opt.value = a.title; opt.textContent = a.title; sel.appendChild(opt); });

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
    appConfig.data.albums.forEach(a => { const opt = document.createElement('option'); opt.value = a.title; opt.textContent = a.title; sel.appendChild(opt); });
    sel.value = song.album || "";

    openModal('dom_modal_upload');
}

// CREAR USUARIO
window.do_create_user_modal = async function() {
    const name = document.getElementById('newUser_Name').value.trim();
    const email = document.getElementById('newUser_Email').value.trim();
    const pass = document.getElementById('newUser_Pass').value;
    
    if(!name || !email || !pass) return showToast("Faltan datos", 'error');
    
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
        if(appConfig.isAdmin) adminBtns = `<div class="album-admin-tools"><button class="btn-alb-tool" style="background:#333" onclick="editAlbum(event, ${index})">✏️</button><button class="btn-alb-tool" style="background:#ff4757" onclick="deleteAlbum(event, ${index})">🗑️</button></div>`;
        div.innerHTML = `<div class="collection-cover" style="background-image: url('${art}')" onerror="this.style.backgroundImage='url(${DEFAULT_COVER})'"></div><h4>${name}</h4>${adminBtns}`;
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
    else { songs.forEach(s => { const item = document.createElement('div'); item.className = 'song-list-item'; item.innerHTML = `<div class="song-info"><div class="song-title">${s.title}</div><div class="song-artist">${s.genre}</div></div><span class="material-icons-round" style="color:var(--accent)">play_circle</span>`; item.onclick = () => { playSong(s); closeModal('dom_modal_pl_detail'); }; list.appendChild(item); }); }
    modal.style.display = 'flex';
}

function renderSmartPlaylists(id) {
    const c = document.getElementById(id); if(!c) return; c.innerHTML = '';
    const createCard = (t,s,img,grad,fn) => { const d=document.createElement('div'); d.className='collection-card'; d.innerHTML=`<div class="collection-cover pl-icon-bg ${grad}" style="background-image:url('${img}')"></div><h4>${t}</h4>`; d.onclick=fn; return d; };
    c.appendChild(createCard("Favoritos", "Likes", "https://cdn-icons-png.flaticon.com/512/833/833472.png", "grad-1", () => openSmartList('fav')));
    c.appendChild(createCard("Recientes", "Nuevas", "https://cdn-icons-png.flaticon.com/512/826/826963.png", "grad-2", () => openSmartList('recent')));
    c.appendChild(createCard("Top Hits", "Más oídas", "https://cdn-icons-png.flaticon.com/512/651/651717.png", "grad-3", () => openSmartList('top')));
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
    if(songs.length === 0) list.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Lista vacía.</div>';
    else {
        songs.forEach(s => { const item = document.createElement('div'); item.className = 'song-list-item'; item.innerHTML = `<div class="song-info"><div class="song-title">${s.title}</div></div><span class="material-icons-round" style="color:var(--accent)">play_circle</span>`; item.onclick = () => { playSong(s); closeModal('dom_modal_pl_detail'); }; list.appendChild(item); });
    }
    modal.style.display = 'flex';
}

window.openFullScreenPlayer = function() {
    if(!appConfig.currentSong) return;
    const song = appConfig.currentSong;
    const art = getSongArt(song);
    if(dom.guestTitle) dom.guestTitle.textContent = song.title;
    if(dom.guestArtist) dom.guestArtist.textContent = song.genre;
    if(dom.guestCover) dom.guestCover.style.backgroundImage = `url('${art}')`;
    updateLikeIcon();
    
    if(dom.mainPlayer) dom.mainPlayer.classList.add('hidden');
    
    // LIMPIEZA TOTAL DE BARRAS PREVIAS
    const infoArea = document.querySelector('.guest-info-area');
    infoArea.querySelectorAll('.progress-container').forEach(e => e.remove()); 

    const sliderDiv = document.createElement('div');
    sliderDiv.className = 'progress-container';
    sliderDiv.innerHTML = `<span id="expCurTime" class="time-display">0:00</span><input type="range" id="expandedSeekSlider" value="0" min="0" max="100" oninput="seekAudio(event)"><span id="expTotTime" class="time-display">0:00</span>`;
    infoArea.appendChild(sliderDiv);
    
    // INYECTAR CONTROLES
    const controlsContainer = document.querySelector('.guest-controls-main');
    if(controlsContainer) {
        controlsContainer.innerHTML = `
            <span class="material-icons-round btn-guest-action" style="color:${appConfig.isShuffle?'var(--accent)':'white'}" onclick="toggleShuffle()">shuffle</span>
            <span class="material-icons-round btn-guest-action" style="font-size:3rem" onclick="prev()">skip_previous</span>
            <span class="material-icons-round btn-guest-action" id="iconPlayBig" style="font-size:4.5rem" onclick="togglePlay()">pause</span>
            <span class="material-icons-round btn-guest-action" style="font-size:3rem" onclick="next()">skip_next</span>
            <span class="material-icons-round btn-guest-action" style="color:${appConfig.isRepeat?'var(--accent)':'white'}" onclick="toggleRepeat()">repeat</span>
        `;
    }
    
    showView('view-guest-player');
}

// LOGICA NAVEGACION
window.toggleShuffle = () => { appConfig.isShuffle = !appConfig.isShuffle; openFullScreenPlayer(); };
window.toggleRepeat = () => { appConfig.isRepeat = !appConfig.isRepeat; openFullScreenPlayer(); };
window.prev = () => showToast("Anterior", 'info');
window.next = () => showToast("Siguiente", 'info');
window.togglePlay = () => { if(dom.audioElement.paused) dom.audioElement.play(); else dom.audioElement.pause(); };

window.closePlayer = function() {
    const fs = document.getElementById('view-guest-player');
    if(fs && fs.style.display === 'flex') {
        showView(appConfig.isAdmin ? 'view-admin' : 'view-user');
        if(dom.mainPlayer) dom.mainPlayer.classList.remove('hidden');
    } else {
        if(dom.mainPlayer) { dom.mainPlayer.style.display = 'none'; dom.mainPlayer.classList.remove('hidden'); }
        if(dom.audioElement) dom.audioElement.pause();
        appConfig.currentSong = null;
    }
}
window.exitFullScreenPlayer = window.closePlayer;

function playSong(song) {
    appConfig.currentSong = song;
    if(dom.mainPlayer) { dom.mainPlayer.style.display = 'flex'; dom.mainPlayer.classList.remove('hidden'); }
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

function updateLikeIcon() {
    if(!appConfig.currentSong) return;
    const userEmail = appConfig.user?.email || "guest";
    const likes = appConfig.currentSong.likes || [];
    const isLiked = likes.includes(userEmail);
    const iconName = isLiked ? 'favorite' : 'favorite_border';
    const color = isLiked ? 'var(--accent)' : '#aaa';
    if(dom.pLikeBtn) { dom.pLikeBtn.textContent = iconName; dom.pLikeBtn.style.color = color; }
    if(dom.guestLikeBtn) { dom.guestLikeBtn.querySelector('span').textContent = iconName; dom.guestLikeBtn.style.color = color; }
}
window.toggleLikeCurrent = async function() {
    if(!appConfig.currentSong || appConfig.isGuest) return;
    const songId = appConfig.currentSong.id;
    const songIdx = appConfig.data.songs.findIndex(s => s.id === songId);
    if(songIdx === -1) return;
    const userEmail = appConfig.user.email;
    let likes = appConfig.data.songs[songIdx].likes || [];
    if(likes.includes(userEmail)) likes = likes.filter(e => e !== userEmail); else likes.push(userEmail);
    appConfig.data.songs[songIdx].likes = likes; appConfig.currentSong.likes = likes;
    updateLikeIcon(); await saveData();
}
window.playSongId = (id) => { const s = appConfig.data.songs.find(x => x.id === id); if(s) playSong(s); };
function togglePlayIcon(isPlaying) { const txt = isPlaying ? 'pause' : 'play_arrow'; if(dom.iconPlay) dom.iconPlay.textContent = txt; const iconBig = document.getElementById('iconPlayBig'); if(iconBig) iconBig.textContent = txt; }
async function saveData() { try { await fetch(`${API_BASE_URL}${PERMANENT_BIN_ID}`, { method: 'PUT', headers: { 'X-Master-Key': PERMANENT_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(appConfig.data) }); } catch(e) { showToast("Error guardando", 'error'); } }
async function saveDataSilent() { try { await fetch(`${API_BASE_URL}${PERMANENT_BIN_ID}`, { method: 'PUT', headers: { 'X-Master-Key': PERMANENT_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(appConfig.data) }); } catch(e) {} }
window.deleteSong = async function(e, songId) { e.stopPropagation(); if(!confirm("¿Eliminar?")) return; appConfig.data.songs = appConfig.data.songs.filter(s => s.id !== songId); await saveData(); showToast("Eliminado", 'success'); updateUI(); }
window.editAlbum = function(e, index) { e.stopPropagation(); const album = appConfig.data.albums[index]; appConfig.editingAlbumIndex = index; if(dom.editAlbName) dom.editAlbName.value = album.title || album.name || ''; if(dom.editAlbArtist) dom.editAlbArtist.value = album.artist || ''; if(dom.editAlbCover) dom.editAlbCover.value = album.cover || album.img || ''; openModal('dom_modal_edit_album'); }
window.doSaveEditAlbum = async function() { const idx = appConfig.editingAlbumIndex; if(idx === null) return; appConfig.data.albums[idx] = { ...appConfig.data.albums[idx], title: dom.editAlbName.value, artist: dom.editAlbArtist.value, cover: dom.editAlbCover.value }; await saveData(); showToast("Álbum actualizado", 'success'); updateUI(); closeModal('dom_modal_edit_album'); }
window.do_create_album = async function() { const name = dom.newAlbName.value.trim(); if(!name) return; appConfig.data.albums.push({ title: name, artist: dom.newAlbArtist.value, cover: dom.newAlbCoverUrl.value || DEFAULT_COVER }); await saveData(); showToast("Creado", 'success'); updateUI(); closeModal('dom_modal_album'); }
window.do_upload = async function() { const title = dom.upTitle.value.trim(); if(!title) return; appConfig.data.songs.push({ id: Date.now(), title, genre: dom.upGenre.value, album: dom.upAlbum.value, url: dom.upUrl.value, cover: '', plays: 0, likes: [] }); await saveData(); showToast("Subida", 'success'); updateUI(); closeModal('dom_modal_upload'); }
window.shareCurrentSong = async function() { if(!appConfig.currentSong) return; const shareUrl = `${window.location.origin}${window.location.pathname}?s=${appConfig.currentSong.id}`; const textMsg = `Esta canción ministró mi vida y tienes que escucharla:\n\n🎵 ${appConfig.currentSong.title}\n— En MusiChris App\n\nEntra directo con este pase de invitado:\n${shareUrl}`; const data = { title: 'MusiChris', text: textMsg, url: shareUrl }; try { if(navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(textMsg); showToast("Mensaje copiado", 'success'); } } catch(e) {} }
async function handleLoginAttempt() { const email = dom.loginEmail.value.trim().toLowerCase(); const pass = dom.loginPass.value.trim(); if (email === 'hjalmar' && pass === '258632') { doLogin({ name: 'Hjalmar', email: 'hjalmar@gmail.com', role: 'admin', avatar: ADMIN_AVATAR }); return; } if (!appConfig.data) await loadAppData(); const user = appConfig.data?.users?.find(u => u.email.toLowerCase() === email); if (user && pass === (user.password || '123')) doLogin(user); else showToast("Error", 'error'); }
function doLogin(user) { appConfig.user = user; appConfig.isLoggedIn = true; appConfig.isAdmin = (user.role === 'admin'); localStorage.setItem('appConfig', JSON.stringify({ user, isLoggedIn: true, isAdmin: appConfig.isAdmin })); showView(appConfig.isAdmin ? 'view-admin' : 'view-user'); loadAppData(); }
window.app_logout = () => { if(dom.audioElement) dom.audioElement.pause(); if(dom.mainPlayer) dom.mainPlayer.style.display='none'; localStorage.removeItem('appConfig'); location.reload(); };
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
window.changeAvatar = function() { appConfig.user.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.floor(Math.random()*999)}`; if(dom.profilePreview) dom.profilePreview.src = appConfig.user.avatar; }
window.do_save_profile = async function() { appConfig.data.users.find(u => u.email === appConfig.user.email).avatar = appConfig.user.avatar; await saveData(); closeModal('dom_modal_profile'); }
window.deleteAlbum = async function(e, i) { e.stopPropagation(); if(confirm("¿Borrar?")) { appConfig.data.albums.splice(i,1); await saveData(); updateUI(); } }
window.deleteUser = async function(i) { if(confirm("¿Borrar?")) { appConfig.data.users.splice(i,1); await saveData(); updateUI(); } }
function renderUserList(id, users) { const c = document.getElementById(id); if(!c) return; c.innerHTML = ''; users.forEach((u, index) => { const div = document.createElement('div'); div.className = 'user-list-item'; div.innerHTML = `<div class="user-info"><img src="${u.avatar || DEFAULT_COVER}" style="width:30px;height:30px;border-radius:50%;margin-right:10px;object-fit:cover"><span>${u.name}</span><span class="role-badge ${u.role==='admin'?'role-admin':''}">${u.role}</span></div><div style="display:flex;gap:5px"><button class="btn-delete-user" onclick="deleteUser(${index})"><span class="material-icons-round">delete</span></button></div>`; c.appendChild(div); }); }
function loadConfig() { const saved = localStorage.getItem('appConfig'); if (saved) { const p = JSON.parse(saved); appConfig.user = p.user; appConfig.isLoggedIn = p.isLoggedIn; appConfig.isAdmin = p.isAdmin; } if (appConfig.isLoggedIn && appConfig.user) { showView(appConfig.isAdmin ? 'view-admin' : 'view-user'); loadAppData(); } else { showView('view-login'); } }
