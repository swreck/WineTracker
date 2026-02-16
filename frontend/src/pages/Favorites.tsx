import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Wine, Vintage } from '../api/client';

interface Props {
  onSelectWine: (id: number) => void;
}

type ViewMode = 'wines' | 'vintages';

const colorLabels: Record<string, string> = {
  red: 'Red',
  white: 'White',
  rose: 'Rosé',
  sparkling: 'Sparkling',
};

export default function Favorites({ onSelectWine }: Props) {
  const [mode, setMode] = useState<ViewMode>('wines');
  const [wines, setWines] = useState<Wine[]>([]);
  const [vintages, setVintages] = useState<Vintage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minRating, setMinRating] = useState(7);
  const [colorFilter, setColorFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [vintageMin, setVintageMin] = useState('');
  const [vintageMax, setVintageMax] = useState('');

  // Generate year options for vintage filter
  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentYear; y >= 1990; y--) {
    yearOptions.push(y);
  }

  useEffect(() => {
    loadFavorites();
  }, [mode, minRating, colorFilter]);

  async function loadFavorites() {
    try {
      setLoading(true);
      setError(null);

      if (mode === 'wines') {
        const data = await api.getFavorites({
          minRating,
          color: colorFilter || undefined,
        });
        setWines(data);
      } else {
        const data = await api.getVintageFavorites({ minRating });
        setVintages(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="favorites">
      <h2>Favorites</h2>

      <div className="favorites-controls">
        <div className="view-toggle">
          <button
            className={mode === 'wines' ? 'active' : ''}
            onClick={() => setMode('wines')}
          >
            By Wine
          </button>
          <button
            className={mode === 'vintages' ? 'active' : ''}
            onClick={() => setMode('vintages')}
          >
            By Vintage
          </button>
        </div>

        <div className="filters">
          <label>
            Min Rating:
            <input
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
            />
          </label>

          {mode === 'wines' && (
            <>
              <select
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
              >
                <option value="">All Colors</option>
                <option value="red">Red</option>
                <option value="white">White</option>
                <option value="rose">Rosé</option>
                <option value="sparkling">Sparkling</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="">All Sources</option>
                <option value="weimax">Weimax</option>
                <option value="costco">Costco</option>
                <option value="other">Other</option>
              </select>
            </>
          )}

          <div className="vintage-filter-inline">
            <select
              value={vintageMin}
              onChange={(e) => setVintageMin(e.target.value)}
            >
              <option value="">From Year</option>
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span>-</span>
            <select
              value={vintageMax}
              onChange={(e) => setVintageMax(e.target.value)}
            >
              <option value="">To Year</option>
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && mode === 'wines' && (() => {
        let filteredWines = wines;

        if (sourceFilter) {
          filteredWines = filteredWines.filter(w => w.vintages?.some(v => v.source === sourceFilter));
        }

        if (vintageMin || vintageMax) {
          const min = vintageMin ? parseInt(vintageMin) : 0;
          const max = vintageMax ? parseInt(vintageMax) : 9999;
          filteredWines = filteredWines.filter(w =>
            w.vintages?.some(v => v.vintageYear >= min && v.vintageYear <= max)
          );
        }

        return (
        <>
          {filteredWines.length === 0 ? (
            <div className="empty">
              No wines with rating ≥ {minRating}. Try lowering the threshold.
            </div>
          ) : (
            <table className="favorites-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Wine</th>
                  <th>Color</th>
                  <th>Avg Rating</th>
                  <th>Tastings</th>
                </tr>
              </thead>
              <tbody>
                {filteredWines.map((wine, i) => (
                  <tr key={wine.id} onClick={() => onSelectWine(wine.id)}>
                    <td className="rank">{i + 1}</td>
                    <td>{wine.name}</td>
                    <td>
                      <span className={`color-badge ${wine.color}`}>
                        {colorLabels[wine.color]}
                      </span>
                    </td>
                    <td>
                      <span className="rating">{wine.averageRating?.toFixed(1)}</span>
                    </td>
                    <td>{wine.tastingCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
        );
      })()}

      {!loading && !error && mode === 'vintages' && (() => {
        let filteredVintages = vintages;

        if (vintageMin || vintageMax) {
          const min = vintageMin ? parseInt(vintageMin) : 0;
          const max = vintageMax ? parseInt(vintageMax) : 9999;
          filteredVintages = filteredVintages.filter(v => v.vintageYear >= min && v.vintageYear <= max);
        }

        return (
        <>
          {filteredVintages.length === 0 ? (
            <div className="empty">
              No vintages with rating ≥ {minRating}. Try lowering the threshold.
            </div>
          ) : (
            <table className="favorites-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Wine</th>
                  <th>Vintage</th>
                  <th>Avg Rating</th>
                  <th>Tastings</th>
                </tr>
              </thead>
              <tbody>
                {filteredVintages.map((vintage, i) => (
                  <tr key={vintage.id} onClick={() => vintage.wine && onSelectWine(vintage.wine.id)}>
                    <td className="rank">{i + 1}</td>
                    <td>{vintage.wine?.name}</td>
                    <td>{vintage.vintageYear}</td>
                    <td>
                      <span className="rating">{vintage.averageRating?.toFixed(1)}</span>
                    </td>
                    <td>{vintage.tastingCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
        );
      })()}
    </div>
  );
}
