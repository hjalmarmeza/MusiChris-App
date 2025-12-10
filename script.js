/**
 * MusiChris App V30.0 - FINAL STABLE
 * - Restaura la función de ANUNCIOS (do_save_announce).
 * - Repara la coincidencia de canciones en álbumes (trim + lowercase).
 * - Mantiene claves blindadas y avatares.
 */

// =========================================================================
// 1. CONFIGURACIÓN BLINDADA
// =========================================================================
const API_BASE_URL = "https://api.jsonbin.io/v3/b/";
const DEFAULT_COVER = "https://i.ibb.co/3WqP7tX/default-cover.png";

// CLAVES MAESTRAS
const PERMANENT_BIN_ID = "69349a76ae596e708f880e31"; 
const PERMANENT_API_KEY = "$2a$10$ME7fO8Oqq2iWhHkYQKGQsu0M6PqJ8d1ymFBxHVhhxFJ70BcAg1FZe";
const ADMIN_AVATAR = "https://api.dicebear.com/9.x/avataaars/svg?seed=Chris"; 

let appConfig = {
    BIN_ID: PERMANENT_BIN_ID, 
    API_KEY: PERMANENT_API_KEY,
    data: null, user: null, isLoggedIn: false, isAdmin: false, currentSong: null,
    tempPlaylist: []
};

const dom = {};
// Helper mejorado: Normaliza texto para comparaciones seguras
const norm = (str) => (str || '').toString().toLowerCase().trim().replace(/\s+/g, ' '); 

// =========================================================================
// 2. INICIO
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Mapeo completo de IDs
    const ids = [
        'view-login', 'view-admin', 'view-user', 'loginEmail', 'loginPass', 'btnLoginBtn', 
        'audioElement', 'customToast', 'statsTotalSongs', 'statsTotalUsers', 'adminAvatar', 
        'adminNameDisplay', 'userAvatarImg', 'userGreeting', 'mainPlayer', 'pTitle', 
        'pArtist', 'pCover', 'iconPlay', 'btnTogglePass', 'dom_modal_pl_detail', 
        'plDetailTitle', 'plDetailList', 'dom_modal_profile', 'profileName', 'profileEmail', 'profilePreview',
        'dom_modal_upload', 'upTitle', 'upGenre', 'upAlbum', 'upUrl', 'dom_modal_album', 
        'newAlbName', 'newAlbArtist', 'newAlbCoverUrl', 
        'dom_modal_settings', 'cfgBinId', 'cfgApiKey',
        'dom_modal_announcement', 'announcementInput', 'userAnnouncement', 'announcementText' // IDs de anuncio
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
    }
    
    // Forzar claves
    appConfig.BIN_ID = PERMANENT_BIN_ID;
    appConfig.API_KEY = PERMANENT_API_KEY;
    
    loadConfig();
});

function showToast(msg, type = 'info') {
    const t = document.getElementById('customToast');
    if(t) { t.textContent = msg; t.className = `customToast show ${type}`; setTimeout(() => t.className = t.className.replace(" show",""), 3000); }
}

// =========================================================================
// 3. IMÁGENES
// =========================================================================
function getArt(item) {
    if (!item) return DEFAULT_COVER;
    return item.cover || item.img || item.image || item.coverUrl || DEFAULT_COVER;
}

function getSongArt(song) {
    let art = song.cover || song.img || song.image;
    if (art) return art;
    if (song.album && appConfig.data && appConfig.data.albums) {
        const target = norm(song.album);
        const album = appConfig.data.albums.find(a => norm(a.title || a.name) === target);
        if (album) return getArt(album);
    }
    return DEFAULT_COVER;
}

// =========================================================================
// 4. VISTAS Y DATOS
// =========================================================================
function showView(viewId) {
    ['view-login','view-admin','view-user','view-guest-player'].forEach(id => {
        const el = document.getElementById(id); if(el) { el.style.display='none'; el.classList.remove('active'); }
    });
    const t = document.getElementById(viewId);
    if(t) { t.style.display = (viewId === 'view-login' ? 'flex' : 'block'); setTimeout(()=>t.classList.add('active'),10); }
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

        updateUI();
    } catch(e) { console.error(e); showToast("Conectando...", 'info'); }
}

function updateUI() {
    if(dom.statsTotalSongs && appConfig.data) dom.statsTotalSongs.textContent = appConfig.data.songs.length;
    if(dom.statsTotalUsers && appConfig.data) dom.statsTotalUsers.textContent = appConfig.data.users.length;
    
    renderSongList(appConfig.isAdmin ? 'adminSongList' : 'userSongList', appConfig.data.songs);
    renderAlbumGrid(appConfig.isAdmin ? 'adminAlbumGrid' : 'userAlbumGrid', appConfig.data.albums);
    if(appConfig.isAdmin) renderUserList('usersListGrid', appConfig.data.users);
    
    const avatar = appConfig.user?.avatar || ADMIN_AVATAR;
    if(dom.adminAvatar) dom.adminAvatar.src = avatar;
    if(dom.userAvatarImg) dom.userAvatarImg.src = avatar;
    
    if(dom.adminNameDisplay) dom.adminNameDisplay.textContent = appConfig.user?.name || 'Admin';
    if(dom.userGreeting) dom.userGreeting.textContent = `Hola, ${appConfig.user?.name || 'Usuario'}`;
    
    // MOSTRAR ANUNCIO SI EXISTE
    if(dom.userAnnouncement && dom.announcementText) {
        if(appConfig.data.announcement) {
            dom.userAnnouncement.style.display = 'block';
            dom.announcementText.textContent = appConfig.data.announcement;
        } else {
            dom.userAnnouncement.style.display = 'none';
        }
    }
}

// =========================================================================
// 5. RENDERIZADO
// =========================================================================
function renderSongList(id, songs) {
    const c = document.getElementById(id); if(!c) return; c.innerHTML = '';
    songs.forEach(s => {
        const div = document.createElement('div'); div.className = 'song-list-item';
        const art = getSongArt(s);
        div.innerHTML = `
            <div class="song-cover" style="background-image: url('${art}')"></div>
            <div class="song-info"><div class="song-title">${s.title || 'Sin Título'}</div><div class="song-artist">${s.genre || 'Desconocido'}</div></div>
            <div class="song-actions"><button class="btn-list-action"><span class="material-icons-round">play_arrow</span></button></div>
        `;
        div.onclick = () => playSong(s);
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
        if(appConfig.isAdmin) {
            adminBtns = `
            <div style="display:flex; justify-content:center; gap:10px; margin-top:5px; z-index:10; position:relative">
                <button class="btn-icon" style="width:25px;height:25px;background:#333" onclick="editAlbum(event, ${index})">✏️</button>
                <button class="btn-icon" style="width:25px;height:25px;background:var(--danger)" onclick="deleteAlbum(event, ${index})">🗑️</button>
            </div>`;
        }
        
        div.innerHTML = `<div class="collection-cover" style="background-image: url('${art}')"></div><h4>${name}</h4><p>${a.artist || 'Varios'}</p>${adminBtns}`;
        div.onclick = (e) => { if(e.target.tagName === 'BUTTON') return; openAlbumDetail(a); };
        c.appendChild(div);
    });
}

function openAlbumDetail(album) {
    const modal = dom.dom_modal_pl_detail; if(!modal) return;
    
    // FILTRO CORRECTO
    const target = norm(album.title || album.name);
    // Filtramos comparando el nombre normalizado
    const songs = appConfig.data.songs.filter(s => norm(s.album) === target);
    
    appConfig.tempPlaylist = songs;
    if(dom.plDetailTitle) dom.plDetailTitle.textContent = album.title || album.name;
    const list = dom.plDetailList; list.innerHTML = '';
    
    if(songs.length === 0) list.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Álbum vacío.<br><small style="font-size:0.7rem">Verifica que el nombre del álbum en la canción sea idéntico.</small></div>';
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

function renderUserList(id, users) {
    const c = document.getElementById(id); if(!c) return; c.innerHTML = '';
    users.forEach((u, index) => {
        const div = document.createElement('div'); div.className = 'user-list-item';
        div.innerHTML = `
            <div class="user-info">
                <img src="${u.avatar || DEFAULT_COVER}" style="width:30px;height:30px;border-radius:50%;margin-right:10px;object-fit:cover">
                <span>${u.name}</span>
                <span class="user-role role-${u.role}" style="font-size:0.7rem;margin-left:5px;padding:2px 6px;border-radius:4px;background:${u.role==='admin'?'var(--accent)':'#3498db'}">${u.role}</span>
            </div>
            <div style="display:flex;gap:5px">
                <button class="btn-icon" style="width:30px;height:30px;background:var(--danger)" onclick="deleteUser(${index})"><span class="material-icons-round">delete</span></button>
            </div>
        `;
        c.appendChild(div);
    });
}

// =========================================================================
// 6. FUNCIONES DE ACCIÓN (AQUÍ ESTÁ LA DE ANUNCIO)
// =========================================================================
window.do_create_album = async function() {
    const name = dom.newAlbName.value.trim();
    const artist = dom.newAlbArtist.value.trim();
    const cover = dom.newAlbCoverUrl.value.trim();
    if(!name) return showToast("Título obligatorio", 'error');
    appConfig.data.albums.push({ title: name, artist: artist || "Varios", cover: cover || DEFAULT_COVER });
    await saveData();
    showToast("Álbum creado", 'success');
    updateUI(); closeModal('dom_modal_album');
    dom.newAlbName.value = ''; dom.newAlbArtist.value = ''; dom.newAlbCoverUrl.value = '';
}

window.do_upload = async function() {
    const title = dom.upTitle.value.trim();
    const genre = dom.upGenre.value;
    const album = dom.upAlbum.value;
    const url = dom.upUrl.value.trim();
    if(!title || !url) return showToast("Faltan datos", 'error');
    appConfig.data.songs.push({ id: Date.now(), title, genre, album, url, cover: '' });
    await saveData();
    showToast("Canción subida", 'success');
    updateUI(); closeModal('dom_modal_upload');
    dom.upTitle.value = ''; dom.upUrl.value = '';
}

// *** ¡AQUÍ ESTÁ LA FUNCIÓN QUE FALTABA! ***
window.do_save_announce = async function() {
    const input = document.getElementById('announcementInput');
    if(!input) return;
    const text = input.value.trim();
    
    if(!text) {
        appConfig.data.announcement = ""; // Borrar anuncio
        showToast("Anuncio eliminado", 'info');
    } else {
        appConfig.data.announcement = text;
        showToast("Anuncio publicado", 'success');
    }
    
    await saveData();
    updateUI();
    closeModal('dom_modal_announcement');
    input.value = '';
}

window.do_save_profile = async function() {
    if(dom.profileName) appConfig.user.name = dom.profileName.value;
    const idx = appConfig.data.users.findIndex(u => u.email === appConfig.user.email);
    if(idx !== -1) {
        appConfig.data.users[idx] = appConfig.user;
        await saveData();
        showToast("Perfil guardado", 'success');
        updateUI(); closeModal('dom_modal_profile');
    }
}

async function saveData() {
    try {
        await fetch(`${API_BASE_URL}${PERMANENT_BIN_ID}`, {
            method: 'PUT', headers: { 'X-Master-Key': PERMANENT_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(appConfig.data)
        });
    } catch(e) { showToast("Error guardando", 'error'); }
}

window.deleteAlbum = async function(e, index) { e.stopPropagation(); if(!confirm("¿Borrar?")) return; appConfig.data.albums.splice(index, 1); await saveData(); updateUI(); }
window.editAlbum = function(e, index) { e.stopPropagation(); showToast("Pendiente", 'info'); }
window.deleteUser = async function(index) { if(!confirm("¿Borrar?")) return; appConfig.data.users.splice(index, 1); await saveData(); updateUI(); }
window.do_save_settings = function() { showToast("Claves guardadas", 'success'); closeModal('dom_modal_settings'); }

// =========================================================================
// 7. UTILIDADES VISUALES Y GLOBALES
// =========================================================================
window.openProfile = function() {
    if(dom.profileName) dom.profileName.value = appConfig.user.name;
    if(dom.profileEmail) dom.profileEmail.value = appConfig.user.email;
    if(dom.profilePreview) dom.profilePreview.src = appConfig.user.avatar || ADMIN_AVATAR;
    openModal('dom_modal_profile');
}

window.changeAvatar = function() {
    const randomId = Math.floor(Math.random() * 9999);
    const newAv = `https://api.dicebear.com/9.x/avataaars/svg?seed=${randomId}`;
    if(dom.profilePreview) dom.profilePreview.src = newAv;
    appConfig.user.avatar = newAv;
}

// CORE EXPORTS
function playSong(song) {
    appConfig.currentSong = song;
    if(dom.mainPlayer) dom.mainPlayer.style.display = 'flex';
    const art = getSongArt(song);
    if(dom.pTitle) dom.pTitle.textContent = song.title;
    if(dom.pArtist) dom.pArtist.textContent = song.genre;
    if(dom.pCover) dom.pCover.style.backgroundImage = `url('${art}')`;
    if(dom.audioElement && song.url) {
        dom.audioElement.src = song.url;
        dom.audioElement.play().catch(e=>console.error(e));
        togglePlayIcon(true);
    }
}
function togglePlayIcon(isPlaying) {
    const txt = isPlaying ? 'pause' : 'play_arrow';
    if(dom.iconPlay) dom.iconPlay.textContent = txt;
}
async function handleLoginAttempt() {
    const email = dom.loginEmail.value.trim().toLowerCase();
    const pass = dom.loginPass.value.trim();
    if (email === 'hjalmar' && pass === '258632') {
        doLogin({ name: 'Hjalmar', email: 'hjalmar@gmail.com', role: 'admin', avatar: ADMIN_AVATAR });
        return;
    }
    if (!appConfig.data) await loadAppData();
    const user = appConfig.data?.users?.find(u => u.email.toLowerCase() === email);
    if (user && pass === (user.password || '123')) doLogin(user);
    else showToast("Error credenciales", 'error');
}
function doLogin(user) {
    appConfig.user = user; appConfig.isLoggedIn = true; appConfig.isAdmin = (user.role === 'admin');
    localStorage.setItem('appConfig', JSON.stringify({ user, isLoggedIn: true, isAdmin: appConfig.isAdmin }));
    showView(appConfig.isAdmin ? 'view-admin' : 'view-user');
    loadAppData();
}
function app_logout() {
    if(dom.audioElement) dom.audioElement.pause();
    if(dom.mainPlayer) dom.mainPlayer.style.display = 'none';
    localStorage.removeItem('appConfig');
    location.reload();
}

window.app_logout = app_logout;
window.toggle_play = () => { if(dom.audioElement.paused) dom.audioElement.play(); else dom.audioElement.pause(); };
window.playCollection = () => { if(appConfig.tempPlaylist[0]) { playSong(appConfig.tempPlaylist[0]); closeModal('dom_modal_pl_detail'); }};
window.do_create_album = window.do_create_album;
window.do_upload = window.do_upload;
window.do_save_announce = window.do_save_announce; // Exportado explícitamente

window.openModal = (id) => { 
    const e = document.getElementById(id); 
    if(e) e.style.display='flex'; 
    if(id === 'dom_modal_upload') {
        const sel = document.getElementById('upAlbum');
        if(sel) {
            sel.innerHTML = '<option value="">Sin Álbum</option>';
            appConfig.data.albums.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.title || a.name;
                opt.textContent = a.title || a.name;
                sel.appendChild(opt);
            });
        }
    }
    if(id === 'dom_modal_settings') {
        if(dom.cfgBinId) dom.cfgBinId.value = PERMANENT_BIN_ID;
        if(dom.cfgApiKey) dom.cfgApiKey.value = PERMANENT_API_KEY;
    }
};
window.closeModal = (id) => { const e = document.getElementById(id); if(e) e.style.display='none'; };
window.openUpload = () => window.openModal('dom_modal_upload');
window.switchTab = (id, btn) => {
    document.querySelectorAll('.list-tab-content, .tab-btn').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active'); btn.classList.add('active');
    if(id.includes('albums')) renderAlbumGrid(appConfig.isAdmin?'adminAlbumGrid':'userAlbumGrid', appConfig.data?.albums);
};
