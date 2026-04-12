import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/AppContext';
import { callAI, buildMapEventPrompt } from '../../services/ai';
import { MapPin, Clock, RefreshCw, ShoppingCart } from 'lucide-react';
import './Map.css';

export default function Map() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const todayEvents = state.mapEvents.filter(e => {
    const eventDate = new Date(e.timestamp).toISOString().slice(0, 10);
    return eventDate === selectedDate;
  }).sort((a, b) => a.timestamp - b.timestamp);

  const generateEvent = useCallback(async () => {
    if (!state.apiKey || loading) return;
    setLoading(true);

    const currentHour = new Date().getHours();
    const prompt = buildMapEventPrompt(currentHour);

    const action = await callAI(
      state.apiKey,
      state.aiModel,
      [{ role: 'system', content: prompt }],
    );

    // Determine location based on action
    let location = '未知';
    const locationMap: Record<string, string> = {
      '图书馆': '校园图书馆',
      '食堂': '第一食堂',
      '宿舍': '男生宿舍楼',
      '教室': '教学楼A',
      '超市': '校园超市',
      '操场': '运动场',
      '实验室': '理工实验楼',
      '咖啡': '校门口咖啡馆',
    };
    for (const [keyword, loc] of Object.entries(locationMap)) {
      if (action.includes(keyword)) {
        location = loc;
        break;
      }
    }
    if (location === '未知') location = '校园某处';

    // Check if shopping-related
    const isShopping = action.includes('超市') || action.includes('购物') || action.includes('买');

    const event = {
      id: `map-${Date.now()}`,
      timestamp: Date.now(),
      location,
      action: action.trim(),
      linkedShoppingId: isShopping ? 'pending' : undefined,
    };
    dispatch({ type: 'ADD_MAP_EVENT', payload: event });
    setLoading(false);
  }, [state.apiKey, state.aiModel, loading, dispatch]);

  // Auto-generate events periodically (every 30 min equivalent)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = state.mapEvents.filter(e =>
      new Date(e.timestamp).toISOString().slice(0, 10) === today
    ).length;

    // Auto-generate if less than reasonable events for current hour
    const currentHour = new Date().getHours();
    const expectedMin = Math.max(0, Math.floor((currentHour - 6) / 2));
    if (todayCount < expectedMin && state.apiKey) {
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

  return (
    <div className="map-page">
      <div className="page-header">
        <h3 style={{ flex: 1 }}>江浔的地图</h3>
        <button
          className="btn-primary"
          onClick={generateEvent}
          disabled={loading || !state.apiKey}
          style={{ padding: '6px 14px', fontSize: 13 }}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          {loading ? '生成中...' : '刷新动态'}
        </button>
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
