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

  // Want to Try list — stored in localStorage for now, will move to backend with Remi
  const [wantToTry, setWantToTry] = useState<{ name: string; note: string }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('wantToTry') || '[]');
    } catch { return []; }
  });
  const [showWantToTry, setShowWantToTry] = useState(false);
  const [newWantName, setNewWantName] = useState('');
  const [newWantNote, setNewWantNote] = useState('');

  function addWantToTry() {
    if (!newWantName.trim()) return;
    const updated = [...wantToTry, { name: newWantName.trim(), note: newWantNote.trim() }];
    setWantToTry(updated);
    localStorage.setItem('wantToTry', JSON.stringify(updated));
    setNewWantName('');
    setNewWantNote('');
  }

  function removeWantToTry(index: number) {
    const updated = wantToTry.filter((_, i) => i !== index);
    setWantToTry(updated);
    localStorage.setItem('wantToTry', JSON.stringify(updated));
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

  return (
    <div className="next-case">
      <h2 className="page-title">Next Case</h2>

      {/* Favorites as launchpad */}
      <section className="nc-section">
        <h3 className="nc-section-title">Your Favorites</h3>
        <div className="nc-filters">
          <label className="nc-rating-filter">
            Min rating:
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
            <option value="rose">Rosé</option>
            <option value="sparkling">Sparkling</option>
          </select>
        </div>

        {loading ? (
          <p className="nc-loading">Loading favorites...</p>
        ) : wines.length === 0 ? (
          <p className="nc-empty">No wines at this rating threshold.</p>
        ) : (
          <div className="wine-cards">
            {wines.map((wine) => {
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

        {/* Find Themes — placeholder for Remi */}
        {wines.length >= 4 && (
          <button className="nc-find-themes-btn" disabled>
            Find Themes (coming with Remi)
          </button>
        )}
      </section>

      {/* Want to Try */}
      <section className="nc-section">
        <button
          className="nc-section-toggle"
          onClick={() => setShowWantToTry(!showWantToTry)}
        >
          <h3 className="nc-section-title">Want to Try ({wantToTry.length})</h3>
          <span className="toggle-indicator">{showWantToTry ? '▼' : '▶'}</span>
        </button>

        {showWantToTry && (
          <div className="nc-want-to-try">
            {wantToTry.map((item, i) => (
              <div key={i} className="nc-want-item">
                <div>
                  <span className="wine-name-serif">{item.name}</span>
                  {item.note && <p className="nc-want-note">{item.note}</p>}
                </div>
                <button className="remove-item-btn" onClick={() => removeWantToTry(i)}>✕</button>
              </div>
            ))}
            <div className="nc-want-add">
              <input
                type="text"
                value={newWantName}
                onChange={(e) => setNewWantName(e.target.value)}
                placeholder="Wine name"
                className="nc-want-input"
              />
              <input
                type="text"
                value={newWantNote}
                onChange={(e) => setNewWantNote(e.target.value)}
                placeholder="Why? (optional)"
                className="nc-want-input nc-want-note-input"
              />
              <button
                className="nc-want-add-btn"
                onClick={addWantToTry}
                disabled={!newWantName.trim()}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
