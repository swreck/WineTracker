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
  splitNote: string;
}

interface Props {
  onClose: () => void;
  onWineIdsChange: (ids: Set<number>) => void;
  priceLookup: Map<number, number>;
}

const STORAGE_KEY = 'winetracker-case-builder';

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function createEmptyBox(): CaseBox {
  return {
    id: generateId(),
    theme: '',
    themeOptions: [],
    items: [],
    splitNote: '',
  };
}

function getBoxTotal(box: CaseBox): number {
  return box.items.reduce((sum, item) => sum + item.quantity, 0);
}

function loadState(): { boxes: CaseBox[]; activeIndex: number } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

function saveState(boxes: CaseBox[], activeIndex: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ boxes, activeIndex }));
}

export interface CaseBuilderHandle {
  addWine: (wine: Wine) => void;
}

const CaseBuilder = forwardRef<CaseBuilderHandle, Props>(function CaseBuilder({ onClose, onWineIdsChange, priceLookup }, ref) {
  const saved = useRef(loadState());
  const [boxes, setBoxes] = useState<CaseBox[]>(saved.current?.boxes || [createEmptyBox()]);
  const [activeIndex, setActiveIndex] = useState(saved.current?.activeIndex || 0);
  const [caseCount, setCaseCount] = useState(saved.current?.boxes?.length || 1);
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [revisionInput, setRevisionInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [themeSuggestingFor, setThemeSuggestingFor] = useState<number | null>(null);
  const [undoItem, setUndoItem] = useState<{ boxIdx: number; item: CaseBoxItem; position: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist state
  useEffect(() => {
    saveState(boxes, activeIndex);
  }, [boxes, activeIndex]);

  // Report which wine IDs are in cases to parent (for card indicators)
  useEffect(() => {
    const ids = new Set<number>();
    for (const box of boxes) {
      for (const item of box.items) {
        ids.add(item.wineId);
      }
    }
    onWineIdsChange(ids);
  }, [boxes, onWineIdsChange]);

  // Sync case count with boxes array
  const handleCaseCountChange = useCallback((count: number) => {
    setCaseCount(count);
    setBoxes(prev => {
      if (count > prev.length) {
        return [...prev, ...Array(count - prev.length).fill(null).map(() => createEmptyBox())];
      }
      return prev.slice(0, count);
    });
    setActiveIndex(prev => Math.min(prev, count - 1));
  }, []);

  // Add wine to active box, auto-advance if full
  const addWineToBox = useCallback((wine: Wine) => {
    setBoxes(prev => {
      const updated = [...prev];
      let targetIdx = activeIndex;

      // If active box is full, find next non-full box or create one
      if (getBoxTotal(updated[targetIdx]) >= 12) {
        const nextEmpty = updated.findIndex((b, i) => i > targetIdx && getBoxTotal(b) < 12);
        if (nextEmpty >= 0) {
          targetIdx = nextEmpty;
        } else {
          // Create a new box
          updated.push(createEmptyBox());
          targetIdx = updated.length - 1;
          setCaseCount(updated.length);
        }
        setActiveIndex(targetIdx);
      }

      const box = { ...updated[targetIdx] };
      const bestVintage = wine.vintages?.sort((a, b) => b.vintageYear - a.vintageYear)[0];

      // Check if wine already in this box
      const existingIdx = box.items.findIndex(item => item.wineId === wine.id);
      if (existingIdx >= 0) {
        const total = getBoxTotal(box);
        if (total >= 12) return prev;
        box.items = [...box.items];
        box.items[existingIdx] = { ...box.items[existingIdx], quantity: box.items[existingIdx].quantity + 1 };
      } else {
        if (getBoxTotal(box) >= 12) return prev;
        box.items = [...box.items, {
          wineId: wine.id,
          wineName: wine.name,
          wineColor: wine.color,
          wineRegion: wine.region,
          vintageYear: bestVintage?.vintageYear,
          quantity: 1,
          isLikeThis: false,
        }];
      }
      updated[targetIdx] = box;
      return updated;
    });
  }, [activeIndex]);

  // Expose addWine to parent via ref
  useImperativeHandle(ref, () => ({
    addWine: addWineToBox,
  }), [addWineToBox]);

  // Remove wine from box — with undo
  const removeItem = useCallback((boxIdx: number, itemIdx: number) => {
    setBoxes(prev => {
      const item = prev[boxIdx].items[itemIdx];
      setUndoItem({ boxIdx, item, position: itemIdx });
      setTimeout(() => setUndoItem(null), 4000);

      const updated = [...prev];
      const box = { ...updated[boxIdx] };
      box.items = box.items.filter((_, i) => i !== itemIdx);
      updated[boxIdx] = box;
      return updated;
    });
  }, []);

  // Undo remove
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

  // Update item quantity
  const updateQuantity = useCallback((boxIdx: number, itemIdx: number, delta: number) => {
    setBoxes(prev => {
      const updated = [...prev];
      const box = { ...updated[boxIdx] };
      const item = { ...box.items[itemIdx] };
      const newQty = item.quantity + delta;
      if (newQty < 1) return prev;
      const total = getBoxTotal(box) + delta;
      if (total > 12) return prev;
      item.quantity = newQty;
      box.items = [...box.items];
      box.items[itemIdx] = item;
      updated[boxIdx] = box;
      return updated;
    });
  }, []);

  // Toggle "like this" vs "this wine"
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

  // Update theme
  const setTheme = useCallback((boxIdx: number, theme: string) => {
    setBoxes(prev => {
      const updated = [...prev];
      updated[boxIdx] = { ...updated[boxIdx], theme };
      return updated;
    });
  }, []);

  // Update split note
  const setSplitNote = useCallback((boxIdx: number, splitNote: string) => {
    setBoxes(prev => {
      const updated = [...prev];
      updated[boxIdx] = { ...updated[boxIdx], splitNote };
      return updated;
    });
  }, []);

  // Ask Remi for theme suggestions
  const suggestThemes = useCallback(async (boxIdx: number) => {
    const box = boxes[boxIdx];
    if (box.items.length === 0) return;
    setThemeSuggestingFor(boxIdx);
    try {
      const wines = box.items.map(item => ({
        name: item.wineName,
        color: item.wineColor,
        region: item.wineRegion,
        vintageYear: item.vintageYear,
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

  // Draft email
  const handleDraftEmail = useCallback(async (revision?: string) => {
    setEmailLoading(true);
    try {
      const emailBoxes = boxes.filter(b => b.items.length > 0 || b.theme).map(b => ({
        theme: b.theme || 'Mixed case',
        splitNote: b.splitNote || undefined,
        items: b.items.map(item => ({
          name: item.wineName,
          vintageYear: item.vintageYear,
          quantity: item.quantity,
          isLikeThis: item.isLikeThis,
        })),
      }));
      const data = await api.remiCaseEmail(emailBoxes, revision);
      setEmailDraft(data.email);
      setShowEmailDraft(true);
      setRevisionInput('');
    } catch { /* silent */ }
    setEmailLoading(false);
  }, [boxes]);

  // Copy email
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(emailDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch { /* silent */ }
  }, [emailDraft]);

  // Clear all cases
  const handleClear = useCallback(() => {
    setBoxes([createEmptyBox()]);
    setCaseCount(1);
    setActiveIndex(0);
    setShowEmailDraft(false);
    setEmailDraft('');
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Scroll active box into view
  useEffect(() => {
    if (scrollRef.current) {
      const boxEl = scrollRef.current.children[activeIndex] as HTMLElement;
      if (boxEl) {
        boxEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeIndex]);

  // Calculate price for a box
  function getBoxPrice(box: CaseBox): number {
    return box.items.reduce((sum, item) => {
      const price = priceLookup.get(item.wineId) || 0;
      return sum + (price * item.quantity);
    }, 0);
  }

  const hasAnyWines = boxes.some(b => b.items.length > 0);
  const totalBottles = boxes.reduce((sum, b) => sum + getBoxTotal(b), 0);
  const totalPrice = boxes.reduce((sum, b) => sum + getBoxPrice(b), 0);

  return (
    <div className="cb-panel">
      <div className="cb-header">
        <div className="cb-header-left">
          <h3 className="cb-title">Your Order</h3>
          <span className="cb-total">
            {totalBottles} bottles{totalPrice > 0 ? ` ~ $${totalPrice}` : ''}
          </span>
        </div>
        <div className="cb-header-actions">
          <select
            className="cb-count-picker"
            value={caseCount}
            onChange={(e) => handleCaseCountChange(parseInt(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map(n => (
              <option key={n} value={n}>{n} {n === 1 ? 'case' : 'cases'}</option>
            ))}
          </select>
          {hasAnyWines && (
            <button className="cb-clear-btn" onClick={handleClear}>Start Over</button>
          )}
        </div>
      </div>

      {/* Case boxes — horizontally scrollable */}
      <div className="cb-boxes-scroll" ref={scrollRef}>
        {boxes.map((box, boxIdx) => {
          const total = getBoxTotal(box);
          const boxPrice = getBoxPrice(box);
          const isActive = boxIdx === activeIndex;
          return (
            <div
              key={box.id}
              className={`cb-box ${isActive ? 'cb-box-active' : ''} ${total === 12 ? 'cb-box-full' : ''}`}
              onClick={() => setActiveIndex(boxIdx)}
            >
              {/* Theme header */}
              <div className="cb-box-theme">
                <div className="cb-theme-input-row">
                  <input
                    type="text"
                    className="cb-theme-input"
                    placeholder={`Case ${boxIdx + 1} theme...`}
                    value={box.theme}
                    onChange={(e) => setTheme(boxIdx, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {box.items.length > 0 && (
                    <button
                      className="cb-suggest-btn"
                      onClick={(e) => { e.stopPropagation(); suggestThemes(boxIdx); }}
                      disabled={themeSuggestingFor === boxIdx}
                      title="Ask Remi for theme ideas"
                    >
                      {themeSuggestingFor === boxIdx ? '...' : 'Remi'}
                    </button>
                  )}
                </div>
                {box.themeOptions.length > 0 && (
                  <div className="cb-theme-chips">
                    {box.themeOptions.map((opt, i) => (
                      <button
                        key={i}
                        className={`cb-theme-chip ${box.theme === opt ? 'cb-theme-chip-active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setTheme(boxIdx, opt); }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Split note */}
              {(box.splitNote || isActive) && (
                <input
                  type="text"
                  className="cb-split-input"
                  placeholder="Split (e.g. 6 reds + 6 whites)"
                  value={box.splitNote}
                  onChange={(e) => setSplitNote(boxIdx, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}

              {/* Wine items */}
              <div className="cb-box-items">
                {box.items.length === 0 ? (
                  <p className="cb-box-empty">
                    {isActive ? 'Your case starts here' : 'Empty'}
                  </p>
                ) : (
                  box.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="cb-item">
                      <div className="cb-item-info">
                        <span className="cb-item-name">
                          {item.wineName}
                        </span>
                        {item.vintageYear && <span className="cb-item-vintage">{item.vintageYear}</span>}
                        <button
                          className={`cb-like-toggle ${item.isLikeThis ? 'cb-like-active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleLikeThis(boxIdx, itemIdx); }}
                          title={item.isLikeThis ? 'Gerald picks something similar' : 'This exact wine'}
                        >
                          {item.isLikeThis ? 'or similar' : 'exact'}
                        </button>
                      </div>
                      <div className="cb-item-controls">
                        <button
                          className="cb-qty-btn"
                          onClick={(e) => { e.stopPropagation(); updateQuantity(boxIdx, itemIdx, -1); }}
                          disabled={item.quantity <= 1}
                        >
                          &#8722;
                        </button>
                        <span className="cb-qty-value">{item.quantity}</span>
                        <button
                          className="cb-qty-btn"
                          onClick={(e) => { e.stopPropagation(); updateQuantity(boxIdx, itemIdx, 1); }}
                          disabled={total >= 12}
                        >
                          +
                        </button>
                        <button
                          className="cb-remove-btn"
                          onClick={(e) => { e.stopPropagation(); removeItem(boxIdx, itemIdx); }}
                        >
                          &#10005;
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Box footer with total and price */}
              <div className={`cb-box-footer ${total === 12 ? 'cb-footer-full' : total > 12 ? 'cb-footer-over' : ''}`}>
                <span>{total}/12{boxPrice > 0 ? ` ~ $${boxPrice}` : ''}</span>
                {total === 12 && <span className="cb-full-badge">Full</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Undo toast */}
      {undoItem && (
        <div className="cb-undo-toast">
          <span>Removed {undoItem.item.wineName.length > 25 ? undoItem.item.wineName.slice(0, 25) + '...' : undoItem.item.wineName}</span>
          <button className="cb-undo-btn" onClick={handleUndo}>Undo</button>
        </div>
      )}

      {/* Email actions */}
      {hasAnyWines && (
        <div className="cb-email-actions">
          <button
            className="cb-email-btn"
            onClick={() => handleDraftEmail()}
            disabled={emailLoading}
          >
            {emailLoading ? 'Remi is drafting...' : 'Draft Email to Gerald'}
          </button>
        </div>
      )}

      {/* Email draft modal */}
      {showEmailDraft && (
        <div className="cb-email-overlay" onClick={() => setShowEmailDraft(false)}>
          <div className="cb-email-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cb-email-header">
              <h4>Email to Gerald</h4>
              <button className="cb-email-close" onClick={() => setShowEmailDraft(false)}>&#10005;</button>
            </div>
            <pre className="cb-email-body">{emailDraft}</pre>
            <div className="cb-email-revision">
              <input
                type="text"
                className="cb-revision-input"
                placeholder="Tell Remi: make it shorter, mention Friday..."
                value={revisionInput}
                onChange={(e) => setRevisionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && revisionInput.trim()) {
                    handleDraftEmail(revisionInput.trim());
                  }
                }}
              />
              <button
                className="cb-revise-btn"
                onClick={() => revisionInput.trim() && handleDraftEmail(revisionInput.trim())}
                disabled={!revisionInput.trim() || emailLoading}
              >
                Revise
              </button>
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
