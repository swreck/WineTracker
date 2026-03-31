import { useState } from 'react';
import Home from './pages/Home';
import WinesList from './pages/WinesList';
import WineDetail from './pages/WineDetail';
import Import from './pages/Import';
import QuickTasting from './pages/QuickTasting';
import NextCase from './pages/NextCase';
import RemiChat from './components/RemiChat';
import { NavigationProvider } from './context/NavigationContext';
import './App.css';

type Page =
  | { type: 'home' }
  | { type: 'wines'; filterWineIds?: number[] }
  | { type: 'wine'; id: number }
  | { type: 'import'; initialMode?: 'receipt' | 'label' | 'manual' }
  | { type: 'next-case' }
  | { type: 'quick-tasting' };

function App() {
  const [page, setPage] = useState<Page>({ type: 'home' });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<string | null>(null);
  const [chatFocusWineId, setChatFocusWineId] = useState<number | null>(null);

  function openChatAboutWine(wineName: string, vintageYear?: number, wineId?: number) {
    const context = vintageYear
      ? `Let's talk about my ${wineName} ${vintageYear}.`
      : `Let's talk about my ${wineName}.`;
    setChatContext(context);
    setChatFocusWineId(wineId || null);
    setChatOpen(true);
  }

  const navigate = (newPage: Page) => setPage(newPage);

  // Helper for Home's simple string-based navigation
  function handleHomeNavigate(target: string) {
    switch (target) {
      case 'wines': navigate({ type: 'wines' }); break;
      case 'import': navigate({ type: 'import' }); break;
      case 'import-label': navigate({ type: 'import', initialMode: 'label' }); break;
      case 'quick-tasting': navigate({ type: 'quick-tasting' }); break;
      case 'next-case': navigate({ type: 'next-case' }); break;
      default: navigate({ type: 'home' });
    }
  }

  return (
    <NavigationProvider>
    <div className="app">
      <header className="header">
        <h1 className="header-title" onClick={() => navigate({ type: 'home' })}>Wine Tracker</h1>
        <nav>
          <button
            className={page.type === 'home' ? 'active' : ''}
            onClick={() => navigate({ type: 'home' })}
          >
            Home
          </button>
          <button
            className={page.type === 'wines' || page.type === 'wine' ? 'active' : ''}
            onClick={() => navigate({ type: 'wines' })}
          >
            Wines
          </button>
          <button
            className={page.type === 'next-case' ? 'active' : ''}
            onClick={() => navigate({ type: 'next-case' })}
          >
            Next Case
          </button>
          <button
            className={page.type === 'import' || page.type === 'quick-tasting' ? 'active' : ''}
            onClick={() => navigate({ type: 'import' })}
          >
            Add
          </button>
        </nav>
      </header>

      <main className="main">
        {page.type === 'home' && (
          <Home
            onSelectWine={(id) => navigate({ type: 'wine', id })}
            onNavigate={handleHomeNavigate}
            onOpenChat={() => setChatOpen(true)}
          />
        )}
        {page.type === 'wines' && (
          <WinesList
            onSelectWine={(id) => navigate({ type: 'wine', id })}
            filterWineIds={page.filterWineIds}
          />
        )}
        {page.type === 'wine' && (
          <WineDetail
            wineId={page.id}
            onBack={() => navigate({ type: 'wines' })}
            onNavigateWine={(id) => navigate({ type: 'wine', id })}
            onChatAboutWine={openChatAboutWine}
          />
        )}
        {page.type === 'import' && (
          <Import
            initialMode={page.initialMode}
            onComplete={(wineIds, goToTasting) => {
              if (goToTasting && wineIds && wineIds.length > 0) {
                navigate({ type: 'wine', id: wineIds[0] });
              } else {
                navigate({ type: 'home' });
              }
            }}
          />
        )}
        {page.type === 'next-case' && (
          <NextCase
            onSelectWine={(id) => navigate({ type: 'wine', id })}
          />
        )}
        {page.type === 'quick-tasting' && (
          <QuickTasting
            onCancel={() => navigate({ type: 'home' })}
          />
        )}
      </main>

      {/* Remi chat */}
      <RemiChat isOpen={chatOpen} onClose={() => { setChatOpen(false); setChatContext(null); setChatFocusWineId(null); }} initialMessage={chatContext} focusWineId={chatFocusWineId} />

      {/* Remi chat FAB — always visible */}
      {!chatOpen && (
        <button
          className="remi-chat-fab"
          onClick={() => setChatOpen(true)}
          title="Chat with Remi"
        >
          <span className="remi-chat-fab-icon">R</span>
        </button>
      )}
    </div>
    </NavigationProvider>
  );
}

export default App;
