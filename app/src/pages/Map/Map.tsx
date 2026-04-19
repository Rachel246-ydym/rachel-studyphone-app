import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/AppContext';
import { callAI, buildMapEventPrompt } from '../../services/ai';
import { MapPin, Clock, RefreshCw, ShoppingCart, ZoomIn, ZoomOut } from 'lucide-react';
import './Map.css';

// Virtual campus landmarks laid out on a 5-column text grid.
// Each landmark has a label + icon; (row, col) determines placement.
interface Landmark {
  id: string;
  name: string;
  icon: string;
  row: number;
  col: number;
}

const LANDMARKS: Landmark[] = [
  { id: '食堂',      name: '食堂',      icon: '🍱', row: 0, col: 0 },
  { id: '教学楼',    name: '教学楼',    icon: '🏛️', row: 0, col: 2 },
  { id: '图书馆',    name: '图书馆',    icon: '📚', row: 0, col: 4 },
  { id: '研究室',    name: '研究室',    icon: '🔬', row: 1, col: 1 },
  { id: '广场',      name: '中心广场',  icon: '⛲', row: 1, col: 3 },
  { id: '健身房',    name: '健身房',    icon: '🏋️', row: 2, col: 0 },
  { id: '咖啡馆',    name: '咖啡馆',    icon: '☕', row: 2, col: 2 },
  { id: '公寓',      name: '江浔的公寓', icon: '🏠', row: 2, col: 4 },
];

// Normalize a raw action string to a canonical landmark id.
function matchLandmark(text: string): string | null {
  for (const lm of LANDMARKS) {
    if (text.includes(lm.id)) return lm.id;
  }
  // Fallbacks
  if (text.includes('食堂') || text.includes('饭')) return '食堂';
  if (text.includes('教室') || text.includes('上课')) return '教学楼';
  if (text.includes('图书')) return '图书馆';
  if (text.includes('咖啡')) return '咖啡馆';
  if (text.includes('健身') || text.includes('跑步')) return '健身房';
  if (text.includes('家') || text.includes('宿舍') || text.includes('回去')) return '公寓';
  return null;
}

export default function Map() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [zoom, setZoom] = useState(1);

  const todayEvents = state.mapEvents.filter(e => {
    const eventDate = new Date(e.timestamp).toISOString().slice(0, 10);
    return eventDate === selectedDate;
  }).sort((a, b) => a.timestamp - b.timestamp);

  // Figure out Jiangxun's "current" landmark = latest event today.
  const today = new Date().toISOString().slice(0, 10);
  const todaysOrdered = state.mapEvents
    .filter(e => new Date(e.timestamp).toISOString().slice(0, 10) === today)
    .sort((a, b) => a.timestamp - b.timestamp);
  const lastEvent = todaysOrdered[todaysOrdered.length - 1];
  const currentLandmarkId = lastEvent && lastEvent.action.includes('到达')
    ? matchLandmark(lastEvent.action)
    : null;

  // Generate a pair of map events: leave previous location + arrive at new one.
  // Only records "到达" and "离开" (start/end) events per user spec.
  const generateEvent = useCallback(async (targetName?: string) => {
    if (loading) return;
    setLoading(true);

    let nextName = targetName || '';
    if (!nextName && state.apiKey) {
      const currentHour = new Date().getHours();
      const prompt = buildMapEventPrompt(currentHour);
      const action = await callAI(
        state.apiKey,
        state.aiModel,
        [{ role: 'system', content: prompt }],
      );
      const match = matchLandmark(action);
      nextName = match || LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)].name;
    }
    if (!nextName) {
      nextName = LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)].name;
    }
    const target = LANDMARKS.find(l => nextName.includes(l.id)) || LANDMARKS[0];

    // Leave previous location if any
    const prev = todaysOrdered.slice().reverse().find(e => e.action.includes('到达'));
    const now = Date.now();
    if (prev) {
      const prevLm = LANDMARKS.find(l => prev.action.includes(l.id));
      if (prevLm && prevLm.id !== target.id) {
        dispatch({
          type: 'ADD_MAP_EVENT',
          payload: {
            id: `map-leave-${now}`,
            timestamp: now,
            location: prevLm.name,
            action: `离开${prevLm.name}`,
          },
        });
      }
    }
    dispatch({
      type: 'ADD_MAP_EVENT',
      payload: {
        id: `map-arrive-${now + 1}`,
        timestamp: now + 1,
        location: target.name,
        action: `到达${target.name}`,
      },
    });
    setLoading(false);
  }, [state.apiKey, state.aiModel, loading, dispatch, todaysOrdered]);

  // Auto-generate events periodically (every 30 min equivalent)
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = state.mapEvents.filter(e =>
      new Date(e.timestamp).toISOString().slice(0, 10) === todayStr
    ).length;

    // Auto-generate if less than reasonable events for current hour
    const currentHour = new Date().getHours();
    const expectedMin = Math.max(0, Math.floor((currentHour - 6) / 2));
    if (todayCount < expectedMin) {
      generateEvent();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function formatTime(ts: number) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }

  // Get unique dates from events
  const eventDates = [...new Set(state.mapEvents.map(e =>
    new Date(e.timestamp).toISOString().slice(0, 10)
  ))].sort().reverse();

  const rows = Math.max(...LANDMARKS.map(l => l.row)) + 1;
  const cols = Math.max(...LANDMARKS.map(l => l.col)) + 1;

  return (
    <div className="map-page">
      <div className="page-header">
        <h3 style={{ flex: 1 }}>江浔的地图</h3>
        <button
          className="header-btn"
          title="缩小"
          onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
        >
          <ZoomOut size={16} />
        </button>
        <button
          className="header-btn"
          title="放大"
          onClick={() => setZoom(z => Math.min(1.6, z + 0.15))}
        >
          <ZoomIn size={16} />
        </button>
        <button
          className="btn-primary"
          onClick={() => generateEvent()}
          disabled={loading}
          style={{ padding: '6px 14px', fontSize: 13, marginLeft: 6 }}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          {loading ? '生成中...' : '刷新动态'}
        </button>
      </div>

      {/* Text-based zoomable campus grid */}
      <div className="map-grid-wrap">
        <div
          className="map-grid"
          style={{
            transform: `scale(${zoom})`,
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {LANDMARKS.map(lm => {
            const isHere = currentLandmarkId === lm.id;
            return (
              <button
                key={lm.id}
                className={`map-landmark ${isHere ? 'active' : ''}`}
                style={{ gridRow: lm.row + 1, gridColumn: lm.col + 1 }}
                onClick={() => generateEvent(lm.name)}
                title={`让江浔去${lm.name}`}
              >
                <div className="landmark-icon">{lm.icon}</div>
                <div className="landmark-name">{lm.name}</div>
                {isHere && <div className="landmark-me">江浔在这</div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="map-content">
        {/* Date selector */}
        <div className="map-dates">
          {eventDates.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-light)' }}>
              {new Date().toISOString().slice(0, 10)}
            </div>
          ) : (
            eventDates.map(date => (
              <button
                key={date}
                className={`date-tab ${date === selectedDate ? 'active' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                {date === new Date().toISOString().slice(0, 10) ? '今天' : date.slice(5)}
              </button>
            ))
          )}
        </div>

        <div className="map-date-label">{formatDate(selectedDate)}</div>

        {/* Timeline */}
        <div className="map-timeline">
          {todayEvents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗺️</div>
              <p>
                {!state.apiKey
                  ? '请先在设置中填入API Key'
                  : '点击「刷新动态」生成江浔的行动轨迹'}
              </p>
            </div>
          ) : (
            todayEvents.map((event, index) => (
              <div key={event.id} className="timeline-item">
                <div className="timeline-line">
                  <div className={`timeline-dot ${index === todayEvents.length - 1 ? 'current' : ''}`}>
                    {event.linkedShoppingId ? <ShoppingCart size={10} /> : <MapPin size={10} />}
                  </div>
                  {index < todayEvents.length - 1 && <div className="timeline-connector" />}
                </div>
                <div className="timeline-content">
                  <div className="timeline-time">
                    <Clock size={12} /> {formatTime(event.timestamp)}
                  </div>
                  <div className="timeline-action">
                    江浔{event.action}
                  </div>
                  <div className="timeline-location">
                    <MapPin size={12} /> {event.location}
                  </div>
                  {event.detail && (
                    <div className="timeline-detail">{event.detail}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
