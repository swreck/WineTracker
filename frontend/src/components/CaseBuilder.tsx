import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { api } from '../api/client';
import type { Wine } from '../api/client';

// ── Types ──────────────────────────────────────────────

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
  caseNumber: number;
  theme: string;
  themeIsManual: boolean;
  themeOptions: string[];
  items: CaseBoxItem[];
}

export interface CaseBuilderHandle {
  addWine: (wine: Wine) => void;
}

// ── Helpers ────────────────────────────────────────────

const STORAGE_KEY = 'winetracker-casebuilder-v5';

function genId() { return Math.random().toString(36).slice(2, 9); }

function emptyBox(caseNumber: number): CaseBox {
  return { id: genId(), caseNumber, theme: '', themeIsManual: false, themeOptions: [], items: [] };
}

function boxTotal(box: CaseBox): number {
  return box.items.reduce((s, i) => s + i.quantity, 0);
}

function loadBoxes(): CaseBox[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const d = JSON.parse(s);
      if (d.boxes?.length) {
        // Migrate old boxes that may lack caseNumber
        return d.boxes.map((b: any, i: number) => ({
          ...b,
          caseNumber: b.caseNumber ?? i + 1,
        }));
      }
    }
  } catch { /* ignore */ }
  return [emptyBox(1)];
}

function saveBoxes(boxes: CaseBox[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ boxes }));
}

function getWinePrice(wine: Wine): number | null {
  if (!wine.vintages) return null;
  for (const v of wine.vintages)
    if (v.purchaseItems) for (const p of v.purchaseItems) if (p.pricePaid) return Number(p.pricePaid);
  return null;
}

function getWineRating(wine: Wine): number | null {
  return wine.averageRating ?? null;
}

function getWineRegion(wine: Wine): string {
  return wine.region || 'Unknown';
}

function getWineLatestNote(wine: Wine): string | null {
  if (!wine.vintages) return null;
  for (const v of wine.vintages) {
    if (v.tastingEvents?.length) {
      const sorted = [...v.tastingEvents].sort((a, b) =>
        new Date(b.tastingDate || 0).getTime() - new Date(a.tastingDate || 0).getTime());
      if (sorted[0]?.notes) return sorted[0].notes;
    }
  }
  return null;
}

function getWineSellerNotes(wine: Wine): string | null {
  if (!wine.vintages) return null;
  for (const v of wine.vintages) if (v.sellerNotes) return v.sellerNotes;
  return null;
}

const DOT_COLORS: Record<string, string> = {
  red: '#5a1a2a', white: '#c4a84a', rose: '#c4607a', sparkling: '#8a9ab5',
};

// ── Component ──────────────────────────────────────────

const CaseBuilder = forwardRef<CaseBuilderHandle>(function CaseBuilder(_props, ref) {
  // Case state
  const [boxes, setBoxes] = useState<CaseBox[]>(loadBoxes);
  const [activeIdx, setActiveIdx] = useState(0);

  // Wine collection
  const [allWines, setAllWines] = useState<Wine[]>([]);
  const [winesLoading, setWinesLoading] = useState(true);

  // Filters/sort
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'name' | 'region'>('rating');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // UI state
  const [peekWine, setPeekWine] = useState<Wine | null>(null);
  const [themePopupOpen, setThemePopupOpen] = useState(false);
  const [themeInput, setThemeInput] = useState('');
  const [themeSuggesting, setThemeSuggesting] = useState(false);
  const [undoItem, setUndoItem] = useState<{ boxIdx: number; item: CaseBoxItem; pos: number } | null>(null);
  const [addedFlash, setAddedFlash] = useState<number | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [revisionInput, setRevisionInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Auto-suggest tracking
  const lastSeenRef = useRef({ activeIdx: 0, itemCount: 0 });
  const suggestThemesRef = useRef<() => void>(() => {});

  // Persist
  useEffect(() => { saveBoxes(boxes); }, [boxes]);

  // Load all wines
  useEffect(() => {
    setWinesLoading(true);
    api.getWines().then(w => { setAllWines(w); setWinesLoading(false); }).catch(() => setWinesLoading(false));
  }, []);

  // Ensure activeIdx is valid
  useEffect(() => {
    if (activeIdx >= boxes.length) setActiveIdx(Math.max(0, boxes.length - 1));
  }, [boxes.length, activeIdx]);

  // ── Derived ────────────────────────────────────────

  const activeBox = boxes[activeIdx] || emptyBox(1);
  const activeTotal = boxTotal(activeBox);
  const activeFull = activeTotal >= 12;
  const hasAnyWines = boxes.some(b => b.items.length > 0);

  const uniqueRegions = [...new Set(allWines.map(w => w.region).filter(Boolean))].sort() as string[];

  // Filter + sort wines
  const filteredWines = allWines.filter(w => {
    if (colorFilter && w.color !== colorFilter) return false;
    if (regionFilter && w.region !== regionFilter) return false;
    if (sourceFilter) {
      const hasSrc = w.vintages?.some(v => v.source === sourceFilter);
      if (!hasSrc) return false;
    }
    if (priceMin || priceMax) {
      const p = getWinePrice(w);
      if (p === null) return false;
      if (priceMin && p < Number(priceMin)) return false;
      if (priceMax && p > Number(priceMax)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = w.name.toLowerCase().includes(q);
      const regionMatch = w.region?.toLowerCase().includes(q);
      const grapeMatch = w.grapeVarietyOrBlend?.toLowerCase().includes(q);
      if (!nameMatch && !regionMatch && !grapeMatch) return false;
    }
    return true;
  }).sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'rating': cmp = (getWineRating(a) || 0) - (getWineRating(b) || 0); break;
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'region': cmp = getWineRegion(a).localeCompare(getWineRegion(b)); break;
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

  function boxPrice(box: CaseBox): number {
    return box.items.reduce((s, item) => {
      const wine = allWines.find(w => w.id === item.wineId);
      return s + (wine ? (getWinePrice(wine) || 0) * item.quantity : 0);
    }, 0);
  }

  // ── Actions ────────────────────────────────────────

  const addWine = useCallback((wine: Wine) => {
    if (activeFull) return;
    setBoxes(prev => {
      const updated = [...prev];
      const box = { ...updated[activeIdx] };
      if (boxTotal(box) >= 12) return prev;
      const bestVintage = wine.vintages?.sort((a, b) => b.vintageYear - a.vintageYear)[0];
      const existIdx = box.items.findIndex(i => i.wineId === wine.id);
      if (existIdx >= 0) {
        box.items = [...box.items];
        box.items[existIdx] = { ...box.items[existIdx], quantity: box.items[existIdx].quantity + 1 };
      } else {
        box.items = [...box.items, {
          wineId: wine.id, wineName: wine.name, wineColor: wine.color,
          wineRegion: wine.region, vintageYear: bestVintage?.vintageYear,
          quantity: 1, isLikeThis: false,
        }];
      }
      updated[activeIdx] = box;
      return updated;
    });
    setAddedFlash(wine.id);
    setTimeout(() => setAddedFlash(null), 400);
  }, [activeIdx, activeFull]);

  useImperativeHandle(ref, () => ({ addWine }), [addWine]);

  const removeItem = useCallback((itemIdx: number) => {
    const item = activeBox.items[itemIdx];
    if (!item) return;
    setUndoItem({ boxIdx: activeIdx, item, pos: itemIdx });
    setTimeout(() => setUndoItem(null), 4000);
    setBoxes(prev => {
      const updated = [...prev];
      const box = { ...updated[activeIdx] };
      box.items = box.items.filter((_, i) => i !== itemIdx);
      updated[activeIdx] = box;
      return updated;
    });
  }, [activeIdx, activeBox]);

  const handleUndo = useCallback(() => {
    if (!undoItem) return;
    setBoxes(prev => {
      const updated = [...prev];
      const box = { ...updated[undoItem.boxIdx] };
      box.items = [...box.items];
      box.items.splice(undoItem.pos, 0, undoItem.item);
      updated[undoItem.boxIdx] = box;
      return updated;
    });
    setUndoItem(null);
  }, [undoItem]);

  const updateQty = useCallback((itemIdx: number, delta: number) => {
    const item = activeBox.items[itemIdx];
    if (!item) return;
    if (item.quantity + delta < 1) { removeItem(itemIdx); return; }
    if (activeTotal + delta > 12) return;
    setBoxes(prev => {
      const updated = [...prev];
      const box = { ...updated[activeIdx] };
      box.items = [...box.items];
      box.items[itemIdx] = { ...box.items[itemIdx], quantity: box.items[itemIdx].quantity + delta };
      updated[activeIdx] = box;
      return updated;
    });
  }, [activeIdx, activeBox, activeTotal, removeItem]);

  const toggleLike = useCallback((itemIdx: number) => {
    setBoxes(prev => {
      const updated = [...prev];
      const box = { ...updated[activeIdx] };
      box.items = [...box.items];
      box.items[itemIdx] = { ...box.items[itemIdx], isLikeThis: !box.items[itemIdx].isLikeThis };
      updated[activeIdx] = box;
      return updated;
    });
  }, [activeIdx]);

  // Theme
  const setTheme = useCallback((theme: string, manual: boolean) => {
    setBoxes(prev => {
      const updated = [...prev];
      updated[activeIdx] = { ...updated[activeIdx], theme, themeIsManual: manual };
      return updated;
    });
  }, [activeIdx]);

  const suggestThemes = useCallback(async () => {
    if (activeBox.items.length === 0) return;
    setThemeSuggesting(true);
    try {
      const wines = activeBox.items.map(i => ({
        name: i.wineName, color: i.wineColor, region: i.wineRegion, vintageYear: i.vintageYear,
      }));
      const data = await api.remiCaseSuggestTheme(wines);
      setBoxes(prev => {
        const updated = [...prev];
        updated[activeIdx] = {
          ...updated[activeIdx],
          themeOptions: data.themes || [],
          theme: updated[activeIdx].themeIsManual ? updated[activeIdx].theme : (data.themes?.[0] || updated[activeIdx].theme),
        };
        return updated;
      });
    } catch { /* silent */ }
    setThemeSuggesting(false);
  }, [activeIdx, activeBox]);

  // Keep ref in sync for auto-suggest effect
  suggestThemesRef.current = suggestThemes;

  // Auto-suggest themes: on mount, on first wine added, or when switching to unnamed case
  useEffect(() => {
    const prev = lastSeenRef.current;
    const curr = { activeIdx, itemCount: activeBox.items.length };
    lastSeenRef.current = curr;

    // Skip if manually themed or no wines
    if (activeBox.themeIsManual || activeBox.items.length === 0) return;
    // Skip if already has suggestions
    if (activeBox.theme && activeBox.themeOptions.length > 0) return;

    // Trigger: went from 0 items to any items on same box (covers mount + first wine)
    const wentFromEmpty = prev.activeIdx === curr.activeIdx && prev.itemCount === 0 && curr.itemCount > 0;
    // Trigger: switched to a case that has wines but no theme
    const switchedToUnnamed = prev.activeIdx !== curr.activeIdx && !activeBox.theme;

    if (wentFromEmpty || switchedToUnnamed) {
      const timer = setTimeout(() => suggestThemesRef.current(), 600);
      return () => clearTimeout(timer);
    }
  }, [activeIdx, activeBox.items.length, activeBox.themeIsManual, activeBox.theme, activeBox.themeOptions.length]);

  // Start a new case
  const startNewCase = useCallback(() => {
    const nextNum = Math.max(...boxes.map(b => b.caseNumber), 0) + 1;
    setBoxes(prev => [...prev, emptyBox(nextNum)]);
    setActiveIdx(boxes.length);
  }, [boxes]);

  // Remove a box
  const removeBox = useCallback((idx: number) => {
    const box = boxes[idx];
    if (box?.items.length > 0 && !window.confirm(`Remove this case and its ${boxTotal(box)} bottles?`)) return;
    setUndoItem(null);
    if (boxes.length <= 1) {
      setBoxes([emptyBox(1)]);
      setActiveIdx(0);
      return;
    }
    setBoxes(prev => prev.filter((_, i) => i !== idx));
    if (activeIdx === idx) setActiveIdx(0);
    else if (activeIdx > idx) setActiveIdx(activeIdx - 1);
  }, [boxes, activeIdx]);

  // Email
  const draftEmail = useCallback(async (revision?: string) => {
    setEmailLoading(true);
    try {
      const emailBoxes = boxes.filter(b => b.items.length > 0 || b.theme).map(b => ({
        theme: b.theme || 'Mixed case',
        items: b.items.map(i => ({ name: i.wineName, vintageYear: i.vintageYear, quantity: i.quantity, isLikeThis: i.isLikeThis })),
      }));
      const data = await api.remiCaseEmail(emailBoxes, revision);
      setEmailDraft(data.email);
      setShowEmail(true);
      setRevisionInput('');
    } catch { /* silent */ }
    setEmailLoading(false);
  }, [boxes]);

  const copyEmail = useCallback(async () => {
    try { await navigator.clipboard.writeText(emailDraft); setCopied(true); setTimeout(() => setCopied(false), 3000); }
    catch { /* silent */ }
  }, [emailDraft]);

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir(field === 'name' || field === 'region' ? 'asc' : 'desc'); }
  }

  // ── Render ─────────────────────────────────────────

  const price = boxPrice(activeBox);

  return (
    <div className="cb5">

      {/* ── Case shelf — all cases always visible ── */}
      <div className="cb5-shelf">
        {boxes.map((box, idx) => {
          const total = boxTotal(box);
          const sealed = total >= 12;
          const isActive = idx === activeIdx;
          return (
            <button
              key={box.id}
              className={`cb5-shelf-item ${isActive ? 'cb5-shelf-active' : ''} ${sealed ? 'cb5-shelf-sealed' : ''}`}
              onClick={() => setActiveIdx(idx)}
            >
              <div className={`cb5-mini-crate ${sealed ? 'cb5-mini-closed' : 'cb5-mini-open'}`}>
                <div className="cb5-mini-flap cb5-mini-flap-l" />
                <div className="cb5-mini-flap cb5-mini-flap-r" />
                <div className="cb5-mini-body" />
              </div>
              <div className="cb5-shelf-detail">
                <span className="cb5-shelf-name">{box.theme || `Case ${box.caseNumber}`}</span>
                <span className="cb5-shelf-count">{total}/12</span>
              </div>
            </button>
          );
        })}
        <button className="cb5-shelf-add" onClick={startNewCase} title="New case">+</button>
      </div>

      {/* ── The open box with flaps ── */}
      <div className="cb5-box-area">
        <div className={`cb5-flaps ${activeFull ? 'cb5-flaps-closed' : 'cb5-flaps-open'}`}>
          <div className="cb5-flap cb5-flap-l" />
          <div className="cb5-flap cb5-flap-r" />
        </div>
        <div className={`cb5-box ${activeFull ? 'cb5-box-sealed' : ''}`}>
          {/* Theme bar */}
          <div className="cb5-theme-bar">
            <div className="cb5-theme-display" onClick={() => { setThemeInput(activeBox.theme); setThemePopupOpen(true); }}>
              <span className={`cb5-theme-text ${!activeBox.theme ? 'cb5-theme-placeholder' : ''} ${!activeBox.themeIsManual && activeBox.theme ? 'cb5-theme-remi' : ''}`}>
                {activeBox.theme || 'Tap to name this case'}
              </span>
              <span className="cb5-theme-arrow">&#9662;</span>
            </div>
            <span className={`cb5-box-count ${activeFull ? 'cb5-box-count-full' : ''}`}>
              {activeTotal}/12
            </span>
          </div>

          {/* Progress bar */}
          <div className="cb5-progress-track">
            <div className={`cb5-progress-bar ${activeFull ? 'cb5-progress-full' : ''}`} style={{ width: `${(activeTotal / 12) * 100}%` }} />
          </div>

          {/* Wines in the box */}
          <div className="cb5-box-contents">
            {activeBox.items.length === 0 ? (
              <p className="cb5-box-empty">Your case starts here</p>
            ) : (
              activeBox.items.map((item, idx) => (
                <div key={idx} className="cb5-box-wine">
                  <span className="cb5-wine-dot" style={{ backgroundColor: DOT_COLORS[item.wineColor] || DOT_COLORS.red }} />
                  <div className="cb5-wine-info">
                    <span className="cb5-wine-name">{item.wineName}</span>
                    {item.vintageYear && <span className="cb5-wine-year">{item.vintageYear}</span>}
                    <button className={`cb5-like-btn ${item.isLikeThis ? 'cb5-like-active' : ''}`}
                      onClick={() => toggleLike(idx)}>
                      {item.isLikeThis ? 'or similar' : 'exact'}
                    </button>
                  </div>
                  <div className="cb5-wine-qty">
                    <button className="cb5-qty-btn" onClick={() => updateQty(idx, -1)}>&#8722;</button>
                    <span className="cb5-qty-num">{item.quantity}</span>
                    <button className="cb5-qty-btn" onClick={() => updateQty(idx, 1)} disabled={activeFull}>+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Box footer */}
          <div className="cb5-box-footer">
            {price > 0 && <span className="cb5-box-price">~${price}</span>}
            {activeFull ? (
              <button className="cb5-next-box-btn" onClick={startNewCase}>Start next case</button>
            ) : activeBox.items.length > 0 ? (
              <div className="cb5-box-footer-actions">
                {boxes.length > 1 && (
                  <button className="cb5-remove-box" onClick={() => removeBox(activeIdx)}>Remove</button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Draft Email (near the box, not after the wall) ── */}
      {hasAnyWines && (
        <div className="cb5-email-area">
          <button className="cb5-email-btn" onClick={() => draftEmail()} disabled={emailLoading}>
            {emailLoading ? 'Remi is drafting...' : 'Draft Email to Gerald'}
          </button>
        </div>
      )}

      {/* ── Wine wall (collection with filters) ── */}
      <div className="cb5-wall">
        {activeFull && (
          <p className="cb5-wall-full-note">This case is full. Tap a wine to peek, or start a new case.</p>
        )}
        <div className="cb5-wall-header">
          <input
            type="search"
            className="cb5-search"
            placeholder="Search wines, regions, grapes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="cb5-filters">
            <select value={colorFilter} onChange={e => setColorFilter(e.target.value)} className="cb5-filter-select">
              <option value="">Color</option>
              <option value="red">Red</option>
              <option value="white">White</option>
              <option value="rose">Rosé</option>
              <option value="sparkling">Sparkling</option>
            </select>
            <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="cb5-filter-select">
              <option value="">Region</option>
              {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="cb5-filter-select">
              <option value="">Source</option>
              <option value="weimax">Weimax</option>
              <option value="costco">Costco</option>
              <option value="other">Other</option>
            </select>
            <div className="cb5-price-range">
              <input
                type="number"
                className="cb5-price-input"
                placeholder="Min $"
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                min="0"
              />
              <span className="cb5-price-dash">&ndash;</span>
              <input
                type="number"
                className="cb5-price-input"
                placeholder="Max $"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                min="0"
              />
            </div>
          </div>
          <div className="cb5-sorts">
            {(['rating', 'region', 'name'] as const).map(f => (
              <button key={f} className={`cb5-sort-chip ${sortBy === f ? 'cb5-sort-active' : ''}`} onClick={() => toggleSort(f)}>
                {f === 'name' ? 'A-Z' : f.charAt(0).toUpperCase() + f.slice(1)}
                {sortBy === f && <span className="cb5-sort-arrow">{sortDir === 'desc' ? ' \u2193' : ' \u2191'}</span>}
              </button>
            ))}
            {(colorFilter || regionFilter || sourceFilter || priceMin || priceMax || search) && (
              <button className="cb5-sort-chip cb5-clear-filters" onClick={() => {
                setColorFilter(''); setRegionFilter(''); setSourceFilter('');
                setPriceMin(''); setPriceMax(''); setSearch('');
              }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {winesLoading ? (
          <p className="cb5-loading">Loading your collection...</p>
        ) : filteredWines.length === 0 ? (
          <p className="cb5-no-results">No wines match these filters.</p>
        ) : (
          <div className="cb5-wine-list">
            {filteredWines.map(wine => {
              const wPrice = getWinePrice(wine);
              const wRating = getWineRating(wine);
              const inCase = activeBox.items.some(i => i.wineId === wine.id);
              const flashing = addedFlash === wine.id;
              return (
                <div key={wine.id}
                  className={`cb5-wall-card card-tint-${wine.color} ${inCase ? 'cb5-wall-card-incase' : ''} ${flashing ? 'wine-card-added-flash' : ''}`}>
                  <div className="cb5-wall-card-main" onClick={() => setPeekWine(wine)}>
                    <span className="cb5-wall-card-name">{wine.name}</span>
                    <div className="cb5-wall-card-meta">
                      {wine.vintages && wine.vintages.length > 0 && (
                        <span>{wine.vintages.map(v => v.vintageYear).sort((a, b) => b - a)[0]}</span>
                      )}
                      {wRating && <span>{wRating.toFixed(1)}</span>}
                      {wPrice && <span>${wPrice}</span>}
                      {wine.region && <span>{wine.region}</span>}
                    </div>
                    {inCase && <span className="cb5-wall-card-check">&#10003;</span>}
                  </div>
                  {!activeFull && (
                    <button className="cb5-wall-card-add" onClick={() => addWine(wine)} title="Add to case">
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Theme popup ── */}
      {themePopupOpen && (
        <div className="cb5-popup-overlay" onClick={() => setThemePopupOpen(false)}>
          <div className="cb5-popup" onClick={e => e.stopPropagation()}>
            <h4 className="cb5-popup-title">Name This Case</h4>

            {/* Show Remi's suggestions first if available */}
            {activeBox.themeOptions.length > 0 && (
              <div className="cb5-popup-suggestions">
                <div className="cb5-popup-options-label">Remi's suggestions</div>
                <div className="cb5-popup-options">
                  {activeBox.themeOptions.map((opt, i) => (
                    <button key={i} className={`cb5-popup-option ${activeBox.theme === opt ? 'cb5-popup-option-active' : ''}`} onClick={() => {
                      setTheme(opt, false);
                      setThemePopupOpen(false);
                    }}>{opt}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom input */}
            <div className="cb5-popup-divider" />
            <input
              type="text"
              className="cb5-popup-input"
              placeholder="Or type your own..."
              value={themeInput}
              onChange={e => setThemeInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && themeInput.trim()) {
                  setTheme(themeInput.trim(), true);
                  setThemePopupOpen(false);
                }
              }}
              autoFocus
            />
            <button className="cb5-popup-set" onClick={() => {
              if (themeInput.trim()) {
                setTheme(themeInput.trim(), true);
                setThemePopupOpen(false);
              }
            }}>Set Name</button>

            {/* Ask Remi button */}
            {activeBox.items.length > 0 && (
              <>
                <div className="cb5-popup-divider" />
                <button className="cb5-popup-suggest" onClick={suggestThemes} disabled={themeSuggesting}>
                  {themeSuggesting ? 'Thinking...' : activeBox.themeOptions.length > 0 ? 'Ask Remi again' : 'Ask Remi for ideas'}
                </button>
              </>
            )}

            <button className="cb5-popup-close" onClick={() => setThemePopupOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Peek card (back of the label) ── */}
      {peekWine && (
        <div className="cb5-popup-overlay" onClick={() => setPeekWine(null)}>
          <div className="cb5-peek" onClick={e => e.stopPropagation()}>
            <h4 className="cb5-peek-name">{peekWine.name}</h4>
            <div className="cb5-peek-meta">
              {peekWine.region && <span>{peekWine.region}</span>}
              {peekWine.grapeVarietyOrBlend && <span>{peekWine.grapeVarietyOrBlend}</span>}
              {peekWine.color && <span>{peekWine.color}</span>}
            </div>
            {getWineRating(peekWine) && (
              <div className="cb5-peek-rating">Rating: {getWineRating(peekWine)!.toFixed(1)}</div>
            )}
            {getWinePrice(peekWine) && (
              <div className="cb5-peek-price">Last price: ${getWinePrice(peekWine)}</div>
            )}
            {getWineLatestNote(peekWine) && (
              <div className="cb5-peek-section">
                <div className="cb5-peek-label">Your tasting note</div>
                <p className="cb5-peek-text">{getWineLatestNote(peekWine)}</p>
              </div>
            )}
            {getWineSellerNotes(peekWine) && (
              <div className="cb5-peek-section">
                <div className="cb5-peek-label">Gerald's notes</div>
                <p className="cb5-peek-text">{getWineSellerNotes(peekWine)}</p>
              </div>
            )}
            <div className="cb5-peek-actions">
              {!activeFull && (
                <button className="cb5-peek-add" onClick={() => { addWine(peekWine); setPeekWine(null); }}>
                  Add to Case
                </button>
              )}
              <button className="cb5-peek-close" onClick={() => setPeekWine(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Undo toast ── */}
      {undoItem && (
        <div className="cb5-undo">
          <span>Removed {undoItem.item.wineName.length > 20 ? undoItem.item.wineName.slice(0, 20) + '...' : undoItem.item.wineName}</span>
          <button className="cb5-undo-btn" onClick={handleUndo}>Undo</button>
        </div>
      )}

      {/* ── Email modal ── */}
      {showEmail && (
        <div className="cb5-popup-overlay" onClick={() => setShowEmail(false)}>
          <div className="cb5-email-modal" onClick={e => e.stopPropagation()}>
            <div className="cb5-email-header">
              <h4>Email to Gerald</h4>
              <button onClick={() => setShowEmail(false)}>&#10005;</button>
            </div>
            <pre className="cb5-email-body">{emailDraft}</pre>
            <div className="cb5-email-revision">
              <input type="text" placeholder="Tell Remi: make it shorter, mention Friday..."
                value={revisionInput} onChange={e => setRevisionInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && revisionInput.trim()) draftEmail(revisionInput.trim()); }} />
              <button onClick={() => revisionInput.trim() && draftEmail(revisionInput.trim())}
                disabled={!revisionInput.trim() || emailLoading}>Revise</button>
            </div>
            <div className="cb5-email-footer">
              <button className="cb5-copy-btn" onClick={copyEmail}>
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
