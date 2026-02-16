import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Vintage, WineSource } from '../api/client';

interface Props {
  vintageId: number;
  onBack: () => void;
  fromWineId?: number;
}

export default function VintageDetail({ vintageId, onBack, fromWineId }: Props) {
  const [vintage, setVintage] = useState<Vintage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddTasting, setShowAddTasting] = useState(false);
  const [showNewRatingPicker, setShowNewRatingPicker] = useState(false);
  const [newTasting, setNewTasting] = useState({
    tastingDate: '',
    rating: '',
    ratingLabel: '',
    notes: '',
  });
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    pricePaid: '',
    quantity: '1',
  });

  // Seller notes editing
  const [editingSellerNotes, setEditingSellerNotes] = useState(false);
  const [sellerNotesValue, setSellerNotesValue] = useState('');

  // Source editing
  const [editingSource, setEditingSource] = useState(false);
  const [sourceValue, setSourceValue] = useState<WineSource | ''>('');
  const [sourceCustomValue, setSourceCustomValue] = useState('');

  // Purchase date editing
  const [editingPurchaseDateId, setEditingPurchaseDateId] = useState<number | null>(null);
  const [editPurchaseDateValue, setEditPurchaseDateValue] = useState('');

  // Tasting editing
  const [editingTastingId, setEditingTastingId] = useState<number | null>(null);
  const [editTasting, setEditTasting] = useState({
    tastingDate: '',
    rating: '',
    notes: '',
  });

  // Rating options for picker
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
  const [showEditRatingPicker, setShowEditRatingPicker] = useState(false);

  useEffect(() => {
    loadVintage();
  }, [vintageId]);

  async function loadVintage() {
    try {
      setLoading(true);
      const data = await api.getVintage(vintageId);
      setVintage(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vintage');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTasting() {
    if (!newTasting.rating) {
      setError('Rating is required');
      return;
    }

    try {
      await api.createTasting({
        vintageId,
        tastingDate: newTasting.tastingDate || undefined,
        rating: parseFloat(newTasting.rating),
        notes: newTasting.notes || undefined,
      });
      await loadVintage();
      setShowAddTasting(false);
      setNewTasting({
        tastingDate: '',
        rating: '',
        ratingLabel: '',
        notes: '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add tasting');
    }
  }

  function handleNewRatingSelect(value: number, label: string) {
    setNewTasting({ ...newTasting, rating: String(value), ratingLabel: label });
    setShowNewRatingPicker(false);
  }

  async function handleDeleteTasting(id: number) {
    if (!confirm('Delete this tasting note?')) return;
    try {
      await api.deleteTasting(id);
      await loadVintage();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  async function handleDeleteVintage() {
    if (!vintage?.wine) return;
    if (!confirm(`Delete ${vintage.wine.name} ${vintage.vintageYear} and all its tastings and purchase history? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteVintage(vintage.wine.id, vintageId);
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete vintage');
    }
  }

  async function handleUpdatePrice(itemId: number) {
    const price = parseFloat(editPriceValue);
    if (isNaN(price) || price < 0) {
      setError('Please enter a valid price');
      return;
    }
    try {
      await api.updatePurchaseItem(itemId, { pricePaid: price });
      await loadVintage();
      setEditingPriceId(null);
      setEditPriceValue('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update price');
    }
  }

  async function handleAddPurchase() {
    if (!vintage?.wine) return;
    const price = newPurchase.pricePaid ? parseFloat(newPurchase.pricePaid) : undefined;
    const quantity = parseInt(newPurchase.quantity) || 1;

    try {
      await api.createPurchaseItem({
        vintageId,
        wineId: vintage.wine.id,
        pricePaid: price,
        quantityPurchased: quantity,
        purchaseDate: newPurchase.purchaseDate,
      });
      await loadVintage();
      setShowAddPurchase(false);
      setNewPurchase({
        purchaseDate: new Date().toISOString().split('T')[0],
        pricePaid: '',
        quantity: '1',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add purchase');
    }
  }

  function startEditPrice(itemId: number, currentPrice?: number) {
    setEditingPriceId(itemId);
    setEditPriceValue(currentPrice ? String(currentPrice) : '');
  }

  function startEditSellerNotes() {
    setSellerNotesValue(vintage?.sellerNotes || '');
    setEditingSellerNotes(true);
  }

  async function handleSaveSellerNotes() {
    try {
      await api.updateVintage(vintageId, { sellerNotes: sellerNotesValue.trim() || null });
      await loadVintage();
      setEditingSellerNotes(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update seller notes');
    }
  }

  function startEditSource() {
    setSourceValue(vintage?.source || '');
    setSourceCustomValue(vintage?.sourceCustom || '');
    setEditingSource(true);
  }

  async function handleSaveSource() {
    try {
      await api.updateVintage(vintageId, {
        source: sourceValue || undefined,
        sourceCustom: sourceValue === 'other' ? sourceCustomValue : undefined,
      });
      await loadVintage();
      setEditingSource(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update source');
    }
  }

  function getSourceLabel(source?: WineSource, custom?: string): string {
    if (!source) return '';
    if (source === 'other' && custom) return custom;
    return source.charAt(0).toUpperCase() + source.slice(1);
  }

  function startEditPurchaseDate(batchId: number, currentDate: string) {
    setEditingPurchaseDateId(batchId);
    setEditPurchaseDateValue(currentDate.split('T')[0]);
  }

  async function handleSavePurchaseDate(batchId: number) {
    try {
      await api.updatePurchaseBatch(batchId, { purchaseDate: editPurchaseDateValue });
      await loadVintage();
      setEditingPurchaseDateId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update purchase date');
    }
  }

  function startEditTasting(tasting: { id: number; tastingDate?: string | null; rating: number; notes?: string }) {
    setEditingTastingId(tasting.id);
    setEditTasting({
      tastingDate: tasting.tastingDate ? tasting.tastingDate.split('T')[0] : '',
      rating: String(tasting.rating),
      notes: tasting.notes || '',
    });
  }

  async function handleSaveTasting(id: number) {
    if (!editTasting.rating) {
      setError('Rating is required');
      return;
    }
    try {
      await api.updateTasting(id, {
        tastingDate: editTasting.tastingDate,
        rating: parseFloat(editTasting.rating),
        notes: editTasting.notes || undefined,
      });
      await loadVintage();
      setEditingTastingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update tasting');
    }
  }

  function handleEditRatingSelect(value: number) {
    setEditTasting({ ...editTasting, rating: String(value) });
    setShowEditRatingPicker(false);
  }

  if (loading) return <div className="loading">Loading vintage...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!vintage) return <div className="error">Vintage not found</div>;

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="vintage-detail">
      <button className="back-button" onClick={onBack}>
        ← {fromWineId ? `Back to ${vintage.wine?.name || 'Wine'}` : 'Back to Wines'}
      </button>

      <div className="vintage-header">
        <h2>
          {vintage.wine?.name}
        </h2>
        <h3>{vintage.vintageYear}</h3>

        {vintage.averageRating && (
          <div className="average-rating">
            Average Rating: <span className="rating">{vintage.averageRating.toFixed(1)}</span>
          </div>
        )}

        {vintage.sellerNotes || editingSellerNotes ? (
          <div className="seller-notes">
            <strong>Seller:</strong>
            {editingSellerNotes ? (
              <div className="seller-notes-edit">
                <textarea
                  value={sellerNotesValue}
                  onChange={(e) => setSellerNotesValue(e.target.value)}
                  rows={3}
                  placeholder="Enter seller notes..."
                  autoFocus
                />
                <div className="edit-actions">
                  <button onClick={handleSaveSellerNotes}>Save</button>
                  <button onClick={() => setEditingSellerNotes(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {' '}{vintage.sellerNotes}
                <button
                  className="edit-inline-btn"
                  onClick={startEditSellerNotes}
                  title="Edit seller notes"
                >
                  ✎
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            className="add-seller-notes-btn"
            onClick={startEditSellerNotes}
          >
            + Add seller notes
          </button>
        )}

        {/* Source field */}
        {vintage.source || editingSource ? (
          <div className="source-field">
            <strong>Source:</strong>
            {editingSource ? (
              <div className="source-edit">
                <select
                  value={sourceValue}
                  onChange={(e) => setSourceValue(e.target.value as WineSource | '')}
                  autoFocus
                >
                  <option value="">Not specified</option>
                  <option value="weimax">Weimax</option>
                  <option value="costco">Costco</option>
                  <option value="other">Other...</option>
                </select>
                {sourceValue === 'other' && (
                  <input
                    type="text"
                    placeholder="Enter source name..."
                    value={sourceCustomValue}
                    onChange={(e) => setSourceCustomValue(e.target.value)}
                  />
                )}
                <div className="edit-actions">
                  <button onClick={handleSaveSource}>Save</button>
                  <button onClick={() => setEditingSource(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {' '}{getSourceLabel(vintage.source, vintage.sourceCustom)}
                <button
                  className="edit-inline-btn"
                  onClick={startEditSource}
                  title="Edit source"
                >
                  ✎
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            className="add-source-btn"
            onClick={startEditSource}
          >
            + Add source
          </button>
        )}

        <button className="delete-button" onClick={handleDeleteVintage}>
          Delete Vintage
        </button>
      </div>

      <div className="purchase-history">
        <div className="section-header">
          <h4>Purchase History</h4>
          <button onClick={() => setShowAddPurchase(true)}>+ Add Purchase</button>
        </div>

        {showAddPurchase && (
          <div className="add-purchase-form">
            <input
              type="date"
              value={newPurchase.purchaseDate}
              onChange={(e) => setNewPurchase({ ...newPurchase, purchaseDate: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Price paid"
              value={newPurchase.pricePaid}
              onChange={(e) => setNewPurchase({ ...newPurchase, pricePaid: e.target.value })}
            />
            <input
              type="number"
              min="1"
              placeholder="Qty"
              value={newPurchase.quantity}
              onChange={(e) => setNewPurchase({ ...newPurchase, quantity: e.target.value })}
              style={{ width: '60px' }}
            />
            <div className="form-actions">
              <button onClick={handleAddPurchase}>Save</button>
              <button onClick={() => setShowAddPurchase(false)}>Cancel</button>
            </div>
          </div>
        )}

        {vintage.purchaseItems && vintage.purchaseItems.length > 0 ? (
          <ul>
            {vintage.purchaseItems.map((item) => (
              <li key={item.id} className="purchase-item">
                {editingPurchaseDateId === item.purchaseBatch?.id ? (
                  <span className="date-edit">
                    <input
                      type="date"
                      value={editPurchaseDateValue}
                      onChange={(e) => setEditPurchaseDateValue(e.target.value)}
                      autoFocus
                    />
                    <button onClick={() => handleSavePurchaseDate(item.purchaseBatch!.id)}>✓</button>
                    <button onClick={() => setEditingPurchaseDateId(null)}>✕</button>
                  </span>
                ) : (
                  <span
                    className="date-display clickable"
                    onClick={() => item.purchaseBatch && startEditPurchaseDate(item.purchaseBatch.id, item.purchaseBatch.purchaseDate)}
                    title="Click to edit date"
                  >
                    {formatDate(item.purchaseBatch?.purchaseDate || '')}
                  </span>
                )}
                {editingPriceId === item.id ? (
                  <span className="price-edit">
                    $<input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPriceValue}
                      onChange={(e) => setEditPriceValue(e.target.value)}
                      autoFocus
                      style={{ width: '80px' }}
                    />
                    <button onClick={() => handleUpdatePrice(item.id)}>✓</button>
                    <button onClick={() => setEditingPriceId(null)}>✕</button>
                  </span>
                ) : (
                  <span
                    className="price-display clickable"
                    onClick={() => startEditPrice(item.id, item.pricePaid ? Number(item.pricePaid) : undefined)}
                  >
                    {item.pricePaid ? `$${Number(item.pricePaid).toFixed(2)}` : '(no price - click to add)'}
                  </span>
                )}
                {item.quantityPurchased > 1 && <span> (x{item.quantityPurchased})</span>}
                {item.purchaseBatch?.theme && (
                  <span className="theme"> - {item.purchaseBatch.theme}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No purchase records</p>
        )}
      </div>

      <div className="tastings-section">
        <div className="section-header">
          <h4>Tasting Notes</h4>
          <button onClick={() => setShowAddTasting(true)}>+ Add Tasting</button>
        </div>

        {showAddTasting && (
          <div className="add-tasting-form">
            <div className="date-row">
              <input
                type="date"
                value={newTasting.tastingDate}
                onChange={(e) => setNewTasting({ ...newTasting, tastingDate: e.target.value })}
              />
              <span className="date-hint">(optional)</span>
            </div>
            <button
              className={`inline-rating-btn ${newTasting.rating ? 'has-rating' : ''}`}
              onClick={() => setShowNewRatingPicker(true)}
            >
              {newTasting.rating ? newTasting.ratingLabel : 'Tap to rate'}
            </button>
            <textarea
              placeholder="Tasting notes..."
              value={newTasting.notes}
              onChange={(e) => setNewTasting({ ...newTasting, notes: e.target.value })}
              rows={3}
            />
            <div className="form-actions">
              <button onClick={handleAddTasting}>Save</button>
              <button onClick={() => setShowAddTasting(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Rating picker popup for new tasting */}
        {showNewRatingPicker && (
          <div className="rating-popup-overlay" onClick={() => setShowNewRatingPicker(false)}>
            <div className="rating-popup" onClick={(e) => e.stopPropagation()}>
              <div className="rating-popup-header">Select Rating</div>
              <div className="rating-options-grid">
                {ratingOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`rating-option ${value < 6 ? 'low' : value >= 8 ? 'high' : 'mid'} ${newTasting.rating === String(value) ? 'selected' : ''}`}
                    onClick={() => handleNewRatingSelect(value, label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {vintage.tastingEvents && vintage.tastingEvents.length > 0 ? (
          <div className="tastings-list">
            {vintage.tastingEvents.map((tasting) => (
              <div key={tasting.id} className="tasting-card">
                {editingTastingId === tasting.id ? (
                  <div className="edit-tasting-form">
                    <div className="date-row">
                      <input
                        type="date"
                        value={editTasting.tastingDate}
                        onChange={(e) => setEditTasting({ ...editTasting, tastingDate: e.target.value })}
                      />
                    </div>
                    <button
                      className={`inline-rating-btn ${editTasting.rating ? 'has-rating' : ''}`}
                      onClick={() => setShowEditRatingPicker(true)}
                    >
                      {editTasting.rating ? ratingOptions.find(r => String(r.value) === editTasting.rating)?.label || editTasting.rating : 'Tap to rate'}
                    </button>
                    <textarea
                      value={editTasting.notes}
                      onChange={(e) => setEditTasting({ ...editTasting, notes: e.target.value })}
                      placeholder="Notes..."
                      rows={2}
                    />
                    <div className="form-actions">
                      <button onClick={() => handleSaveTasting(tasting.id)}>Save</button>
                      <button onClick={() => setEditingTastingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="tasting-header">
                      <span className="tasting-date">{tasting.tastingDate ? formatDate(tasting.tastingDate) : '(no date)'}</span>
                      <span className="rating">{Number(tasting.rating).toFixed(1)}</span>
                      <button
                        className="edit-inline-btn"
                        onClick={() => startEditTasting(tasting)}
                        title="Edit tasting"
                      >
                        ✎
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteTasting(tasting.id)}
                      >
                        ×
                      </button>
                    </div>
                    {tasting.notes && <p className="tasting-notes">{tasting.notes}</p>}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">No tasting notes yet</p>
        )}

        {/* Rating picker popup for editing */}
        {showEditRatingPicker && (
          <div className="rating-popup-overlay" onClick={() => setShowEditRatingPicker(false)}>
            <div className="rating-popup" onClick={(e) => e.stopPropagation()}>
              <div className="rating-popup-header">Select Rating</div>
              <div className="rating-options-grid">
                {ratingOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`rating-option ${value < 6 ? 'low' : value >= 8 ? 'high' : 'mid'} ${editTasting.rating === String(value) ? 'selected' : ''}`}
                    onClick={() => handleEditRatingSelect(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
