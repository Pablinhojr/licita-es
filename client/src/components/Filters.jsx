import { useState, useEffect, useCallback } from 'react';
import { fetchMunicipios } from '../services/api';

const UFS = [
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' },
    { sigla: 'ES', nome: 'Espírito Santo' },
    { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'PA', nome: 'Pará' },
    { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' },
];

const MODALIDADES = [
    { value: '', label: 'Todas as modalidades' },
    { value: '6', label: 'Pregão Eletrônico' },
    { value: '7', label: 'Pregão Presencial' },
    { value: '8', label: 'Dispensa Eletrônica' },
    { value: '9', label: 'Inexigibilidade' },
    { value: '4', label: 'Concorrência Eletrônica' },
    { value: '5', label: 'Concorrência Presencial' },
    { value: '12', label: 'Credenciamento' },
    { value: '3', label: 'Concurso' },
    { value: '10', label: 'Manifestação de Interesse' },
    { value: '11', label: 'Pré-qualificação' },
    { value: '1', label: 'Leilão Eletrônico' },
    { value: '13', label: 'Leilão Presencial' },
];

// Data de hoje e 30 dias atrás
function getDefaultDates() {
    const hoje = new Date();
    const passado = new Date();
    passado.setDate(hoje.getDate() - 30);
    const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '');
    return { dataFinal: fmt(hoje), dataInicial: fmt(passado) };
}

function fmtDate(str) {
    if (!str) return '';
    return str.slice(0, 10).split('-').reverse().join('/');
}

export default function Filters({ onSearch, loading, initialUf = '' }) {
    const defaults = getDefaultDates();
    const [uf, setUf] = useState(initialUf);
    const [municipio, setMunicipio] = useState('');
    const [modalidade, setModalidade] = useState('');
    const [palavraChave, setPalavraChave] = useState('');
    const [dataInicial, setDataInicial] = useState(defaults.dataInicial.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    const [dataFinal, setDataFinal] = useState(defaults.dataFinal.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    const [municipios, setMunicipios] = useState([]);
    const [loadingMunicipios, setLoadingMunicipios] = useState(false);
    const [errorMunicipios, setErrorMunicipios] = useState('');

    // Sync when initialUf changes (from company profile button)
    useEffect(() => {
        if (initialUf && initialUf !== uf) {
            setUf(initialUf);
            loadMunicipios(initialUf);
        }
    }, [initialUf]);

    const loadMunicipios = useCallback(async (sigla) => {
        setLoadingMunicipios(true);
        setErrorMunicipios('');
        setMunicipio('');
        setMunicipios([]);
        try {
            const data = await fetchMunicipios(sigla);
            setMunicipios(data);
        } catch (e) {
            setErrorMunicipios('Não foi possível carregar os municípios.');
        } finally {
            setLoadingMunicipios(false);
        }
    }, []);

    const handleUfChange = (e) => {
        const val = e.target.value;
        setUf(val);
        if (val) loadMunicipios(val);
        else { setMunicipios([]); setMunicipio(''); }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!uf) return;
        const fmt = str => str.replace(/-/g, '');
        onSearch({
            uf,
            codigoMunicipioIbge: municipio,
            dataInicial: fmt(dataInicial),
            dataFinal: fmt(dataFinal),
            modalidade,
            palavraChave: palavraChave.trim(),
            pagina: 1,
        });
    };

    return (
        <div className="filters-panel">
            <h2>🔍 Filtros de Pesquisa</h2>
            <form onSubmit={handleSubmit} id="search-form">
                <div className="filters-grid">
                    {/* Estado */}
                    <div className="form-group">
                        <label htmlFor="select-uf">Estado (UF) *</label>
                        <select id="select-uf" value={uf} onChange={handleUfChange} required>
                            <option value="">Selecione o estado...</option>
                            {UFS.map(u => (
                                <option key={u.sigla} value={u.sigla}>{u.sigla} — {u.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Município */}
                    <div className="form-group">
                        <label htmlFor="select-municipio">
                            Município {loadingMunicipios && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>carregando...</span>}
                        </label>
                        <select
                            id="select-municipio"
                            value={municipio}
                            onChange={e => setMunicipio(e.target.value)}
                            disabled={!uf || loadingMunicipios || municipios.length === 0}
                        >
                            <option value="">Todos os municípios</option>
                            {municipios.map(m => (
                                <option key={m.codigoIbge} value={m.codigoIbge}>{m.nome}</option>
                            ))}
                        </select>
                        {errorMunicipios && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errorMunicipios}</span>}
                    </div>

                    {/* Data Inicial */}
                    <div className="form-group">
                        <label htmlFor="data-inicial">Data Inicial *</label>
                        <input
                            id="data-inicial"
                            type="date"
                            value={dataInicial}
                            onChange={e => setDataInicial(e.target.value)}
                            required
                        />
                    </div>

                    {/* Data Final */}
                    <div className="form-group">
                        <label htmlFor="data-final">Data Final *</label>
                        <input
                            id="data-final"
                            type="date"
                            value={dataFinal}
                            onChange={e => setDataFinal(e.target.value)}
                            required
                        />
                    </div>

                    {/* Modalidade */}
                    <div className="form-group">
                        <label htmlFor="select-modalidade">Modalidade</label>
                        <select id="select-modalidade" value={modalidade} onChange={e => setModalidade(e.target.value)}>
                            {MODALIDADES.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Botão */}
                    <div className="form-group">
                        <label>&nbsp;</label>
                        <button
                            id="btn-pesquisar"
                            type="submit"
                            className="btn-search"
                            disabled={loading || !uf}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                                    Pesquisando...
                                </>
                            ) : (
                                <>🔎 Pesquisar</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Palavra-chave — linha separada full-width */}
                <div className="keyword-row">
                    <div className="keyword-wrap">
                        <span className="keyword-icon">🔤</span>
                        <input
                            id="input-palavrachave"
                            type="text"
                            className="keyword-input"
                            placeholder="Filtrar por palavra-chave: ex. computador, veículo, merenda..."
                            value={palavraChave}
                            onChange={e => setPalavraChave(e.target.value)}
                        />
                        {palavraChave && (
                            <button
                                type="button"
                                className="keyword-clear"
                                onClick={() => setPalavraChave('')}
                                title="Limpar palavra-chave"
                            >✕</button>
                        )}
                    </div>
                    {palavraChave && (
                        <p className="keyword-hint">
                            💡 Filtra nos resultados já carregados. Para mais abrangência, pesquise um período maior.
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
}
