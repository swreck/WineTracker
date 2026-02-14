import { useState } from 'react';
import { api } from '../api/client';
import type { ImportPreview, ImportResult } from '../api/client';

interface Props {
  onComplete: () => void;
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
}

const currentYear = new Date().getFullYear();

export default function Import({ onComplete }: Props) {
  const [stage, setStage] = useState<Stage>('input');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<ImportMode>('receipt');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual entry state
  const [manualEntry, setManualEntry] = useState<ManualEntry>({
    name: '',
    vintageYear: currentYear - 2,
    color: 'red',
    price: '',
    quantity: 1,
    purchaseDate: new Date().toISOString().split('T')[0],
  });
  const [showOlderYears, setShowOlderYears] = useState(false);

  async function handlePreview() {
    if (!text.trim()) {
      setError('Please paste some text to import');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // For label mode, use 'label' to trigger flexible single-bottle parsing
      const apiMode = mode === 'label' ? 'label' : mode === 'receipt' ? 'receipt' : 'standard';
      const data = await api.previewImport(text, apiMode);
      setPreview(data);
      setStage('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse import');
    } finally {
      setLoading(false);
    }
  }

  async function handleExecute() {
    try {
      setLoading(true);
      setError(null);
      const apiMode = mode === 'label' ? 'label' : mode === 'receipt' ? 'receipt' : 'standard';
      const data = await api.executeImport(text, apiMode);
      setResult(data);
      setStage('complete');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to execute import');
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit() {
    if (!manualEntry.name.trim()) {
      setError('Wine name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create the wine directly via API
      const data = await api.createWineWithVintage({
        name: manualEntry.name.trim(),
        color: manualEntry.color,
        vintageYear: manualEntry.vintageYear,
        price: manualEntry.price ? parseFloat(manualEntry.price) : undefined,
        quantity: manualEntry.quantity,
        purchaseDate: manualEntry.purchaseDate,
      });

      setResult({
        success: true,
        results: {
          winesCreated: data.wineCreated ? 1 : 0,
          winesMatched: data.wineCreated ? 0 : 1,
          vintagesCreated: data.vintageCreated ? 1 : 0,
          vintagesMatched: data.vintageCreated ? 0 : 1,
          purchaseBatchesCreated: 1,
          purchaseItemsCreated: 1,
          tastingsCreated: 0,
        },
        ambiguities: [],
      });
      setStage('complete');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add wine');
    } finally {
      setLoading(false);
    }
  }

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
          <button className="primary-button" onClick={onComplete}>
            View Wines
          </button>
          <button onClick={() => {
            setStage('input');
            setText('');
            setManualEntry({
              name: '',
              vintageYear: currentYear - 2,
              color: 'red',
              price: '',
              quantity: 1,
              purchaseDate: new Date().toISOString().split('T')[0],
            });
          }}>
            Add More
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'preview' && preview) {
    return (
      <div className="import-preview">
        <h2>Import Preview</h2>

        <div className="preview-summary">
          <h4>Summary</h4>
          <ul>
            <li>Purchase batches: {preview.summary.batchCount}</li>
            <li>Wine items: {preview.summary.itemCount} ({preview.summary.newCount || preview.summary.itemCount} new, {preview.summary.existingCount || 0} already in database)</li>
            <li>Tasting notes: {preview.summary.tastingCount}</li>
          </ul>
        </div>

        {/* Editable text area */}
        <div className="edit-import-text">
          <h4>Edit Import Text</h4>
          <p className="edit-hint">You can edit the text below and re-preview.</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
          />
          <button onClick={handlePreview} disabled={loading}>
            {loading ? 'Re-parsing...' : 'Re-Preview'}
          </button>
        </div>

        {preview.existingMatches && preview.existingMatches.length > 0 && (
          <div className="existing-matches">
            <h4>Already in Database ({preview.existingMatches.length})</h4>
            <p className="match-note">These wines exist — new purchase records will be added.</p>
            {preview.existingMatches.map((match: any, i: number) => (
              <div key={i} className="match-item">
                <strong>{match.name} {match.vintageYear}</strong>
                <span className="match-message">{match.message}</span>
              </div>
            ))}
          </div>
        )}

        {preview.ambiguities.length > 0 && (
          <div className="ambiguities warning">
            <h4>Ambiguities Found ({preview.ambiguities.length})</h4>
            <p className="amb-note">
              These items need review after import. The import will proceed with best guesses.
            </p>
            {preview.ambiguities.map((amb, i) => (
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

        <div className="preview-batches">
          <h4>Parsed Data</h4>
          {preview.batches.slice(0, 15).map((batch, bi) => (
            <div key={bi} className="batch-preview">
              <div className="batch-header">
                <strong>
                  {new Date(batch.purchaseDate).toLocaleDateString()}
                </strong>
                {batch.theme && <span className="theme"> - {batch.theme}</span>}
                <span className="item-count"> ({batch.items?.length || 0} wines)</span>
              </div>
              <div className="batch-items">
                {(batch.items || []).map((item: any, ii: number) => (
                  <div key={ii} className="preview-item">
                    <div className="preview-item-header">
                      <strong>{item.name}</strong>{' '}
                      {item.vintageYear}
                      <span className={`color-badge ${item.color}`}>{item.color}</span>
                      {item.price && <span className="price">${item.price}</span>}
                      {item.quantity > 1 && <span className="qty">x{item.quantity}</span>}
                    </div>
                    {item.sellerNotes && (
                      <div className="preview-seller-notes">
                        <em>Seller:</em> {item.sellerNotes}
                      </div>
                    )}
                    {item.tastings?.length > 0 && (
                      <div className="preview-tastings">
                        <em>Your Tastings:</em>
                        <ul>
                          {item.tastings.map((t: any, ti: number) => (
                            <li key={ti}>
                              {new Date(t.date).toLocaleDateString()}: {t.rating > 0 ? t.rating : 'NR'}
                              {t.notes && ` - ${t.notes}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {preview.batches.length > 15 && (
            <p className="more-batches">...and {preview.batches.length - 15} more batches</p>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="preview-actions">
          <button onClick={() => setStage('input')}>Back</button>
          <button
            className="primary-button"
            onClick={handleExecute}
            disabled={loading}
          >
            {loading ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
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

  // Manual entry form
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
            <input
              type="date"
              value={manualEntry.purchaseDate}
              onChange={(e) => setManualEntry({ ...manualEntry, purchaseDate: e.target.value })}
            />
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <button
          className="primary-button"
          onClick={handleManualSubmit}
          disabled={loading || !manualEntry.name.trim()}
        >
          {loading ? 'Adding...' : 'Add Wine'}
        </button>
      </div>
    );
  }

  return (
    <div className="import-input">
      <h2>Add Wines</h2>

      <ModeTabs />

      {mode === 'receipt' && (
        <>
          <p>Paste OCR text from a wine store receipt.</p>
          <ul className="format-hints">
            <li>Wine names (removes store SKU numbers)</li>
            <li>Vintage years (2 or 4 digit)</li>
            <li>Quantity and price (from "2 @ 39.99" format)</li>
            <li>Seller descriptions</li>
            <li>Ignores: tax, discounts, totals</li>
          </ul>
        </>
      )}

      {mode === 'label' && (
        <>
          <p>Paste OCR text from a wine bottle label photo.</p>
          <ul className="format-hints">
            <li>Wine name (winery, region, varietal)</li>
            <li>Vintage year</li>
            <li>Flexible parsing for varied OCR formats</li>
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
CHATEAU MARGAUX
Grand Vin
2018
MARGAUX
Premier Grand Cru Classé`
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
