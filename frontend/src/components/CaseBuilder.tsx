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

// Build the 12-slot visual grid from items
function buildBottleGrid(items: CaseBoxItem[]): { color: string; wineName: string; idx: number }[] {
  const slots: { color: string; wineName: string; idx: number }[] = [];
  items.forEach((item, idx) => {
    for (let i = 0; i < item.quantity; i++) {
      slots.push({ color: item.wineColor, wineName: item.wineName, idx });
    }
  });
  return slots;
}

const WINE_COLORS: Record<string, string> = {
  red: 'var(--color-bottle-red, #5a1a2a)',
  white: 'var(--color-bottle-white, #c4a84a)',
  rose: 'var(--color-bottle-rose, #c4607a)',
  sparkling: 'var(--color-bottle-sparkling, #8a9ab5)',
};

export interface CaseBuilderHandle {
  addWine: (wine: Wine) => void;
}

const CaseBuilder = forwardRef<CaseBuilderHandle, Props>(function CaseBuilder({ onClose, onWineIdsChange, priceLookup }, ref) {
  const saved = useRef(loadState());
  const [boxes, setBoxes] = useState<CaseBox[]>(saved.current?.boxes || [createEmptyBox()]);
  const [activeIndex, setActiveIndex] = useState(saved.current?.activeIndex || 0);
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [revisionInput, setRevisionInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [themeSuggestingFor, setThemeSuggestingFor] = useState<number | null>(null);
  const [undoItem, setUndoItem] = useState<{ boxIdx: number; item: CaseBoxItem; position: number } | null>(null);

  // Persist state
  useEffect(() => {
    saveState(boxes, activeIndex);
  }, [boxes, activeIndex]);

  // Report which wine IDs are in cases to parent
  useEffect(() => {
    const ids = new Set<number>();
    for (const box of boxes) {
      for (const item of box.items) {
        ids.add(item.wineId);
      }
    }
    onWineIdsChange(ids);
  }, [boxes, onWineIdsChange]);

  // Add wine to active box, auto-advance if full
  const addWineToBox = useCallback((wine: Wine) => {
    setBoxes(prev => {
      const updated = [...prev];
      let targetIdx = activeIndex;

      if (getBoxTotal(updated[targetIdx]) >= 12) {
        const nextEmpty = updated.findIndex((b, i) => i > targetIdx && getBoxTotal(b) < 12);
        if (nextEmpty >= 0) {
          targetIdx = nextEmpty;
        } else {
          updated.push(createEmptyBox());
          targetIdx = updated.length - 1;
        }
        setActiveIndex(targetIdx);
      }

      const box = { ...updated[targetIdx] };
      const bestVintage = wine.vintages?.sort((a, b) => b.vintageYear - a.vintageYear)[0];

      const existingIdx = box.items.findIndex(item => item.wineId === wine.id);
      if (existingIdx >= 0) {
        if (getBoxTotal(box) >= 12) return prev;
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

  useImperativeHandle(ref, () => ({
    addWine: addWineToBox,
  }), [addWineToBox]);

  // Remove wine from box — with undo
  const removeItem = useCallback((boxIdx: number, itemIdx: number) => {
    // Capture item before modifying state (avoid side effects in updater)
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

  // Update quantity — minus at 1 removes
  const updateQuantity = useCallback((boxIdx: number, itemIdx: number, delta: number) => {
    setBoxes(prev => {
      const updated = [...prev];
      const box = { ...updated[boxIdx] };
      const item = { ...box.items[itemIdx] };
      const newQty = item.quantity + delta;
      if (newQty < 1) {
        removeItem(boxIdx, itemIdx);
        return prev;
      }
      const total = getBoxTotal(box) + delta;
      if (total > 12) return prev;
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

  const setSplitNote = useCallback((boxIdx: number, splitNote: string) => {
    setBoxes(prev => {
      const updated = [...prev];
      updated[boxIdx] = { ...updated[boxIdx], splitNote };
      return updated;
    });
  }, []);

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

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(emailDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch { /* silent */ }
  }, [emailDraft]);

  const handleClear = useCallback(() => {
    const totalBottles = boxes.reduce((sum, b) => sum + getBoxTotal(b), 0);
    if (totalBottles > 0 && !window.confirm('Clear all cases and start over?')) {
      return;
    }
    setBoxes([createEmptyBox()]);
    setActiveIndex(0);
    setShowEmailDraft(false);
    setEmailDraft('');
    setUndoItem(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [boxes]);

  // Add a new case
  const addCase = useCallback(() => {
    setBoxes(prev => [...prev, createEmptyBox()]);
    setActiveIndex(boxes.length);
  }, [boxes.length]);

  // Remove current case — with confirmation
  const removeCase = useCallback((idx: number) => {
    const box = boxes[idx];
    const hasWines = box && box.items.length > 0;
    if (hasWines && !window.confirm(`Remove Case ${idx + 1} and its ${getBoxTotal(box)} bottles?`)) {
      return;
    }
    setUndoItem(null); // Clear undo to prevent restoring to wrong case
    if (boxes.length <= 1) {
      handleClear();
      return;
    }
    setBoxes(prev => prev.filter((_, i) => i !== idx));
    setActiveIndex(prev => Math.min(prev, boxes.length - 2));
  }, [boxes, handleClear]);

  function getBoxPrice(box: CaseBox): number {
    return box.items.reduce((sum, item) => {
      const price = priceLookup.get(item.wineId) || 0;
      return sum + (price * item.quantity);
    }, 0);
  }

  const activeBox = boxes[activeIndex];
  const total = getBoxTotal(activeBox);
  const boxPrice = getBoxPrice(activeBox);
  const bottleGrid = buildBottleGrid(activeBox.items);
  const hasAnyWines = boxes.some(b => b.items.length > 0);

  return (
    <div className="cb-page">
      {/* The visual crate */}
      <div className="cb-crate">
        {/* Theme area */}
        <div className="cb-crate-theme">
          <input
            type="text"
            className="cb-crate-theme-input"
            placeholder={`Case ${activeIndex + 1} theme...`}
            value={activeBox.theme}
            onChange={(e) => setTheme(activeIndex, e.target.value)}
          />
          {activeBox.items.length > 0 && (
            <button
              className="cb-crate-suggest"
              onClick={() => suggestThemes(activeIndex)}
              disabled={themeSuggestingFor === activeIndex}
            >
              {themeSuggestingFor === activeIndex ? '...' : 'Suggest'}
            </button>
          )}
        </div>

        {activeBox.themeOptions.length > 0 && (
          <div className="cb-crate-theme-chips">
            {activeBox.themeOptions.map((opt, i) => (
              <button
                key={i}
                className={`cb-theme-chip ${activeBox.theme === opt ? 'cb-theme-chip-active' : ''}`}
                onClick={() => setTheme(activeIndex, opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* 4x3 bottle grid */}
        <div className="cb-bottle-grid">
          {Array.from({ length: 12 }).map((_, slotIdx) => {
            const bottle = bottleGrid[slotIdx];
            return (
              <div
                key={slotIdx}
                className={`cb-bottle-slot ${bottle ? 'cb-bottle-filled' : 'cb-bottle-empty'}`}
                style={bottle ? { backgroundColor: WINE_COLORS[bottle.color] || WINE_COLORS.red } : undefined}
                title={bottle?.wineName}
              >
                {bottle && (
                  <span className="cb-bottle-initial">
                    {bottle.wineName.charAt(0)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Count and price */}
        <div className={`cb-crate-status ${total === 12 ? 'cb-crate-full' : ''}`}>
          <span>{total}/12 bottles</span>
          {boxPrice > 0 && <span>~${boxPrice}</span>}
          {total === 12 && <span className="cb-full-label">Case full</span>}
        </div>

        {/* Split note */}
        {(activeBox.splitNote || total > 0) && (
          <input
            type="text"
            className="cb-crate-split"
            placeholder="Split note (e.g. 6 reds + 6 whites)"
            value={activeBox.splitNote}
            onChange={(e) => setSplitNote(activeIndex, e.target.value)}
          />
        )}

        {/* Wine list — details of what's in the crate */}
        {activeBox.items.length > 0 && (
          <div className="cb-crate-wines">
            {activeBox.items.map((item, itemIdx) => (
              <div key={itemIdx} className="cb-wine-row">
                <div
                  className="cb-wine-color-dot"
                  style={{ backgroundColor: WINE_COLORS[item.wineColor] || WINE_COLORS.red }}
                />
                <div className="cb-wine-detail">
                  <span className="cb-wine-name">{item.wineName}</span>
                  {item.vintageYear && <span className="cb-wine-year">{item.vintageYear}</span>}
                  <button
                    className={`cb-like-toggle ${item.isLikeThis ? 'cb-like-active' : ''}`}
                    onClick={() => toggleLikeThis(activeIndex, itemIdx)}
                  >
                    {item.isLikeThis ? 'or similar' : 'exact'}
                  </button>
                </div>
                <div className="cb-wine-qty">
                  <button
                    className="cb-qty-btn"
                    onClick={() => updateQuantity(activeIndex, itemIdx, -1)}
                  >
                    &#8722;
                  </button>
                  <span className="cb-qty-num">{item.quantity}</span>
                  <button
                    className="cb-qty-btn"
                    onClick={() => updateQuantity(activeIndex, itemIdx, 1)}
                    disabled={total >= 12}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeBox.items.length === 0 && (
          <p className="cb-crate-empty">Tap a wine above to start filling this case</p>
        )}
      </div>

      {/* Case tabs */}
      <div className="cb-case-tabs">
        {boxes.map((box, idx) => {
          const boxTotal = getBoxTotal(box);
          return (
            <button
              key={box.id}
              className={`cb-case-tab ${idx === activeIndex ? 'cb-case-tab-active' : ''} ${boxTotal === 12 ? 'cb-case-tab-full' : ''}`}
              onClick={() => setActiveIndex(idx)}
            >
              Case {idx + 1}
              {boxTotal > 0 && <span className="cb-tab-count">{boxTotal}</span>}
            </button>
          );
        })}
        <button className="cb-case-tab cb-case-tab-add" onClick={addCase}>+</button>
        {boxes.length > 1 && (
          <button
            className="cb-case-tab-remove"
            onClick={() => removeCase(activeIndex)}
          >
            Remove case
          </button>
        )}
      </div>

      {/* Undo toast */}
      {undoItem && (
        <div className="cb-undo-toast">
          <span>Removed {undoItem.item.wineName.length > 20 ? undoItem.item.wineName.slice(0, 20) + '...' : undoItem.item.wineName}</span>
          <button className="cb-undo-btn" onClick={handleUndo}>Undo</button>
        </div>
      )}

      {/* Email button */}
      {hasAnyWines && (
        <button
          className="cb-email-btn"
          onClick={() => handleDraftEmail()}
          disabled={emailLoading}
        >
          {emailLoading ? 'Remi is drafting...' : 'Draft Email to Gerald'}
        </button>
      )}

      {hasAnyWines && (
        <button className="cb-start-over" onClick={handleClear}>Start Over</button>
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
