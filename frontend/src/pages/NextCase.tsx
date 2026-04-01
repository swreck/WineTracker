import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Wine } from '../api/client';

interface Props {
  onSelectWine: (id: number) => void;
}

export default function NextCase({ onSelectWine }: Props) {
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [minRating, setMinRating] = useState(7.0);
  const [colorFilter, setColorFilter] = useState('');

  // Themes
  const [themes, setThemes] = useState<{ theme: string; wines: string[]; description: string }[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);

  // Want to Try
  const [wantToTry, setWantToTry] = useState<{ id: number; name: string; note?: string | null }[]>([]);
  const [showWantToTry, setShowWantToTry] = useState(false);
  const [newWantName, setNewWantName] = useState('');
  const [newWantNote, setNewWantNote] = useState('');

  useEffect(() => { loadFavorites(); }, [minRating, colorFilter]);
  useEffect(() => { api.remiGetWantToTry().then(d => setWantToTry(d.items || [])).catch(() => {}); }, []);

  async function loadFavorites() {
    try { setLoading(true); setWines(await api.getFavorites({ minRating, color: colorFilter || undefined })); }
    catch { /* silent */ } finally { setLoading(false); }
  }

  async function handleFindThemes() {
    try { setThemesLoading(true); setThemes((await api.remiFindThemes(minRating)).themes || []); }
    catch { /* silent */ } finally { setThemesLoading(false); }
  }

  async function addWantToTry() {
    if (!newWantName.trim()) return;
    try {
      const item = await api.remiAddWantToTry(newWantName.trim(), newWantNote.trim() || undefined);
      setWantToTry(prev => [{ id: item.id, name: item.name, note: newWantNote.trim() || null }, ...prev]);
      setNewWantName(''); setNewWantNote('');
    } catch { /* silent */ }
  }

  async function removeWantToTry(id: number) {
    try { await api.remiDeleteWantToTry(id); setWantToTry(prev => prev.filter(i => i.id !== id)); } catch { /* silent */ }
  }

  function getLatestPrice(wine: Wine): number | null {
    if (!wine.vintages) return null;
    for (const v of wine.vintages) if (v.purchaseItems) for (const p of v.purchaseItems) if (p.pricePaid) return Number(p.pricePaid);
    return null;
  }

  function getLatestNote(wine: Wine): string | undefined {
    if (!wine.vintages) return undefined;
    for (const v of wine.vintages) {
      if (v.tastingEvents?.length) {
        const sorted = [...v.tastingEvents].sort((a, b) => new Date(b.tastingDate || 0).getTime() - new Date(a.tastingDate || 0).getTime());
        if (sorted[0]?.notes) return sorted[0].notes;
      }
    }
    return undefined;
  }

  function truncateNote(note: string | undefined, max = 60): string {
    if (!note) return '';
    return note.length <= max ? note : note.slice(0, max).replace(/\s+\S*$/, '') + '...';
  }

  // ── NEXT CASE PAGE ──
  return (
    <div className="next-case">
      <div className="nc-title-row">
        <h2 className="page-title">Next Case</h2>
      </div>

      <section className="nc-section">
        <h3 className="nc-section-title">Your Favorites</h3>
        <div className="nc-filters">
          <label className="nc-rating-filter">
            Min: <select value={minRating} onChange={e => setMinRating(parseFloat(e.target.value))}>
              {[6, 6.5, 7, 7.5, 8, 8.5, 9].map(r => <option key={r} value={r}>{r}+</option>)}
            </select>
          </label>
          <select value={colorFilter} onChange={e => setColorFilter(e.target.value)} className="nc-color-filter">
            <option value="">All Colors</option>
            <option value="red">Red</option><option value="white">White</option>
            <option value="rose">Rosé</option><option value="sparkling">Sparkling</option>
          </select>
        </div>

        {loading ? <p className="nc-loading">Loading favorites...</p> : wines.length === 0 ? <p className="nc-empty">No wines at this rating threshold.</p> : (
          <div className="wine-cards">
            {wines.map(wine => {
              const price = getLatestPrice(wine); const note = getLatestNote(wine);
              return (
                <div key={wine.id} className={`wine-card card-tint-${wine.color}`} onClick={() => onSelectWine(wine.id)}>
                  <div className="wine-card-header"><span className="wine-name-serif">{wine.name}</span></div>
                  <div className="wine-card-meta">
                    {wine.vintages?.length ? <span className="wine-card-vintage">{wine.vintages.map(v => v.vintageYear).sort((a, b) => b - a).slice(0, 2).join(', ')}</span> : null}
                    {wine.averageRating && <span className="wine-card-rating">{wine.averageRating.toFixed(1)}</span>}
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
            <button className="nc-find-themes-btn" onClick={handleFindThemes} disabled={themesLoading}>
              {themesLoading ? 'Remi is analyzing...' : 'Find Case Themes'}
            </button>
            {themes.length > 0 && (
              <div className="nc-themes">{themes.map((t, i) => (
                <div key={i} className="nc-theme-card">
                  <h4 className="nc-theme-name">{t.theme}</h4>
                  <p className="nc-theme-desc">{t.description}</p>
                  <div className="nc-theme-wines">{t.wines.map((w, j) => <span key={j} className="nc-theme-wine">{w}</span>)}</div>
                </div>
              ))}</div>
            )}
          </>
        )}
      </section>

      <section className="nc-section">
        <button className="nc-section-toggle" onClick={() => setShowWantToTry(!showWantToTry)}>
          <h3 className="nc-section-title">Want to Try ({wantToTry.length})</h3>
          <span className="toggle-indicator">{showWantToTry ? '\u25BC' : '\u25B6'}</span>
        </button>
        {showWantToTry && (
          <div className="nc-want-to-try">
            {wantToTry.map(item => (
              <div key={item.id} className="nc-want-item">
                <div><span className="wine-name-serif">{item.name}</span>{item.note && <p className="nc-want-note">{item.note}</p>}</div>
                <button className="remove-item-btn" onClick={() => removeWantToTry(item.id)}>&#10005;</button>
              </div>
            ))}
            <div className="nc-want-add">
              <input type="text" value={newWantName} onChange={e => setNewWantName(e.target.value)} placeholder="Wine name" className="nc-want-input" />
              <input type="text" value={newWantNote} onChange={e => setNewWantNote(e.target.value)} placeholder="Why? (optional)" className="nc-want-input nc-want-note-input" />
              <button className="nc-want-add-btn" onClick={addWantToTry} disabled={!newWantName.trim()}>Add</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
