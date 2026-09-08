import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { SidebarRail } from './components/SidebarRail';
import { Dashboard } from './pages/Dashboard';
import { ProjectView } from './pages/ProjectView';
import { AssetView } from './pages/AssetView';
import { StorageView } from './pages/StorageView';
import { NotificationsView } from './pages/NotificationsView';
import { SearchModal } from './components/SearchModal';
import { ClientReviewRoom } from './pages/ClientReviewRoom';
import { Login } from './pages/Login';

export const App: React.FC = () => {
  const { user, loading } = useAuth();

  const [currentView, setCurrentView] = useState<'dashboard' | 'project' | 'asset' | 'storage' | 'notifications'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);

  // Check URL pathname for /review/:token client route
  const [reviewToken, setReviewToken] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/review\/([^/]+)/);
    if (match && match[1]) {
      setReviewToken(match[1]);
    }

    const handlePopState = () => {
      const p = window.location.pathname;
      const m = p.match(/^\/review\/([^/]+)/);
      if (m && m[1]) {
        setReviewToken(m[1]);
      } else {
        setReviewToken(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // If URL points to /review/:token, render Client Review Room directly
  if (reviewToken) {
    return <ClientReviewRoom token={reviewToken} />;
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#090b11] flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="h-screen w-screen bg-[#090b11] text-slate-100 flex overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Frame.io Left Icon Navigation Rail */}
      <SidebarRail
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'dashboard') {
            setSelectedProjectId(null);
            setSelectedAssetId(null);
          }
          setCurrentView(view);
        }}
        onSearchClick={() => setShowSearchModal(true)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <main className="flex-1 w-full p-6">
          {currentView === 'dashboard' && (
            <Dashboard
              onSelectProject={(projId) => {
                setSelectedProjectId(projId);
                setCurrentView('project');
              }}
            />
          )}

          {currentView === 'project' && selectedProjectId && (
            <ProjectView
              projectId={selectedProjectId}
              onBack={() => {
                setSelectedProjectId(null);
                setCurrentView('dashboard');
              }}
              onSelectAsset={(astId) => {
                setSelectedAssetId(astId);
                setCurrentView('asset');
              }}
            />
          )}

          {currentView === 'asset' && selectedAssetId && (
            <AssetView
              assetId={selectedAssetId}
              onBack={() => {
                setSelectedAssetId(null);
                if (selectedProjectId) {
                  setCurrentView('project');
                } else {
                  setCurrentView('dashboard');
                }
              }}
            />
          )}

          {currentView === 'storage' && (
            <StorageView
              onSelectAsset={(astId) => {
                setSelectedAssetId(astId);
                setCurrentView('asset');
              }}
            />
          )}

          {currentView === 'notifications' && (
            <NotificationsView
              onSelectAsset={(astId) => {
                setSelectedAssetId(astId);
                setCurrentView('asset');
              }}
              onSelectProject={(projId) => {
                setSelectedProjectId(projId);
                setCurrentView('project');
              }}
            />
          )}
        </main>
      </div>

      {/* Quick Search Palette Modal */}
      {showSearchModal && (
        <SearchModal
          onClose={() => setShowSearchModal(false)}
          onSelectProject={(projId) => {
            setSelectedProjectId(projId);
            setCurrentView('project');
          }}
          onSelectAsset={(astId) => {
            setSelectedAssetId(astId);
            setCurrentView('asset');
          }}
        />
      )}
    </div>
  );
};
