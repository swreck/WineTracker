import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Wine, Vintage } from '../api/client';

interface Props {
  onCancel: () => void;
}

export default function QuickTasting({ onCancel }: Props) {
  const [search, setSearch] = useState('');
  const [wines, setWines] = useState<Wine[]>([]);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [selectedVintage, setSelectedVintage] = useState<Vintage | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Tasting form
  const [tastingDate, setTastingDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [rating, setRating] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (search.length >= 2) {
      loadWines();
    } else {
      setWines([]);
    }
  }, [search]);

  async function loadWines() {
    try {
      setLoading(true);
      const data = await api.getWines({ search });
      setWines(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function selectWine(wine: Wine) {
    setSelectedWine(wine);
    // If only one vintage, auto-select it
    if (wine.vintages && wine.vintages.length === 1) {
      setSelectedVintage(wine.vintages[0]);
    } else {
      setSelectedVintage(null);
    }
  }

  async function handleSave() {
    if (!selectedVintage) {
      setError('Please select a vintage');
      return;
    }
    if (!rating) {
      setError('Please enter a rating');
      return;
    }

    const ratingNum = parseFloat(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 10) {
      setError('Rating must be between 1 and 10');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await api.createTasting({
        vintageId: selectedVintage.id,
        tastingDate,
        rating: ratingNum,
        notes: notes || undefined,
      });
      setSuccess(true);
      // Reset for another entry
      setTimeout(() => {
        setSelectedWine(null);
        setSelectedVintage(null);
        setSearch('');
        setRating('');
        setNotes('');
        setSuccess(false);
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="quick-tasting">
        <div className="success-message">
          Tasting saved for {selectedWine?.name} {selectedVintage?.vintageYear}
        </div>
      </div>
    );
  }

  return (
    <div className="quick-tasting">
      <div className="quick-tasting-header">
        <h2>Quick Tasting</h2>
        <button className="close-button" onClick={onCancel}>
          Done
        </button>
      </div>

      {!selectedWine ? (
        <div className="wine-search">
          <input
            type="text"
            placeholder="Search wines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          {loading && <div className="loading">Searching...</div>}

          {wines.length > 0 && (
            <div className="search-results">
              {wines.map((wine) => (
                <div
                  key={wine.id}
                  className="search-result"
                  onClick={() => selectWine(wine)}
                >
                  <span className="wine-name">{wine.name}</span>
                  <span className={`color-badge ${wine.color}`}>
                    {wine.color}
                  </span>
                  {wine.vintages && wine.vintages.length > 0 && (
                    <span className="vintages">
                      {wine.vintages.map((v) => v.vintageYear).join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {search.length >= 2 && wines.length === 0 && !loading && (
            <div className="no-results">No wines found for "{search}"</div>
          )}
        </div>
      ) : (
        <div className="tasting-form">
          <div className="selected-wine">
            <strong>{selectedWine.name}</strong>
            <button
              className="change-wine"
              onClick={() => {
                setSelectedWine(null);
                setSelectedVintage(null);
              }}
            >
              Change
            </button>
          </div>

          {!selectedVintage &&
            selectedWine.vintages &&
            selectedWine.vintages.length > 1 && (
              <div className="vintage-selector">
                <label>Select Vintage:</label>
                <div className="vintage-options">
                  {selectedWine.vintages.map((v) => (
                    <button
                      key={v.id}
                      className="vintage-option"
                      onClick={() => setSelectedVintage(v)}
                    >
                      {v.vintageYear}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {selectedVintage && (
            <>
              <div className="vintage-selected">
                Vintage: <strong>{selectedVintage.vintageYear}</strong>
                {selectedWine.vintages && selectedWine.vintages.length > 1 && (
                  <button
                    className="change-vintage"
                    onClick={() => setSelectedVintage(null)}
                  >
                    Change
                  </button>
                )}
              </div>

              <div className="form-row">
                <label>Date:</label>
                <input
                  type="date"
                  value={tastingDate}
                  onChange={(e) => setTastingDate(e.target.value)}
                />
              </div>

              <div className="form-row">
                <label>Rating (1-10):</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="8.5"
                />
              </div>

              <div className="form-row">
                <label>Notes (optional):</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tasting notes..."
                  rows={3}
                />
              </div>

              {error && <div className="error">{error}</div>}

              <button
                className="primary-button save-tasting"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Tasting'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
