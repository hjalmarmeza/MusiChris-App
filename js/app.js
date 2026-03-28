







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



