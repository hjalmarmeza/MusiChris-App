/* MusiChris App v63 - Final Stability */
const _u_m = 'aGphbG1hcg=='; // hjalmar
const _p_m = 'MjU4NjMy'; // 258632

function checkMasterAuth(u, p) {
    return btoa(u) === _u_m && btoa(p) === _p_m;
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
        const displayType = (id === 'view-login' || id === 'view-maintenance' || id === 'view-admin') ? 'flex' : 'block';
        target.style.setProperty('display', displayType, 'important');
        target.style.opacity = '1';
        target.classList.add('active');
        window.scrollTo(0, 0);
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
                return;
            }
        } catch (e) {
            localStorage.removeItem('musichris_user');
        }
    }
    showView('view-login');
});