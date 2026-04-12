import { AppProvider, useApp } from './store/AppContext';
import Sidebar from './components/Sidebar/Sidebar';
import WeChat from './pages/WeChat/WeChat';
import VirtualSpace from './pages/VirtualSpace/VirtualSpace';
import Library from './pages/Library/Library';
import Map from './pages/Map/Map';
import Shopping from './pages/Shopping/Shopping';
import Accounting from './pages/Accounting/Accounting';
import ExamSimulator from './pages/ExamSimulator/ExamSimulator';
import Settings from './pages/Settings/Settings';
import './App.css';

function AppContent() {
  const { state } = useApp();

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
      <main className="app-main">
        {pageMap[state.activePage] || <WeChat />}
      </main>
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
