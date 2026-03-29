









// ==========================================================
















// LÓGICA DE NEGOCIO Y ACCIONES DE LA APP

















// --- AUTENTICACIÓN ---
/* ==========================================================
SHIELD PROTOCOL v8.1 - MASTER AUTH
========================================================== */
const _u_m = 'aGphbG1hcg=='; // hjalmar
const _p_m = 'MjU4NjMy'; // 258632

function checkMasterAuth(u, p) {
    return btoa(u) === _u_m && btoa(p) === _p_m;
}

function handleLoginAttempt() {
    const userOrEmail = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (!userOrEmail || !pass) {
        showToast("Por favor, completa todos los campos", "error");
        return;
    }

    // 1. Verificar Master Auth (hjalmar / 258632)
    if (checkMasterAuth(userOrEmail.toLowerCase(), pass)) {
        appConfig.user = {
            name: "Chris",
            email: "admin@musichris.com",
            avatar: ADMIN_AVATAR
        };
        appConfig.isLoggedIn = true;
        appConfig.isAdmin = true;
        
        localStorage.setItem('musichris_user', JSON.stringify(appConfig.user));
        showView('view-admin');
        logActivity('LOGIN');
        showToast("Bienvenido Master Chris");
        return;
    }

    // 2. Verificar en la base de datos de usuarios
    const user = appConfig.data.users.find(u => 
        (u.email.toLowerCase() === userOrEmail.toLowerCase()) && u.pass === pass
    );

    if (user) {
        // Bloquear si está en mantenimiento y no es admin
        if (appConfig.data.maintenanceMode) {
            showView('view-maintenance');
            return;
        }

        appConfig.user = user;
        appConfig.isLoggedIn = true;
        appConfig.isAdmin = false;

        localStorage.setItem('musichris_user', JSON.stringify(appConfig.user));
        showView('view-user');
        logActivity('LOGIN');
        showToast(`Hola ${user.name}`);
    } else {
        showToast("Credenciales incorrectas", "error");
    }
}

function showView(id) {
    console.log(`🎬 Mostrando vista: ${id}`);
    document.querySelectorAll('.view-section').forEach(v => {
        v.style.display = 'none';
        v.style.opacity = '0';
        v.classList.remove('active');
    });
    const target = document.getElementById(id);
    if (target) {
        target.style.display = (id === 'view-login' || id === 'view-maintenance') ? 'flex' : 'block';
        // Forzado de opacidad inmediato para evitar pantalla negra
        target.style.opacity = '1';
        target.classList.add('active');
        window.scrollTo(0, 0);
    }
});
    const target = document.getElementById(id);
    if (target) {
        target.style.display = (id === 'view-login' || id === 'view-maintenance') ? 'flex' : 'block';
        setTimeout(() => target.classList.add('active'), 50);
        window.scrollTo(0, 0);
    }
}

function app_logout() {
    appConfig.user = null;
    appConfig.isLoggedIn = false;
    appConfig.isAdmin = false;
    localStorage.removeItem('musichris_user');
    console.log("💎 Fix v62.7: Forzando visibilidad inicial...");
    showView('view-login');
    showToast("Sesión cerrada");
}
// ==========================================================




// ==========================================================
// INICIALIZACIÓN DE LA APP (SKILL FLOW v8.3)
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 MusiChris v62.6 Rescue Init...");
    
    // Fallback de seguridad: Si en 3s nada carga, forzar Login
    const fallbackTimer = setTimeout(() => {
        if (!appConfig.isLoggedIn) {
            console.warn("⚠️ Carga lenta detectada, forzando Login...");
            console.log("💎 Fix v62.7: Forzando visibilidad inicial...");
    showView('view-login');
        }
    }, 3000);

    // 1. Cargar datos (Nube + Caché)
    if (typeof loadAppData === 'function') {
        loadAppData().catch(e => console.error("Error cargando datos:", e));
    }
    
    // 2. Configurar PWA
    if (typeof setupPWA === 'function') setupPWA();
    
    // 3. Restauración de Sesión con protección
    const savedUser = localStorage.getItem('musichris_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            // Validar estructura básica del usuario guardado
            if (user && user.name) {
                appConfig.user = user;
                appConfig.isLoggedIn = true;
                const isMaster = (btoa(user.name.toLowerCase()) === _u_m);
                appConfig.isAdmin = isMaster;
                clearTimeout(fallbackTimer);
                showView(isMaster ? 'view-admin' : 'view-user');
                return;
            }
        } catch (e) {
            localStorage.removeItem('musichris_user');
        }
    }
    
    // Por defecto, ir al Login
    clearTimeout(fallbackTimer);
    console.log("💎 Fix v62.7: Forzando visibilidad inicial...");
    showView('view-login');
});
