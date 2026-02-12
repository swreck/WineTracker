import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Wine } from '../api/client';

interface Props {
  wineId: number;
  onBack: () => void;
  onSelectVintage: (id: number) => void;
}

const colorLabels: Record<string, string> = {
  red: 'Red',
  white: 'White',
  rose: 'Rosé',
  sparkling: 'Sparkling',
};

export default function WineDetail({ wineId, onBack, onSelectVintage }: Props) {
  const [wine, setWine] = useState<Wine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Wine>>({});

  useEffect(() => {
    loadWine();
  }, [wineId]);

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

  if (loading) return <div className="loading">Loading wine...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!wine) return <div className="error">Wine not found</div>;

  return (
    <div className="wine-detail">
      <button className="back-button" onClick={onBack}>
        ← Back to Wines
      </button>

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
                Edit
              </button>
              <button className="delete-button" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      <h4>Vintages</h4>
      {wine.vintages && wine.vintages.length > 0 ? (
        <div className="vintages-list">
          {wine.vintages.map((vintage) => {
            const avgRating =
              vintage.tastingEvents && vintage.tastingEvents.length > 0
                ? vintage.tastingEvents.reduce((sum, t) => sum + Number(t.rating), 0) /
                  vintage.tastingEvents.length
                : null;

            return (
              <div key={vintage.id} className="vintage-card-expanded">
                <div className="vintage-header-row">
                  <div className="vintage-year">{vintage.vintageYear}</div>
                  {avgRating && (
                    <span className="rating">Avg: {avgRating.toFixed(1)}</span>
                  )}
                  <button
                    className="edit-button"
                    onClick={() => onSelectVintage(vintage.id)}
                  >
                    Edit
                  </button>
                </div>

                {vintage.sellerNotes && (
                  <p className="seller-notes">{vintage.sellerNotes}</p>
                )}

                {vintage.tastingEvents && vintage.tastingEvents.length > 0 && (
                  <div className="inline-tastings">
                    {vintage.tastingEvents.map((tasting) => (
                      <div key={tasting.id} className="inline-tasting">
                        <span className="tasting-date">
                          {new Date(tasting.tastingDate).toLocaleDateString()}
                        </span>
                        <span className="rating">{Number(tasting.rating).toFixed(1)}</span>
                        {tasting.notes && (
                          <span className="tasting-notes">{tasting.notes}</span>
                        )}
                      </div>
                    ))}
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
