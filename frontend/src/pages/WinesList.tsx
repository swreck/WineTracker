import { useState, useEffect, useMemo } from 'react';
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

type SortField = 'name' | 'vintage' | 'price' | 'rating' | 'tastings';
type SortDir = 'asc' | 'desc';

export default function WinesList({ onSelectWine, onSelectVintage }: Props) {
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('');
  const [expandedWines, setExpandedWines] = useState<Set<number>>(new Set());

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Vintage range filter
  const [vintageMin, setVintageMin] = useState<string>('');
  const [vintageMax, setVintageMax] = useState<string>('');
  const [showVintageFilter, setShowVintageFilter] = useState(false);

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

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc'); // Names default A-Z, others default high-first
    }
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

  function getOldestVintage(wine: Wine): number | null {
    if (!wine.vintages || wine.vintages.length === 0) return null;
    return Math.min(...wine.vintages.map(v => v.vintageYear));
  }

  function getNewestVintage(wine: Wine): number | null {
    if (!wine.vintages || wine.vintages.length === 0) return null;
    return Math.max(...wine.vintages.map(v => v.vintageYear));
  }

  function getVintageYears(wine: Wine): string {
    if (!wine.vintages || wine.vintages.length === 0) return '-';
    const years = wine.vintages.map(v => v.vintageYear).sort((a, b) => b - a);
    if (years.length === 1) return String(years[0]);
    if (years.length <= 3) return years.join(', ');
    return `${years[0]}, ${years[1]}... (${years.length})`;
  }

  // Filter and sort wines
  const filteredAndSortedWines = useMemo(() => {
    // First, filter
    let result = wines.filter((w) => {
      // Text search
      if (search) {
        const term = search.toLowerCase();
        const matches = w.name.toLowerCase().includes(term) ||
          w.region?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      // Vintage range filter
      if (vintageMin || vintageMax) {
        const oldest = getOldestVintage(w);
        const newest = getNewestVintage(w);
        if (!oldest || !newest) return false;

        if (vintageMin) {
          const min = parseInt(vintageMin);
          if (newest < min) return false; // Wine's newest vintage is before our min
        }
        if (vintageMax) {
          const max = parseInt(vintageMax);
          if (oldest > max) return false; // Wine's oldest vintage is after our max
        }
      }

      return true;
    });

    // Then sort
    result.sort((a, b) => {
      let cmp = 0;

      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'vintage':
          const aVintage = sortDir === 'asc' ? getOldestVintage(a) : getNewestVintage(a);
          const bVintage = sortDir === 'asc' ? getOldestVintage(b) : getNewestVintage(b);
          cmp = (aVintage || 9999) - (bVintage || 9999);
          break;
        case 'price':
          cmp = (getLatestPrice(a) || 0) - (getLatestPrice(b) || 0);
          break;
        case 'rating':
          cmp = (a.averageRating || 0) - (b.averageRating || 0);
          break;
        case 'tastings':
          cmp = (a.tastingCount || 0) - (b.tastingCount || 0);
          break;
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [wines, search, vintageMin, vintageMax, sortField, sortDir]);

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

  function clearVintageFilter() {
    setVintageMin('');
    setVintageMax('');
    setShowVintageFilter(false);
  }

  function SortHeader({ field, label }: { field: SortField; label: string }) {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => toggleSort(field)}
        className={`sortable ${isActive ? 'active' : ''}`}
      >
        {label}
        {isActive && (
          <span className="sort-indicator">
            {sortDir === 'asc' ? ' ▲' : ' ▼'}
          </span>
        )}
      </th>
    );
  }

  // Generate year options for vintage filter
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear; y >= 1980; y--) {
    yearOptions.push(y);
  }

  if (loading) return <div className="loading">Loading wines...</div>;
  if (error) return <div className="error">{error}</div>;

  const hasVintageFilter = vintageMin || vintageMax;

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
        <button
          className={`vintage-filter-btn ${hasVintageFilter ? 'active' : ''}`}
          onClick={() => setShowVintageFilter(!showVintageFilter)}
        >
          {hasVintageFilter
            ? `${vintageMin || 'Any'} - ${vintageMax || 'Any'}`
            : 'Vintages'}
        </button>
      </div>

      {showVintageFilter && (
        <div className="vintage-filter-panel">
          <div className="vintage-range">
            <label>
              <span>From</span>
              <select
                value={vintageMin}
                onChange={(e) => setVintageMin(e.target.value)}
              >
                <option value="">Any</option>
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <span className="range-separator">to</span>
            <label>
              <span>To</span>
              <select
                value={vintageMax}
                onChange={(e) => setVintageMax(e.target.value)}
              >
                <option value="">Any</option>
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="vintage-presets">
            <button onClick={() => { setVintageMin(String(currentYear - 5)); setVintageMax(''); }}>
              Since {currentYear - 5}
            </button>
            <button onClick={() => { setVintageMin(''); setVintageMax(String(currentYear - 10)); }}>
              Before {currentYear - 9}
            </button>
            <button onClick={clearVintageFilter}>Clear</button>
          </div>
        </div>
      )}

      {filteredAndSortedWines.length === 0 ? (
        <div className="empty">
          {wines.length === 0
            ? 'No wines yet. Use Import to add wines.'
            : 'No wines match your filters.'}
        </div>
      ) : (
        <table className="wines-table">
          <thead>
            <tr>
              <SortHeader field="name" label="Wine" />
              <SortHeader field="vintage" label="Vintage" />
              <th>Color</th>
              <SortHeader field="price" label="Price" />
              <SortHeader field="rating" label="Rating" />
              <SortHeader field="tastings" label="Tastings" />
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedWines.map((wine) => {
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

      <div className="list-summary">
        {filteredAndSortedWines.length} of {wines.length} wines
      </div>
    </div>
  );
}
