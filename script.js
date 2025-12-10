/**
 * MusiChris App V18.0 - FINAL FIX
 * Soluciona el error de sintaxis "view-login" que bloqueaba la app.
 */

const API_BASE_URL = "https://api.jsonbin.io/v3/b/";
const ADMIN_AVATAR = "https://i.ibb.co/68038m8/chris-admin.png";
const DEFAULT_COVER = "https://i.ibb.co/3WqP7tX/default-cover.png";

// TUS CLAVES REALES
const LOCAL_BIN_ID = "69349a76ae596e708f880e31"; 
const LOCAL_API_KEY = "$2a$10$ME7fO8Oqq2iWhHkYQKGQsu0M6PqJ8d1ymFBxHVhhxFJ70BcAg1FZe";

let appConfig = {
    BIN_ID: LOCAL_BIN_ID, API_KEY: LOCAL_API_KEY, data: null, user: null, isLoggedIn: false,
    isAdmin: false, activeSongId: null, currentPlaylist: [], 
    currentPlaylistIndex: -1, isShuffling: false, repeatMode: 'none', 
    eq: { low: 0, mid: 0, high: 0 }
};

const dom = {};
const audio = { element: null, context: null };
let visualizerInterval = null;

function showToast(message, type = 'info') {
    const toast = document.getElementById('customToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `customToast show ${type}`;
    setTimeout(() => { toast.className = toast.className.replace(" show", ""); }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Mapeo seguro de elementos
    const ids = ['view-login', 'view-admin', 'view-user', 'loginEmail', 'loginPass', 'btnLoginBtn', 'audioElement', 'customToast', 'statsTotalSongs', 'statsTotalUsers', 'storageText', 'storageBar', 'adminAvatar', 'adminNameDisplay', 'userAvatarImg', 'userGreeting', 'userAnnouncement', 'announcementText', 'guestNotice', 'view-guest-player', 'guestTitle', 'guestArtist', 'guestCover', 'seekSlider', 'guestSeekSlider', 'mainPlayer', 'pTitle', 'pArtist', 'pCover', 'btnTogglePass'];
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) dom[id] = el;
    });

    if (dom['btnLoginBtn']) {
        dom['btnLoginBtn'].addEventListener('click', handleLoginAttempt);
    }
    
    audio.element = dom['audioElement'];
    loadConfig();
    
    if (audio.element) audio.element.addEventListener('ended', onSongEnded);
    if (dom['btnTogglePass']) dom['btnTogglePass'].addEventListener('click', togglePasswordVisibility);
});

function loadConfig() {
    const saved = localStorage.getItem('appConfig');
    if (saved) Object.assign(appConfig, JSON.parse(saved));
    
    // Asegurar claves
    if (!appConfig.BIN_ID || appConfig.BIN_ID.length < 10) {
        appConfig.BIN_ID = LOCAL_BIN_ID;
        appConfig.API_KEY = LOCAL_API_KEY;
    }

    if (appConfig.isLoggedIn && appConfig.user) {
        showView(appConfig.isAdmin ? 'view-admin' : 'view-user');
        loadAppData();
    } else {
        showView('view-login');
    }
}

function saveConfig() {
    localStorage.setItem('appConfig', JSON.stringify(appConfig));
}

function showView(viewId) {
    // 1. Ocultar todo
    document.querySelectorAll('.view-section').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });

    // 2. Mostrar target
    const target = document.getElementById(viewId);
    if (target) {
        target.style.display = 'block'; // Forzar display block
        setTimeout(() => target.classList.add('active'), 10);
    }
}

function togglePasswordVisibility() {
    const pass = dom['loginPass'];
    if(pass.type === "password") {
        pass.type = "text";
        dom['btnTogglePass'].textContent = "visibility";
    } else {
        pass.type = "password";
        dom['btnTogglePass'].textContent = "visibility_off";
    }
}

async function handleLoginAttempt() {
    const email = dom['loginEmail'].value.trim().toLowerCase();
    const password = dom['loginPass'].value.trim();

    if (!email || !password) return showToast("Faltan datos", 'error');

    // ADMIN BYPASS
    if (email === 'hjalmar' && password === '258632') {
        appConfig.user = { name: 'Hjalmar', email: 'hjalmar@gmail.com', role: 'admin', avatar: ADMIN_AVATAR };
        appConfig.isLoggedIn = true;
        appConfig.isAdmin = true;
        saveConfig();
        showView('view-admin'); 
        await loadAppData(); 
        return;
    }

    // USER LOGIN
    if (!appConfig.data) await loadAppData();
    
    const userFound = appConfig.data?.users?.find(u => u.email.toLowerCase() === email);
    
    if (userFound) {
        const validPass = userFound.password || '123';
        if (password === validPass) {
            appConfig.user = userFound;
            appConfig.isLoggedIn = true;
            appConfig.isAdmin = userFound.role === 'admin';
            saveConfig();
            showView(appConfig.isAdmin ? 'view-admin' : 'view-user');
            loadAppData(); // Recargar para asegurar datos
        } else {
            showToast("Contraseña incorrecta", 'error');
        }
    } else {
        showToast("Usuario no encontrado", 'error');
    }
}

async function loadAppData() {
    try {
        const response = await fetch(`${API_BASE_URL}${appConfig.BIN_ID}`, {
            headers: { 'X-Master-Key': appConfig.API_KEY }
        });
        
        if (!response.ok) throw new Error("Error API");
        
        const json = await response.json();
        appConfig.data = json.record;
        
        // Inicializar arrays vacíos si fallan
        if (!appConfig.data.songs) appConfig.data.songs = [];
        if (!appConfig.data.users) appConfig.data.users = [];
        if (!appConfig.data.albums) appConfig.data.albums = [];
        if (!appConfig.data.playlists) appConfig.data.playlists = [];

        updateUI();
        
    } catch (error) {
        console.error(error);
        showToast("Error al cargar datos. Revisa conexión.", 'error');
    }
}

function updateUI() {
    // Actualizar Estadísticas Admin
    if (dom['statsTotalSongs']) dom['statsTotalSongs'].textContent = appConfig.data.songs.length;
    if (dom['statsTotalUsers']) dom['statsTotalUsers'].textContent = appConfig.data.users.length;
    
    // Renderizar Listas
    if (appConfig.isAdmin) {
        renderSongList(appConfig.data.songs, 'adminSongList', true);
        if(dom['adminNameDisplay']) dom['adminNameDisplay'].textContent = appConfig.user.name;
        if(dom['adminAvatar']) dom['adminAvatar'].src = appConfig.user.avatar || ADMIN_AVATAR;
    } else {
        renderSongList(appConfig.data.songs, 'userSongList', false);
        if(dom['userGreeting']) dom['userGreeting'].textContent = `Hola, ${appConfig.user.name}`;
        if(dom['userAvatarImg']) dom['userAvatarImg'].src = appConfig.user.avatar || ADMIN_AVATAR;
    }
}

function renderSongList(songs, containerId, isAdmin) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    songs.forEach(song => {
        const div = document.createElement('div');
        div.className = 'song-list-item';
        div.innerHTML = `
            <div class="song-cover" style="background-image: url('${song.cover || DEFAULT_COVER}')"></div>
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.genre}</div>
            </div>
            <div class="song-actions">
                <button class="btn-list-action"><span class="material-icons-round">play_arrow</span></button>
            </div>
        `;
        div.onclick = () => playSong(song);
        container.appendChild(div);
    });
}

function playSong(song) {
    if(!song) return;
    appConfig.activeSongId = song.id;
    
    const player = document.getElementById('mainPlayer');
    const audioEl = dom['audioElement'];
    
    if(player) player.style.display = 'flex';
    if(dom['pTitle']) dom['pTitle'].textContent = song.title;
    if(dom['pArtist']) dom['pArtist'].textContent = song.genre;
    if(dom['pCover']) dom['pCover'].style.backgroundImage = `url('${song.cover || DEFAULT_COVER}')`;
    
    if(audioEl) {
        audioEl.src = song.url;
        audioEl.play().catch(e => console.log("Play error", e));
    }
}

function toggle_play() {
    const audioEl = dom['audioElement'];
    if(audioEl.paused) audioEl.play();
    else audioEl.pause();
}

// Funciones Dummy para botones que faltan lógica completa en esta versión mini
function app_logout() {
    appConfig.isLoggedIn = false;
    appConfig.user = null;
    saveConfig();
    location.reload(); 
}

// Tabs System
window.switchTab = function(tabId, btn) {
    const container = btn.closest('.container');
    container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    container.querySelectorAll('.list-tab-content').forEach(c => c.classList.remove('active'));
    const target = document.getElementById(tabId);
    if(target) target.classList.add('active');
}

// Modales System
window.openModal = function(id) {
    const m = document.getElementById(id);
    if(m) m.style.display = 'flex';
}
window.closeModal = function(id) {
    const m = document.getElementById(id);
    if(m) m.style.display = 'none';
}

// Controladores visuales extra
window.openProfile = () => openModal('dom_modal_profile');
window.openUpload = () => openModal('dom_modal_upload');
window.toggleMinimize = () => { document.getElementById('mainPlayer').classList.toggle('minimized'); };
window.closePlayer = () => { 
    document.getElementById('mainPlayer').style.display = 'none'; 
    dom['audioElement'].pause();
};
