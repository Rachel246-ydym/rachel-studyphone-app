import { useApp } from '../../store/AppContext';
import {
  MessageCircle, Sparkles, BookOpen, MapPin,
  ShoppingBag, Calculator, GraduationCap, Settings,
  ChevronLeft, ChevronRight, GripVertical,
} from 'lucide-react';
import { useState, useRef } from 'react';
import './Sidebar.css';

const iconMap: Record<string, React.ReactNode> = {
  MessageCircle: <MessageCircle size={22} />,
  Sparkles: <Sparkles size={22} />,
  BookOpen: <BookOpen size={22} />,
  MapPin: <MapPin size={22} />,
  ShoppingBag: <ShoppingBag size={22} />,
  Calculator: <Calculator size={22} />,
  GraduationCap: <GraduationCap size={22} />,
  Settings: <Settings size={22} />,
};

function isMobile() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
}

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const { sidebarExpanded, sidebarItems, activePage, contacts } = state;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const sorted = [...sidebarItems].sort((a, b) => a.order - b.order);
  // Settings always last
  const mainItems = sorted.filter(i => i.id !== 'settings');
  const settingsItem = sorted.find(i => i.id === 'settings');

  // Total unread across all chat contacts -> red dot on WeChat icon
  const totalUnread = contacts.reduce((sum, c) => sum + (c.unread || 0), 0);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    dragOverIndex.current = index;
  }

  function handleDrop() {
    if (dragIndex === null || dragOverIndex.current === null || dragIndex === dragOverIndex.current) {
      setDragIndex(null);
      return;
    }
    const newItems = [...mainItems];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(dragOverIndex.current, 0, moved);
    const reordered = newItems.map((item, i) => ({ ...item, order: i }));
    if (settingsItem) reordered.push({ ...settingsItem, order: reordered.length });
    dispatch({ type: 'REORDER_SIDEBAR', payload: reordered });
    setDragIndex(null);
  }

  function selectPage(id: string) {
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: id });
    // On mobile, auto-close the drawer after picking an item
    if (isMobile() && sidebarExpanded) {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    }
  }

  function renderIcon(item: { id: string; icon: string }) {
    const base = iconMap[item.icon];
    if (item.id === 'wechat' && totalUnread > 0) {
      return (
        <span className="sidebar-icon-with-dot">
          {base}
          <span className="sidebar-red-dot" title={`${totalUnread} 条未读`} />
        </span>
      );
    }
    return base;
  }

  return (
    <aside className={`sidebar ${sidebarExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-header">
        {sidebarExpanded && <span className="sidebar-title">手机模拟器</span>}
        <button
          className="sidebar-toggle"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          title={sidebarExpanded ? '收起' : '展开'}
        >
          {sidebarExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {mainItems.map((item, index) => (
          <div
            key={item.id}
            className={`sidebar-item ${activePage === item.id ? 'active' : ''} ${dragIndex === index ? 'dragging' : ''}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            onDragEnd={() => setDragIndex(null)}
            onClick={() => selectPage(item.id)}
            title={item.label}
          >
            {sidebarExpanded && (
              <span className="drag-handle">
                <GripVertical size={14} />
              </span>
            )}
            <span className="sidebar-icon">{renderIcon(item)}</span>
            {sidebarExpanded && <span className="sidebar-label">{item.label}</span>}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {settingsItem && (
          <div
            className={`sidebar-item ${activePage === 'settings' ? 'active' : ''}`}
            onClick={() => selectPage('settings')}
            title="设置"
          >
            <span className="sidebar-icon">{iconMap[settingsItem.icon]}</span>
            {sidebarExpanded && <span className="sidebar-label">{settingsItem.label}</span>}
          </div>
        )}
      </div>
    </aside>
  );
}
