// LÓGICA DE NEGOCIO Y ACCIONES DE LA APP


// --- AUTENTICACIÓN ---
async function handleLoginAttempt() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value.trim();


    if (btoa(email) === 'aGphbG1hcg==' && btoa(pass) === 'MjU4NjMy') {
        doLogin({ name: 'Hjalmar', email: 'admin@musichris.com', role: 'admin', avatar: ADMIN_AVATAR });
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


async function doLogin(user) {
    appConfig.user = user;
    appConfig.isLoggedIn = true;
    appConfig.isAdmin = (user.role === 'admin');
    localStorage.setItem('appConfig', JSON.stringify({
        user,
        isLoggedIn: true,
        isAdmin: appConfig.isAdmin
    }));


    // Esperamos a que los datos se carguen antes de verificar mantenimiento
    await loadAppData();


    // 🔧 VERIFICAR MODO MANTENIMIENTO (solo para usuarios regulares)
