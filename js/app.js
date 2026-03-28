



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
// ==========================================================


// LÓGICA DE NEGOCIO Y ACCIONES DE LA APP


// --- AUTENTICACIÓN ---
async function handleLoginAttempt() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value.trim();
    
    if (checkMasterAuth(email, pass)) {
        doLogin({ 
            name: atob('SGphbG1hcg=='), 
            email: atob('YWRtaW5AbXVzaWNocmlzLmNvbQ=='), 
            role: atob('YWRtaW4='), 
            avatar: ADMIN_AVATAR 
        });
        return;
    }

    


    if (!appConfig.data) await loadAppData();


    const user = appConfig.data?.users?.find(u => u.email.toLowerCase() === email);
    if (user && pass === (user.password || atob('MTIz'))) {
        doLogin(user);
    } else {
        showToast("Credenciales incorrectas", 'error');
    }
}


    if (!appConfig.data) await loadAppData();















