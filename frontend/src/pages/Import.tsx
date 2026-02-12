import { useState } from 'react';
import { api } from '../api/client';
import type { ImportPreview, ImportResult } from '../api/client';

interface Props {
  onComplete: () => void;
}

type Stage = 'input' | 'preview' | 'complete';

type ImportMode = 'standard' | 'receipt';

export default function Import({ onComplete }: Props) {
  const [stage, setStage] = useState<Stage>('input');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<ImportMode>('standard');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePreview() {
    if (!text.trim()) {
      setError('Please paste some text to import');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.previewImport(text, mode);
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
      const data = await api.executeImport(text, mode);
      setResult(data);
      setStage('complete');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to execute import');
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

        <button className="primary-button" onClick={onComplete}>
          View Wines
        </button>
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
          <h4>Parsed Data (showing first 10 batches)</h4>
          {preview.batches.slice(0, 10).map((batch, bi) => (
            <div key={bi} className="batch-preview">
              <div className="batch-header">
                <strong>
                  {new Date(batch.purchaseDate).toLocaleDateString()}
                </strong>
                {batch.theme && <span className="theme"> - {batch.theme}</span>}
                <span className="item-count"> ({batch.items?.length || 0} wines)</span>
              </div>
              <div className="batch-items">
                {(batch.items || []).slice(0, 20).map((item: any, ii: number) => (
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
                {(batch.items?.length || 0) > 20 && (
                  <div className="more-items">...and {batch.items.length - 20} more</div>
                )}
              </div>
            </div>
          ))}
          {preview.batches.length > 10 && (
            <p className="more-batches">...and {preview.batches.length - 10} more batches</p>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="preview-actions">
          <button onClick={() => setStage('input')}>← Back to Edit</button>
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

  return (
    <div className="import-input">
      <h2>Import Wines</h2>

      <div className="mode-selector">
        <label>
          <input
            type="radio"
            name="mode"
            value="standard"
            checked={mode === 'standard'}
            onChange={() => setMode('standard')}
          />
          Standard (notes & purchases)
        </label>
        <label>
          <input
            type="radio"
            name="mode"
            value="receipt"
            checked={mode === 'receipt'}
            onChange={() => setMode('receipt')}
          />
          Receipt (OCR from store receipt)
        </label>
      </div>

      {mode === 'standard' ? (
        <>
          <p>Paste your wine purchase notes below. The parser will extract:</p>
          <ul className="format-hints">
            <li>Purchase dates (as date headers)</li>
            <li>Wine lines: Name, Vintage, Price, Quantity</li>
            <li>Seller notes (ALL CAPS descriptions)</li>
            <li>Your tasting notes with dates and ratings</li>
          </ul>
        </>
      ) : (
        <>
          <p>Paste OCR text from a wine store receipt. The parser will extract:</p>
          <ul className="format-hints">
            <li>Wine names (removes store SKU numbers)</li>
            <li>Vintage years (2 or 4 digit)</li>
            <li>Quantity and unit price (from "2 @ 39.99" format)</li>
            <li>Seller descriptions (ALL CAPS text)</li>
            <li>Ignores: tax, discounts, REGULAR prices, totals</li>
          </ul>
        </>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={mode === 'standard' ? `Example format:

January 15, 2024 - Winter Reds

Chateau Margaux - Margaux 2018 $150
Elegant, complex nose with blackcurrant and cedar.
Tasted 2/1/2024: 9.0 - Incredible depth and length.

Ridge - Monte Bello 2019 $180 x2
California's answer to Bordeaux.` : `Example receipt OCR:

14248 PINTAS CHARACTER 2019
2 @ 39.99        S        79.98 T
REGULAR    50.00
FROM 30 YEAR OLD VINES, THIS IS A TOP
DOURO VALLEY FIELD BLEND RED.

15075 POEIRINHO BAIRRADA BAGA 16
1 @ 49.99        5.00        44.99 T
FAMOUS WINEMAKER DIRK NIEPOORT.`}
        rows={15}
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
