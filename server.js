const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'licitabrasil-jwt-secret-2026-change-in-production';

// ── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
});
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde 5 minutos.' },
});
app.use('/api', limiter);

// ── Stores em memória ────────────────────────────────────────────────────────
const users = new Map();        // cnpj → { cnpj, passwordHash, createdAt }
const municipiosCache = new Map();
const cnpjCache = new Map();    // cnpj → { data, cachedAt }

// ── Helpers ──────────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function cleanCnpj(cnpj) {
  return cnpj.replace(/\D/g, '');
}

function isValidCnpj(cnpj) {
  const c = cleanCnpj(cnpj);
  if (c.length !== 14) return false;
  if (/^(\d)\1+$/.test(c)) return false;

  let sum = 0;
  let weight = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 12; i++) sum += parseInt(c[i]) * weight[i];
  let dig1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (dig1 !== parseInt(c[12])) return false;

  sum = 0;
  weight = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 13; i++) sum += parseInt(c[i]) * weight[i];
  let dig2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return dig2 === parseInt(c[13]);
}

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token de autenticação necessário.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

// ── Auth: Cadastro ────────────────────────────────────────────────────────────
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { cnpj, password } = req.body;
  if (!cnpj || !password) return res.status(400).json({ error: 'CNPJ e senha são obrigatórios.' });

  const cnpjClean = cleanCnpj(cnpj);
  if (!isValidCnpj(cnpjClean)) return res.status(400).json({ error: 'CNPJ inválido.' });
  if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres.' });

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return res.status(400).json({ error: 'Senha muito fraca. Use letras maiúsculas, minúsculas, números e caracteres especiais.' });
  }

  if (users.has(cnpjClean)) return res.status(409).json({ error: 'CNPJ já cadastrado. Faça login.' });

  const passwordHash = await bcrypt.hash(password, 12);
  users.set(cnpjClean, { cnpj: cnpjClean, passwordHash, createdAt: new Date().toISOString() });

  const token = jwt.sign({ cnpj: cnpjClean }, JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({ token, cnpj: cnpjClean, message: 'Cadastro realizado com sucesso!' });
});

// ── Auth: Login ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { cnpj, password } = req.body;
  if (!cnpj || !password) return res.status(400).json({ error: 'CNPJ e senha são obrigatórios.' });

  const cnpjClean = cleanCnpj(cnpj);
  const user = users.get(cnpjClean);
  if (!user) return res.status(401).json({ error: 'CNPJ não encontrado. Faça o cadastro.' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Senha incorreta.' });

  const token = jwt.sign({ cnpj: cnpjClean }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, cnpj: cnpjClean });
});

// ── CNPJ: Dados Públicos ──────────────────────────────────────────────────────
app.get('/api/cnpj/:cnpj', requireAuth, async (req, res) => {
  const cnpjClean = cleanCnpj(req.params.cnpj);
  if (cnpjClean.length !== 14) return res.status(400).json({ error: 'CNPJ inválido.' });

  // Cache de 1 hora
  const cached = cnpjCache.get(cnpjClean);
  if (cached && Date.now() - cached.cachedAt < 60 * 60 * 1000) {
    return res.json(cached.data);
  }

  try {
    const response = await fetchWithTimeout(
      `https://publica.cnpj.ws/cnpj/${cnpjClean}`,
      { headers: { 'Accept': 'application/json', 'User-Agent': 'LicitaBrasil/1.0' } },
      15000
    );

    if (response.status === 429) {
      return res.status(429).json({ error: 'Limite de consultas CNPJ atingido. Tente em 1 minuto.' });
    }
    if (response.status === 404) {
      return res.status(404).json({ error: 'CNPJ não encontrado na base da Receita Federal.' });
    }
    if (!response.ok) {
      throw new Error(`cnpj.ws retornou ${response.status}`);
    }

    const raw = await response.json();

    // Normalizar dados
    const estab = raw.estabelecimento || {};
    const data = {
      cnpj: cnpjClean,
      razaoSocial: raw.razao_social,
      nomeFantasia: estab.nome_fantasia || raw.razao_social,
      situacao: estab.situacao_cadastral,
      dataSituacao: estab.data_situacao_cadastral,
      dataAbertura: estab.data_inicio_atividade,
      capitalSocial: raw.capital_social,
      porte: raw.porte?.descricao || null,
      naturezaJuridica: raw.natureza_juridica?.descricao || null,
      atividadePrincipal: estab.atividade_principal?.descricao || null,
      cnae: estab.atividade_principal?.subclasse || null,
      atividadesSecundarias: (estab.atividades_secundarias || []).map(a => a.descricao),
      endereco: {
        logradouro: `${estab.tipo_logradouro || ''} ${estab.logradouro || ''}`.trim(),
        numero: estab.numero,
        complemento: estab.complemento,
        bairro: estab.bairro,
        municipio: estab.cidade?.nome || '',
        uf: estab.estado?.sigla || '',
        cep: estab.cep,
      },
      telefone: estab.ddd1 && estab.telefone1 ? `(${estab.ddd1}) ${estab.telefone1}` : null,
      email: estab.email,
      socios: (raw.socios || []).map(s => ({
        nome: s.nome,
        tipo: s.tipo,
        dataEntrada: s.data_entrada,
        qualificacao: s.qualificacao_socio?.descricao || '',
      })),
      optanteSimplesNacional: raw.simples?.simples === 'Sim',
    };

    cnpjCache.set(cnpjClean, { data, cachedAt: Date.now() });
    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Timeout ao consultar CNPJ.' });
    console.error('[cnpj]', err.message);
    res.status(500).json({ error: 'Erro ao consultar dados do CNPJ.' });
  }
});

// ── Endpoint: Municípios por UF ────────────────────────────────────────────
app.get('/api/municipios/:uf', async (req, res) => {
  const sigla = req.params.uf.toUpperCase();
  if (!/^[A-Z]{2}$/.test(sigla)) return res.status(400).json({ error: 'Sigla de UF inválida.' });

  if (municipiosCache.has(sigla)) return res.json(municipiosCache.get(sigla));

  try {
    const response = await fetchWithTimeout(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${sigla}/municipios?orderBy=nome`
    );
    if (!response.ok) throw new Error(`IBGE ${response.status}`);
    const data = await response.json();
    const municipios = data.map(m => ({ nome: m.nome, codigoIbge: String(m.id) }));
    municipiosCache.set(sigla, municipios);
    res.json(municipios);
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Timeout ao buscar municípios.' });
    console.error('[municipios]', err.message);
    res.status(500).json({ error: 'Erro ao buscar municípios: ' + err.message });
  }
});

// ── Endpoint: Licitações (Proxy PNCP) ────────────────────────────────────────
async function fetchPNCP({ uf, codigoMunicipioIbge, dataInicial, dataFinal, pagina, tamanhoPagina, modalidade }) {
  const params = new URLSearchParams({
    dataInicial, dataFinal,
    codigoModalidadeContratacao: modalidade,
    pagina: String(pagina),
    tamanhoPagina: String(Math.max(10, Math.min(Number(tamanhoPagina), 50))),
  });
  if (uf) params.append('uf', uf.toUpperCase());
  if (codigoMunicipioIbge) params.append('codigoMunicipioIbge', codigoMunicipioIbge);

  const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?${params}`;
  console.log(`[pncp] ${url}`);
  const response = await fetchWithTimeout(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'LicitaBrasil/1.0' },
  }, 20000);
  if (!response.ok) throw new Error(`PNCP ${response.status}: ${await response.text()}`);
  return response.json();
}

function mapLicitacao(l) {
  return {
    numeroControlePNCP: l.numeroControlePNCP,
    objeto: l.objetoCompra,
    valorEstimado: l.valorTotalEstimado,
    valorHomologado: l.valorTotalHomologado,
    orgao: l.orgaoEntidade?.razaoSocial || '',
    cnpj: l.orgaoEntidade?.cnpj || '',
    municipio: l.unidadeOrgao?.municipioNome || '',
    uf: l.unidadeOrgao?.ufSigla || '',
    modalidade: l.modalidadeNome || '',
    situacao: l.situacaoCompraNome || '',
    dataPublicacao: l.dataPublicacaoPncp || l.dataInclusao,
    dataAbertura: l.dataAberturaProposta,
    dataEncerramento: l.dataEncerramentoProposta,
    linkOrigem: l.linkSistemaOrigem || null,
    linkPNCP: `https://pncp.gov.br/app/editais/${l.orgaoEntidade?.cnpj}/${l.anoCompra}/${l.sequencialCompra}`,
    processo: l.processo,
    numeroCompra: l.numeroCompra,
  };
}

app.get('/api/licitacoes', requireAuth, async (req, res) => {
  const { uf, codigoMunicipioIbge, dataInicial, dataFinal, pagina = 1, tamanhoPagina = 20, modalidade } = req.query;

  if (!uf && !codigoMunicipioIbge) return res.status(400).json({ error: 'Informe pelo menos um Estado (UF).' });
  if (!dataInicial || !dataFinal) return res.status(400).json({ error: 'Informe o período de pesquisa.' });

  try {
    if (modalidade) {
      const data = await fetchPNCP({ uf, codigoMunicipioIbge, dataInicial, dataFinal, pagina, tamanhoPagina, modalidade });
      return res.json({
        licitacoes: (data.data || []).map(mapLicitacao),
        totalRegistros: data.totalRegistros || 0,
        totalPaginas: data.totalPaginas || 1,
        numeroPagina: data.numeroPagina || 1,
      });
    }

    const paginaNum = Number(pagina);
    const tamanhoNum = Math.max(10, Math.min(Number(tamanhoPagina), 20));
    const modParallel = ['6', '5', '1', '2'];
    const results = await Promise.allSettled(
      modParallel.map(m => fetchPNCP({ uf, codigoMunicipioIbge, dataInicial, dataFinal, pagina: paginaNum, tamanhoPagina: tamanhoNum, modalidade: m }))
    );

    let all = [], totalRegistros = 0, totalPaginas = 1;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        all.push(...(r.value.data || []).map(mapLicitacao));
        totalRegistros += r.value.totalRegistros || 0;
        totalPaginas = Math.max(totalPaginas, r.value.totalPaginas || 1);
      }
    }
    all.sort((a, b) => new Date(b.dataPublicacao) - new Date(a.dataPublicacao));
    return res.json({ licitacoes: all.slice(0, tamanhoNum), totalRegistros, totalPaginas, numeroPagina: paginaNum, modoAgregado: true });
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Timeout na API do PNCP.' });
    console.error('[licitacoes]', err.message);
    res.status(500).json({ error: 'Erro ao buscar licitações. ' + err.message });
  }
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Serve Frontend in Production ──────────────────────────────────────────────
const path = require('path');
// Serve os arquivos estáticos do React (pasta dist gerada pelo Vite)
app.use(express.static(path.join(__dirname, 'client/dist')));

// Qualquer outra rota não-API é redirecionada para o React
// O Express 5 requer Regex ao invés de string com asterisco
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
