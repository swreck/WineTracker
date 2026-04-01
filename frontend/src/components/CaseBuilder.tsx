import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { api } from '../api/client';
import type { Wine } from '../api/client';

export interface CaseBoxItem {
  wineId: number;
  wineName: string;
  wineColor: string;
  wineRegion?: string;
  vintageYear?: number;
  quantity: number;
  isLikeThis: boolean;
}

export interface CaseBox {
  id: string;
  theme: string;
  themeOptions: string[];
  items: CaseBoxItem[];
}

interface Props {
  onClose: () => void;
  onWineIdsChange: (ids: Set<number>) => void;
  priceLookup: Map<number, number>;
  favorites: Wine[];
  favoritesLoading: boolean;
  minRating: number;
  onMinRatingChange: (r: number) => void;
  colorFilter: string;
  onColorFilterChange: (c: string) => void;
  sortField: string;
  onToggleSort: (field: string) => void;
  sortDir: string;
  getLatestPrice: (wine: Wine) => number | null;
}

const STORAGE_KEY = 'winetracker-case-builder';

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function createEmptyBox(): CaseBox {
  return { id: generateId(), theme: '', themeOptions: [], items: [] };
}

function getBoxTotal(box: CaseBox): number {
  return box.items.reduce((sum, item) => sum + item.quantity, 0);
}

function loadState(): { boxes: CaseBox[] } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

function saveState(boxes: CaseBox[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ boxes }));
}

const WINE_DOT_COLORS: Record<string, string> = {
  red: '#5a1a2a',
  white: '#c4a84a',
  rose: '#c4607a',
  sparkling: '#8a9ab5',
};

export interface CaseBuilderHandle {
  addWine: (wine: Wine) => void;
}

const CaseBuilder = forwardRef<CaseBuilderHandle, Props>(function CaseBuilder(props, ref) {
  const {
    onClose, onWineIdsChange, priceLookup, favorites, favoritesLoading,
    minRating, onMinRatingChange, colorFilter, onColorFilterChange,
    sortField, onToggleSort, sortDir, getLatestPrice,
  } = props;

  const saved = useRef(loadState());
  const [boxes, setBoxes] = useState<CaseBox[]>(saved.current?.boxes?.length ? saved.current.boxes : [createEmptyBox()]);
  const [fillingIndex, setFillingIndex] = useState<number | null>(null); // null = overview
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [revisionInput, setRevisionInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [themeSuggestingFor, setThemeSuggestingFor] = useState<number | null>(null);
  const [undoItem, setUndoItem] = useState<{ boxIdx: number; item: CaseBoxItem; position: number } | null>(null);
  const [addedFlash, setAddedFlash] = useState<number | null>(null);

  useEffect(() => { saveState(boxes); }, [boxes]);

  useEffect(() => {
    const ids = new Set<number>();
    for (const box of boxes) for (const item of box.items) ids.add(item.wineId);
    onWineIdsChange(ids);
  }, [boxes, onWineIdsChange]);

  // Add wine to the case currently being filled
  const addWineToBox = useCallback((wine: Wine) => {
    const targetIdx = fillingIndex ?? 0;
    setBoxes(prev => {
      const updated = [...prev];
      const box = { ...updated[targetIdx] };
      if (getBoxTotal(box) >= 12) return prev;
      const bestVintage = wine.vintages?.sort((a, b) => b.vintageYear - a.vintageYear)[0];
      const existingIdx = box.items.findIndex(item => item.wineId === wine.id);
      if (existingIdx >= 0) {
        box.items = [...box.items];
        box.items[existingIdx] = { ...box.items[existingIdx], quantity: box.items[existingIdx].quantity + 1 };
      } else {
        box.items = [...box.items, {
          wineId: wine.id, wineName: wine.name, wineColor: wine.color,
          wineRegion: wine.region, vintageYear: bestVintage?.vintageYear,
          quantity: 1, isLikeThis: false,
        }];
      }
      updated[targetIdx] = box;
      return updated;
    });
    setAddedFlash(wine.id);
    setTimeout(() => setAddedFlash(null), 400);
  }, [fillingIndex]);

  useImperativeHandle(ref, () => ({ addWine: addWineToBox }), [addWineToBox]);

  const removeItem = useCallback((boxIdx: number, itemIdx: number) => {
    const item = boxes[boxIdx]?.items[itemIdx];
    if (!item) return;
    setUndoItem({ boxIdx, item, position: itemIdx });
    setTimeout(() => setUndoItem(null), 4000);
    setBoxes(prev => {
      const updated = [...prev];
      const box = { ...updated[boxIdx] };
      box.items = box.items.filter((_, i) => i !== itemIdx);
      updated[boxIdx] = box;
      return updated;
    });
  }, [boxes]);

  const handleUndo = useCallback(() => {
    if (!undoItem) return;
    setBoxes(prev => {
      const updated = [...prev];
      const box = { ...updated[undoItem.boxIdx] };
      box.items = [...box.items];
      box.items.splice(undoItem.position, 0, undoItem.item);
      updated[undoItem.boxIdx] = box;
      return updated;
    });
    setUndoItem(null);
  }, [undoItem]);

  const updateQuantity = useCallback((boxIdx: number, itemIdx: number, delta: number) => {
    setBoxes(prev => {
      const updated = [...prev];
      const box = { ...updated[boxIdx] };
      const item = { ...box.items[itemIdx] };
      const newQty = item.quantity + delta;
      if (newQty < 1) { removeItem(boxIdx, itemIdx); return prev; }
      if (getBoxTotal(box) + delta > 12) return prev;
      item.quantity = newQty;
      box.items = [...box.items];
      box.items[itemIdx] = item;
      updated[boxIdx] = box;
      return updated;
    });
  }, [removeItem]);

  const toggleLikeThis = useCallback((boxIdx: number, itemIdx: number) => {
    setBoxes(prev => {
      const updated = [...prev];
      const box = { ...updated[boxIdx] };
      box.items = [...box.items];
      box.items[itemIdx] = { ...box.items[itemIdx], isLikeThis: !box.items[itemIdx].isLikeThis };
      updated[boxIdx] = box;
      return updated;
    });
  }, []);

  const setTheme = useCallback((boxIdx: number, theme: string) => {
    setBoxes(prev => {
      const updated = [...prev];
      updated[boxIdx] = { ...updated[boxIdx], theme };
      return updated;
    });
  }, []);

  const suggestThemes = useCallback(async (boxIdx: number) => {
    const box = boxes[boxIdx];
    if (box.items.length === 0) return;
    setThemeSuggestingFor(boxIdx);
    try {
      const wines = box.items.map(item => ({
        name: item.wineName, color: item.wineColor,
        region: item.wineRegion, vintageYear: item.vintageYear,
      }));
      const data = await api.remiCaseSuggestTheme(wines);
      setBoxes(prev => {
        const updated = [...prev];
        updated[boxIdx] = {
          ...updated[boxIdx],
          themeOptions: data.themes || [],
          theme: updated[boxIdx].theme || (data.themes?.[0] || ''),
        };
        return updated;
      });
    } catch { /* silent */ }
    setThemeSuggestingFor(null);
  }, [boxes]);

  const addCase = useCallback(() => {
    setBoxes(prev => [...prev, createEmptyBox()]);
  }, []);

  const removeCase = useCallback((idx: number) => {
    const box = boxes[idx];
    if (box && box.items.length > 0 && !window.confirm(`Remove Case ${idx + 1} and its ${getBoxTotal(box)} bottles?`)) return;
    setUndoItem(null);
    if (boxes.length <= 1) {
      setBoxes([createEmptyBox()]);
      setFillingIndex(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    setBoxes(prev => prev.filter((_, i) => i !== idx));
    if (fillingIndex === idx) setFillingIndex(null);
    else if (fillingIndex !== null && fillingIndex > idx) setFillingIndex(fillingIndex - 1);
  }, [boxes, fillingIndex]);

  const handleClear = useCallback(() => {
    const totalBottles = boxes.reduce((sum, b) => sum + getBoxTotal(b), 0);
    if (totalBottles > 0 && !window.confirm('Clear all cases and start over?')) return;
    setBoxes([createEmptyBox()]);
    setFillingIndex(null);
    setShowEmailDraft(false);
    setEmailDraft('');
    setUndoItem(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [boxes]);

  const handleDraftEmail = useCallback(async (revision?: string) => {
    setEmailLoading(true);
    try {
      const emailBoxes = boxes.filter(b => b.items.length > 0 || b.theme).map(b => ({
        theme: b.theme || 'Mixed case',
        items: b.items.map(item => ({
          name: item.wineName, vintageYear: item.vintageYear,
          quantity: item.quantity, isLikeThis: item.isLikeThis,
        })),
      }));
      const data = await api.remiCaseEmail(emailBoxes, revision);
      setEmailDraft(data.email);
      setShowEmailDraft(true);
      setRevisionInput('');
    } catch { /* silent */ }
    setEmailLoading(false);
  }, [boxes]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(emailDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch { /* silent */ }
  }, [emailDraft]);

  function getBoxPrice(box: CaseBox): number {
    return box.items.reduce((sum, item) => sum + (priceLookup.get(item.wineId) || 0) * item.quantity, 0);
  }

  const hasAnyWines = boxes.some(b => b.items.length > 0);
  const totalBottles = boxes.reduce((sum, b) => sum + getBoxTotal(b), 0);
  const totalPrice = boxes.reduce((sum, b) => sum + getBoxPrice(b), 0);

  // ============================================================
  // FILL MODE — filling a specific case
  // ============================================================
  if (fillingIndex !== null && boxes[fillingIndex]) {
    const box = boxes[fillingIndex];
    const total = getBoxTotal(box);
    const price = getBoxPrice(box);
    const isFull = total >= 12;

    return (
      <div className="cb-fill-page">
        {/* Header */}
        <button className="cb-fill-back" onClick={() => setFillingIndex(null)}>
          &#8249; All Cases
        </button>

        {/* The case being filled */}
        <div className={`cb-fill-crate ${isFull ? 'cb-fill-crate-full' : ''}`}>
          <div className="cb-fill-crate-header">
            <input
              type="text"
              className="cb-fill-theme-input"
              placeholder={`Case ${fillingIndex + 1} theme...`}
              value={box.theme}
              onChange={(e) => setTheme(fillingIndex, e.target.value)}
            />
            <span className={`cb-fill-count ${isFull ? 'cb-fill-count-full' : ''}`}>
              {total}/12{price > 0 ? ` ~$${price}` : ''}
            </span>
          </div>

          {box.themeOptions.length > 0 && (
            <div className="cb-fill-theme-chips">
              {box.themeOptions.map((opt, i) => (
                <button key={i} className={`cb-theme-chip ${box.theme === opt ? 'cb-theme-chip-active' : ''}`}
                  onClick={() => setTheme(fillingIndex, opt)}>{opt}</button>
              ))}
            </div>
          )}

          {isFull && (
            <div className="cb-fill-sealed">Case sealed — 12 bottles</div>
          )}

          {box.items.length > 0 ? (
            <div className="cb-fill-wines">
              {box.items.map((item, itemIdx) => (
                <div key={itemIdx} className="cb-fill-wine-row">
                  <div className="cb-fill-wine-dot" style={{ backgroundColor: WINE_DOT_COLORS[item.wineColor] || WINE_DOT_COLORS.red }} />
                  <div className="cb-fill-wine-info">
                    <span className="cb-fill-wine-name">{item.wineName}</span>
                    {item.vintageYear && <span className="cb-fill-wine-year">{item.vintageYear}</span>}
                    <button
                      className={`cb-like-toggle ${item.isLikeThis ? 'cb-like-active' : ''}`}
                      onClick={() => toggleLikeThis(fillingIndex, itemIdx)}
                    >
                      {item.isLikeThis ? 'or similar' : 'exact'}
                    </button>
                  </div>
                  <div className="cb-fill-qty">
                    <button className="cb-qty-btn" onClick={() => updateQuantity(fillingIndex, itemIdx, -1)}>&#8722;</button>
                    <span className="cb-qty-num">{item.quantity}</span>
                    <button className="cb-qty-btn" onClick={() => updateQuantity(fillingIndex, itemIdx, 1)} disabled={isFull}>+</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="cb-fill-empty">Tap a wine below to add it</p>
          )}
        </div>

        {/* Favorites list — full size, not a strip */}
        {!isFull && (
          <div className="cb-fill-favorites">
            <div className="cb-fill-fav-header">
              <h3 className="cb-fill-fav-title">Your Favorites</h3>
              <div className="cb-fill-fav-filters">
                <select value={minRating} onChange={(e) => onMinRatingChange(parseFloat(e.target.value))} className="cb-strip-select">
                  {[6, 6.5, 7, 7.5, 8, 8.5, 9].map(r => <option key={r} value={r}>{r}+</option>)}
                </select>
                <select value={colorFilter} onChange={(e) => onColorFilterChange(e.target.value)} className="cb-strip-select">
                  <option value="">All</option>
                  <option value="red">Red</option>
                  <option value="white">White</option>
                  <option value="rose">Ros&eacute;</option>
                  <option value="sparkling">Sparkling</option>
                </select>
              </div>
            </div>
            {favoritesLoading ? (
              <p className="nc-loading">Loading...</p>
            ) : (
              <div className="cb-fill-fav-list">
                {favorites.map(wine => {
                  const winePrice = getLatestPrice(wine);
                  const isInThisCase = box.items.some(item => item.wineId === wine.id);
                  const flashing = addedFlash === wine.id;
                  return (
                    <button
                      key={wine.id}
                      className={`cb-fill-fav-card card-tint-${wine.color} ${isInThisCase ? 'cb-fill-fav-added' : ''} ${flashing ? 'wine-card-added-flash' : ''}`}
                      onClick={() => addWineToBox(wine)}
                    >
                      <div className="cb-fill-fav-top">
                        <span className="cb-fill-fav-name">{wine.name}</span>
                        {isInThisCase && <span className="cb-fill-fav-check">&#10003;</span>}
                      </div>
                      <div className="cb-fill-fav-meta">
                        {wine.vintages && wine.vintages.length > 0 && (
                          <span>{wine.vintages.map(v => v.vintageYear).sort((a, b) => b - a)[0]}</span>
                        )}
                        {wine.averageRating && <span>{wine.averageRating.toFixed(1)}</span>}
                        {winePrice && <span>${winePrice}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Undo toast */}
        {undoItem && (
          <div className="cb-undo-toast">
            <span>Removed {undoItem.item.wineName.length > 20 ? undoItem.item.wineName.slice(0, 20) + '...' : undoItem.item.wineName}</span>
            <button className="cb-undo-btn" onClick={handleUndo}>Undo</button>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // OVERVIEW MODE — see all your cases
  // ============================================================
  return (
    <div className="cb-overview">
      {/* Order summary */}
      {hasAnyWines && (
        <div className="cb-order-summary">
          {totalBottles} bottles across {boxes.length} {boxes.length === 1 ? 'case' : 'cases'}
          {totalPrice > 0 ? ` — ~$${totalPrice}` : ''}
        </div>
      )}

      {/* Case cards */}
      {boxes.map((box, idx) => {
        const total = getBoxTotal(box);
        const price = getBoxPrice(box);
        const isFull = total >= 12;
        return (
          <div key={box.id} className={`cb-case-card ${isFull ? 'cb-case-card-full' : ''}`}>
            <div className="cb-case-card-header">
              <input
                type="text"
                className="cb-case-card-theme"
                placeholder={`Case ${idx + 1} — give it a theme`}
                value={box.theme}
                onChange={(e) => setTheme(idx, e.target.value)}
              />
              {box.items.length > 0 && (
                <button
                  className="cb-case-card-suggest"
                  onClick={() => suggestThemes(idx)}
                  disabled={themeSuggestingFor === idx}
                >
                  {themeSuggestingFor === idx ? '...' : 'Suggest'}
                </button>
              )}
            </div>

            {box.themeOptions.length > 0 && (
              <div className="cb-case-card-chips">
                {box.themeOptions.map((opt, i) => (
                  <button key={i} className={`cb-theme-chip ${box.theme === opt ? 'cb-theme-chip-active' : ''}`}
                    onClick={() => setTheme(idx, opt)}>{opt}</button>
                ))}
              </div>
            )}

            {/* Wine preview */}
            <div className="cb-case-card-wines">
              {box.items.length === 0 ? (
                <p className="cb-case-card-empty">No wines yet</p>
              ) : (
                box.items.map((item, i) => (
                  <div key={i} className="cb-case-card-wine">
                    <span className="cb-case-card-dot" style={{ backgroundColor: WINE_DOT_COLORS[item.wineColor] || WINE_DOT_COLORS.red }} />
                    <span className="cb-case-card-wine-name">{item.wineName}</span>
                    {item.quantity > 1 && <span className="cb-case-card-qty">x{item.quantity}</span>}
                    {item.isLikeThis && <span className="cb-case-card-similar">~</span>}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="cb-case-card-footer">
              <span className={`cb-case-card-count ${isFull ? 'cb-case-card-count-full' : ''}`}>
                {total}/12{price > 0 ? ` ~$${price}` : ''}
                {isFull && ' — Sealed'}
              </span>
              <div className="cb-case-card-actions">
                <button className="cb-case-card-fill" onClick={() => setFillingIndex(idx)}>
                  {isFull ? 'Edit' : total > 0 ? 'Continue' : 'Fill'}
                </button>
                {boxes.length > 1 && (
                  <button className="cb-case-card-remove" onClick={() => removeCase(idx)}>&#10005;</button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Add case button */}
      <button className="cb-add-case" onClick={addCase}>
        + Add another case
      </button>

      {/* Actions */}
      <div className="cb-overview-actions">
        {hasAnyWines && (
          <button className="cb-email-btn" onClick={() => handleDraftEmail()} disabled={emailLoading}>
            {emailLoading ? 'Remi is drafting...' : 'Draft Email to Gerald'}
          </button>
        )}
        {hasAnyWines && (
          <button className="cb-action-text" onClick={handleClear}>Start over</button>
        )}
      </div>

      {/* Undo toast */}
      {undoItem && (
        <div className="cb-undo-toast">
          <span>Removed {undoItem.item.wineName.length > 20 ? undoItem.item.wineName.slice(0, 20) + '...' : undoItem.item.wineName}</span>
          <button className="cb-undo-btn" onClick={handleUndo}>Undo</button>
        </div>
      )}

      {/* Email modal */}
      {showEmailDraft && (
        <div className="cb-email-overlay" onClick={() => setShowEmailDraft(false)}>
          <div className="cb-email-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cb-email-header">
              <h4>Email to Gerald</h4>
              <button className="cb-email-close" onClick={() => setShowEmailDraft(false)}>&#10005;</button>
            </div>
            <pre className="cb-email-body">{emailDraft}</pre>
            <div className="cb-email-revision">
              <input type="text" className="cb-revision-input" placeholder="Tell Remi: make it shorter, mention Friday..."
                value={revisionInput} onChange={(e) => setRevisionInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && revisionInput.trim()) handleDraftEmail(revisionInput.trim()); }} />
              <button className="cb-revise-btn" onClick={() => revisionInput.trim() && handleDraftEmail(revisionInput.trim())}
                disabled={!revisionInput.trim() || emailLoading}>Revise</button>
            </div>
            <div className="cb-email-footer">
              <button className="cb-copy-btn" onClick={handleCopy}>
                {copied ? 'Copied! Paste into your email to Gerald' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default CaseBuilder;
