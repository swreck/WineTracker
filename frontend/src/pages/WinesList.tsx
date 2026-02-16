import { useState, useEffect, useMemo, useLayoutEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import type { Wine } from '../api/client';
import { useNavigation } from '../context/NavigationContext';
import { SearchWithHistory } from '../components/SearchWithHistory';
import { AlphabeticalJump } from '../components/AlphabeticalJump';

interface Props {
  onSelectWine: (id: number) => void;
  onSelectVintage: (vintageId: number, wineId: number) => void;
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

  // Use navigation context for filter state persistence
  const {
    winesListState,
    updateWinesListState,
    saveScrollPosition,
    shouldRestoreScroll,
    setShouldRestoreScroll
  } = useNavigation();

  const { search, colorFilter, sourceFilter, sortField, sortDir, vintageMin, vintageMax, expandedWines } = winesListState;

  // Local setter functions that update context
  const setSearch = (value: string) => updateWinesListState({ search: value });
  const setColorFilter = (value: string) => updateWinesListState({ colorFilter: value });
  const setSourceFilter = (value: string) => updateWinesListState({ sourceFilter: value });
  const setSortField = (value: SortField) => updateWinesListState({ sortField: value });
  const setSortDir = (value: SortDir) => updateWinesListState({ sortDir: value });
  const setVintageMin = (value: string) => updateWinesListState({ vintageMin: value });
  const setVintageMax = (value: string) => updateWinesListState({ vintageMax: value });
  const setExpandedWines = (value: Set<number> | ((prev: Set<number>) => Set<number>)) => {
    if (typeof value === 'function') {
      updateWinesListState({ expandedWines: value(expandedWines) });
    } else {
      updateWinesListState({ expandedWines: value });
    }
  };

  const [showVintageFilter, setShowVintageFilter] = useState(false);

  // Merge state
  const [mergeSource, setMergeSource] = useState<Wine | null>(null);
  const [mergeSearch, setMergeSearch] = useState('');
  const [merging, setMerging] = useState(false);

  // Alphabetical jump state
  const [currentLetter, setCurrentLetter] = useState<string | undefined>();
  const letterRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const handleLetterClick = useCallback((letter: string) => {
    const ref = letterRefs.current.get(letter);
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentLetter(letter);
    }
  }, []);

  useEffect(() => {
    loadWines();
  }, [colorFilter]);

  // Restore scroll position when returning to this page
  useLayoutEffect(() => {
    if (shouldRestoreScroll && winesListState.scrollPosition > 0) {
      window.scrollTo(0, winesListState.scrollPosition);
      setShouldRestoreScroll(false);
    }
  }, [shouldRestoreScroll, winesListState.scrollPosition, setShouldRestoreScroll]);

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

      // Source filter - check if any vintage has matching source
      if (sourceFilter) {
        const hasSource = w.vintages?.some(v => v.source === sourceFilter);
        if (!hasSource) return false;
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
  }, [wines, search, sourceFilter, vintageMin, vintageMax, sortField, sortDir]);

  // Store filtered wine IDs in context for Next/Previous navigation
  useEffect(() => {
    const ids = filteredAndSortedWines.map(w => w.id);
    updateWinesListState({ filteredWineIds: ids });
  }, [filteredAndSortedWines, updateWinesListState]);

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

  async function handleMerge(targetWine: Wine) {
    if (!mergeSource || merging) return;

    const confirmed = window.confirm(
      `Merge "${mergeSource.name}" into "${targetWine.name}"?\n\n` +
      `All vintages, tastings, and purchases from "${mergeSource.name}" ` +
      `will be moved to "${targetWine.name}", and "${mergeSource.name}" will be deleted.`
    );

    if (!confirmed) return;

    try {
      setMerging(true);
      await api.mergeWines(targetWine.id, mergeSource.id);
      setMergeSource(null);
      setMergeSearch('');
      await loadWines();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to merge wines');
    } finally {
      setMerging(false);
    }
  }

  // Filter wines for merge search
  const mergeSearchResults = mergeSource && mergeSearch.length >= 2
    ? wines.filter(w =>
        w.id !== mergeSource.id &&
        w.name.toLowerCase().includes(mergeSearch.toLowerCase())
      ).slice(0, 5)
    : [];

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
        <SearchWithHistory
          value={search}
          onChange={setSearch}
          placeholder="Search wines..."
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
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="source-filter"
        >
          <option value="">All Sources</option>
          <option value="weimax">Weimax</option>
          <option value="costco">Costco</option>
          <option value="other">Other</option>
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
              <th className="actions-col"></th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedWines.map((wine, index) => {
              const hasMultipleVintages = wine.vintages && wine.vintages.length > 1;
              const isExpanded = expandedWines.has(wine.id);
              const latestPrice = getLatestPrice(wine);

              // Track first wine of each letter for alphabetical jump
              const firstLetter = wine.name.charAt(0).toUpperCase();
              const normalizedLetter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
              const prevLetter = index > 0
                ? (() => {
                    const prev = filteredAndSortedWines[index - 1].name.charAt(0).toUpperCase();
                    return /[A-Z]/.test(prev) ? prev : '#';
                  })()
                : null;
              const isFirstOfLetter = normalizedLetter !== prevLetter;

              const handleRowClick = (_e: React.MouseEvent) => {
                // Allow text selection - don't navigate if user is selecting text
                const selection = window.getSelection();
                if (selection && selection.toString().length > 0) return;

                if (hasMultipleVintages) {
                  toggleExpand(wine.id);
                } else if (wine.vintages && wine.vintages.length === 1) {
                  // Single vintage - go directly to vintage detail
                  saveScrollPosition();
                  onSelectVintage(wine.vintages[0].id, wine.id);
                } else {
                  saveScrollPosition();
                  onSelectWine(wine.id);
                }
              };

              return (
                <>
                  <tr
                    key={wine.id}
                    ref={isFirstOfLetter ? (el) => {
                      if (el) letterRefs.current.set(normalizedLetter, el);
                    } : undefined}
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
                    <td className="actions-cell">
                      <button
                        className="merge-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMergeSource(wine);
                          setMergeSearch('');
                        }}
                        title="Merge with another wine"
                      >
                        Merge
                      </button>
                    </td>
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
                        onClick={() => {
                          saveScrollPosition();
                          onSelectVintage(vintage.id, wine.id);
                        }}
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
                        <td></td>
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

      {/* Merge Modal */}
      {mergeSource && (
        <div className="merge-modal-overlay" onClick={() => setMergeSource(null)}>
          <div className="merge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="merge-modal-header">
              <h3>Merge "{mergeSource.name}"</h3>
              <button className="close-btn" onClick={() => setMergeSource(null)}>×</button>
            </div>

            <div className="merge-modal-body">
              <p>Select which wine to merge into (this wine will be kept):</p>

              {/* Quick merge with adjacent wines */}
              {(() => {
                const currentIndex = filteredAndSortedWines.findIndex(w => w.id === mergeSource.id);
                const prevWine = currentIndex > 0 ? filteredAndSortedWines[currentIndex - 1] : null;
                const nextWine = currentIndex < filteredAndSortedWines.length - 1 ? filteredAndSortedWines[currentIndex + 1] : null;

                return (prevWine || nextWine) ? (
                  <div className="quick-merge-options">
                    {prevWine && (
                      <button
                        className="quick-merge-btn"
                        onClick={() => handleMerge(prevWine)}
                        disabled={merging}
                      >
                        Merge into "{prevWine.name}" (above)
                      </button>
                    )}
                    {nextWine && (
                      <button
                        className="quick-merge-btn"
                        onClick={() => handleMerge(nextWine)}
                        disabled={merging}
                      >
                        Merge into "{nextWine.name}" (below)
                      </button>
                    )}
                  </div>
                ) : null;
              })()}

              <div className="merge-search-section">
                <label>Or search for a wine:</label>
                <input
                  type="text"
                  placeholder="Search wines..."
                  value={mergeSearch}
                  onChange={(e) => setMergeSearch(e.target.value)}
                  autoFocus
                />
                {mergeSearchResults.length > 0 && (
                  <div className="merge-search-results">
                    {mergeSearchResults.map((w) => (
                      <button
                        key={w.id}
                        className="merge-search-result"
                        onClick={() => handleMerge(w)}
                        disabled={merging}
                      >
                        {w.name}
                        {w.vintages && w.vintages.length > 0 && (
                          <span className="vintages-hint">
                            ({w.vintages.map(v => v.vintageYear).join(', ')})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {merging && <div className="merging-indicator">Merging...</div>}
            </div>
          </div>
        </div>
      )}

      {/* Alphabetical Jump Selector */}
      {filteredAndSortedWines.length > 10 && sortField === 'name' && (
        <AlphabeticalJump
          wines={filteredAndSortedWines}
          onSelectLetter={handleLetterClick}
          currentLetter={currentLetter}
        />
      )}
    </div>
  );
}
