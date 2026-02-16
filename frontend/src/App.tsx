import { useState } from 'react';
import WinesList from './pages/WinesList';
import WineDetail from './pages/WineDetail';
import VintageDetail from './pages/VintageDetail';
import Import from './pages/Import';
import Favorites from './pages/Favorites';
import QuickTasting from './pages/QuickTasting';
import { NavigationProvider } from './context/NavigationContext';
import './App.css';

type Page =
  | { type: 'wines' }
  | { type: 'wine'; id: number }
  | { type: 'vintage'; id: number; fromWineId?: number }
  | { type: 'import' }
  | { type: 'favorites' }
  | { type: 'quick-tasting' };

function App() {
  const [page, setPage] = useState<Page>({ type: 'wines' });

  const navigate = (newPage: Page) => setPage(newPage);

  return (
    <NavigationProvider>
    <div className="app">
      <header className="header">
        <h1 onClick={() => navigate({ type: 'wines' })}>Wine Tracker</h1>
        <nav>
          <button
            className={page.type === 'wines' ? 'active' : ''}
            onClick={() => navigate({ type: 'wines' })}
          >
            Wines
          </button>
          <button
            className={page.type === 'favorites' ? 'active' : ''}
            onClick={() => navigate({ type: 'favorites' })}
          >
            Favorites
          </button>
          <button
            className={page.type === 'quick-tasting' ? 'active' : ''}
            onClick={() => navigate({ type: 'quick-tasting' })}
          >
            + Tasting
          </button>
          <button
            className={page.type === 'import' ? 'active' : ''}
            onClick={() => navigate({ type: 'import' })}
          >
            Import
          </button>
        </nav>
      </header>

      <main className="main">
        {page.type === 'wines' && (
          <WinesList
            onSelectWine={(id) => navigate({ type: 'wine', id })}
            onSelectVintage={(vintageId, wineId) => navigate({ type: 'vintage', id: vintageId, fromWineId: wineId })}
          />
        )}
        {page.type === 'wine' && (
          <WineDetail
            wineId={page.id}
            onBack={() => navigate({ type: 'wines' })}
            onSelectVintage={(id) => navigate({ type: 'vintage', id, fromWineId: page.id })}
            onNavigateWine={(id) => navigate({ type: 'wine', id })}
          />
        )}
        {page.type === 'vintage' && (
          <VintageDetail
            vintageId={page.id}
            onBack={() => page.fromWineId
              ? navigate({ type: 'wine', id: page.fromWineId })
              : navigate({ type: 'wines' })
            }
            fromWineId={page.fromWineId}
          />
        )}
        {page.type === 'import' && (
          <Import onComplete={() => navigate({ type: 'wines' })} />
        )}
        {page.type === 'favorites' && (
          <Favorites
            onSelectWine={(id) => navigate({ type: 'wine', id })}
            onSelectVintage={(vintageId, wineId) => navigate({ type: 'vintage', id: vintageId, fromWineId: wineId })}
          />
        )}
        {page.type === 'quick-tasting' && (
          <QuickTasting
            onCancel={() => navigate({ type: 'wines' })}
          />
        )}
      </main>
    </div>
    </NavigationProvider>
  );
}

export default App;
