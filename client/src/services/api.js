const BASE_URL = '/api';

function getToken() {
    return localStorage.getItem('licitabrasil_token');
}

function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function registerUser(cnpj, password) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar');
    return data;
}

export async function loginUser(cnpj, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');
    return data;
}

// ── CNPJ ─────────────────────────────────────────────────────────────────────
export async function fetchCnpjData(cnpj) {
    const clean = cnpj.replace(/\D/g, '');
    const res = await fetch(`${BASE_URL}/cnpj/${clean}`, {
        headers: { ...authHeaders() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao buscar CNPJ');
    return data;
}

// ── Licitações ────────────────────────────────────────────────────────────────
export async function fetchLicitacoes({ uf, codigoMunicipioIbge, dataInicial, dataFinal, pagina = 1, tamanhoPagina = 20, modalidade }) {
    const params = new URLSearchParams({ dataInicial, dataFinal, pagina, tamanhoPagina });
    if (uf) params.append('uf', uf);
    if (codigoMunicipioIbge) params.append('codigoMunicipioIbge', codigoMunicipioIbge);
    if (modalidade) params.append('modalidade', modalidade);

    const res = await fetch(`${BASE_URL}/licitacoes?${params}`, {
        headers: { ...authHeaders() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
}

// ── Municípios ────────────────────────────────────────────────────────────────
export async function fetchMunicipios(uf) {
    const res = await fetch(`${BASE_URL}/municipios/${uf}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao buscar municípios');
    return data;
}
