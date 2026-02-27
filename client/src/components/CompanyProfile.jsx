import { useState, useEffect } from 'react';
import { fetchCnpjData } from '../services/api';

function formatCnpj(cnpj) {
    const c = cnpj.replace(/\D/g, '');
    return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('pt-BR');
}

function formatCep(cep) {
    if (!cep) return '—';
    return cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

function formatCurrency(value) {
    if (value == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function CompanyProfile({ cnpj, onSearchLicitacoes }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        fetchCnpjData(cnpj)
            .then(d => { if (!cancelled) setData(d); })
            .catch(e => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [cnpj]);

    if (loading) return (
        <div className="profile-loading">
            <div className="spinner" />
            <p>Carregando dados da empresa...</p>
        </div>
    );

    if (error) return (
        <div className="error-box" style={{ marginBottom: 24 }}>
            <span>⚠️</span>
            <span>{error}</span>
        </div>
    );

    if (!data) return null;

    const statusClass = data.situacao?.toLowerCase() === 'ativa' ? 'badge-ativa' : 'badge-inativa';
    const endereco = data.endereco;
    const endStr = [
        endereco.logradouro,
        endereco.numero && `Nº ${endereco.numero}`,
        endereco.complemento,
        endereco.bairro,
        endereco.municipio && `${endereco.municipio}/${endereco.uf}`,
        endereco.cep && `CEP ${formatCep(endereco.cep)}`,
    ].filter(Boolean).join(', ');

    return (
        <div className="profile-card">
            {/* Header da empresa */}
            <div className="profile-header">
                <div className="profile-avatar">🏢</div>
                <div className="profile-info">
                    <h2 className="profile-name">{data.razaoSocial}</h2>
                    {data.nomeFantasia && data.nomeFantasia !== data.razaoSocial && (
                        <p className="profile-fantasy">{data.nomeFantasia}</p>
                    )}
                    <div className="profile-badges">
                        <span className="profile-cnpj">{formatCnpj(data.cnpj)}</span>
                        <span className={`profile-badge ${statusClass}`}>
                            {data.situacao?.toLowerCase() === 'ativa' ? '✅' : '⛔'} {data.situacao}
                        </span>
                        {data.optanteSimplesNacional && (
                            <span className="profile-badge badge-simples">🟢 Simples Nacional</span>
                        )}
                    </div>
                </div>
                <button
                    id="btn-buscar-licitacoes-empresa"
                    className="btn-search-from-profile"
                    onClick={() => onSearchLicitacoes(data.endereco.uf)}
                    title="Pesquisar licitações no estado desta empresa"
                >
                    🔎 Ver Licitações do Estado
                </button>
            </div>

            {/* Grid de detalhes */}
            <div className="profile-grid">
                {/* Dados Cadastrais */}
                <div className="profile-section">
                    <h3 className="profile-section-title">📋 Dados Cadastrais</h3>
                    <div className="profile-details">
                        <DetailRow label="Abertura" value={formatDate(data.dataAbertura)} />
                        <DetailRow label="Capital Social" value={formatCurrency(data.capitalSocial)} />
                        <DetailRow label="Porte" value={data.porte} />
                        <DetailRow label="Natureza Jurídica" value={data.naturezaJuridica} />
                        {data.telefone && <DetailRow label="Telefone" value={data.telefone} />}
                        {data.email && <DetailRow label="E-mail" value={data.email} />}
                    </div>
                </div>

                {/* Atividade Econômica */}
                <div className="profile-section">
                    <h3 className="profile-section-title">⚙️ Atividade Econômica</h3>
                    <div className="profile-details">
                        <DetailRow label="CNAE" value={data.cnae} />
                        <DetailRow label="Atividade Principal" value={data.atividadePrincipal} />
                    </div>
                    {data.atividadesSecundarias?.length > 0 && (
                        <div className="atividades-sec">
                            <p className="detail-label" style={{ marginTop: 10 }}>Atividades Secundárias</p>
                            <ul className="ativ-list">
                                {data.atividadesSecundarias.slice(0, 5).map((a, i) => (
                                    <li key={i} className="ativ-item">• {a}</li>
                                ))}
                                {data.atividadesSecundarias.length > 5 && (
                                    <li className="ativ-item" style={{ color: 'var(--text-muted)' }}>
                                        + {data.atividadesSecundarias.length - 5} outras...
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Endereço */}
                <div className="profile-section">
                    <h3 className="profile-section-title">📍 Endereço</h3>
                    <p className="profile-address">{endStr || '—'}</p>
                </div>

                {/* Sócios */}
                {data.socios?.length > 0 && (
                    <div className="profile-section profile-section-full">
                        <h3 className="profile-section-title">👥 Quadro Societário</h3>
                        <div className="socios-grid">
                            {data.socios.map((s, i) => (
                                <div key={i} className="socio-card">
                                    <div className="socio-avatar">{s.tipo === 'Pessoa Física' ? '👤' : '🏢'}</div>
                                    <div className="socio-info">
                                        <p className="socio-name">{s.nome}</p>
                                        <p className="socio-meta">{s.qualificacao}</p>
                                        <p className="socio-meta">Entrada: {formatDate(s.dataEntrada)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailRow({ label, value }) {
    if (!value) return null;
    return (
        <div className="detail-row">
            <span className="detail-label">{label}</span>
            <span className="detail-value">{value}</span>
        </div>
    );
}
