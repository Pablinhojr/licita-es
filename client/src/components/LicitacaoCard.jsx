import { useState } from 'react';

function formatCurrency(value) {
    if (value == null) return null;
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
    }).format(value);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    } catch {
        return '—';
    }
}

function getStatusClass(situacao) {
    if (!situacao) return 'status-outro';
    const s = situacao.toLowerCase();
    if (s.includes('divulgada') || s.includes('ativa')) return 'status-ativa';
    if (s.includes('suspensa') || s.includes('cancelada')) return 'status-suspensa';
    return 'status-outro';
}

export default function LicitacaoCard({ licitacao, index }) {
    const [expanded, setExpanded] = useState(false);

    const valor = licitacao.valorHomologado ?? licitacao.valorEstimado;
    const linkOficial = licitacao.linkOrigem || licitacao.linkPNCP;

    return (
        <div
            className={`card ${expanded ? 'expanded' : ''}`}
            onClick={() => setExpanded(prev => !prev)}
            id={`card-licitacao-${index}`}
        >
            <div className="card-header">
                <div className="card-title">{licitacao.objeto || 'Objeto não informado'}</div>
                {valor != null ? (
                    <div className="card-valor">{formatCurrency(valor)}</div>
                ) : (
                    <div className="card-valor no-value">Valor não informado</div>
                )}
            </div>

            <div className="card-meta">
                <span className="meta-chip">🏛️ {licitacao.orgao}</span>
                <span className="meta-chip location">📍 {licitacao.municipio}/{licitacao.uf}</span>
                <span className="meta-chip">📋 {licitacao.modalidade}</span>
                <span className={`meta-chip ${getStatusClass(licitacao.situacao)}`}>
                    ● {licitacao.situacao}
                </span>
            </div>

            <div className="card-footer" onClick={e => e.stopPropagation()}>
                <div className="card-dates">
                    <span className="card-date">📅 Publicado: {formatDate(licitacao.dataPublicacao)}</span>
                    {licitacao.dataEncerramento && (
                        <span className="card-date">⏰ Encerra: {formatDate(licitacao.dataEncerramento)}</span>
                    )}
                </div>
                <div className="card-actions">
                    {licitacao.linkOrigem && (
                        <a
                            href={licitacao.linkOrigem}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-link primary"
                            id={`btn-link-origem-${index}`}
                            title="Acessar sistema de origem da licitação"
                        >
                            🔗 Ver Licitação
                        </a>
                    )}
                    <a
                        href={licitacao.linkPNCP}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-link secondary"
                        id={`btn-link-pncp-${index}`}
                        title="Acessar no PNCP"
                    >
                        PNCP ↗
                    </a>
                </div>
            </div>

            {expanded && (
                <div className="card-details" onClick={e => e.stopPropagation()}>
                    <div className="detail-item">
                        <span className="detail-label">Nº Controle PNCP</span>
                        <span className="detail-value">{licitacao.numeroControlePNCP || '—'}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Processo</span>
                        <span className="detail-value">{licitacao.processo || '—'}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Nº Compra</span>
                        <span className="detail-value">{licitacao.numeroCompra || '—'}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">CNPJ Órgão</span>
                        <span className="detail-value">{licitacao.cnpj || '—'}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Valor Estimado</span>
                        <span className="detail-value">{formatCurrency(licitacao.valorEstimado) || '—'}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Valor Homologado</span>
                        <span className="detail-value">{formatCurrency(licitacao.valorHomologado) || '—'}</span>
                    </div>
                    {licitacao.dataAbertura && (
                        <div className="detail-item">
                            <span className="detail-label">Abertura de propostas</span>
                            <span className="detail-value">{formatDate(licitacao.dataAbertura)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
