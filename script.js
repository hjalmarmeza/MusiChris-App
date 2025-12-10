/**
 * MusiChris App V19.0 - FINAL STABLE
 * Corrigiendo el error de sintaxis del guion (-) en los IDs
 * y forzando la carga de datos.
 */

// =========================================================================
// 1. CONFIGURACIÓN
// =========================================================================
const API_BASE_URL = "https://api.jsonbin.io/v3/b/";
const ADMIN_AVATAR = "https://i.ibb.co/68038m8/chris-admin.png";
const DEFAULT_COVER = "https://i.ibb.co/3WqP7tX/default-cover.png";

// CLAVES DE ACCESO DIRECTAS
const LOCAL_BIN_ID = "69349a76ae596e708f880e31"; 
const LOCAL_API_KEY = "$2a$10$ME7fO8Oqq2iWhHkYQKGQsu0M6PqJ8d1ymFBxHVhhxFJ70BcAg1FZe";

let appConfig = {
    BIN_ID: LOCAL_BIN_ID,
    API_KEY: LOCAL_API_KEY,
    data: null,
    user: null,
    isLoggedIn: false,
    isAdmin: false
};

// =========================================================================
// 2. INICIO Y DOM
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Event Listeners seguros
    const btnLogin = document.getElementById('btnLoginBtn');
    if (btnLogin) btnLogin.addEventListener('click', handleLoginAttempt);

    const btnPass = document.getElementById('btnTogglePass');
    if (btnPass) btnPass.addEventListener('click', togglePasswordVisibility);

    // Iniciar App
    loadConfig();
});

function showToast(message, type = 'info') {
    const toast = document.getElementById('customToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `customToast show ${type}`;
    setTimeout(() => { toast.className = toast.className.replace(" show", ""); }, 3000);
}

// =========================================================================
// 3. NAVEGACIÓN (CORE FIX)
// =========================================================================
function showView(viewId) {
    // 1. Ocultar TODAS las vistas a la fuerza
    const views = ['view-login', 'view-admin', 'view-user', 'view-guest-player'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.classList.remove('active');
        }
    });

    // 2. Mostrar la vista deseada
    const target = document.getElementById(viewId);
    if (target) {
        if (viewId === 'view-login') {
            target.style.display = 'flex';
        } else {
            target.style.display = 'block';
        }
        // Pequeño delay para la animación CSS
        setTimeout(() => target.classList.add('active'), 10);
    }
}

function loadConfig() {
    const saved = localStorage.getItem('appConfig');
    if (saved) {
        const parsed = JSON.parse(saved);
        appConfig.user = parsed.user;
        appConfig.isLoggedIn = parsed.isLoggedIn;
        appConfig.isAdmin = parsed.isAdmin;
    }

    // SIEMPRE asegurar las claves correctas
    appConfig.BIN_ID = LOCAL_BIN_ID;
    appConfig.API_KEY = LOCAL_API_KEY;

    if (appConfig.isLoggedIn && appConfig.user) {
        showView(appConfig.isAdmin ? 'view-admin' : 'view-user');
        loadAppData(); // Cargar datos inmediatamente
    } else {
        showView('view-login');
    }
}

function saveConfig() {
    localStorage.setItem('appConfig', JSON.stringify(appConfig));
}

// =========================================================================
// 4. DATOS Y API
// =========================================================================
async function loadAppData() {
    try {
        const response = await fetch(`${API_BASE_URL}${appConfig.BIN_ID}`, {
            method: 'GET',
            headers: {
                'X-Master-Key': appConfig.API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`Error API: ${response.status}`);

        const json = await response.json();
        appConfig.data = json.record;

        // Inicializar arrays vacíos si no existen para evitar errores
        if (!appConfig.data.songs) appConfig.data.songs = [];
        if (!appConfig.data.users) appConfig.data.users = [];

        updateUI();

    } catch (error) {
        console.error(error);
        showToast("Error conectando a la base de datos", 'error');
    }
}

function updateUI() {
    // Actualizar contadores
    const elSongs = document.getElementById('statsTotalSongs');
    const elUsers = document.getElementById('statsTotalUsers');
    
    if (elSongs && appConfig.data) elSongs.textContent = appConfig.data.songs.length;
    if (elUsers && appConfig.data) elUsers.textContent = appConfig.data.users.length;

    // Renderizar lista de canciones
    if (appConfig.isAdmin) {
        renderList('adminSongList', appConfig.data.songs);
        const adminName = document.getElementById('adminNameDisplay');
        const adminAvatar = document.getElementById('adminAvatar');
        if(adminName) adminName.textContent = appConfig.user.name;
        if(adminAvatar) adminAvatar.src = appConfig.user.avatar || ADMIN_AVATAR;
    } else {
        renderList('userSongList', appConfig.data.songs);
        const userName = document.getElementById('userGreeting');
        const userAvatar = document.getElementById('userAvatarImg');
        if(userName) userName.textContent = `Hola, ${appConfig.user.name}`;
        if(userAvatar) userAvatar.src = appConfig.user.avatar || ADMIN_AVATAR;
    }
}

function renderList(containerId, songs) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!songs || songs.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#666">No hay canciones aún.</div>';
        return;
    }

    songs.forEach(song => {
        const div = document.createElement('div');
        div.className = 'song-list-item';
        div.innerHTML = `
            <div class="song-cover" style="background-image: url('${song.cover || DEFAULT_COVER}')"></div>
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.genre}</div>
            </div>
        `;
        div.onclick = () => {
            showToast(`Reproduciendo: ${song.title}`, 'success');
            // Aquí iría la lógica completa de reproducción
        };
        container.appendChild(div);
    });
}

// =========================================================================
// 5. LOGIN Y UTILIDADES
// =========================================================================
async function handleLoginAttempt() {
    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPass');
    
    const email = emailEl.value.trim().toLowerCase();
    const password = passEl.value.trim();

    if (!email || !password) return showToast("Ingresa datos", 'error');

    // 1. ADMIN HARDCODED
    if (email === 'hjalmar' && password === '258632') {
        appConfig.user = { name: 'Hjalmar', email: 'hjalmar@gmail.com', role: 'admin', avatar: ADMIN_AVATAR };
        appConfig.isLoggedIn = true;
        appConfig.isAdmin = true;
        saveConfig();
        
        showView('view-admin');
        loadAppData();
        return;
    }

    // 2. USUARIO NORMAL
    if (!appConfig.data) await loadAppData();

    const user = appConfig.data?.users?.find(u => u.email.toLowerCase() === email);
    
    if (user) {
        const validPass = user.password || '123';
        if (password === validPass) {
            appConfig.user = user;
            appConfig.isLoggedIn = true;
            appConfig.isAdmin = user.role === 'admin';
            saveConfig();
            
            showView(appConfig.isAdmin ? 'view-admin' : 'view-user');
            loadAppData();
        } else {
            showToast("Contraseña incorrecta", 'error');
        }
    } else {
        showToast("Usuario no encontrado", 'error');
    }
}

function togglePasswordVisibility() {
    const passInput = document.getElementById('loginPass');
    const btn = document.getElementById('btnTogglePass');
    if (passInput.type === "password") {
        passInput.type = "text";
        btn.textContent = "visibility";
    } else {
        passInput.type = "password";
        btn.textContent = "visibility_off";
    }
}

function app_logout() {
    localStorage.removeItem('appConfig');
    location.reload();
}

// Exponer funciones globales para el HTML
window.app_logout = app_logout;
window.openModal = (id) => { const el = document.getElementById(id); if(el) el.style.display='flex'; };
window.closeModal = (id) => { const el = document.getElementById(id); if(el) el.style.display='none'; };
window.openProfile = () => window.openModal('dom_modal_profile');
window.openUpload = () => window.openModal('dom_modal_upload');

// Switch Tabs Simple
window.switchTab = (tabId, btn) => {
    const parent = btn.closest('.container');
    parent.querySelectorAll('.list-tab-content').forEach(el => el.classList.remove('active'));
    parent.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(tabId);
    if(target) target.classList.add('active');
    btn.classList.add('active');
    
    // Recargar listas si es necesario
    if(tabId === 'admin-music' || tabId === 'user-music') {
        updateUI();
    }
};

