// CONFIGURACIÓN GLOBAL Y ESTADO DE LA APLICACIÓN
// JSONBin.io - Para almacenar la base de datos principal (canciones, usuarios, álbumes, playlists)
const API_BASE_URL = "https://api.jsonbin.io/v3/b/";
const PERMANENT_BIN_ID = "69349a76ae596e708f880e31";
const PERMANENT_API_KEY = "$2a$10$ME7fO8Oqq2iWhHkYQKGQsu0M6PqJ8d1ymFBxHVhhxFJ70BcAg1FZe";

// Google Apps Script - Para estadísticas y logs de actividad
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_nQ5bfK8gPXHUXaHU6U9ThkAGV20nxzV89YouO5aQ6vfxBYjUKzqiinR_pQ-32ozY6w/exec";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=500&auto=format&fit=crop";
const ADMIN_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=Chris";
const APP_LOGO = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=100&auto=format&fit=crop";

// Estado de la Aplicación
let appConfig = {
    BIN_ID: PERMANENT_BIN_ID,
    API_KEY: PERMANENT_API_KEY,
    data: null,
    user: null,
    isLoggedIn: false,
    isAdmin: false,
    currentSong: null,
    tempPlaylist: [],
    currentFilter: null, // Para mantener el filtro (ej: álbum abierto) al actualizar
    editingAlbumIndex: null,
    pendingSongId: null,
    isGuest: false,
    editingSongId: null,
    isShuffle: false,
    isRepeat: false,
    currentIndex: 0,
    sleepTimer: null,
    sleepTimerEnd: null,
    stats: {
        lastSync: null,
        weeklyData: [],
        topSongs: [],
        topLikes: [],
        ignoredSongs: [],
        superFavorites: []
    }
};


// Variables para PWA
let deferredPrompt = null;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /android/i.test(navigator.userAgent);
let isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
let pwaInstallShown = false;

// Helpers
const dom = {};
const norm = (str) => (str || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
