import { useState } from 'react';
import { api } from '../api/client';
import type { ImportPreview, ImportResult } from '../api/client';

interface Props {
  onComplete: (wineIds?: number[], goToTasting?: boolean) => void;
}

type Stage = 'input' | 'preview' | 'complete';

type ImportMode = 'receipt' | 'label' | 'manual' | 'standard';

interface ManualEntry {
  name: string;
  vintageYear: number;
  color: 'red' | 'white' | 'rose' | 'sparkling';
  price: string;
  quantity: number;
  purchaseDate: string;
  sellerNotes: string;
  source: '' | 'weimax' | 'costco' | 'other';
  sourceCustom: string;
  addTasting: boolean;
  tastingRating: string;
  tastingNotes: string;
}

const currentYear = new Date().getFullYear();

const colorLabels: Record<string, string> = {
  red: 'Red',
  white: 'White',
  rose: 'Rosé',
  sparkling: 'Sparkling',
};

export default function Import({ onComplete }: Props) {
  const [stage, setStage] = useState<Stage>('input');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<ImportMode>('receipt');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable parsed batches (user can modify before confirming)
  const [editedBatches, setEditedBatches] = useState<any[] | null>(null);

  // Track original values for corrections
  const [originalBatches, setOriginalBatches] = useState<any[] | null>(null);

  // Match decisions: { importedName: existingWineId | null }
  const [matchDecisions, setMatchDecisions] = useState<Record<string, number | null>>({});

  // Manual entry state
  const [manualEntry, setManualEntry] = useState<ManualEntry>({
    name: '',
    vintageYear: currentYear - 2,
    color: 'red',
    price: '',
    quantity: 1,
    purchaseDate: '',
    sellerNotes: '',
    source: '',
    sourceCustom: '',
    addTasting: false,
    tastingRating: '',
    tastingNotes: '',
  });
  const [showOlderYears, setShowOlderYears] = useState(false);
  const [showManualRatingPicker, setShowManualRatingPicker] = useState(false);

  // Tasting addition per-item in preview
  const [previewTastings, setPreviewTastings] = useState<Record<string, { rating: string; notes: string }>>({});
  const [showPreviewRatingPicker, setShowPreviewRatingPicker] = useState<string | null>(null);

  // Whether to navigate to tasting after import
  const [goToTasting, setGoToTasting] = useState(false);

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

  async function handlePreview() {
    if (!text.trim()) {
      setError('Please paste some text to import');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apiMode = mode === 'label' ? 'label' : mode === 'receipt' ? 'receipt' : 'standard';
      const data = await api.previewImport(text, apiMode);
      setPreview(data);
      // Deep clone batches for editing
      const cloned = JSON.parse(JSON.stringify(data.batches));
      setEditedBatches(cloned);
      setOriginalBatches(JSON.parse(JSON.stringify(data.batches)));
      setMatchDecisions({});
      setStage('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse import');
    } finally {
      setLoading(false);
    }
  }

  function updateItem(batchIndex: number, itemIndex: number, field: string, value: any) {
    if (!editedBatches) return;
    const updated = [...editedBatches];
    updated[batchIndex] = { ...updated[batchIndex], items: [...updated[batchIndex].items] };
    updated[batchIndex].items[itemIndex] = { ...updated[batchIndex].items[itemIndex], [field]: value };
    setEditedBatches(updated);
  }

  function removeItem(batchIndex: number, itemIndex: number) {
    if (!editedBatches) return;
    const updated = [...editedBatches];
    updated[batchIndex] = {
      ...updated[batchIndex],
      items: updated[batchIndex].items.filter((_: any, i: number) => i !== itemIndex),
    };
    // Remove empty batches
    setEditedBatches(updated.filter((b: any) => b.items.length > 0));
  }

  async function saveCorrections() {
    if (!originalBatches || !editedBatches) return;

    const corrections: { fieldName: string; wrongValue: string; correctValue: string; originalText: string }[] = [];

    for (let bi = 0; bi < originalBatches.length; bi++) {
      const origBatch = originalBatches[bi];
      const editBatch = editedBatches[bi];
      if (!editBatch) continue;

      for (let ii = 0; ii < (origBatch.items || []).length; ii++) {
        const orig = origBatch.items[ii];
        const edited = editBatch.items?.[ii];
        if (!edited) continue;

        for (const field of ['name', 'color', 'vintageYear', 'price']) {
          const origVal = String(orig[field] ?? '');
          const editVal = String(edited[field] ?? '');
          if (origVal !== editVal) {
            corrections.push({
              fieldName: field,
              wrongValue: origVal,
              correctValue: editVal,
              originalText: text.slice(0, 500),
            });
          }
        }
      }
    }

    if (corrections.length > 0) {
      try {
        const apiMode = mode === 'label' ? 'label' : 'receipt';
        await api.saveCorrections(corrections, apiMode);
      } catch {
        // Silent fail — corrections are nice-to-have
      }
    }
  }

  function buildErrorMailto(errorDetail: string) {
    const subject = encodeURIComponent('For Wine Tracker punch list');
    const body = encodeURIComponent(
      `IMPORT ERROR\n` +
      `────────────\n` +
      `Mode: ${mode}\n` +
      `Date: ${new Date().toISOString()}\n\n` +
      `Problem:\n${errorDetail}\n\n` +
      `Raw input text:\n${text.slice(0, 1000)}\n\n` +
      `Parsed result:\n${JSON.stringify(editedBatches, null, 2)?.slice(0, 1000) || 'none'}\n`
    );
    return `mailto:kenrosen@gmail.com?subject=${subject}&body=${body}`;
  }

  async function handleExecute(addTasting = false) {
    try {
      setLoading(true);
      setError(null);
      setGoToTasting(addTasting);

      // Save corrections before executing
      await saveCorrections();

      // Inject any preview tastings into the edited batches
      if (editedBatches && Object.keys(previewTastings).length > 0) {
        for (let bi = 0; bi < editedBatches.length; bi++) {
          for (let ii = 0; ii < (editedBatches[bi].items || []).length; ii++) {
            const key = `${bi}-${ii}`;
            const tasting = previewTastings[key];
            if (tasting && tasting.rating) {
              editedBatches[bi].items[ii].tastings = [
                ...(editedBatches[bi].items[ii].tastings || []),
                { rating: parseFloat(tasting.rating), notes: tasting.notes || undefined, date: new Date().toISOString() },
              ];
            }
          }
        }
      }

      const apiMode = mode === 'label' ? 'label' : mode === 'receipt' ? 'receipt' : 'standard';
      const data = await api.executeImport(text, apiMode, matchDecisions, editedBatches || undefined);

      if (data.results.winesCreated === 0 && data.results.winesMatched === 0) {
        const detail = 'No wines were created or matched. The parser could not extract valid wine data from the input.';
        setError(detail);
        return;
      }

      setResult(data);
      setStage('complete');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to execute import';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit() {
    if (!manualEntry.name.trim()) {
      setError('Wine name is required');
      return;
    }

    if (manualEntry.addTasting && !manualEntry.tastingRating) {
      setError('Please select a rating for the tasting');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await api.createWineWithVintage({
        name: manualEntry.name.trim(),
        color: manualEntry.color,
        vintageYear: manualEntry.vintageYear,
        price: manualEntry.price ? parseFloat(manualEntry.price) : undefined,
        quantity: manualEntry.quantity,
        purchaseDate: manualEntry.purchaseDate || undefined,
        sellerNotes: manualEntry.sellerNotes.trim() || undefined,
        source: manualEntry.source || undefined,
        sourceCustom: manualEntry.source === 'other' ? manualEntry.sourceCustom.trim() : undefined,
        tasting: manualEntry.addTasting && manualEntry.tastingRating
          ? {
              rating: parseFloat(manualEntry.tastingRating),
              notes: manualEntry.tastingNotes.trim() || undefined,
            }
          : undefined,
      });

      setResult({
        success: true,
        results: {
          winesCreated: data.wineCreated ? 1 : 0,
          winesMatched: data.wineCreated ? 0 : 1,
          vintagesCreated: data.vintageCreated ? 1 : 0,
          vintagesMatched: data.vintageCreated ? 0 : 1,
          purchaseBatchesCreated: manualEntry.price || manualEntry.quantity > 0 ? 1 : 0,
          purchaseItemsCreated: manualEntry.price || manualEntry.quantity > 0 ? 1 : 0,
          tastingsCreated: data.tastingCreated ? 1 : 0,
        },
        importedWineIds: [data.wine.id],
        ambiguities: [],
      });
      setStage('complete');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add wine');
    } finally {
      setLoading(false);
    }
  }

  // ===== COMPLETE STAGE =====
  if (stage === 'complete' && result) {
    return (
      <div className="import-complete">
        <h2>Import Complete</h2>
        <div className="import-results">
          <h4>Results</h4>
          <ul>
            <li>Wines created: {result.results.winesCreated}</li>
            <li>Wines matched: {result.results.winesMatched}</li>
            <li>Vintages created: {result.results.vintagesCreated}</li>
            <li>Vintages matched: {result.results.vintagesMatched}</li>
            <li>Purchase batches: {result.results.purchaseBatchesCreated}</li>
            <li>Purchase items: {result.results.purchaseItemsCreated}</li>
            <li>Tasting events: {result.results.tastingsCreated}</li>
          </ul>
        </div>

        {result.ambiguities.length > 0 && (
          <div className="ambiguities">
            <h4>Items to Review ({result.ambiguities.length})</h4>
            {result.ambiguities.map((amb, i) => (
              <div key={i} className="ambiguity-item">
                <div className="amb-type">{amb.type}</div>
                <div className="amb-message">{amb.message}</div>
                <div className="amb-context">{amb.context}</div>
                {amb.suggestion && (
                  <div className="amb-suggestion">Suggestion: {amb.suggestion}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="complete-actions">
          <button className="primary-button" onClick={() => onComplete(result.importedWineIds, goToTasting)}>
            {goToTasting ? 'Add Tasting Now' : 'Back to Wines'}
          </button>
          <button onClick={() => {
            setStage('input');
            setText('');
            setEditedBatches(null);
            setOriginalBatches(null);
            setManualEntry({
              name: '',
              vintageYear: currentYear - 2,
              color: 'red',
              price: '',
              quantity: 1,
              purchaseDate: '',
              sellerNotes: '',
              source: '',
              sourceCustom: '',
              addTasting: false,
              tastingRating: '',
              tastingNotes: '',
            });
          }}>
            Add More
          </button>
        </div>
      </div>
    );
  }

  // ===== PREVIEW STAGE =====
  if (stage === 'preview' && preview && editedBatches) {
    const totalItems = editedBatches.reduce((sum: number, b: any) => sum + (b.items?.length || 0), 0);

    return (
      <div className="import-preview">
        <h2>Review & Edit</h2>

        {totalItems === 0 && (
          <div className="error">
            No wines were parsed from the text. Try editing the text and re-previewing, or use Manual mode.
          </div>
        )}

        {/* Directly editable parsed items */}
        {editedBatches.map((batch: any, bi: number) => (
          <div key={bi} className="batch-preview">
            <div className="batch-header">
              <strong>
                {batch.purchaseDate
                  ? new Date(batch.purchaseDate).toLocaleDateString()
                  : 'No date'}
              </strong>
              {batch.theme && <span className="theme"> - {batch.theme}</span>}
              <span className="item-count"> ({batch.items?.length || 0} wines)</span>
            </div>
            <div className="batch-items">
              {(batch.items || []).map((item: any, ii: number) => {
                const key = `${bi}-${ii}`;
                const hasError = !item.name || item.name.trim().length < 2;
                const tasting = previewTastings[key];
                return (
                  <div key={ii} className={`preview-item editable ${hasError ? 'has-error' : ''}`}>
                    <div className="preview-item-fields">
                      <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) => updateItem(bi, ii, 'name', e.target.value)}
                        placeholder="Wine name"
                        className={`edit-field-input wine-name-input ${hasError ? 'field-error' : ''}`}
                      />
                      {hasError && <span className="field-error-msg">Name required</span>}

                      <div className="preview-item-meta">
                        <input
                          type="number"
                          value={item.vintageYear || ''}
                          onChange={(e) => updateItem(bi, ii, 'vintageYear', parseInt(e.target.value) || 0)}
                          placeholder="Year"
                          className="edit-field-input small"
                        />

                        <select
                          className="edit-color-select"
                          value={item.color || 'red'}
                          onChange={(e) => updateItem(bi, ii, 'color', e.target.value)}
                        >
                          {Object.entries(colorLabels).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>

                        <div className="price-field">
                          <span className="price-prefix">$</span>
                          <input
                            type="number"
                            value={item.price || ''}
                            onChange={(e) => updateItem(bi, ii, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="Price"
                            className="edit-field-input small price-input"
                          />
                        </div>

                        {item.quantity > 1 && <span className="qty">x{item.quantity}</span>}

                        <button
                          className="remove-item-btn"
                          onClick={() => removeItem(bi, ii)}
                          title="Remove this wine"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={item.sellerNotes || ''}
                      onChange={(e) => updateItem(bi, ii, 'sellerNotes', e.target.value || undefined)}
                      placeholder="Seller notes (optional)"
                      className="edit-field-input seller-notes-input"
                    />

                    {/* Inline tasting option */}
                    {!tasting ? (
                      <button
                        className="add-tasting-inline-btn"
                        onClick={() => setPreviewTastings({ ...previewTastings, [key]: { rating: '', notes: '' } })}
                      >
                        + Add tasting
                      </button>
                    ) : (
                      <div className="inline-tasting-fields">
                        <button
                          type="button"
                          className={`inline-rating-btn ${tasting.rating ? 'has-rating' : ''}`}
                          onClick={() => setShowPreviewRatingPicker(key)}
                        >
                          {tasting.rating
                            ? ratingOptions.find(r => String(r.value) === tasting.rating)?.label || tasting.rating
                            : 'Tap to rate'}
                        </button>
                        <input
                          type="text"
                          value={tasting.notes}
                          onChange={(e) => setPreviewTastings({
                            ...previewTastings,
                            [key]: { ...tasting, notes: e.target.value },
                          })}
                          placeholder="Tasting notes"
                          className="edit-field-input tasting-notes-input"
                        />
                        <button
                          className="remove-item-btn"
                          onClick={() => {
                            const next = { ...previewTastings };
                            delete next[key];
                            setPreviewTastings(next);
                          }}
                          title="Remove tasting"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Potential matches */}
        {preview.potentialMatches && preview.potentialMatches.length > 0 && (
          <div className="potential-matches">
            <h4>Possible Duplicates ({preview.potentialMatches.length})</h4>
            <p className="match-note">
              These imported wines look similar to existing wines. Please confirm:
            </p>
            {preview.potentialMatches.map((pm, i) => (
              <div key={i} className="potential-match-item">
                <div className="match-imported">
                  <strong>Importing:</strong> "{pm.importedName}"
                </div>
                <div className="match-options">
                  {pm.matches.map((m) => (
                    <label key={m.existingId} className="match-option">
                      <input
                        type="radio"
                        name={`match-${pm.importedName}`}
                        checked={matchDecisions[pm.importedName] === m.existingId}
                        onChange={() => setMatchDecisions({
                          ...matchDecisions,
                          [pm.importedName]: m.existingId
                        })}
                      />
                      <span className="match-existing">
                        Use existing: "{m.existingName}"
                        <span className="match-similarity">
                          ({Math.round(m.similarity * 100)}% similar)
                        </span>
                      </span>
                    </label>
                  ))}
                  <label className="match-option">
                    <input
                      type="radio"
                      name={`match-${pm.importedName}`}
                      checked={matchDecisions[pm.importedName] === null}
                      onChange={() => setMatchDecisions({
                        ...matchDecisions,
                        [pm.importedName]: null
                      })}
                    />
                    <span className="match-new">Create as new wine</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {preview.ambiguities.length > 0 && (
          <div className="ambiguities warning">
            <h4>Notes ({preview.ambiguities.length})</h4>
            {preview.ambiguities.map((amb, i) => (
              <div key={i} className="ambiguity-item">
                <div className="amb-message">{amb.message}</div>
              </div>
            ))}
          </div>
        )}

        {/* Re-parse option */}
        <details className="edit-text-section">
          <summary>Edit raw text and re-parse</summary>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
          />
          <button onClick={handlePreview} disabled={loading}>
            {loading ? 'Re-parsing...' : 'Re-Preview'}
          </button>
        </details>

        {error && (
          <div className="error error-with-actions">
            <p>{error}</p>
            <div className="error-actions">
              <span className="error-hint">Fix the fields above, or</span>
              <a href={buildErrorMailto(error)} className="error-report-btn">
                Report bug
              </a>
            </div>
          </div>
        )}

        <div className="preview-actions">
          <button onClick={() => setStage('input')}>Back</button>
          {(() => {
            const unresolvedMatches = (preview.potentialMatches || []).filter(
              pm => matchDecisions[pm.importedName] === undefined
            );
            const hasUnresolved = unresolvedMatches.length > 0;
            return (
              <>
                <button
                  className="primary-button"
                  onClick={() => handleExecute(false)}
                  disabled={loading || hasUnresolved || totalItems === 0}
                  title={hasUnresolved ? 'Please resolve all potential duplicates above' : ''}
                >
                  {loading ? 'Importing...' : hasUnresolved
                    ? `Resolve ${unresolvedMatches.length} match${unresolvedMatches.length > 1 ? 'es' : ''} first`
                    : 'Confirm Import'}
                </button>
                {!hasUnresolved && totalItems > 0 && (
                  <button
                    className="secondary-button"
                    onClick={() => handleExecute(true)}
                    disabled={loading}
                  >
                    Confirm & Add Tasting
                  </button>
                )}
              </>
            );
          })()}
        </div>

        {/* Rating picker popup for preview tastings */}
        {showPreviewRatingPicker && (
          <div className="rating-popup-overlay" onClick={() => setShowPreviewRatingPicker(null)}>
            <div className="rating-popup" onClick={(e) => e.stopPropagation()}>
              <div className="rating-popup-header">Select Rating</div>
              <div className="rating-options-grid">
                {ratingOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`rating-option ${value < 6 ? 'low' : value >= 8 ? 'high' : 'mid'} ${previewTastings[showPreviewRatingPicker]?.rating === String(value) ? 'selected' : ''}`}
                    onClick={() => {
                      setPreviewTastings({
                        ...previewTastings,
                        [showPreviewRatingPicker]: {
                          ...previewTastings[showPreviewRatingPicker],
                          rating: String(value),
                        },
                      });
                      setShowPreviewRatingPicker(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mode tabs component
  const ModeTabs = () => (
    <div className="mode-tabs">
      <button className={mode === 'receipt' ? 'active' : ''} onClick={() => setMode('receipt')}>Receipt</button>
      <button className={mode === 'label' ? 'active' : ''} onClick={() => setMode('label')}>Label</button>
      <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>Manual</button>
      <button className={mode === 'standard' ? 'active' : ''} onClick={() => setMode('standard')}>Import</button>
    </div>
  );

  // ===== MANUAL ENTRY =====
  if (mode === 'manual') {
    const years = [];
    for (let y = currentYear; y >= currentYear - 10; y--) {
      years.push(y);
    }

    return (
      <div className="import-input manual-entry">
        <h2>Add Wine Manually</h2>

        <ModeTabs />

        <p>Enter wine details directly. Tasting notes can be added later.</p>

        <div className="manual-form">
          <div className="form-field">
            <label>Wine Name *</label>
            <input
              type="text"
              value={manualEntry.name}
              onChange={(e) => setManualEntry({ ...manualEntry, name: e.target.value })}
              placeholder="e.g., Chateau Margaux - Margaux"
            />
          </div>

          <div className="form-field">
            <label>Vintage Year</label>
            <div className="vintage-picker">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={manualEntry.vintageYear === y ? 'selected' : ''}
                  onClick={() => setManualEntry({ ...manualEntry, vintageYear: y })}
                >
                  {y}
                </button>
              ))}
              <button
                type="button"
                className={showOlderYears ? 'selected' : ''}
                onClick={() => setShowOlderYears(!showOlderYears)}
              >
                Older...
              </button>
            </div>
            {showOlderYears && (
              <input
                type="number"
                value={manualEntry.vintageYear < currentYear - 10 ? manualEntry.vintageYear : ''}
                onChange={(e) => setManualEntry({ ...manualEntry, vintageYear: parseInt(e.target.value) || currentYear - 2 })}
                placeholder="Enter year (e.g., 1998)"
                min={1900}
                max={currentYear}
                className="older-year-input"
              />
            )}
          </div>

          <div className="form-field">
            <label>Color</label>
            <div className="color-picker">
              {(['red', 'white', 'rose', 'sparkling'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-option ${c} ${manualEntry.color === c ? 'selected' : ''}`}
                  onClick={() => setManualEntry({ ...manualEntry, color: c })}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row-inline">
            <div className="form-field">
              <label>Price</label>
              <input
                type="number"
                step="0.01"
                value={manualEntry.price}
                onChange={(e) => setManualEntry({ ...manualEntry, price: e.target.value })}
                placeholder="$"
              />
            </div>
            <div className="form-field">
              <label>Qty</label>
              <input
                type="number"
                min={1}
                value={manualEntry.quantity}
                onChange={(e) => setManualEntry({ ...manualEntry, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Purchase Date</label>
            <div className="date-field-row">
              <input
                type="date"
                value={manualEntry.purchaseDate}
                onChange={(e) => setManualEntry({ ...manualEntry, purchaseDate: e.target.value })}
                placeholder="No date"
              />
              {manualEntry.purchaseDate ? (
                <button
                  type="button"
                  className="date-clear-btn"
                  onClick={() => setManualEntry({ ...manualEntry, purchaseDate: '' })}
                  title="Clear date"
                >
                  ✕
                </button>
              ) : (
                <button
                  type="button"
                  className="date-today-btn"
                  onClick={() => setManualEntry({ ...manualEntry, purchaseDate: new Date().toISOString().split('T')[0] })}
                >
                  Today
                </button>
              )}
            </div>
          </div>

          <div className="form-field">
            <label>Source</label>
            <select
              value={manualEntry.source}
              onChange={(e) => setManualEntry({ ...manualEntry, source: e.target.value as ManualEntry['source'] })}
            >
              <option value="">Not specified</option>
              <option value="weimax">Weimax</option>
              <option value="costco">Costco</option>
              <option value="other">Other...</option>
            </select>
            {manualEntry.source === 'other' && (
              <input
                type="text"
                placeholder="Enter source name"
                value={manualEntry.sourceCustom}
                onChange={(e) => setManualEntry({ ...manualEntry, sourceCustom: e.target.value })}
                className="source-custom-input"
              />
            )}
          </div>

          <div className="form-field">
            <label>Seller Notes</label>
            <textarea
              value={manualEntry.sellerNotes}
              onChange={(e) => setManualEntry({ ...manualEntry, sellerNotes: e.target.value })}
              placeholder="Wine description from seller (optional)"
              rows={3}
            />
          </div>

          <div className="form-field tasting-toggle">
            <label>
              <input
                type="checkbox"
                checked={manualEntry.addTasting}
                onChange={(e) => setManualEntry({ ...manualEntry, addTasting: e.target.checked })}
              />
              Add a tasting note
            </label>
          </div>

          {manualEntry.addTasting && (
            <div className="tasting-fields">
              <div className="form-field">
                <label>Rating *</label>
                <button
                  type="button"
                  className={`inline-rating-btn ${manualEntry.tastingRating ? 'has-rating' : ''}`}
                  onClick={() => setShowManualRatingPicker(true)}
                >
                  {manualEntry.tastingRating
                    ? ratingOptions.find(r => String(r.value) === manualEntry.tastingRating)?.label || manualEntry.tastingRating
                    : 'Tap to rate'}
                </button>
              </div>
              <div className="form-field">
                <label>Tasting Notes</label>
                <textarea
                  value={manualEntry.tastingNotes}
                  onChange={(e) => setManualEntry({ ...manualEntry, tastingNotes: e.target.value })}
                  placeholder="Your tasting notes (optional)"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        <button
          className="primary-button"
          onClick={handleManualSubmit}
          disabled={loading || !manualEntry.name.trim()}
        >
          {loading ? 'Adding...' : 'Add Wine'}
        </button>

        {showManualRatingPicker && (
          <div className="rating-popup-overlay" onClick={() => setShowManualRatingPicker(false)}>
            <div className="rating-popup" onClick={(e) => e.stopPropagation()}>
              <div className="rating-popup-header">Select Rating</div>
              <div className="rating-options-grid">
                {ratingOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`rating-option ${value < 6 ? 'low' : value >= 8 ? 'high' : 'mid'} ${manualEntry.tastingRating === String(value) ? 'selected' : ''}`}
                    onClick={() => {
                      setManualEntry({ ...manualEntry, tastingRating: String(value) });
                      setShowManualRatingPicker(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== INPUT STAGE =====
  return (
    <div className="import-input">
      <h2>Add Wines</h2>

      <ModeTabs />

      {mode === 'receipt' && (
        <>
          <p>Paste OCR text from a wine store receipt.</p>
          <ul className="format-hints">
            <li>AI-powered parsing with learning from corrections</li>
            <li>Wine names, vintage years, prices, quantities</li>
            <li>Seller descriptions</li>
          </ul>
        </>
      )}

      {mode === 'label' && (
        <>
          <p>Paste OCR text from a wine bottle label photo.</p>
          <ul className="format-hints">
            <li>AI-powered — handles noisy OCR, logos, decorative text</li>
            <li>Recognizes appellations, grape varieties, producers</li>
          </ul>
          <p className="hint">Tip: Take a photo with your camera app, use built-in text recognition, then paste here.</p>
        </>
      )}

      {mode === 'standard' && (
        <>
          <p>Paste your wine purchase notes with tasting history.</p>
          <ul className="format-hints">
            <li>Purchase dates (as date headers)</li>
            <li>Wine lines: Name, Vintage, Price, Quantity</li>
            <li>Seller notes</li>
            <li>Your tasting notes with dates and ratings</li>
          </ul>
        </>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          mode === 'receipt'
            ? `Paste receipt OCR here...

Example:
14248 PINTAS CHARACTER 2019
2 @ 39.99        S        79.98 T
FROM 30 YEAR OLD VINES, A TOP DOURO VALLEY BLEND.`
            : mode === 'label'
            ? `Paste label OCR here...

Example:
CHABLIS
APPELLATION CHABLIS CONTRÔLÉE
RÉCOLTE 2023
MICHEL GAYOT`
            : `Paste purchase notes here...

Example:
January 15, 2024 - Winter Reds

Chateau Margaux 2018 $150
Elegant, complex nose with blackcurrant.
Tasted 2/1/2024: 9.0 - Incredible depth.`
        }
        rows={12}
      />

      {error && <div className="error">{error}</div>}

      <button
        className="primary-button"
        onClick={handlePreview}
        disabled={loading}
      >
        {loading ? 'Parsing...' : 'Preview Import'}
      </button>
    </div>
  );
}
