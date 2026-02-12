import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Wine } from '../api/client';

interface Props {
  onSelectWine: (id: number) => void;
  onSelectVintage: (id: number) => void;
}

const colorLabels: Record<string, string> = {
  red: 'Red',
  white: 'White',
  rose: 'Rosé',
  sparkling: 'Sparkling',
};

export default function WinesList({ onSelectWine, onSelectVintage }: Props) {
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('');
  const [expandedWines, setExpandedWines] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadWines();
  }, [colorFilter]);

  async function loadWines() {
    try {
      setLoading(true);
      const data = await api.getWines({ color: colorFilter || undefined });
      setWines(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wines');
    } finally {
      setLoading(false);
    }
  }

  const filteredWines = wines.filter((w) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      w.name.toLowerCase().includes(term) ||
      w.region?.toLowerCase().includes(term)
    );
  });

  function toggleExpand(wineId: number) {
    setExpandedWines(prev => {
      const next = new Set(prev);
      if (next.has(wineId)) {
        next.delete(wineId);
      } else {
        next.add(wineId);
      }
      return next;
    });
  }

  function getLatestPrice(wine: Wine): number | null {
    if (!wine.vintages) return null;
    for (const vintage of wine.vintages) {
      if (vintage.purchaseItems) {
        for (const item of vintage.purchaseItems) {
          if (item.pricePaid) return Number(item.pricePaid);
        }
      }
    }
    return null;
  }

  function getVintageYears(wine: Wine): string {
    if (!wine.vintages || wine.vintages.length === 0) return '-';
    const years = wine.vintages.map(v => v.vintageYear).sort((a, b) => b - a);
    if (years.length === 1) return String(years[0]);
    if (years.length <= 3) return years.join(', ');
    return `${years[0]}, ${years[1]}... (${years.length})`;
  }

  if (loading) return <div className="loading">Loading wines...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="wines-list">
      <div className="filters">
        <input
          type="text"
          placeholder="Search wines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={colorFilter}
          onChange={(e) => setColorFilter(e.target.value)}
          className="color-filter"
        >
          <option value="">All Colors</option>
          <option value="red">Red</option>
          <option value="white">White</option>
          <option value="rose">Rosé</option>
          <option value="sparkling">Sparkling</option>
        </select>
      </div>

      {filteredWines.length === 0 ? (
        <div className="empty">
          {wines.length === 0
            ? 'No wines yet. Use Import to add wines.'
            : 'No wines match your search.'}
        </div>
      ) : (
        <table className="wines-table">
          <thead>
            <tr>
              <th>Wine</th>
              <th>Vintage(s)</th>
              <th>Color</th>
              <th>Price</th>
              <th>Avg Rating</th>
              <th>Tastings</th>
            </tr>
          </thead>
          <tbody>
            {filteredWines.map((wine) => {
              const hasMultipleVintages = wine.vintages && wine.vintages.length > 1;
              const isExpanded = expandedWines.has(wine.id);
              const latestPrice = getLatestPrice(wine);

              const handleRowClick = (_e: React.MouseEvent) => {
                // Allow text selection - don't navigate if user is selecting text
                const selection = window.getSelection();
                if (selection && selection.toString().length > 0) return;

                if (hasMultipleVintages) {
                  toggleExpand(wine.id);
                } else {
                  onSelectWine(wine.id);
                }
              };

              return (
                <>
                  <tr
                    key={wine.id}
                    onClick={handleRowClick}
                    className={hasMultipleVintages ? 'expandable' : ''}
                  >
                    <td className="wine-name-cell">
                      {hasMultipleVintages && (
                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                      )}
                      <span className="wine-name">{wine.name}</span>
                    </td>
                    <td>{getVintageYears(wine)}</td>
                    <td>
                      <span className={`color-badge ${wine.color}`}>
                        {colorLabels[wine.color]}
                      </span>
                    </td>
                    <td>{latestPrice ? `$${latestPrice}` : '-'}</td>
                    <td>
                      {wine.averageRating ? (
                        <span className="rating">{wine.averageRating.toFixed(1)}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{wine.tastingCount || 0}</td>
                  </tr>
                  {isExpanded && wine.vintages && wine.vintages.map((vintage) => {
                    const vintagePrice = vintage.purchaseItems?.[0]?.pricePaid;
                    const avgRating = vintage.tastingEvents && vintage.tastingEvents.length > 0
                      ? vintage.tastingEvents.reduce((sum, t) => sum + Number(t.rating), 0) / vintage.tastingEvents.length
                      : null;

                    return (
                      <tr
                        key={`vintage-${vintage.id}`}
                        className="vintage-row"
                        onClick={() => onSelectVintage(vintage.id)}
                      >
                        <td className="vintage-indent">↳ {vintage.vintageYear}</td>
                        <td></td>
                        <td></td>
                        <td>{vintagePrice ? `$${Number(vintagePrice)}` : '-'}</td>
                        <td>
                          {avgRating ? (
                            <span className="rating">{avgRating.toFixed(1)}</span>
                          ) : '-'}
                        </td>
                        <td>{vintage.tastingEvents?.length || 0}</td>
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
