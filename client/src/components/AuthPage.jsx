import { useState, useCallback } from 'react';
import { loginUser, registerUser } from '../services/api';

// ── CNPJ helpers ─────────────────────────────────────────────────────────────
function maskCnpj(value) {
    const d = value.replace(/\D/g, '').slice(0, 14);
    return d
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(pwd) {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: 'Fraca', color: '#ef4444', pct: 25 };
    if (score <= 3) return { score, label: 'Média', color: '#f59e0b', pct: 50 };
    if (score <= 4) return { score, label: 'Boa', color: '#3b82f6', pct: 75 };
    return { score, label: 'Forte', color: '#10b981', pct: 100 };
}

function isStrongEnough(pwd) {
    return (
        pwd.length >= 8 &&
        /[A-Z]/.test(pwd) &&
        /[a-z]/.test(pwd) &&
        /[0-9]/.test(pwd) &&
        /[^A-Za-z0-9]/.test(pwd)
    );
}

export default function AuthPage({ onAuth }) {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [cnpj, setCnpj] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const strength = getStrength(password);

    const handleCnpjChange = (e) => setCnpj(maskCnpj(e.target.value));

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const cnpjRaw = cnpj.replace(/\D/g, '');
        if (cnpjRaw.length !== 14) { setError('CNPJ deve ter 14 dígitos.'); return; }
        if (!password) { setError('Informe a senha.'); return; }
        if (mode === 'register' && !isStrongEnough(password)) {
            setError('Senha fraca. Use ao menos 8 caracteres, maiúsculas, minúsculas, números e símbolos.');
            return;
        }

        setLoading(true);
        try {
            const fn = mode === 'login' ? loginUser : registerUser;
            const result = await fn(cnpjRaw, password);
            localStorage.setItem('licitabrasil_token', result.token);
            localStorage.setItem('licitabrasil_cnpj', result.cnpj);
            if (result.message) setSuccess(result.message);
            setTimeout(() => onAuth(result.token, result.cnpj), 300);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [cnpj, password, mode, onAuth]);

    const switchMode = () => {
        setMode(m => m === 'login' ? 'register' : 'login');
        setError('');
        setSuccess('');
        setPassword('');
    };

    return (
        <div className="auth-page">
            {/* Background decoration */}
            <div className="auth-bg" />

            <div className="auth-card">
                {/* Logo */}
                <div className="auth-logo">
                    <div className="auth-logo-icon">🏛️</div>
                    <h1 className="auth-logo-title">LicitaBrasil</h1>
                    <p className="auth-logo-sub">Portal de Licitações Públicas</p>
                </div>

                {/* Tabs */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => { setMode('login'); setError(''); setPassword(''); }}
                        type="button"
                        id="tab-login"
                    >
                        Entrar
                    </button>
                    <button
                        className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                        onClick={() => { setMode('register'); setError(''); setPassword(''); }}
                        type="button"
                        id="tab-register"
                    >
                        Cadastrar
                    </button>
                </div>

                {/* Form */}
                <form className="auth-form" onSubmit={handleSubmit} id="auth-form">
                    {/* CNPJ */}
                    <div className="auth-field">
                        <label htmlFor="input-cnpj">CNPJ da Empresa</label>
                        <div className="auth-input-wrap">
                            <span className="auth-input-icon">🏢</span>
                            <input
                                id="input-cnpj"
                                type="text"
                                placeholder="00.000.000/0000-00"
                                value={cnpj}
                                onChange={handleCnpjChange}
                                autoComplete="username"
                                required
                            />
                        </div>
                    </div>

                    {/* Senha */}
                    <div className="auth-field">
                        <label htmlFor="input-password">Senha</label>
                        <div className="auth-input-wrap">
                            <span className="auth-input-icon">🔐</span>
                            <input
                                id="input-password"
                                type={showPwd ? 'text' : 'password'}
                                placeholder={mode === 'register' ? 'Crie uma senha forte' : 'Sua senha'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                required
                            />
                            <button
                                type="button"
                                className="pwd-toggle"
                                onClick={() => setShowPwd(v => !v)}
                                aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                                id="btn-toggle-pwd"
                            >
                                {showPwd ? '🙈' : '👁️'}
                            </button>
                        </div>

                        {/* Strength bar — only on register */}
                        {mode === 'register' && password.length > 0 && (
                            <div className="strength-wrap">
                                <div className="strength-bar">
                                    <div
                                        className="strength-fill"
                                        style={{ width: `${strength.pct}%`, background: strength.color }}
                                    />
                                </div>
                                <span className="strength-label" style={{ color: strength.color }}>
                                    {strength.label}
                                </span>
                            </div>
                        )}

                        {/* Hints — only on register */}
                        {mode === 'register' && (
                            <ul className="pwd-hints">
                                {[
                                    { ok: password.length >= 8, text: 'Mínimo 8 caracteres' },
                                    { ok: /[A-Z]/.test(password), text: 'Letra maiúscula' },
                                    { ok: /[a-z]/.test(password), text: 'Letra minúscula' },
                                    { ok: /[0-9]/.test(password), text: 'Número' },
                                    { ok: /[^A-Za-z0-9]/.test(password), text: 'Caractere especial (!@#...)' },
                                ].map(h => (
                                    <li key={h.text} className={h.ok ? 'hint-ok' : 'hint-no'}>
                                        {h.ok ? '✓' : '○'} {h.text}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Error / Success */}
                    {error && <div className="auth-error" role="alert">⚠️ {error}</div>}
                    {success && <div className="auth-success" role="status">✅ {success}</div>}

                    {/* Submit */}
                    <button
                        id="btn-auth-submit"
                        type="submit"
                        className="auth-submit"
                        disabled={loading || (mode === 'register' && password.length > 0 && !isStrongEnough(password))}
                    >
                        {loading ? (
                            <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Aguarde...</>
                        ) : mode === 'login' ? '🔑 Entrar' : '✨ Criar Conta'}
                    </button>
                </form>

                <p className="auth-switch">
                    {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
                    <button type="button" onClick={switchMode} className="auth-switch-btn" id="btn-switch-mode">
                        {mode === 'login' ? 'Cadastre-se' : 'Fazer login'}
                    </button>
                </p>

                <p className="auth-disclaimer">
                    Seus dados são protegidos por criptografia bcrypt + JWT.<br />
                    Dados empresariais via API pública da Receita Federal.
                </p>
            </div>
        </div>
    );
}
