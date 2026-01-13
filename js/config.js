// CONFIGURACIÓN GLOBAL Y ESTADO DE LA APLICACIÓN
const API_BASE_URL = "https://api.jsonbin.io/v3/b/";
const DEFAULT_COVER = "https://i.ibb.co/3WqP7tX/default-cover.png";
const PERMANENT_BIN_ID = "69349a76ae596e708f880e31";
const PERMANENT_API_KEY = "$2a$10$ME7fO8Oqq2iWhHkYQKGQsu0M6PqJ8d1ymFBxHVhhxFJ70BcAg1FZe";
const ADMIN_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=Chris";
const APP_LOGO = "https://i.ibb.co/3WqP7tX/default-cover.png";

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
