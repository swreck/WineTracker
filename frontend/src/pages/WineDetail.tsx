import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Wine, Vintage, WineSource } from '../api/client';
import { useNavigation } from '../context/NavigationContext';

interface Props {
  wineId: number;
  onBack: () => void;
  onNavigateWine?: (id: number) => void;
}

const colorLabels: Record<string, string> = {
  red: 'Red',
  white: 'White',
  rose: 'Rosé',
  sparkling: 'Sparkling',
};

export default function WineDetail({ wineId, onBack, onNavigateWine }: Props) {
  const [wine, setWine] = useState<Wine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Wine>>({});

  // Navigation context for Next/Previous
  const { winesListState } = useNavigation();
  const { filteredWineIds } = winesListState;
  const currentIndex = filteredWineIds.indexOf(wineId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredWineIds.length - 1;

  // Expanded vintage tracking - auto-expand if single vintage
  const [expandedVintages, setExpandedVintages] = useState<Set<number>>(new Set());

  // Add vintage state
  const [addingVintage, setAddingVintage] = useState(false);
  const [newVintageYear, setNewVintageYear] = useState<number>(new Date().getFullYear());

  // Per-vintage editing states (keyed by vintage ID)
  const [editingSellerNotes, setEditingSellerNotes] = useState<number | null>(null);
  const [sellerNotesValue, setSellerNotesValue] = useState('');
  const [editingSource, setEditingSource] = useState<number | null>(null);
  const [sourceValue, setSourceValue] = useState<WineSource | ''>('');
  const [sourceCustomValue, setSourceCustomValue] = useState('');

  // Purchase editing states
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [editingPurchaseDateId, setEditingPurchaseDateId] = useState<number | null>(null);
  const [editPurchaseDateValue, setEditPurchaseDateValue] = useState('');
  const [showAddPurchase, setShowAddPurchase] = useState<number | null>(null);
  const [newPurchase, setNewPurchase] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    pricePaid: '',
    quantity: '1',
  });

  // Tasting states
  const [addingTastingForVintage, setAddingTastingForVintage] = useState<number | null>(null);
  const [newTasting, setNewTasting] = useState({
    tastingDate: new Date().toISOString().split('T')[0],
    rating: null as number | null,
    ratingLabel: '',
    notes: '',
  });
  const [showRatingPicker, setShowRatingPicker] = useState(false);
  const [editingTastingId, setEditingTastingId] = useState<number | null>(null);
  const [editTasting, setEditTasting] = useState({
    tastingDate: '',
    rating: '',
    notes: '',
  });
  const [showEditRatingPicker, setShowEditRatingPicker] = useState(false);

  // Rating options
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

  useEffect(() => {
    loadWine();
  }, [wineId]);

  // Auto-expand single vintage
  useEffect(() => {
    if (wine?.vintages?.length === 1) {
      setExpandedVintages(new Set([wine.vintages[0].id]));
    }
  }, [wine]);

  async function loadWine() {
    try {
      setLoading(true);
      const data = await api.getWine(wineId);
      setWine(data);
      setEditData(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wine');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      await api.updateWine(wineId, editData);
      await loadWine();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${wine?.name}" and all its vintages, tastings, and purchase history? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteWine(wineId);
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  function toggleVintage(vintageId: number) {
    setExpandedVintages(prev => {
      const next = new Set(prev);
      if (next.has(vintageId)) {
        next.delete(vintageId);
      } else {
        next.add(vintageId);
      }
      return next;
    });
  }

  // Add vintage
  async function handleAddVintage() {
    if (!newVintageYear) {
      setError('Please enter a vintage year');
      return;
    }
    try {
      const vintage = await api.createVintage({
        wineId,
        vintageYear: newVintageYear,
      });
      await loadWine();
      setAddingVintage(false);
      setNewVintageYear(new Date().getFullYear());
      // Auto-expand the new vintage
      setExpandedVintages(prev => new Set(prev).add(vintage.id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add vintage');
    }
  }

  // Delete vintage
  async function handleDeleteVintage(vintage: Vintage) {
    if (!confirm(`Delete ${wine?.name} ${vintage.vintageYear} and all its tastings and purchase history? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteVintage(wineId, vintage.id);
      await loadWine();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete vintage');
    }
  }

  // Seller notes
  function startEditSellerNotes(vintage: Vintage) {
    setSellerNotesValue(vintage.sellerNotes || '');
    setEditingSellerNotes(vintage.id);
  }

  async function handleSaveSellerNotes(vintageId: number) {
    try {
      await api.updateVintage(vintageId, { sellerNotes: sellerNotesValue.trim() || null });
      await loadWine();
      setEditingSellerNotes(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update seller notes');
    }
  }

  // Source
  function startEditSource(vintage: Vintage) {
    setSourceValue(vintage.source || '');
    setSourceCustomValue(vintage.sourceCustom || '');
    setEditingSource(vintage.id);
  }

  async function handleSaveSource(vintageId: number) {
    try {
      await api.updateVintage(vintageId, {
        source: sourceValue || undefined,
        sourceCustom: sourceValue === 'other' ? sourceCustomValue : undefined,
      });
      await loadWine();
      setEditingSource(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update source');
    }
  }

  function getSourceLabel(source?: WineSource, custom?: string): string {
    if (!source) return '';
    if (source === 'other' && custom) return custom;
    return source.charAt(0).toUpperCase() + source.slice(1);
  }

  // Purchases
  function startEditPrice(itemId: number, currentPrice?: number) {
    setEditingPriceId(itemId);
    setEditPriceValue(currentPrice ? String(currentPrice) : '');
  }

  async function handleUpdatePrice(itemId: number) {
    const price = parseFloat(editPriceValue);
    if (isNaN(price) || price < 0) {
      setError('Please enter a valid price');
      return;
    }
    try {
      await api.updatePurchaseItem(itemId, { pricePaid: price });
      await loadWine();
      setEditingPriceId(null);
      setEditPriceValue('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update price');
    }
  }

  function startEditPurchaseDate(batchId: number, currentDate: string) {
    setEditingPurchaseDateId(batchId);
    setEditPurchaseDateValue(currentDate.split('T')[0]);
  }

  async function handleSavePurchaseDate(batchId: number) {
    try {
      await api.updatePurchaseBatch(batchId, { purchaseDate: editPurchaseDateValue });
      await loadWine();
      setEditingPurchaseDateId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update purchase date');
    }
  }

  async function handleAddPurchase(vintageId: number) {
    const price = newPurchase.pricePaid ? parseFloat(newPurchase.pricePaid) : undefined;
    const quantity = parseInt(newPurchase.quantity) || 1;

    try {
      await api.createPurchaseItem({
        vintageId,
        wineId,
        pricePaid: price,
        quantityPurchased: quantity,
        purchaseDate: newPurchase.purchaseDate,
      });
      await loadWine();
      setShowAddPurchase(null);
      setNewPurchase({
        purchaseDate: new Date().toISOString().split('T')[0],
        pricePaid: '',
        quantity: '1',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add purchase');
    }
  }

  // Tastings
  function startAddTasting(vintageId: number) {
    setAddingTastingForVintage(vintageId);
    setNewTasting({
      tastingDate: new Date().toISOString().split('T')[0],
      rating: null,
      ratingLabel: '',
      notes: '',
    });
    setShowRatingPicker(false);
  }

  function selectRating(value: number, label: string) {
    setNewTasting({ ...newTasting, rating: value, ratingLabel: label });
    setShowRatingPicker(false);
  }

  async function handleAddTasting() {
    if (!addingTastingForVintage) return;
    if (newTasting.rating === null) {
      setError('Please select a rating');
      return;
    }

    try {
      await api.createTasting({
        vintageId: addingTastingForVintage,
        tastingDate: newTasting.tastingDate || undefined,
        rating: newTasting.rating,
        notes: newTasting.notes || undefined,
      });
      await loadWine();
      setAddingTastingForVintage(null);
      setNewTasting({
        tastingDate: new Date().toISOString().split('T')[0],
        rating: null,
        ratingLabel: '',
        notes: '',
      });
      setShowRatingPicker(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add tasting');
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

  function handleEditRatingSelect(value: number) {
    setEditTasting({ ...editTasting, rating: String(value) });
    setShowEditRatingPicker(false);
  }

  async function handleSaveTasting(id: number) {
    if (!editTasting.rating) {
      setError('Rating is required');
      return;
    }
    try {
      await api.updateTasting(id, {
        tastingDate: editTasting.tastingDate || null,
        rating: parseFloat(editTasting.rating),
        notes: editTasting.notes || undefined,
      });
      await loadWine();
      setEditingTastingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update tasting');
    }
  }

  async function handleDeleteTasting(id: number) {
    if (!confirm('Delete this tasting note?')) return;
    try {
      await api.deleteTasting(id);
      await loadWine();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  if (loading) return <div className="loading">Loading wine...</div>;
  if (error && !wine) return <div className="error">{error}</div>;
  if (!wine) return <div className="error">Wine not found</div>;

  return (
    <div className="wine-detail">
      <div className="wine-detail-nav">
        <button className="back-button" onClick={onBack}>
          ← Back to Wines
        </button>
        {onNavigateWine && (
          <div className="wine-nav-arrows">
            <button
              className="nav-arrow"
              disabled={!hasPrev}
              onClick={() => hasPrev && onNavigateWine(filteredWineIds[currentIndex - 1])}
              title="Previous wine"
            >
              ◀
            </button>
            {filteredWineIds.length > 0 && (
              <span className="nav-position">{currentIndex + 1} of {filteredWineIds.length}</span>
            )}
            <button
              className="nav-arrow"
              disabled={!hasNext}
              onClick={() => hasNext && onNavigateWine(filteredWineIds[currentIndex + 1])}
              title="Next wine"
            >
              ▶
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="wine-header">
        {editing ? (
          <div className="edit-form">
            <input
              type="text"
              value={editData.name || ''}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              placeholder="Wine Name"
            />
            <select
              value={editData.color || 'red'}
              onChange={(e) => setEditData({ ...editData, color: e.target.value as Wine['color'] })}
            >
              <option value="red">Red</option>
              <option value="white">White</option>
              <option value="rose">Rosé</option>
              <option value="sparkling">Sparkling</option>
            </select>
            <input
              type="text"
              value={editData.region || ''}
              onChange={(e) => setEditData({ ...editData, region: e.target.value })}
              placeholder="Region"
            />
            <input
              type="text"
              value={editData.appellation || ''}
              onChange={(e) => setEditData({ ...editData, appellation: e.target.value })}
              placeholder="Appellation"
            />
            <input
              type="text"
              value={editData.grapeVarietyOrBlend || ''}
              onChange={(e) => setEditData({ ...editData, grapeVarietyOrBlend: e.target.value })}
              placeholder="Grape / Blend"
            />
            <div className="edit-actions">
              <button onClick={handleSave}>Save</button>
              <button onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h2>{wine.name}</h2>
            <div className="wine-meta">
              <span className={`color-badge ${wine.color}`}>{colorLabels[wine.color]}</span>
              {wine.region && <span>{wine.region}</span>}
              {wine.appellation && <span>{wine.appellation}</span>}
              {wine.grapeVarietyOrBlend && <span>{wine.grapeVarietyOrBlend}</span>}
            </div>
            <div className="button-group">
              <button className="edit-button" onClick={() => setEditing(true)}>
                Edit Wine
              </button>
              <button className="delete-button" onClick={handleDelete}>
                Delete Wine
              </button>
            </div>
          </>
        )}
      </div>

      <div className="vintages-header">
        <h4>Vintages</h4>
        <button className="add-vintage-btn" onClick={() => setAddingVintage(true)}>
          + Add Vintage
        </button>
      </div>

      {addingVintage && (
        <div className="add-vintage-form">
          <input
            type="number"
            value={newVintageYear}
            onChange={(e) => setNewVintageYear(parseInt(e.target.value, 10) || 0)}
            placeholder="Year"
            min={1900}
            max={2100}
          />
          <div className="form-actions">
            <button onClick={handleAddVintage}>Add</button>
            <button onClick={() => setAddingVintage(false)}>Cancel</button>
          </div>
        </div>
      )}

      {wine.vintages && wine.vintages.length > 0 ? (
        <div className="vintages-list">
          {wine.vintages.map((vintage) => {
            const isExpanded = expandedVintages.has(vintage.id);
            const avgRating =
              vintage.tastingEvents && vintage.tastingEvents.length > 0
                ? vintage.tastingEvents.reduce((sum, t) => sum + Number(t.rating), 0) /
                  vintage.tastingEvents.length
                : null;

            return (
              <div key={vintage.id} className={`vintage-card-expandable ${isExpanded ? 'expanded' : ''}`}>
                <div
                  className="vintage-header-row clickable"
                  onClick={() => toggleVintage(vintage.id)}
                >
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  <div className="vintage-year">{vintage.vintageYear}</div>
                  {avgRating && (
                    <span className="rating">Avg: {avgRating.toFixed(1)}</span>
                  )}
                  {vintage.tastingEvents && vintage.tastingEvents.length > 0 && (
                    <span className="tasting-count">{vintage.tastingEvents.length} tasting{vintage.tastingEvents.length > 1 ? 's' : ''}</span>
                  )}
                  {vintage.source && (
                    <span className="source-badge">{getSourceLabel(vintage.source, vintage.sourceCustom)}</span>
                  )}
                </div>

                {isExpanded && (
                  <div className="vintage-expanded-content">
                    {/* Source field */}
                    <div className="vintage-field">
                      <strong>Source:</strong>
                      {editingSource === vintage.id ? (
                        <div className="inline-edit">
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
                              placeholder="Source name..."
                              value={sourceCustomValue}
                              onChange={(e) => setSourceCustomValue(e.target.value)}
                            />
                          )}
                          <button onClick={() => handleSaveSource(vintage.id)}>Save</button>
                          <button onClick={() => setEditingSource(null)}>Cancel</button>
                        </div>
                      ) : (
                        <span className="field-value">
                          {vintage.source ? getSourceLabel(vintage.source, vintage.sourceCustom) : '(not set)'}
                          <button className="edit-inline-btn" onClick={() => startEditSource(vintage)} title="Edit">✎</button>
                        </span>
                      )}
                    </div>

                    {/* Seller notes */}
                    <div className="vintage-field">
                      <strong>Seller Notes:</strong>
                      {editingSellerNotes === vintage.id ? (
                        <div className="inline-edit">
                          <textarea
                            value={sellerNotesValue}
                            onChange={(e) => setSellerNotesValue(e.target.value)}
                            rows={3}
                            placeholder="Enter seller notes..."
                            autoFocus
                          />
                          <div className="edit-actions">
                            <button onClick={() => handleSaveSellerNotes(vintage.id)}>Save</button>
                            <button onClick={() => setEditingSellerNotes(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <span className="field-value">
                          {vintage.sellerNotes || '(none)'}
                          <button className="edit-inline-btn" onClick={() => startEditSellerNotes(vintage)} title="Edit">✎</button>
                        </span>
                      )}
                    </div>

                    {/* Purchases */}
                    <div className="vintage-section">
                      <div className="section-header">
                        <strong>Purchases</strong>
                        <button className="small-btn" onClick={() => setShowAddPurchase(vintage.id)}>+ Add</button>
                      </div>

                      {showAddPurchase === vintage.id && (
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
                            placeholder="Price"
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
                          <button onClick={() => handleAddPurchase(vintage.id)}>Save</button>
                          <button onClick={() => setShowAddPurchase(null)}>Cancel</button>
                        </div>
                      )}

                      {vintage.purchaseItems && vintage.purchaseItems.length > 0 ? (
                        <ul className="purchase-list">
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
                                  className="clickable"
                                  onClick={() => item.purchaseBatch && startEditPurchaseDate(item.purchaseBatch.id, item.purchaseBatch.purchaseDate)}
                                  title="Click to edit date"
                                >
                                  {formatDate(item.purchaseBatch?.purchaseDate || '')}
                                </span>
                              )}
                              {' - '}
                              {editingPriceId === item.id ? (
                                <span className="price-edit">
                                  $<input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editPriceValue}
                                    onChange={(e) => setEditPriceValue(e.target.value)}
                                    autoFocus
                                    style={{ width: '70px' }}
                                  />
                                  <button onClick={() => handleUpdatePrice(item.id)}>✓</button>
                                  <button onClick={() => setEditingPriceId(null)}>✕</button>
                                </span>
                              ) : (
                                <span
                                  className="clickable"
                                  onClick={() => startEditPrice(item.id, item.pricePaid ? Number(item.pricePaid) : undefined)}
                                >
                                  {item.pricePaid ? `$${Number(item.pricePaid).toFixed(0)}` : '(no price)'}
                                </span>
                              )}
                              {item.quantityPurchased > 1 && <span> × {item.quantityPurchased}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="empty-small">No purchases recorded</p>
                      )}
                    </div>

                    {/* Tastings */}
                    <div className="vintage-section">
                      <div className="section-header">
                        <strong>Tastings</strong>
                        <button className="small-btn" onClick={() => startAddTasting(vintage.id)}>+ Add</button>
                      </div>

                      {addingTastingForVintage === vintage.id && (
                        <div className="add-tasting-form">
                          <div className="date-row">
                            <input
                              type="date"
                              value={newTasting.tastingDate}
                              onChange={(e) => setNewTasting({ ...newTasting, tastingDate: e.target.value })}
                            />
                            <button
                              className="today-btn"
                              onClick={() => setNewTasting({ ...newTasting, tastingDate: new Date().toISOString().split('T')[0] })}
                            >
                              Today
                            </button>
                          </div>
                          <button
                            className={`inline-rating-btn ${newTasting.rating !== null ? 'has-rating' : ''}`}
                            onClick={() => setShowRatingPicker(true)}
                          >
                            {newTasting.rating !== null ? newTasting.ratingLabel : 'Tap to rate'}
                          </button>
                          <textarea
                            placeholder="Notes (optional)"
                            value={newTasting.notes}
                            onChange={(e) => setNewTasting({ ...newTasting, notes: e.target.value })}
                            rows={2}
                          />
                          <div className="form-actions">
                            <button onClick={handleAddTasting}>Save</button>
                            <button onClick={() => setAddingTastingForVintage(null)}>Cancel</button>
                          </div>
                        </div>
                      )}

                      {showRatingPicker && addingTastingForVintage === vintage.id && (
                        <div className="rating-popup-overlay" onClick={() => setShowRatingPicker(false)}>
                          <div className="rating-popup" onClick={(e) => e.stopPropagation()}>
                            <div className="rating-popup-header">Rate this wine</div>
                            <div className="rating-options-grid">
                              {ratingOptions.map((opt) => (
                                <button
                                  key={opt.value}
                                  className={`rating-option ${newTasting.rating === opt.value ? 'selected' : ''} ${opt.value >= 8 ? 'high' : opt.value >= 5 ? 'mid' : 'low'}`}
                                  onClick={() => selectRating(opt.value, opt.label)}
                                >
                                  {opt.label}
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
                                    {editTasting.tastingDate && (
                                      <button
                                        type="button"
                                        className="clear-date-btn"
                                        onClick={() => setEditTasting({ ...editTasting, tastingDate: '' })}
                                        title="Clear date"
                                      >
                                        ✕
                                      </button>
                                    )}
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
                                    <button className="edit-inline-btn" onClick={() => startEditTasting(tasting)} title="Edit">✎</button>
                                    <button className="delete-inline-btn" onClick={() => handleDeleteTasting(tasting.id)} title="Delete">×</button>
                                  </div>
                                  {tasting.notes && <p className="tasting-notes">{tasting.notes}</p>}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="empty-small">No tastings yet</p>
                      )}

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

                    <div className="vintage-actions">
                      <button className="delete-button small" onClick={() => handleDeleteVintage(vintage)}>
                        Delete Vintage
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty">No vintages recorded</div>
      )}
    </div>
  );
}
