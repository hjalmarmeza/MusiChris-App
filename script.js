/**
 * MusiChris App V23.0 - PLAYER VISIBILITY FIX
 * - Oculta el reproductor automáticamente al iniciar la App.
 * - Asegura que al cerrar sesión el reproductor desaparezca.
 * - Mantiene todas las funciones de imágenes y botones de la V22.
 */

// =========================================================================
// 1. CONFIGURACIÓN
// =========================================================================
const API_BASE_URL = "https://api.jsonbin.io/v3/b/";
const ADMIN_AVATAR = "https://i.ibb.co/68038m8/chris-admin.png";
const DEFAULT_COVER = "https://i.ibb.co/3WqP7tX/default-cover.png";
const LOCAL_BIN_ID = "69349a76ae596e708f880e31"; 
const LOCAL_API_KEY = "$2a$10$ME7fO8Oqq2iWhHkYQKGQsu0M6PqJ8d1ymFBxHVhhxFJ70BcAg1FZe";

let appConfig = {
    BIN_ID: LOCAL_BIN_ID, API_KEY: LOCAL_API_KEY,
    data: null, user: null, isLoggedIn: false, isAdmin: false, currentSong: null
};

const dom = {};

// =========================================================================
// 2. INICIO
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const ids = ['view-login', 'view-admin', 'view-user', 'loginEmail', 'loginPass', 'btnLoginBtn', 'audioElement', 'customToast', 'statsTotalSongs', 'statsTotalUsers', 'adminAvatar', 'adminNameDisplay', 'userAvatarImg', 'userGreeting', 'mainPlayer', 'pTitle', 'pArtist', 'pCover', 'iconPlay', 'btnTogglePass'];
    ids.forEach(id => { const el = document.getElementById(id); if(el) dom[id] = el; });

    // CORRECCIÓN CRÍTICA: Ocultar reproductor al iniciar
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
    
    loadConfig();
});

function showToast(msg, type = 'info') {
    const t = document.getElementById('customToast');
    if(t) { t.textContent = msg; t.className = `customToast show ${type}`; setTimeout(() => t.className = t.className.replace(" show",""), 3000); }
}

// =========================================================================
// 3. LOGICA DE IMÁGENES
// =========================================================================
function getArt(item) {
    if (!item) return DEFAULT_COVER;
    return item.cover || item.img || item.image || item.coverUrl || DEFAULT_COVER;
}

function getSongArt(song) {
    let art = song.cover || song.img || song.image;
    if (art) return art;
    if (song.album && appConfig.data && appConfig.data.albums) {
        const album = appConfig.data.albums.find(a => (a.title === song.album || a.name === song.album));
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
        const res = await fetch(`${API_BASE_URL}${appConfig.BIN_ID}`, { headers: {'X-Master-Key': appConfig.API_KEY} });
        if(!res.ok) throw new Error("API Error");
        const json = await res.json();
        appConfig.data = json.record;
        
        if(!appConfig.data.songs) appConfig.data.songs = [];
        if(!appConfig.data.users) appConfig.data.users = [];
        if(!appConfig.data.albums) appConfig.data.albums = [];

        updateUI();
    } catch(e) { console.error(e); showToast("Error de conexión", 'error'); }
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
    albums.forEach(a => {
        const div = document.createElement('div'); div.className = 'collection-card';
        const art = getArt(a);
        div.innerHTML = `<div class="collection-cover" style="background-image: url('${art}')"></div><h4>${a.title || a.name || 'Álbum'}</h4>`;
        c.appendChild(div);
    });
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
// 6. ACCIONES Y REPRODUCTOR
// =========================================================================
async function deleteUser(index) {
    if(!confirm("¿Seguro que quieres eliminar este usuario?")) return;
    appConfig.data.users.splice(index, 1);
    try {
        const res = await fetch(`${API_BASE_URL}${appConfig.BIN_ID}`, {
            method: 'PUT', headers: { 'X-Master-Key': appConfig.API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(appConfig.data)
        });
        if(res.ok) { showToast("Usuario eliminado", 'success'); updateUI(); }
    } catch(e) { showToast("Error al guardar", 'error'); }
}

function playSong(song) {
    appConfig.currentSong = song;
    if(dom.mainPlayer) dom.mainPlayer.style.display = 'flex';
    
    const art = getSongArt(song);
    if(dom.pTitle) dom.pTitle.textContent = song.title;
    if(dom.pArtist) dom.pArtist.textContent = song.genre;
    if(dom.pCover) dom.pCover.style.backgroundImage = `url('${art}')`;

    if(dom.audioElement && song.url) {
        dom.audioElement.src = song.url;
        dom.audioElement.play().catch(e => console.error(e));
        togglePlayIcon(true);
    }
}

function togglePlayIcon(isPlaying) {
    const txt = isPlaying ? 'pause' : 'play_arrow';
    if(dom.iconPlay) dom.iconPlay.textContent = txt;
}

// =========================================================================
// 7. LOGIN Y LOGOUT
// =========================================================================
async function handleLoginAttempt() {
    const email = dom.loginEmail.value.trim().toLowerCase();
    const pass = dom.loginPass.value.trim();
    if (!email || !pass) return showToast("Faltan datos", 'error');

    if (email === 'hjalmar' && pass === '258632') {
        doLogin({ name: 'Hjalmar', email: 'hjalmar@gmail.com', role: 'admin', avatar: ADMIN_AVATAR });
        return;
    }

    if (!appConfig.data) await loadAppData();
    const user = appConfig.data?.users?.find(u => u.email.toLowerCase() === email);
    
    if (user && pass === (user.password || '123')) {
        doLogin(user);
    } else {
        showToast("Credenciales incorrectas", 'error');
    }
}

function doLogin(user) {
    appConfig.user = user; appConfig.isLoggedIn = true; appConfig.isAdmin = (user.role === 'admin');
    localStorage.setItem('appConfig', JSON.stringify({ user, isLoggedIn: true, isAdmin: appConfig.isAdmin }));
    showView(appConfig.isAdmin ? 'view-admin' : 'view-user');
    loadAppData();
}

function app_logout() {
    // 1. Detener audio
    if(dom.audioElement) dom.audioElement.pause();
    // 2. Ocultar reproductor visualmente
    if(dom.mainPlayer) dom.mainPlayer.style.display = 'none';
    // 3. Borrar sesión
    localStorage.removeItem('appConfig');
    // 4. Recargar
    location.reload();
}

// GLOBALES
window.deleteUser = deleteUser;
window.toggle_play = () => { if(dom.audioElement.paused) dom.audioElement.play(); else dom.audioElement.pause(); };
window.app_logout = app_logout;
window.openModal = (id) => { const e = document.getElementById(id); if(e) e.style.display='flex'; };
window.closeModal = (id) => { const e = document.getElementById(id); if(e) e.style.display='none'; };
window.openProfile = () => window.openModal('dom_modal_profile');
window.openUpload = () => window.openModal('dom_modal_upload');
window.switchTab = (id, btn) => {
    document.querySelectorAll('.list-tab-content, .tab-btn').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active'); btn.classList.add('active');
    if(id.includes('albums')) renderAlbumGrid(appConfig.isAdmin?'adminAlbumGrid':'userAlbumGrid', appConfig.data?.albums);
};
