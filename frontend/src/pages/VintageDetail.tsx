import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Vintage } from '../api/client';

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
  const [newTasting, setNewTasting] = useState({
    tastingDate: new Date().toISOString().split('T')[0],
    rating: '',
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
        tastingDate: newTasting.tastingDate,
        rating: parseFloat(newTasting.rating),
        notes: newTasting.notes || undefined,
      });
      await loadVintage();
      setShowAddTasting(false);
      setNewTasting({
        tastingDate: new Date().toISOString().split('T')[0],
        rating: '',
        notes: '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add tasting');
    }
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

  if (loading) return <div className="loading">Loading vintage...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!vintage) return <div className="error">Vintage not found</div>;

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

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

        {vintage.sellerNotes && (
          <div className="seller-notes">
            <strong>Seller:</strong> {vintage.sellerNotes}
          </div>
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
                <span>{formatDate(item.purchaseBatch?.purchaseDate || '')}</span>
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
            <input
              type="date"
              value={newTasting.tastingDate}
              onChange={(e) => setNewTasting({ ...newTasting, tastingDate: e.target.value })}
            />
            <input
              type="number"
              step="0.1"
              min="1"
              max="10"
              placeholder="Rating (1-10)"
              value={newTasting.rating}
              onChange={(e) => setNewTasting({ ...newTasting, rating: e.target.value })}
            />
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

        {vintage.tastingEvents && vintage.tastingEvents.length > 0 ? (
          <div className="tastings-list">
            {vintage.tastingEvents.map((tasting) => (
              <div key={tasting.id} className="tasting-card">
                <div className="tasting-header">
                  <span className="tasting-date">{formatDate(tasting.tastingDate)}</span>
                  <span className="rating">{Number(tasting.rating).toFixed(1)}</span>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteTasting(tasting.id)}
                  >
                    ×
                  </button>
                </div>
                {tasting.notes && <p className="tasting-notes">{tasting.notes}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">No tasting notes yet</p>
        )}
      </div>
    </div>
  );
}
