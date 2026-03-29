









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
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo(0,0);
    }
}

function app_logout() {
    appConfig.user = null;
    appConfig.isLoggedIn = false;
    appConfig.isAdmin = false;
    localStorage.removeItem('musichris_user');
    showView('view-login');
    showToast("Sesión cerrada");
}
// ==========================================================




// ==========================================================
// INICIALIZACIÓN DE LA APP (SKILL FLOW v8.3)
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar datos (Nube + Caché)
    if (typeof loadAppData === 'function') {
        loadAppData();
    }
    
    // 2. Configurar PWA
    if (typeof setupPWA === 'function') {
        setupPWA();
    }
    
    // 3. Verificar si hay sesión guardada
    const savedUser = localStorage.getItem('musichris_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            appConfig.user = user;
            appConfig.isLoggedIn = true;
            
            // Re-validar si es Admin basado en nombre o campos previos
            const isMaster = (btoa(user.name.toLowerCase()) === _u_m || user.email === 'admin@musichris.com');
            appConfig.isAdmin = isMaster;
            
            console.log(`👤 Sesión restaurada: ${user.name} (${isMaster ? 'ADMIN' : 'USER'})`);
            showView(isMaster ? 'view-admin' : 'view-user');
        } catch (e) {
            console.error("❌ Error al restaurar sesión:", e);
            localStorage.removeItem('musichris_user');
            showView('view-login');
        }
    } else {
        showView('view-login');
    }
});
