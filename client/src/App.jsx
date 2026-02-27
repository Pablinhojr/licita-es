import { useState, useCallback } from 'react';
import AuthPage from './components/AuthPage';
import CompanyProfile from './components/CompanyProfile';
import Filters from './components/Filters';
import LicitacaoCard from './components/LicitacaoCard';
import Pagination from './components/Pagination';
import { fetchLicitacoes } from './services/api';

const NAV_ITEMS = [
    { id: 'perfil', label: 'Meu Perfil', icon: '🏢' },
    { id: 'licitacoes', label: 'Licitações', icon: '📋' },
];

export default function App() {
    // ── Auth ─────────────────────────────────────────────────────────────────────
    const [token, setToken] = useState(() => localStorage.getItem('licitabrasil_token') || '');
    const [userCnpj, setUserCnpj] = useState(() => localStorage.getItem('licitabrasil_cnpj') || '');

    // ── Navigation ────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('perfil');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // ── Licitações state ──────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resultado, setResultado] = useState(null);
    const [filtrosAtivos, setFiltrosAtivos] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [defaultUf, setDefaultUf] = useState('');
    const [palavraChave, setPalavraChave] = useState('');

    // ── Handlers ──────────────────────────────────────────────────────────────────
    const handleAuth = useCallback((newToken, cnpj) => {
        setToken(newToken);
        setUserCnpj(cnpj);
    }, []);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('licitabrasil_token');
        localStorage.removeItem('licitabrasil_cnpj');
        setToken(''); setUserCnpj('');
        setResultado(null); setFiltrosAtivos(null); setDefaultUf('');
    }, []);

    const pesquisar = useCallback(async (filtros) => {
        setLoading(true); setError(''); setResultado(null);
        const paginaAtual = filtros.pagina || 1;
        const kw = (filtros.palavraChave || '').trim();
        setPagina(paginaAtual);
        setPalavraChave(kw);
        // Fetch more results per page when keyword active (max 50)
        const tamanhoPagina = kw ? 50 : 20;
        try {
            const data = await fetchLicitacoes({ ...filtros, pagina: paginaAtual, tamanhoPagina });
            setResultado(data);
            setFiltrosAtivos(filtros);
        } catch (err) {
            setError(err.message || 'Erro ao buscar licitações.');
        } finally {
            setLoading(false);
        }
    }, []);

    const handlePageChange = useCallback((nova) => {
        if (!filtrosAtivos) return;
        pesquisar({ ...filtrosAtivos, pagina: nova });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [filtrosAtivos, pesquisar]);

    const goToLicitacoes = useCallback((uf) => {
        setDefaultUf(uf);
        setActiveTab('licitacoes');
        setSidebarOpen(false);
    }, []);

    const navTo = (id) => { setActiveTab(id); setSidebarOpen(false); };

    // ── Not authenticated ────────────────────────────────────────────────────────
    if (!token) return <AuthPage onAuth={handleAuth} />;

    // ── Authenticated ────────────────────────────────────────────────────────────
    const formatCnpj = (c) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

    return (
        <div className="layout">
            {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">🏛️</div>
                    <div>
                        <div className="sidebar-logo-name">LicitaBrasil</div>
                        <div className="sidebar-logo-sub">Portal Público</div>
                    </div>
                </div>

                {/* User info */}
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">🏢</div>
                    <div className="sidebar-user-info">
                        <p className="sidebar-user-cnpj">{formatCnpj(userCnpj)}</p>
                        <p className="sidebar-user-role">Empresa</p>
                    </div>
                </div>

                {/* Nav items */}
                <nav className="sidebar-nav">
                    <p className="sidebar-nav-label">Menu</p>
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            id={`nav-${item.id}`}
                            className={`nav-item ${activeTab === item.id ? 'nav-item-active' : ''}`}
                            onClick={() => navTo(item.id)}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            <span className="nav-item-label">{item.label}</span>
                            {activeTab === item.id && <span className="nav-item-dot" />}
                        </button>
                    ))}
                </nav>

                {/* Bottom: pncp badge + logout */}
                <div className="sidebar-bottom">
                    <div className="pncp-badge" style={{ margin: '0 0 12px', width: '100%', justifyContent: 'center' }}>
                        ✅ API Oficial PNCP
                    </div>
                    <button id="btn-logout" className="btn-logout" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                        Sair 🚪
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

            {/* ── Main area ───────────────────────────────────────────────────────── */}
            <div className="layout-main">
                {/* ── Mobile Bottom Nav ──────────────────────────────────────────── */}
                <nav className="bottom-nav">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            id={`bottom-nav-${item.id}`}
                            className={`bottom-nav-item ${activeTab === item.id ? 'bottom-nav-active' : ''}`}
                            onClick={() => navTo(item.id)}
                        >
                            <span className="bottom-nav-icon">{item.icon}</span>
                            <span className="bottom-nav-label">{item.label}</span>
                        </button>
                    ))}
                    <button
                        className="bottom-nav-item bottom-nav-logout"
                        onClick={handleLogout}
                        id="bottom-nav-logout"
                    >
                        <span className="bottom-nav-icon">🚪</span>
                        <span className="bottom-nav-label">Sair</span>
                    </button>
                </nav>

                {/* ── Page content ─────────────────────────────────────────────────── */}
                <main className="page-content">

                    {/* ═══ MEU PERFIL ═════════════════════════════════════════════════ */}
                    {activeTab === 'perfil' && (
                        <div>
                            <div className="page-title">
                                <h2>🏢 Meu Perfil</h2>
                                <p>Dados públicos da sua empresa cadastrada</p>
                            </div>
                            <CompanyProfile cnpj={userCnpj} onSearchLicitacoes={goToLicitacoes} />
                        </div>
                    )}

                    {/* ═══ LICITAÇÕES ═════════════════════════════════════════════════ */}
                    {activeTab === 'licitacoes' && (
                        <div>
                            <div className="page-title">
                                <h2>📋 Licitações</h2>
                                <p>Busque licitações públicas em tempo real no PNCP</p>
                            </div>

                            <Filters onSearch={pesquisar} loading={loading} initialUf={defaultUf} />

                            {error && (
                                <div className="error-box" role="alert">
                                    <span>⚠️</span><span>{error}</span>
                                </div>
                            )}

                            {loading && (
                                <div className="state-container">
                                    <div className="spinner" />
                                    <p className="state-title">Buscando licitações...</p>
                                    <p className="state-desc">Consultando a API oficial do PNCP em tempo real</p>
                                </div>
                            )}

                            {!loading && !error && !resultado && (
                                <div className="state-container">
                                    <div className="state-icon">📋</div>
                                    <p className="state-title">Use os filtros acima para pesquisar</p>
                                    <p className="state-desc">Selecione um estado e clique em Pesquisar</p>
                                </div>
                            )}

                            {!loading && resultado?.licitacoes?.length === 0 && (
                                <div className="state-container">
                                    <div className="state-icon">🔍</div>
                                    <p className="state-title">Nenhuma licitação encontrada</p>
                                    <p className="state-desc">Tente ampliar o período ou outra modalidade.</p>
                                </div>
                            )}

                            {!loading && resultado?.licitacoes?.length > 0 && (() => {
                                // Client-side keyword filter
                                const kw = palavraChave.toLowerCase().trim();
                                const todas = resultado.licitacoes;
                                const filtradas = kw
                                    ? todas.filter(l =>
                                        (l.objeto || '').toLowerCase().includes(kw) ||
                                        (l.orgao || '').toLowerCase().includes(kw)
                                    )
                                    : todas;

                                return (
                                    <>
                                        <div className="results-header">
                                            <div className="results-meta">
                                                <div className="results-count">
                                                    {kw ? (
                                                        <>
                                                            <strong>{filtradas.length}</strong> resultado{filtradas.length !== 1 ? 's' : ''} para{' '}
                                                            <span className="kw-badge">"{palavraChave}"</span>
                                                            {' '}(de {todas.length} carregados)
                                                        </>
                                                    ) : (
                                                        <>
                                                            <strong>{resultado.totalRegistros.toLocaleString('pt-BR')}</strong> licitações encontradas
                                                        </>
                                                    )}
                                                </div>
                                                {!kw && (
                                                    <div className="results-count">
                                                        Página <strong>{pagina}</strong> de <strong>{resultado.totalPaginas.toLocaleString('pt-BR')}</strong>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {kw && filtradas.length === 0 ? (
                                            <div className="state-container">
                                                <div className="state-icon">🔍</div>
                                                <p className="state-title">Nenhum resultado para "{palavraChave}"</p>
                                                <p className="state-desc">Tente outra palavra ou amplie o período de busca.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="cards-list" id="lista-licitacoes">
                                                    {filtradas.map((l, idx) => (
                                                        <LicitacaoCard key={l.numeroControlePNCP || idx} licitacao={l} index={idx} />
                                                    ))}
                                                </div>
                                                {!kw && (
                                                    <Pagination pagina={pagina} totalPaginas={resultado.totalPaginas} onPageChange={handlePageChange} />
                                                )}
                                            </>
                                        )}
                                    </>
                                );
                            })()}

                        </div>
                    )}

                </main>

                {/* Footer */}
                <footer className="page-footer">
                    Dados do{' '}
                    <a href="https://pncp.gov.br" target="_blank" rel="noopener noreferrer">PNCP</a>
                    {' '}e{' '}
                    <a href="https://www.gov.br/receitafederal" target="_blank" rel="noopener noreferrer">Receita Federal</a>.
                    Lei nº 14.133/2021.
                </footer>
            </div>
        </div>
    );
}
