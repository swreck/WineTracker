import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Wine, Vintage } from '../api/client';
import AutoExpandTextarea from '../components/AutoExpandTextarea';

interface Props {
  onCancel: () => void;
  // Optional: pre-select a wine/vintage (from wines list quick-rate)
  preselectedWine?: Wine;
  preselectedVintage?: Vintage;
}

interface RecentWine {
  wine: Wine;
  vintage: Vintage;
  lastTasted?: string | null;
}

export default function QuickTasting({ onCancel, preselectedWine, preselectedVintage }: Props) {
  const [search, setSearch] = useState('');
  const [wines, setWines] = useState<Wine[]>([]);
  const [recentWines, setRecentWines] = useState<RecentWine[]>([]);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(preselectedWine || null);
  const [selectedVintage, setSelectedVintage] = useState<Vintage | null>(preselectedVintage || null);
  const [loading, setLoading] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareSlot, setCompareSlot] = useState<1 | 2>(1);
  const [compareWine1, setCompareWine1] = useState<{ wine: Wine; vintage: Vintage } | null>(null);
  const [compareWine2, setCompareWine2] = useState<{ wine: Wine; vintage: Vintage } | null>(null);
  const [compareRating1, setCompareRating1] = useState<number | null>(null);
  const [compareRating2, setCompareRating2] = useState<number | null>(null);
  const [compareNotes1, setCompareNotes1] = useState('');
  const [compareNotes2, setCompareNotes2] = useState('');
  const [showCompareRatingPicker, setShowCompareRatingPicker] = useState<1 | 2 | null>(null);
  const [compareSaving, setCompareSaving] = useState(false);
  const [compareSuccess, setCompareSuccess] = useState(false);

  // Tasting form
  const [rating, setRating] = useState<number | null>(null);
  const [ratingLabel, setRatingLabel] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [showRatingPicker, setShowRatingPicker] = useState(false);

  // Rating options: <5, 5, 5.5, 6, ... 10
  const ratingOptions = [
    { value: 4, label: '<5' },
    { value: 5, label: '5' },
    { value: 5.5, label: '5.5' },
    { value: 6, label: '6' },
    { value: 6.5, label: '6.5' },
    { value: 7, label: '7' },
    { value: 7.5, label: '7.5' },
    { value: 8, label: '8' },
    { value: 8.5, label: '8.5' },
    { value: 9, label: '9' },
    { value: 9.5, label: '9.5' },
    { value: 10, label: '10' },
  ];

  // Load recent wines on mount
  useEffect(() => {
    loadRecentWines();
  }, []);

  // Search wines when typing
  useEffect(() => {
    if (search.length >= 2) {
      loadWines();
    } else {
      setWines([]);
    }
  }, [search]);

  async function loadRecentWines() {
    try {
      setLoadingRecent(true);
      const tastings = await api.getRecentTastings(10);

      // Dedupe by vintage ID, keeping most recent
      const seen = new Set<number>();
      const recent: RecentWine[] = [];

      for (const t of tastings) {
        if (t.vintage && t.vintage.wine && !seen.has(t.vintage.id)) {
          seen.add(t.vintage.id);
          recent.push({
            wine: t.vintage.wine,
            vintage: t.vintage,
            lastTasted: t.tastingDate,
          });
        }
        if (recent.length >= 5) break;
      }

      setRecentWines(recent);
    } catch (e) {
      console.error('Failed to load recent wines:', e);
    } finally {
      setLoadingRecent(false);
    }
  }

  async function loadWines() {
    try {
      setLoading(true);
      const data = await api.getWines({ search });
      setWines(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function selectWine(wine: Wine, vintage?: Vintage) {
    setSelectedWine(wine);
    if (vintage) {
      setSelectedVintage(vintage);
    } else if (wine.vintages && wine.vintages.length === 1) {
      setSelectedVintage(wine.vintages[0]);
    } else {
      setSelectedVintage(null);
    }
    setRating(null);
    setRatingLabel('');
    setNotes('');
    setShowNotes(false);
  }

  function selectRating(value: number, label: string) {
    setRating(value);
    setRatingLabel(label);
    setShowRatingPicker(false);
  }

  async function handleSave() {
    if (!selectedVintage) {
      setError('Please select a vintage');
      return;
    }
    if (rating === null) {
      setError('Please tap a rating');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await api.createTasting({
        vintageId: selectedVintage.id,
        tastingDate: new Date().toISOString().split('T')[0],
        rating,
        notes: notes || undefined,
      });
      setSuccess(true);
      // Refresh recent wines and reset for another entry
      loadRecentWines();
      setTimeout(() => {
        setSelectedWine(null);
        setSelectedVintage(null);
        setSearch('');
        setRating(null);
        setNotes('');
        setShowNotes(false);
        setSuccess(false);
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function selectCompareWine(wine: Wine, vintage?: Vintage) {
    const v = vintage || (wine.vintages?.length === 1 ? wine.vintages[0] : null);
    if (!v) {
      // Need vintage selection — for simplicity, pick first
      // TODO: could show vintage picker
      if (wine.vintages && wine.vintages.length > 0) {
        const sorted = [...wine.vintages].sort((a, b) => b.vintageYear - a.vintageYear);
        if (compareSlot === 1) {
          setCompareWine1({ wine, vintage: sorted[0] });
          setCompareSlot(2);
        } else {
          setCompareWine2({ wine, vintage: sorted[0] });
        }
      }
      return;
    }
    if (compareSlot === 1) {
      setCompareWine1({ wine, vintage: v });
      setCompareSlot(2);
    } else {
      setCompareWine2({ wine, vintage: v });
    }
    setSearch('');
  }

  async function handleCompareSave() {
    if (!compareWine1 || !compareWine2 || compareRating1 === null || compareRating2 === null) return;

    try {
      setCompareSaving(true);
      setError(null);
      const today = new Date().toISOString().split('T')[0];

      await Promise.all([
        api.createTasting({
          vintageId: compareWine1.vintage.id,
          tastingDate: today,
          rating: compareRating1,
          notes: compareNotes1 || undefined,
        }),
        api.createTasting({
          vintageId: compareWine2.vintage.id,
          tastingDate: today,
          rating: compareRating2,
          notes: compareNotes2 || undefined,
        }),
      ]);

      setCompareSuccess(true);
      loadRecentWines();
      setTimeout(() => {
        setCompareMode(false);
        setCompareWine1(null);
        setCompareWine2(null);
        setCompareRating1(null);
        setCompareRating2(null);
        setCompareNotes1('');
        setCompareNotes2('');
        setCompareSlot(1);
        setCompareSuccess(false);
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setCompareSaving(false);
    }
  }

  // ===== COMPARE MODE =====
  if (compareMode) {
    if (compareSuccess) {
      return (
        <div className="quick-tasting">
          <div className="success-message">
            <span className="success-check">&#10003;</span>
            Both tastings saved!
          </div>
        </div>
      );
    }

    // If still selecting wines
    if (!compareWine1 || !compareWine2) {
      return (
        <div className="quick-tasting">
          <div className="quick-tasting-header">
            <h2>Compare</h2>
            <button className="close-button" onClick={() => setCompareMode(false)}>Back</button>
          </div>

          <p className="compare-instruction">
            Select {!compareWine1 ? 'first' : 'second'} wine:
          </p>

          {compareWine1 && (
            <div className="compare-selected">
              <span className="wine-name-serif">{compareWine1.wine.name}</span>
              <span className="compare-vintage">{compareWine1.vintage.vintageYear}</span>
            </div>
          )}

          {/* Search for compare */}
          <div className="wine-search">
            <input
              type="text"
              placeholder="Search wines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {wines.length > 0 && (
              <div className="search-results">
                {wines.filter(w => w.id !== compareWine1?.wine.id).map((wine) => (
                  <div
                    key={wine.id}
                    className="search-result"
                    onClick={() => selectCompareWine(wine)}
                  >
                    <span className="wine-name">{wine.name}</span>
                    <span className={`color-dot ${wine.color}`}></span>
                    {wine.vintages && wine.vintages.length > 0 && (
                      <span className="vintages-hint">
                        {wine.vintages.map((v) => v.vintageYear).join(', ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!loadingRecent && recentWines.length > 0 && (
            <div className="recent-wines">
              <div className="section-label">Recent</div>
              {recentWines.filter(r => r.wine.id !== compareWine1?.wine.id).map((r) => (
                <div
                  key={`${r.wine.id}-${r.vintage.id}`}
                  className="recent-wine-item"
                  onClick={() => selectCompareWine(r.wine, r.vintage)}
                >
                  <span className="wine-name">{r.wine.name}</span>
                  <span className="vintage-year">{r.vintage.vintageYear}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Both wines selected — rate side by side
    return (
      <div className="quick-tasting compare-rating">
        <div className="quick-tasting-header">
          <h2>Compare</h2>
          <button className="close-button" onClick={() => { setCompareWine2(null); setCompareSlot(2); }}>Back</button>
        </div>

        <div className="compare-cards">
          {/* Wine 1 */}
          <div className={`compare-card card-tint-${compareWine1.wine.color}`}>
            <span className="wine-name-serif">{compareWine1.wine.name}</span>
            <span className="compare-vintage">{compareWine1.vintage.vintageYear}</span>
            <button
              className={`rating-picker-btn compact ${compareRating1 !== null ? 'has-rating' : ''}`}
              onClick={() => setShowCompareRatingPicker(1)}
            >
              {compareRating1 !== null
                ? ratingOptions.find(r => r.value === compareRating1)?.label || compareRating1
                : 'Rate'}
            </button>
            <AutoExpandTextarea
              value={compareNotes1}
              onChange={(e) => setCompareNotes1(e.target.value)}
              placeholder="Notes..."
              maxHeight={100}
              style={{ minHeight: '60px', fontSize: '13px' }}
            />
          </div>

          {/* Wine 2 */}
          <div className={`compare-card card-tint-${compareWine2.wine.color}`}>
            <span className="wine-name-serif">{compareWine2.wine.name}</span>
            <span className="compare-vintage">{compareWine2.vintage.vintageYear}</span>
            <button
              className={`rating-picker-btn compact ${compareRating2 !== null ? 'has-rating' : ''}`}
              onClick={() => setShowCompareRatingPicker(2)}
            >
              {compareRating2 !== null
                ? ratingOptions.find(r => r.value === compareRating2)?.label || compareRating2
                : 'Rate'}
            </button>
            <AutoExpandTextarea
              value={compareNotes2}
              onChange={(e) => setCompareNotes2(e.target.value)}
              placeholder="Notes..."
              maxHeight={100}
              style={{ minHeight: '60px', fontSize: '13px' }}
            />
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <button
          className="save-tasting-btn"
          onClick={handleCompareSave}
          disabled={compareSaving || compareRating1 === null || compareRating2 === null}
        >
          {compareSaving ? 'Saving...' : 'Save Both'}
        </button>

        {showCompareRatingPicker !== null && (
          <div className="rating-popup-overlay" onClick={() => setShowCompareRatingPicker(null)}>
            <div className="rating-popup" onClick={(e) => e.stopPropagation()}>
              <div className="rating-popup-header">Rate {showCompareRatingPicker === 1 ? compareWine1.wine.name : compareWine2.wine.name}</div>
              <div className="rating-options-grid">
                {ratingOptions.map((opt) => {
                  const current = showCompareRatingPicker === 1 ? compareRating1 : compareRating2;
                  return (
                    <button
                      key={opt.value}
                      className={`rating-option ${current === opt.value ? 'selected' : ''} ${opt.value >= 8 ? 'high' : opt.value >= 5 ? 'mid' : 'low'}`}
                      onClick={() => {
                        if (showCompareRatingPicker === 1) setCompareRating1(opt.value);
                        else setCompareRating2(opt.value);
                        setShowCompareRatingPicker(null);
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <div className="quick-tasting">
        <div className="success-message">
          <span className="success-check">&#10003;</span>
          {ratingLabel} for {selectedWine?.name} {selectedVintage?.vintageYear}
        </div>
      </div>
    );
  }

  // Wine selection phase
  if (!selectedWine) {
    return (
      <div className="quick-tasting">
        <div className="quick-tasting-header">
          <h2>Quick Tasting</h2>
          <button className="close-button" onClick={onCancel}>Done</button>
        </div>

        {/* Compare mode toggle */}
        <button className="compare-mode-btn" onClick={() => setCompareMode(true)}>
          Compare Two Wines
        </button>

        {/* Recent wines - one tap to rate again */}
        {!loadingRecent && recentWines.length > 0 && (
          <div className="recent-wines">
            <div className="section-label">Recent</div>
            {recentWines.map((r) => (
              <div
                key={`${r.wine.id}-${r.vintage.id}`}
                className="recent-wine-item"
                onClick={() => selectWine(r.wine, r.vintage)}
              >
                <span className="wine-name">{r.wine.name}</span>
                <span className="vintage-year">{r.vintage.vintageYear}</span>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="wine-search">
          <input
            type="text"
            placeholder="Search wines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading && <div className="loading-small">Searching...</div>}

          {wines.length > 0 && (
            <div className="search-results">
              {wines.map((wine) => (
                <div
                  key={wine.id}
                  className="search-result"
                  onClick={() => selectWine(wine)}
                >
                  <span className="wine-name">{wine.name}</span>
                  <span className={`color-dot ${wine.color}`}></span>
                  {wine.vintages && wine.vintages.length > 0 && (
                    <span className="vintages-hint">
                      {wine.vintages.map((v) => v.vintageYear).join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {search.length >= 2 && wines.length === 0 && !loading && (
            <div className="no-results">No wines found</div>
          )}
        </div>
      </div>
    );
  }

  // Vintage selection phase (if multiple)
  if (!selectedVintage && selectedWine.vintages && selectedWine.vintages.length > 1) {
    return (
      <div className="quick-tasting">
        <div className="quick-tasting-header">
          <h2>{selectedWine.name}</h2>
          <button className="close-button" onClick={() => setSelectedWine(null)}>Back</button>
        </div>

        <div className="vintage-select-grid">
          {selectedWine.vintages
            .sort((a, b) => b.vintageYear - a.vintageYear)
            .map((v) => (
              <button
                key={v.id}
                className="vintage-select-btn"
                onClick={() => setSelectedVintage(v)}
              >
                {v.vintageYear}
              </button>
            ))}
        </div>
      </div>
    );
  }

  // Rating phase - tap to rate
  return (
    <div className="quick-tasting">
      <div className="quick-tasting-header">
        <h2>
          {selectedWine.name}
          {selectedVintage && <span className="header-vintage"> '{String(selectedVintage.vintageYear).slice(-2)}</span>}
        </h2>
        <button className="close-button" onClick={() => {
          setSelectedWine(null);
          setSelectedVintage(null);
        }}>Back</button>
      </div>

      <div className="rating-section">
        <button
          className={`rating-picker-btn ${rating !== null ? 'has-rating' : ''}`}
          onClick={() => setShowRatingPicker(true)}
        >
          {rating !== null ? (
            <span className="selected-rating">{ratingLabel}</span>
          ) : (
            <span className="rating-placeholder">Tap to rate</span>
          )}
        </button>
      </div>

      {showRatingPicker && (
        <div className="rating-popup-overlay" onClick={() => setShowRatingPicker(false)}>
          <div className="rating-popup" onClick={(e) => e.stopPropagation()}>
            <div className="rating-popup-header">Rate this wine</div>
            <div className="rating-options-grid">
              {ratingOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`rating-option ${rating === opt.value ? 'selected' : ''} ${opt.value >= 8 ? 'high' : opt.value >= 5 ? 'mid' : 'low'}`}
                  onClick={() => selectRating(opt.value, opt.label)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!showNotes ? (
        <button className="add-notes-link" onClick={() => setShowNotes(true)}>
          + Add notes
        </button>
      ) : (
        <div className="notes-section">
          <AutoExpandTextarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tasting notes..."
            autoFocus
          />
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <button
        className="save-tasting-btn"
        onClick={handleSave}
        disabled={saving || rating === null}
      >
        {saving ? 'Saving...' : rating !== null ? `Save ${ratingLabel}` : 'Tap to rate'}
      </button>
    </div>
  );
}
