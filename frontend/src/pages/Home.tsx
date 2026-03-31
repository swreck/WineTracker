import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { TastingEvent, PurchaseBatch } from '../api/client';

interface Props {
  onSelectWine: (id: number) => void;
  onNavigate: (page: string) => void;
  onOpenChat: () => void;
}

interface RemiSuggestion {
  id: number;
  content: string;
  wineId: number | null;
  createdAt?: string;
}

export default function Home({ onSelectWine, onNavigate, onOpenChat }: Props) {
  const [recentTastings, setRecentTastings] = useState<TastingEvent[]>([]);
  const [recentBatches, setRecentBatches] = useState<PurchaseBatch[]>([]);
  const [suggestions, setSuggestions] = useState<RemiSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showCases, setShowCases] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [tastings, batches, sugData] = await Promise.all([
        api.getRecentTastings(5),
        api.getPurchases(),
        api.remiGetSuggestions().catch(() => ({ suggestions: [] })),
      ]);

      // Deduplicate tastings by vintage ID, keep most recent
      const seen = new Set<number>();
      const deduped = tastings.filter(t => {
        if (seen.has(t.vintageId)) return false;
        seen.add(t.vintageId);
        return true;
      }).slice(0, 3);

      setRecentTastings(deduped);
      setRecentBatches(batches.slice(0, 3));
      setSuggestions(sugData.suggestions || []);
    } catch {
      // Silent — home screen is best-effort
    } finally {
      setLoading(false);
    }
  }

  async function refreshSuggestions() {
    try {
      setSuggestionsLoading(true);
      const data = await api.remiGenerateSuggestions();
      setSuggestions(data.suggestions || []);
    } catch {
      // Silent
    } finally {
      setSuggestionsLoading(false);
    }
  }

  function timeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }

  function truncateNote(note: string | undefined, maxLen = 80): string {
    if (!note) return '';
    if (note.length <= maxLen) return note;
    return note.slice(0, maxLen).replace(/\s+\S*$/, '') + '...';
  }

  if (loading) {
    return <div className="home loading-home">Loading...</div>;
  }

  return (
    <div className="home">
      {/* Last Tasted */}
      {recentTastings.length > 0 && (
        <section className="home-section">
          <h2 className="home-section-title">Last Tasted</h2>
          <div className="home-tasting-cards">
            {recentTastings.map((tasting) => {
              const wine = tasting.vintage?.wine;
              const color = wine?.color || 'red';
              return (
                <div
                  key={tasting.id}
                  className={`home-tasting-card card-tint-${color}`}
                  onClick={() => wine && onSelectWine(wine.id)}
                >
                  <div className="home-tasting-header">
                    <span className="wine-name-serif">{wine?.name || 'Unknown'}</span>
                    <span className="home-tasting-ago">{timeAgo(tasting.tastingDate)}</span>
                  </div>
                  <div className="home-tasting-meta">
                    <span className="home-tasting-vintage">{tasting.vintage?.vintageYear}</span>
                    <span className="home-tasting-rating">{Number(tasting.rating).toFixed(1)}</span>
                  </div>
                  {tasting.notes && (
                    <p className="home-tasting-note">{truncateNote(tasting.notes)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Remi Suggests */}
      <section className="home-section">
        <div className="remi-suggests-header">
          <h2 className="home-section-title">
            <span className="remi-label">Remi</span> Suggests
          </h2>
          <button
            className="remi-refresh-btn"
            onClick={refreshSuggestions}
            disabled={suggestionsLoading}
            title="Get fresh suggestions"
          >
            {suggestionsLoading ? '...' : '↻'}
          </button>
        </div>

        {suggestions.length > 0 ? (
          <div className="remi-suggestions">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="remi-suggestion-card"
                data-has-wine={s.wineId ? 'true' : 'false'}
                onClick={() => s.wineId ? onSelectWine(s.wineId) : onOpenChat()}
              >
                <p className="remi-suggestion-text">{s.content}</p>
                <button
                  className="suggestion-dismiss-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    api.remiDismissSuggestion(s.id).then(() => {
                      setSuggestions(prev => prev.filter(x => x.id !== s.id));
                    });
                  }}
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="remi-placeholder">
            <p className="remi-placeholder-text">
              {suggestionsLoading
                ? 'Remi is thinking...'
                : 'Tap ↻ to get personalized suggestions from Remi.'}
            </p>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="home-section">
        <div className="home-quick-actions">
          <button className="home-action-btn" onClick={() => onNavigate('import-label')}>
            <span className="home-action-icon">📷</span>
            <span>Scan Label</span>
          </button>
          <button className="home-action-btn" onClick={() => onNavigate('quick-tasting')}>
            <span className="home-action-icon">+</span>
            <span>Add Tasting</span>
          </button>
          <button className="home-action-btn" onClick={() => onNavigate('wines')}>
            <span className="home-action-icon">🍷</span>
            <span>Browse</span>
          </button>
        </div>
      </section>

      {/* Recent Cases — collapsible */}
      {recentBatches.length > 0 && (
        <section className="home-section home-section-secondary">
          <button
            className="home-section-toggle"
            onClick={() => setShowCases(!showCases)}
          >
            <h2 className="home-section-title">Recent Cases</h2>
            <span className="toggle-indicator">{showCases ? '▼' : '▶'}</span>
          </button>
          {showCases && (
            <div className="home-cases">
              {recentBatches.map((batch) => (
                <div key={batch.id} className="home-case-card">
                  <div className="home-case-date">
                    {batch.purchaseDate
                      ? new Date(batch.purchaseDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                      : 'No date'}
                  </div>
                  {batch.theme && <div className="home-case-theme">{batch.theme}</div>}
                  <div className="home-case-count">
                    {batch.items?.length || 0} wines
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
