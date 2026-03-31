import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Wine, Vintage, WineSource } from '../api/client';
import { useNavigation } from '../context/NavigationContext';
import AutoExpandTextarea from '../components/AutoExpandTextarea';

interface Props {
  wineId: number;
  onBack: () => void;
  onNavigateWine?: (id: number) => void;
  onChatAboutWine?: (wineName: string, vintageYear?: number, wineId?: number) => void;
}

const colorLabels: Record<string, string> = {
  red: 'Red',
  white: 'White',
  rose: 'Rosé',
  sparkling: 'Sparkling',
};

export default function WineDetail({ wineId, onBack, onNavigateWine, onChatAboutWine }: Props) {
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

  // Expanded vintage tracking (preserved for potential future use)
  const [, setExpandedVintages] = useState<Set<number>>(new Set());

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

  // Detail tab state
  type DetailTab = 'notes' | 'gerald' | 'remi' | 'details';
  const [activeTab, setActiveTab] = useState<DetailTab>('notes');

  // Tell Me More / Remi state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);
  const [showVintagePicker, setShowVintagePicker] = useState(false);

  // Remi enrichment profiles (loaded per vintage)
  const [enrichments, setEnrichments] = useState<Record<string, string>>({});

  async function handleTellMeMore(vintageYear?: number) {
    if (!wine) return;
    setShowVintagePicker(false);
    setAiLoading(true);
    setAiText(null);
    try {
      const { text } = await api.tellMeMore({
        wineName: wine.name,
        vintageYear,
        color: wine.color,
        region: wine.region || undefined,
        appellation: wine.appellation || undefined,
        grapeVarietyOrBlend: wine.grapeVarietyOrBlend || undefined,
      });
      setAiText(text);
    } catch (e) {
      setAiText('Sorry, I couldn\u2019t find information about this wine right now.');
    } finally {
      setAiLoading(false);
    }
  }

  function onTellMeMoreClick() {
    if (!wine?.vintages || wine.vintages.length === 0) {
      handleTellMeMore();
    } else if (wine.vintages.length === 1) {
      handleTellMeMore(wine.vintages[0].vintageYear);
    } else {
      setShowVintagePicker(true);
    }
  }

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

  // Auto-expand single vintage and set default tab
  useEffect(() => {
    if (wine?.vintages?.length === 1) {
      setExpandedVintages(new Set([wine.vintages[0].id]));
    }
    // Default tab: notes if there are tastings, otherwise remi
    if (wine?.vintages) {
      const hasTastings = wine.vintages.some(v => v.tastingEvents && v.tastingEvents.length > 0);
      setActiveTab(hasTastings ? 'notes' : 'remi');

      // Load enrichments for all vintages
      for (const v of wine.vintages) {
        const key = `${wine.id}-${v.vintageYear}`;
        if (!enrichments[key]) {
          api.remiGetEnrichment(wine.id, v.vintageYear)
            .then(data => setEnrichments(prev => ({ ...prev, [key]: data.profile })))
            .catch(() => {}); // Silent — enrichment is optional
        }
      }
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

  // toggleVintage no longer used with tabbed layout
  void setExpandedVintages;

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

  async function handleDeletePurchase(itemId: number) {
    if (!confirm('Delete this purchase record?')) return;
    try {
      await api.deletePurchaseItem(itemId);
      await loadWine();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete purchase');
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

  // Gather all tastings and seller notes across vintages for tabbed view
  const allTastings = wine?.vintages?.flatMap(v =>
    (v.tastingEvents || []).map(t => ({
      ...t,
      vintageYear: v.vintageYear,
      vintageId: v.id,
    }))
  )?.sort((a, b) => new Date(b.tastingDate || 0).getTime() - new Date(a.tastingDate || 0).getTime()) || [];

  const allSellerNotes = wine?.vintages?.filter(v => v.sellerNotes).map(v => ({
    vintageYear: v.vintageYear,
    notes: v.sellerNotes!,
    source: v.source,
    sourceCustom: v.sourceCustom,
  })) || [];

  const allEnrichmentTexts = wine?.vintages?.map(v => ({
    vintageYear: v.vintageYear,
    profile: enrichments[`${wine.id}-${v.vintageYear}`] || null,
  })).filter(e => e.profile) || [];

  if (loading) return <div className="loading">Loading wine...</div>;
  if (error && !wine) return <div className="error">{error}</div>;
  if (!wine) return <div className="error">Wine not found</div>;

  return (
    <div className="wine-detail v2-detail">
      <div className="wine-detail-nav">
        <button className="back-button" onClick={onBack}>←</button>
        {onNavigateWine && (
          <div className="wine-nav-arrows">
            <button className="nav-arrow" disabled={!hasPrev}
              onClick={() => hasPrev && onNavigateWine(filteredWineIds[currentIndex - 1])}>◀</button>
            {filteredWineIds.length > 0 && (
              <span className="nav-position">{currentIndex + 1}/{filteredWineIds.length}</span>
            )}
            <button className="nav-arrow" disabled={!hasNext}
              onClick={() => hasNext && onNavigateWine(filteredWineIds[currentIndex + 1])}>▶</button>
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* ===== WINE HERO ===== */}
      <div className={`wine-hero card-tint-${wine.color}`}>
        <h2 className="wine-name-serif wine-hero-name">{wine.name}</h2>
        <div className="wine-identity">
          <span className={`color-dot ${wine.color}`} />
          <span className="wine-identity-text">
            {[colorLabels[wine.color], wine.region, wine.appellation, wine.grapeVarietyOrBlend].filter(Boolean).join(' · ')}
          </span>
        </div>
        <div className="wine-hero-vintages">
          {wine.vintages?.map(v => v.vintageYear).sort((a, b) => b - a).join(', ')}
        </div>
        {wine.averageRating && (
          <span className="wine-hero-rating">{wine.averageRating.toFixed(1)}</span>
        )}
      </div>

      {/* ===== TAB BAR ===== */}
      <div className="detail-tabs">
        <button className={`detail-tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
          My Notes
        </button>
        <button className={`detail-tab ${activeTab === 'gerald' ? 'active' : ''}`} onClick={() => setActiveTab('gerald')}>
          Gerald
        </button>
        <button className={`detail-tab ${activeTab === 'remi' ? 'active' : ''}`} onClick={() => setActiveTab('remi')}>
          Remi
        </button>
        <button className={`detail-tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>
          Details
        </button>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div className="detail-tab-content">

        {/* MY NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="tab-notes">
            {allTastings.length > 0 ? (
              <div className="tasting-journal">
                {allTastings.map((tasting) => (
                  <div key={tasting.id} className="tasting-journal-entry">
                    {editingTastingId === tasting.id ? (
                      <div className="edit-tasting-form">
                        <div className="date-row">
                          <input type="date" value={editTasting.tastingDate}
                            onChange={(e) => setEditTasting({ ...editTasting, tastingDate: e.target.value })} />
                          {editTasting.tastingDate && (
                            <button type="button" className="clear-date-btn"
                              onClick={() => setEditTasting({ ...editTasting, tastingDate: '' })}>✕</button>
                          )}
                        </div>
                        <button className={`inline-rating-btn ${editTasting.rating ? 'has-rating' : ''}`}
                          onClick={() => setShowEditRatingPicker(true)}>
                          {editTasting.rating ? ratingOptions.find(r => String(r.value) === editTasting.rating)?.label || editTasting.rating : 'Tap to rate'}
                        </button>
                        <AutoExpandTextarea value={editTasting.notes}
                          onChange={(e) => setEditTasting({ ...editTasting, notes: e.target.value })}
                          placeholder="Notes..." />
                        <div className="form-actions">
                          <button onClick={() => handleSaveTasting(tasting.id)}>Save</button>
                          <button onClick={() => setEditingTastingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="tasting-journal-header">
                          <div className="tasting-journal-left">
                            <span className="tasting-journal-date">
                              {tasting.tastingDate ? formatDate(tasting.tastingDate) : '(no date)'}
                            </span>
                            <span className="tasting-journal-vintage">{tasting.vintageYear}</span>
                          </div>
                          <span className="tasting-journal-rating">{Number(tasting.rating).toFixed(1)}</span>
                          <div className="tasting-journal-actions">
                            <button className="edit-inline-btn" onClick={() => startEditTasting(tasting)} title="Edit">✎</button>
                            <button className="delete-inline-btn" onClick={() => handleDeleteTasting(tasting.id)} title="Delete">×</button>
                          </div>
                        </div>
                        {tasting.notes && <p className="tasting-journal-notes">{tasting.notes}</p>}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="tab-empty">
                <p>No tasting notes yet.</p>
              </div>
            )}

            {/* Add tasting button */}
            {wine.vintages && wine.vintages.length > 0 && !addingTastingForVintage && (
              <button className="tab-action-btn" onClick={() => {
                const v = wine.vintages!.length === 1 ? wine.vintages![0] : null;
                if (v) startAddTasting(v.id);
                else setActiveTab('details'); // go to details to pick vintage
              }}>
                + Add Tasting
              </button>
            )}

            {/* Inline add tasting form */}
            {addingTastingForVintage && (
              <div className="add-tasting-form">
                <div className="date-row">
                  <input type="date" value={newTasting.tastingDate}
                    onChange={(e) => setNewTasting({ ...newTasting, tastingDate: e.target.value })} />
                  <button className="today-btn"
                    onClick={() => setNewTasting({ ...newTasting, tastingDate: new Date().toISOString().split('T')[0] })}>Today</button>
                </div>
                <button className={`inline-rating-btn ${newTasting.rating !== null ? 'has-rating' : ''}`}
                  onClick={() => setShowRatingPicker(true)}>
                  {newTasting.rating !== null ? newTasting.ratingLabel : 'Tap to rate'}
                </button>
                <AutoExpandTextarea placeholder="Notes (optional)" value={newTasting.notes}
                  onChange={(e) => setNewTasting({ ...newTasting, notes: e.target.value })} />
                <div className="form-actions">
                  <button onClick={handleAddTasting}>Save</button>
                  <button onClick={() => setAddingTastingForVintage(null)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Rating pickers */}
            {showRatingPicker && (
              <div className="rating-popup-overlay" onClick={() => setShowRatingPicker(false)}>
                <div className="rating-popup" onClick={(e) => e.stopPropagation()}>
                  <div className="rating-popup-header">Rate this wine</div>
                  <div className="rating-options-grid">
                    {ratingOptions.map((opt) => (
                      <button key={opt.value}
                        className={`rating-option ${newTasting.rating === opt.value ? 'selected' : ''} ${opt.value >= 8 ? 'high' : opt.value >= 5 ? 'mid' : 'low'}`}
                        onClick={() => selectRating(opt.value, opt.label)}>{opt.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {showEditRatingPicker && (
              <div className="rating-popup-overlay" onClick={() => setShowEditRatingPicker(false)}>
                <div className="rating-popup" onClick={(e) => e.stopPropagation()}>
                  <div className="rating-popup-header">Select Rating</div>
                  <div className="rating-options-grid">
                    {ratingOptions.map(({ value, label }) => (
                      <button key={value}
                        className={`rating-option ${value < 6 ? 'low' : value >= 8 ? 'high' : 'mid'} ${editTasting.rating === String(value) ? 'selected' : ''}`}
                        onClick={() => handleEditRatingSelect(value)}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GERALD TAB */}
        {activeTab === 'gerald' && (
          <div className="tab-gerald">
            {allSellerNotes.length > 0 ? (
              allSellerNotes.map((sn, i) => (
                <div key={i} className="gerald-note-card">
                  <div className="gerald-note-header">
                    <span className="gerald-note-vintage">{sn.vintageYear}</span>
                    {sn.source && <span className="gerald-note-source">{getSourceLabel(sn.source, sn.sourceCustom || undefined)}</span>}
                  </div>
                  <p className="gerald-note-text">{sn.notes}</p>
                </div>
              ))
            ) : (
              <div className="tab-empty">
                <p>No seller notes for this wine.</p>
              </div>
            )}
          </div>
        )}

        {/* REMI TAB */}
        {activeTab === 'remi' && (
          <div className="tab-remi">
            {allEnrichmentTexts.length > 0 ? (
              allEnrichmentTexts.map((e, i) => (
                <div key={i} className="remi-enrichment-card">
                  <div className="remi-enrichment-header">
                    <span className="remi-profile-label">Remi</span>
                    <span className="remi-enrichment-vintage">{e.vintageYear}</span>
                  </div>
                  {e.profile!.split('\n\n').map((p, j) => (
                    <p key={j} className="remi-paragraph">{p}</p>
                  ))}
                </div>
              ))
            ) : aiLoading ? (
              <div className="tab-empty">
                <div className="ai-loading-spinner" />
                <p>Remi is thinking...</p>
              </div>
            ) : (
              <div className="tab-empty">
                <p>Remi hasn't profiled this wine yet.</p>
                <button className="tab-action-btn" onClick={onTellMeMoreClick} disabled={aiLoading}>
                  Ask Remi
                </button>
              </div>
            )}

            {/* AI response from Ask Remi button */}
            {aiText && !aiLoading && (
              <div className="remi-profile-area">
                <div className="remi-profile-header">
                  <span className="remi-profile-label">Remi</span>
                  <button className="ai-dismiss" onClick={() => setAiText(null)} title="Dismiss">×</button>
                </div>
                {aiText.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="remi-paragraph">{paragraph}</p>
                ))}
              </div>
            )}

            {showVintagePicker && wine.vintages && (
              <div className="vintage-picker">
                <span className="vintage-picker-label">Which vintage?</span>
                <div className="vintage-picker-options">
                  {wine.vintages.map(v => (
                    <button key={v.id} className="vintage-picker-btn"
                      onClick={() => handleTellMeMore(v.vintageYear)}>{v.vintageYear}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Bridge to Remi chat */}
            {onChatAboutWine && (allEnrichmentTexts.length > 0 || aiText) && (
              <button
                className="remi-continue-btn"
                onClick={() => onChatAboutWine(wine.name, wine.vintages?.length === 1 ? wine.vintages[0].vintageYear : undefined, wine.id)}
              >
                Continue with Remi
              </button>
            )}
          </div>
        )}

        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="tab-details">
            {/* Edit wine */}
            {editing ? (
              <div className="edit-form">
                <input type="text" value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Wine Name" />
                <select value={editData.color || 'red'}
                  onChange={(e) => setEditData({ ...editData, color: e.target.value as Wine['color'] })}>
                  <option value="red">Red</option><option value="white">White</option>
                  <option value="rose">Rosé</option><option value="sparkling">Sparkling</option>
                </select>
                <input type="text" value={editData.region || ''}
                  onChange={(e) => setEditData({ ...editData, region: e.target.value })} placeholder="Region" />
                <input type="text" value={editData.appellation || ''}
                  onChange={(e) => setEditData({ ...editData, appellation: e.target.value })} placeholder="Appellation" />
                <input type="text" value={editData.grapeVarietyOrBlend || ''}
                  onChange={(e) => setEditData({ ...editData, grapeVarietyOrBlend: e.target.value })} placeholder="Grape / Blend" />
                <div className="edit-actions">
                  <button onClick={handleSave}>Save</button>
                  <button onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="detail-actions-row">
                <button className="detail-action-btn" onClick={() => setEditing(true)}>Edit Wine</button>
                <button className="detail-action-btn danger" onClick={handleDelete}>Delete Wine</button>
              </div>
            )}

            {/* Vintages */}
            <div className="detail-section">
              <div className="section-header">
                <h4>Vintages</h4>
                <button className="small-btn" onClick={() => setAddingVintage(true)}>+ Add</button>
              </div>

              {addingVintage && (
                <div className="add-vintage-form">
                  <input type="number" value={newVintageYear}
                    onChange={(e) => setNewVintageYear(parseInt(e.target.value, 10) || 0)}
                    placeholder="Year" min={1900} max={2100} />
                  <div className="form-actions">
                    <button onClick={handleAddVintage}>Add</button>
                    <button onClick={() => setAddingVintage(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {wine.vintages && wine.vintages.map((vintage) => (
                <div key={vintage.id} className="detail-vintage-card">
                  <div className="detail-vintage-header">
                    <span className="detail-vintage-year">{vintage.vintageYear}</span>
                    {vintage.source && <span className="source-badge">{getSourceLabel(vintage.source, vintage.sourceCustom)}</span>}
                  </div>

                  {/* Source editing */}
                  <div className="detail-field">
                    <span className="detail-field-label">Source:</span>
                    {editingSource === vintage.id ? (
                      <div className="inline-edit">
                        <select value={sourceValue} onChange={(e) => setSourceValue(e.target.value as WineSource | '')}>
                          <option value="">Not specified</option>
                          <option value="weimax">Weimax</option><option value="costco">Costco</option>
                          <option value="other">Other...</option>
                        </select>
                        {sourceValue === 'other' && (
                          <input type="text" placeholder="Source name..." value={sourceCustomValue}
                            onChange={(e) => setSourceCustomValue(e.target.value)} />
                        )}
                        <button onClick={() => handleSaveSource(vintage.id)}>Save</button>
                        <button onClick={() => setEditingSource(null)}>Cancel</button>
                      </div>
                    ) : (
                      <span className="field-value">
                        {vintage.source ? getSourceLabel(vintage.source, vintage.sourceCustom) : '(not set)'}
                        <button className="edit-inline-btn" onClick={() => startEditSource(vintage)}>✎</button>
                      </span>
                    )}
                  </div>

                  {/* Seller notes editing */}
                  <div className="detail-field">
                    <span className="detail-field-label">Seller Notes:</span>
                    {editingSellerNotes === vintage.id ? (
                      <div className="inline-edit">
                        <textarea value={sellerNotesValue} onChange={(e) => setSellerNotesValue(e.target.value)}
                          rows={3} placeholder="Enter seller notes..." />
                        <div className="edit-actions">
                          <button onClick={() => handleSaveSellerNotes(vintage.id)}>Save</button>
                          <button onClick={() => setEditingSellerNotes(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <span className="field-value">
                        {vintage.sellerNotes || '(none)'}
                        <button className="edit-inline-btn" onClick={() => startEditSellerNotes(vintage)}>✎</button>
                      </span>
                    )}
                  </div>

                  {/* Purchases */}
                  <div className="detail-field">
                    <span className="detail-field-label">Purchases:</span>
                    <button className="small-btn" onClick={() => setShowAddPurchase(vintage.id)}>+ Add</button>
                  </div>

                  {showAddPurchase === vintage.id && (
                    <div className="add-purchase-form">
                      <input type="date" value={newPurchase.purchaseDate}
                        onChange={(e) => setNewPurchase({ ...newPurchase, purchaseDate: e.target.value })} />
                      <input type="number" step="0.01" min="0" placeholder="Price" value={newPurchase.pricePaid}
                        onChange={(e) => setNewPurchase({ ...newPurchase, pricePaid: e.target.value })} />
                      <input type="number" min="1" placeholder="Qty" value={newPurchase.quantity}
                        onChange={(e) => setNewPurchase({ ...newPurchase, quantity: e.target.value })} style={{ width: '60px' }} />
                      <button onClick={() => handleAddPurchase(vintage.id)}>Save</button>
                      <button onClick={() => setShowAddPurchase(null)}>Cancel</button>
                    </div>
                  )}

                  {vintage.purchaseItems && vintage.purchaseItems.length > 0 && (
                    <ul className="purchase-list">
                      {vintage.purchaseItems.map((item) => (
                        <li key={item.id} className="purchase-item">
                          {editingPurchaseDateId === item.purchaseBatch?.id ? (
                            <span className="date-edit">
                              <input type="date" value={editPurchaseDateValue}
                                onChange={(e) => setEditPurchaseDateValue(e.target.value)} autoFocus />
                              <button onClick={() => handleSavePurchaseDate(item.purchaseBatch!.id)}>✓</button>
                              <button onClick={() => setEditingPurchaseDateId(null)}>✕</button>
                            </span>
                          ) : (
                            <span className="clickable"
                              onClick={() => item.purchaseBatch && startEditPurchaseDate(item.purchaseBatch.id, item.purchaseBatch.purchaseDate)}
                            >{formatDate(item.purchaseBatch?.purchaseDate || '')}</span>
                          )}
                          {' - '}
                          {editingPriceId === item.id ? (
                            <span className="price-edit">
                              $<input type="number" step="0.01" min="0" value={editPriceValue}
                                onChange={(e) => setEditPriceValue(e.target.value)} autoFocus style={{ width: '70px' }} />
                              <button onClick={() => handleUpdatePrice(item.id)}>✓</button>
                              <button onClick={() => setEditingPriceId(null)}>✕</button>
                            </span>
                          ) : (
                            <span className="clickable"
                              onClick={() => startEditPrice(item.id, item.pricePaid ? Number(item.pricePaid) : undefined)}
                            >{item.pricePaid ? `$${Number(item.pricePaid).toFixed(0)}` : '(no price)'}</span>
                          )}
                          {item.quantityPurchased > 1 && <span> × {item.quantityPurchased}</span>}
                          <button className="delete-inline-btn" onClick={() => handleDeletePurchase(item.id)}>×</button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Add tasting for this vintage */}
                  <button className="small-btn" onClick={() => startAddTasting(vintage.id)}>+ Add Tasting</button>

                  <div className="detail-vintage-footer">
                    <label className="not-available-toggle">
                      <input type="checkbox" checked={vintage.notAvailable || false}
                        onChange={async (e) => {
                          try { await api.updateVintage(vintage.id, { notAvailable: e.target.checked } as any); await loadWine(); }
                          catch (err) { setError(err instanceof Error ? err.message : 'Failed to update'); }
                        }} />
                      Not available
                    </label>
                    <button className="delete-button small" onClick={() => handleDeleteVintage(vintage)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
