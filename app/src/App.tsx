import { AppProvider, useApp } from './store/AppContext';
import Sidebar from './components/Sidebar/Sidebar';
import StatusBar from './components/StatusBar/StatusBar';
import WeChat from './pages/WeChat/WeChat';
import VirtualSpace from './pages/VirtualSpace/VirtualSpace';
import Library from './pages/Library/Library';
import Map from './pages/Map/Map';
import Shopping from './pages/Shopping/Shopping';
import Accounting from './pages/Accounting/Accounting';
import ExamSimulator from './pages/ExamSimulator/ExamSimulator';
import Settings from './pages/Settings/Settings';
import { useAutoMessages } from './hooks/useAutoMessages';
import './App.css';

function AppContent() {
  const { state, dispatch } = useApp();

  // Run the Jiangxun auto-message scheduler at app level so it keeps firing
  // regardless of which page is active.
  useAutoMessages();

  const pageMap: Record<string, React.ReactNode> = {
    'wechat': <WeChat />,
    'virtual-space': <VirtualSpace />,
    'library': <Library />,
    'map': <Map />,
    'shopping': <Shopping />,
    'accounting': <Accounting />,
    'exam': <ExamSimulator />,
    'settings': <Settings />,
  };

  return (
    <div className="app-layout">
      <Sidebar />
      {/* Mobile drawer backdrop — clicking closes the drawer */}
      <div
        className={`sidebar-backdrop ${state.sidebarExpanded ? 'visible' : ''}`}
        onClick={() => {
          if (state.sidebarExpanded) dispatch({ type: 'TOGGLE_SIDEBAR' });
        }}
      />
      <div className="app-main-wrap">
        <StatusBar />
        <main className="app-main">
          {pageMap[state.activePage] || <WeChat />}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
