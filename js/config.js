/* ==========================================================
   SHIELD PROTOCOL v8.1 - JSONBIN PROTECTION
   ========================================================== */

// Ofuscacion de API Key y Bin ID (Doble Blindaje)
const _K_ = 'JHkyYiQxMCQxNGZsd0NvaU0xaE04TFRuUjd6b2JPdHV4T1VwMm5oWlYxZlR2bllYUzVleUZ0eUp4VnpzRw=='; 
const _B_ = 'NjVkMWE0OGYyNjRjYmViZTlhNDdiYTM0';

const API_BASE_URL = "https://api.jsonbin.io/v3/b/";
const PERMANENT_BIN_ID = atob(_B_);
const PERMANENT_API_KEY = atob(_K_);


// Google Apps Script - Para estadisticas y logs de actividad
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_nQ5bfK8gPXHUXaHU6U9ThkAGV20nxzV89YouO5aQ6vfxBYjUKzqiinR_pQ-32ozY6w/exec";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=500&auto=format&fit=crop";
const ADMIN_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=Chris";
const APP_LOGO = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=100&auto=format&fit=crop";


// Estado de la Aplicacion
let appConfig = {
        BIN_ID: PERMANENT_BIN_ID,
        API_KEY: PERMANENT_API_KEY,
        data: null,
        user: null,
        isLoggedIn: false,
        isAdmin: false,
        currentSong: null,
        tempPlaylist: [],
        currentFilter: null,
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
                    weeklyData: []
        }
};
// Utilidades Globales
const norm = (str) => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);
