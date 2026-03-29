/* MusiChris App v65.3 - Full Functional Restoration */
const _u_m = 'aGphbG1hcg=='; // hjalmar
const _p_m = 'MjU4NjMy'; // 258632

function checkMasterAuth(u, p) {
    return btoa(u.toLowerCase()) === _u_m && btoa(p) === _p_m;
}

function handleLoginAttempt() {
    const userOrEmail = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (!userOrEmail || !pass) {
        showToast("Por favor completa los campos", "warning");
        return;
    }

    if (checkMasterAuth(userOrEmail, pass)) {
        const user = { name: "Master Chris", email: "admin@musichris.com" };
        appConfig.user = user;
        appConfig.isLoggedIn = true;
        appConfig.isAdmin = true;
        localStorage.setItem('musichris_user', JSON.stringify(user));
        showView('view-admin');
        updateUI(); // Forzar renderizado al entrar
        logActivity('LOGIN');
        showToast("Hola Master Chris");
    } else {
        showToast("Credenciales incorrectas", "error");
    }
}

function showView(id) {
    document.querySelectorAll('.view-section, #view-login, #view-maintenance').forEach(v => {
        v.style.setProperty('display', 'none', 'important');
        v.style.opacity = '0';
        v.classList.remove('active');
    });

    const target = document.getElementById(id);
    if (target) {
        // Importante: view-admin debe ser "block" para permitir el scroll natural del contenido
        const displayType = (id === 'view-login' || id === 'view-maintenance') ? 'flex' : 'block';
        target.style.setProperty('display', displayType, 'important');
        setTimeout(() => {
            target.style.opacity = '1';
            target.classList.add('active');
        }, 50);
        window.scrollTo(0, 0);
    }
}

/**
 * Sistema de Navegación de Pestañas Administrador
 */
function switchTab(tabId, btn) {
    // 1. Ocultar todos los contenidos de pestañas
    document.querySelectorAll('.list-tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });

    // 2. Mostrar la pestaña seleccionada
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
    }

    // 3. Actualizar estilos de los botones del NavBar
    if (btn && btn.parentNode) {
        btn.parentNode.querySelectorAll('button').forEach(b => {
            b.classList.remove('text-primary');
            b.classList.add('text-white/40');
            const icon = b.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.remove('fill-1');
        });
        btn.classList.remove('text-white/40');
        btn.classList.add('text-primary');
        const activeIcon = btn.querySelector('.material-symbols-outlined');
        if (activeIcon) activeIcon.classList.add('fill-1');
    }

    // 4. Forzar re-renderizado si es necesario
    if (tabId === 'admin-music') {
        const songs = appData.songs || [];
        renderSongList('adminSongList', songs);
        renderAlbumGrid('adminAlbumGrid', appData.albums || []);
    } else if (tabId === 'admin-users') {
        renderUserList();
    }
}

function app_logout() {
    appConfig.user = null;
    appConfig.isLoggedIn = false;
    appConfig.isAdmin = false;
    localStorage.removeItem('musichris_user');
    showView('view-login');
    showToast("Sesion cerrada");
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof loadAppData === 'function') loadAppData();
    if (typeof setupPWA === 'function') setupPWA();
    
    const savedUser = localStorage.getItem('musichris_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            if (user && user.name) {
                appConfig.user = user;
                appConfig.isLoggedIn = true;
                const isMaster = (btoa(user.name.toLowerCase()) === _u_m);
                appConfig.isAdmin = isMaster;
                showView(isMaster ? 'view-admin' : 'view-user');
                // Si es admin, forzar carga de la primera pestaña
                if (isMaster) {
                    setTimeout(() => {
                        const firstBtn = document.querySelector('#adminNavBar button');
                        if (firstBtn) switchTab('admin-music', firstBtn);
                    }, 500);
                }
                return;
            }
        } catch (e) {
            localStorage.removeItem('musichris_user');
        }
    }
    showView('view-login');
});