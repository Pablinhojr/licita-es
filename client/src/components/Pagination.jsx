export default function Pagination({ pagina, totalPaginas, onPageChange }) {
    if (totalPaginas <= 1) return null;

    const delta = 2;
    const pages = [];
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, pagina - delta); i <= Math.min(totalPaginas - 1, pagina + delta); i++) {
        range.push(i);
    }

    if (range[0] - 1 === 2) range.unshift(2);
    if (totalPaginas - 1 - range[range.length - 1] === 1) range.push(totalPaginas - 1);

    rangeWithDots.push(1);
    if (range[0] > 2) rangeWithDots.push('...');
    rangeWithDots.push(...range);
    if (range[range.length - 1] < totalPaginas - 1) rangeWithDots.push('...');
    if (totalPaginas > 1) rangeWithDots.push(totalPaginas);

    return (
        <div className="pagination">
            <button
                className="page-btn"
                onClick={() => onPageChange(pagina - 1)}
                disabled={pagina === 1}
                id="btn-prev-page"
                aria-label="Página anterior"
            >
                ‹
            </button>

            {rangeWithDots.map((p, i) =>
                p === '...' ? (
                    <span key={`dots-${i}`} className="page-info">…</span>
                ) : (
                    <button
                        key={p}
                        className={`page-btn ${p === pagina ? 'active' : ''}`}
                        onClick={() => onPageChange(p)}
                        id={`btn-page-${p}`}
                        aria-label={`Página ${p}`}
                        aria-current={p === pagina ? 'page' : undefined}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                className="page-btn"
                onClick={() => onPageChange(pagina + 1)}
                disabled={pagina === totalPaginas}
                id="btn-next-page"
                aria-label="Próxima página"
            >
                ›
            </button>
        </div>
    );
}
