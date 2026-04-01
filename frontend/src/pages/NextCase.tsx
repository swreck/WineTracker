import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../api/client';
import type { Wine } from '../api/client';
import CaseBuilder from '../components/CaseBuilder';
import type { CaseBuilderHandle } from '../components/CaseBuilder';

interface Props {
  onSelectWine: (id: number) => void;
}

export default function NextCase({ onSelectWine }: Props) {
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [minRating, setMinRating] = useState(7.0);
  const [colorFilter, setColorFilter] = useState('');
  const [sortField, setSortField] = useState<'name' | 'vintage' | 'rating' | 'price'>('rating');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [caseBuilderOpen, setCaseBuilderOpen] = useState(false);
  const [addedFlash, setAddedFlash] = useState<number | null>(null);
  const caseBuilderRef = useRef<CaseBuilderHandle>(null);
  const [wineIdsInCases, setWineIdsInCases] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadFavorites();
  }, [minRating, colorFilter]);

  async function loadFavorites() {
    try {
      setLoading(true);
      const data = await api.getFavorites({
        minRating,
        color: colorFilter || undefined,
      });
      setWines(data);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }

  function sortWines(wines: Wine[]): Wine[] {
    const sorted = [...wines];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'vintage': {
          const aYear = a.vintages?.map(v => v.vintageYear).sort((x, y) => y - x)[0] || 0;
          const bYear = b.vintages?.map(v => v.vintageYear).sort((x, y) => y - x)[0] || 0;
          cmp = aYear - bYear;
          break;
        }
        case 'rating':
          cmp = (a.averageRating || 0) - (b.averageRating || 0);
          break;
        case 'price': {
          const aPrice = getLatestPrice(a) || 0;
          const bPrice = getLatestPrice(b) || 0;
          cmp = aPrice - bPrice;
          break;
        }
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  }

  // Themes
  const [themes, setThemes] = useState<{ theme: string; wines: string[]; description: string }[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);

  async function handleFindThemes() {
    try {
      setThemesLoading(true);
      const data = await api.remiFindThemes(minRating);
      setThemes(data.themes || []);
    } catch {
      // Silent
    } finally {
      setThemesLoading(false);
    }
  }

  // Want to Try list
  const [wantToTry, setWantToTry] = useState<{ id: number; name: string; note?: string | null }[]>([]);
  const [showWantToTry, setShowWantToTry] = useState(false);
  const [newWantName, setNewWantName] = useState('');
  const [newWantNote, setNewWantNote] = useState('');

  useEffect(() => {
    api.remiGetWantToTry().then(data => setWantToTry(data.items || [])).catch(() => {});
  }, []);

  async function addWantToTry() {
    if (!newWantName.trim()) return;
    try {
      const item = await api.remiAddWantToTry(newWantName.trim(), newWantNote.trim() || undefined);
      setWantToTry(prev => [{ id: item.id, name: item.name, note: newWantNote.trim() || null }, ...prev]);
      setNewWantName('');
      setNewWantNote('');
    } catch { /* silent */ }
  }

  async function removeWantToTry(id: number) {
    try {
      await api.remiDeleteWantToTry(id);
      setWantToTry(prev => prev.filter(item => item.id !== id));
    } catch { /* silent */ }
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

  function getLatestNote(wine: Wine): string | undefined {
    if (!wine.vintages) return undefined;
    for (const v of wine.vintages) {
      if (v.tastingEvents && v.tastingEvents.length > 0) {
        const sorted = [...v.tastingEvents].sort((a, b) =>
          new Date(b.tastingDate || 0).getTime() - new Date(a.tastingDate || 0).getTime()
        );
        if (sorted[0]?.notes) return sorted[0].notes;
      }
    }
    return undefined;
  }

  function truncateNote(note: string | undefined, maxLen = 60): string {
    if (!note) return '';
    if (note.length <= maxLen) return note;
    return note.slice(0, maxLen).replace(/\s+\S*$/, '') + '...';
  }

  function handleWineCardTap(wine: Wine) {
    if (caseBuilderOpen && caseBuilderRef.current) {
      caseBuilderRef.current.addWine(wine);
      setAddedFlash(wine.id);
      setTimeout(() => setAddedFlash(null), 400);
    } else {
      onSelectWine(wine.id);
    }
  }

  const priceLookup = useMemo(() => {
    const map = new Map<number, number>();
    for (const wine of wines) {
      const price = getLatestPrice(wine);
      if (price) map.set(wine.id, price);
    }
    return map;
  }, [wines]);

  const sortedWines = sortWines(wines);

  // ============================================================
  // CASE BUILDER MODE — full page takeover
  // ============================================================
  if (caseBuilderOpen) {
    return (
      <div className="cb-fullpage">
        {/* Header with back button */}
        <div className="cb-topbar">
          <button className="cb-back-btn" onClick={() => setCaseBuilderOpen(false)}>
            &#8249; Back
          </button>
          <h2 className="page-title">Build a Case</h2>
          <div style={{ width: 60 }} /> {/* Spacer for centering */}
        </div>

        {/* Favorites strip */}
        <div className="cb-favorites-strip">
          <div className="cb-strip-filters">
            <select
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
              className="cb-strip-select"
            >
              {[6, 6.5, 7, 7.5, 8, 8.5, 9].map(r => (
                <option key={r} value={r}>{r}+</option>
              ))}
            </select>
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="cb-strip-select"
            >
              <option value="">All</option>
              <option value="red">Red</option>
              <option value="white">White</option>
              <option value="rose">Ros&eacute;</option>
              <option value="sparkling">Sparkling</option>
            </select>
            <div className="cb-strip-sorts">
              {(['rating', 'price', 'name'] as const).map(field => (
                <button
                  key={field}
                  className={`nc-sort-chip ${sortField === field ? 'nc-sort-chip-active' : ''}`}
                  onClick={() => toggleSort(field)}
                >
                  {field === 'name' ? 'A-Z' : field.charAt(0).toUpperCase() + field.slice(1)}
                  {sortField === field && (
                    <span className="nc-sort-arrow">{sortDir === 'desc' ? ' \u2193' : ' \u2191'}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="cb-strip-scroll">
            {loading ? (
              <p className="nc-loading">Loading...</p>
            ) : sortedWines.length === 0 ? (
              <p className="nc-empty">No wines at this threshold.</p>
            ) : (
              sortedWines.map((wine) => {
                const price = getLatestPrice(wine);
                const isFlashing = addedFlash === wine.id;
                const isInCase = wineIdsInCases.has(wine.id);
                const bestVintage = wine.vintages?.map(v => v.vintageYear).sort((a, b) => b - a)[0];
                return (
                  <button
                    key={wine.id}
                    className={`cb-strip-card card-tint-${wine.color} ${isFlashing ? 'wine-card-added-flash' : ''} ${isInCase ? 'cb-strip-card-added' : ''}`}
                    onClick={() => handleWineCardTap(wine)}
                  >
                    <span className="cb-strip-name">{wine.name}</span>
                    <span className="cb-strip-meta">
                      {bestVintage && <span>{bestVintage}</span>}
                      {wine.averageRating && <span>{wine.averageRating.toFixed(1)}</span>}
                      {price && <span>${price}</span>}
                    </span>
                    {isInCase && <span className="cb-strip-check">{'\u2713'}</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Case Builder content */}
        <div className="cb-content">
          <CaseBuilder
            ref={caseBuilderRef}
            onClose={() => setCaseBuilderOpen(false)}
            onWineIdsChange={setWineIdsInCases}
            priceLookup={priceLookup}
          />
        </div>
      </div>
    );
  }

  // ============================================================
  // NORMAL NEXT CASE PAGE
  // ============================================================
  return (
    <div className="next-case">
      <div className="nc-title-row">
        <h2 className="page-title">Next Case</h2>
        <button
          className="cb-toggle-btn"
          onClick={() => setCaseBuilderOpen(true)}
        >
          Build a Case
        </button>
      </div>

      <section className="nc-section">
        <h3 className="nc-section-title">Your Favorites</h3>
        <div className="nc-filters">
          <label className="nc-rating-filter">
            Min:
            <select
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
            >
              {[6, 6.5, 7, 7.5, 8, 8.5, 9].map(r => (
                <option key={r} value={r}>{r}+</option>
              ))}
            </select>
          </label>
          <select
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
            className="nc-color-filter"
          >
            <option value="">All Colors</option>
            <option value="red">Red</option>
            <option value="white">White</option>
            <option value="rose">Ros&eacute;</option>
            <option value="sparkling">Sparkling</option>
          </select>
        </div>
        <div className="nc-sort-row">
          {(['rating', 'vintage', 'price', 'name'] as const).map(field => (
            <button
              key={field}
              className={`nc-sort-chip ${sortField === field ? 'nc-sort-chip-active' : ''}`}
              onClick={() => toggleSort(field)}
            >
              {field === 'name' ? 'A-Z' : field.charAt(0).toUpperCase() + field.slice(1)}
              {sortField === field && (
                <span className="nc-sort-arrow">{sortDir === 'desc' ? ' \u2193' : ' \u2191'}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="nc-loading">Loading favorites...</p>
        ) : sortedWines.length === 0 ? (
          <p className="nc-empty">No wines at this rating threshold.</p>
        ) : (
          <div className="wine-cards">
            {sortedWines.map((wine) => {
              const price = getLatestPrice(wine);
              const note = getLatestNote(wine);
              return (
                <div
                  key={wine.id}
                  className={`wine-card card-tint-${wine.color}`}
                  onClick={() => onSelectWine(wine.id)}
                >
                  <div className="wine-card-header">
                    <span className="wine-name-serif">{wine.name}</span>
                  </div>
                  <div className="wine-card-meta">
                    {wine.vintages && wine.vintages.length > 0 && (
                      <span className="wine-card-vintage">
                        {wine.vintages.map(v => v.vintageYear).sort((a, b) => b - a).slice(0, 2).join(', ')}
                      </span>
                    )}
                    {wine.averageRating && (
                      <span className="wine-card-rating">{wine.averageRating.toFixed(1)}</span>
                    )}
                    {price && <span className="wine-card-price">${price}</span>}
                  </div>
                  {note && <p className="wine-card-note">{truncateNote(note)}</p>}
                </div>
              );
            })}
          </div>
        )}

        {wines.length >= 4 && (
          <>
            <button
              className="nc-find-themes-btn"
              onClick={handleFindThemes}
              disabled={themesLoading}
            >
              {themesLoading ? 'Remi is analyzing...' : 'Find Case Themes'}
            </button>
            {themes.length > 0 && (
              <div className="nc-themes">
                {themes.map((theme, i) => (
                  <div key={i} className="nc-theme-card">
                    <h4 className="nc-theme-name">{theme.theme}</h4>
                    <p className="nc-theme-desc">{theme.description}</p>
                    <div className="nc-theme-wines">
                      {theme.wines.map((w, j) => (
                        <span key={j} className="nc-theme-wine">{w}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="nc-section">
        <button
          className="nc-section-toggle"
          onClick={() => setShowWantToTry(!showWantToTry)}
        >
          <h3 className="nc-section-title">Want to Try ({wantToTry.length})</h3>
          <span className="toggle-indicator">{showWantToTry ? '\u25BC' : '\u25B6'}</span>
        </button>

        {showWantToTry && (
          <div className="nc-want-to-try">
            {wantToTry.map((item) => (
              <div key={item.id} className="nc-want-item">
                <div>
                  <span className="wine-name-serif">{item.name}</span>
                  {item.note && <p className="nc-want-note">{item.note}</p>}
                </div>
                <button className="remove-item-btn" onClick={() => removeWantToTry(item.id)}>&#10005;</button>
              </div>
            ))}
            <div className="nc-want-add">
              <input type="text" value={newWantName} onChange={(e) => setNewWantName(e.target.value)} placeholder="Wine name" className="nc-want-input" />
              <input type="text" value={newWantNote} onChange={(e) => setNewWantNote(e.target.value)} placeholder="Why? (optional)" className="nc-want-input nc-want-note-input" />
              <button className="nc-want-add-btn" onClick={addWantToTry} disabled={!newWantName.trim()}>Add</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
