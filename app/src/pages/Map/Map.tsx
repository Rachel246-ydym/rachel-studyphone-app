import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../store/AppContext';
import {
  callAI,
  buildJiangxunMessages,
  buildLandmarkReactionPrompt,
  buildMapEventPrompt,
} from '../../services/ai';
import {
  MAP_LANDMARKS,
  JINGJING_LOCATIONS,
  JIANGXUN_LOCATION_COORDS,
} from '../../utils/prompts';
import type { MapLandmark, ChatMessage } from '../../types';
import { RefreshCw } from 'lucide-react';
import './Map.css';

const CATEGORY_LABELS: Record<string, string> = {
  cafe: '咖啡馆',
  restaurant: '餐厅',
  bookstore: '书店',
  park: '公园',
  historical: '历史建筑',
  shop: '商店',
  campus: '校园',
};

function getJingjingLocation(hour: number): { x: number; y: number; label: string } {
  if (hour >= 23 || hour < 7) return JINGJING_LOCATIONS.sleep;
  if (hour === 7)              return JINGJING_LOCATIONS.breakfast;
  if (hour >= 8 && hour < 12) return JINGJING_LOCATIONS.class;
  if (hour === 12)             return JINGJING_LOCATIONS.lunch;
  if (hour === 13)             return JINGJING_LOCATIONS.nap;
  if (hour >= 14 && hour < 18) return JINGJING_LOCATIONS.study;
  if (hour === 18)             return JINGJING_LOCATIONS.dinner;
  if (hour >= 19 && hour < 22) return JINGJING_LOCATIONS.evening;
  return JINGJING_LOCATIONS.back;
}

function getJiangxunCoords(eventText: string): { x: number; y: number } {
  for (const [keyword, coords] of Object.entries(JIANGXUN_LOCATION_COORDS)) {
    if (eventText.includes(keyword)) return coords;
  }
  return { x: 400, y: 500 };
}

function calcDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): string {
  const px = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  const meters = Math.round(px * 2);
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function matchLandmarkName(text: string): string {
  const FALLBACKS: [string, string][] = [
    ['食堂', '食堂'], ['饭', '食堂'], ['餐', '食堂'],
    ['教室', '教学楼'], ['上课', '教学楼'], ['教学', '教学楼'],
    ['图书', '图书馆'], ['自习', '图书馆'],
    ['咖啡', '咖啡馆'], ['奶茶', '咖啡馆'],
    ['篮球', '操场'], ['打球', '操场'], ['跑步', '操场'], ['运动', '操场'], ['操场', '操场'],
    ['健身', '健身房'],
    ['便利', '超市'], ['买东西', '超市'],
    ['宿舍', '宿舍'], ['公寓', '宿舍'], ['回去', '宿舍'], ['回家', '宿舍'],
  ];
  for (const [kw, name] of FALLBACKS) {
    if (text.includes(kw)) return name;
  }
  return '校园';
}

// Static tree dot positions for the SVG background
const TREE_DOTS: [number, number, number][] = [
  [50, 100, 4], [90, 80, 5], [122, 108, 4], [70, 152, 5], [115, 65, 3],
  [730, 82, 4], [760, 120, 5], [750, 62, 3],
  [58, 282, 5], [62, 452, 4], [67, 562, 5],
  [745, 382, 4], [755, 482, 5], [742, 562, 4],
  [122, 862, 5], [162, 882, 4], [202, 902, 5], [552, 872, 4], [602, 892, 5],
  [745, 462, 4], [760, 542, 5], [748, 612, 4],
  [132, 482, 5], [172, 532, 4], [202, 492, 5],
  [242, 602, 4], [237, 662, 5], [247, 722, 4],
  [232, 272, 5], [262, 292, 4], [292, 312, 5], [312, 332, 4],
  [460, 180, 4], [480, 155, 5], [505, 170, 3],
  [100, 760, 4], [80, 800, 5],
];

export default function Map() {
  const { state, dispatch } = useApp();
  const [scale, setScale] = useState(0.47);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedLandmark, setSelectedLandmark] = useState<MapLandmark | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const lastPinchDist = useRef<number | null>(null);

  // Refresh positions every minute
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const currentHour = new Date().getHours();
  const jingjingPos = getJingjingLocation(currentHour);

  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = state.mapEvents
    .filter(e => new Date(e.timestamp).toISOString().slice(0, 10) === today)
    .sort((a, b) => a.timestamp - b.timestamp);
  const lastEvent = todayEvents[todayEvents.length - 1];
  const jiangxunPos = getJiangxunCoords(lastEvent?.action ?? '');
  const distance = calcDistance(jingjingPos, jiangxunPos);
  const jiangxunStatus = lastEvent ? lastEvent.action.slice(0, 10) : '在校园某处';

  // --- Generate new map event for Jiangxun ---
  const generateEvent = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    let actionText = '';
    if (state.apiKey) {
      const prompt = buildMapEventPrompt(currentHour);
      actionText = await callAI(state.apiKey, state.aiModel, [{ role: 'system', content: prompt }]);
    }
    if (!actionText || actionText.startsWith('[')) {
      const fallbacks = ['到达了图书馆', '在食堂吃饭', '回到了宿舍', '去了操场', '在教学楼上课'];
      actionText = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    const locationName = matchLandmarkName(actionText);
    const now = Date.now();
    if (lastEvent?.action?.includes('到达')) {
      const prevLoc = matchLandmarkName(lastEvent.action);
      if (prevLoc !== locationName) {
        dispatch({
          type: 'ADD_MAP_EVENT',
          payload: { id: `map-leave-${now}`, timestamp: now, location: prevLoc, action: `离开${prevLoc}` },
        });
      }
    }
    dispatch({
      type: 'ADD_MAP_EVENT',
      payload: { id: `map-arrive-${now + 1}`, timestamp: now + 1, location: locationName, action: actionText },
    });
    setLoading(false);
  }, [loading, state.apiKey, state.aiModel, currentHour, lastEvent, dispatch]);

  // --- Mouse drag ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.map-landmark-marker, .map-char-marker')) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.preventDefault();
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y,
    });
  };
  const handleMouseUp = () => {
    isDragging.current = false;
    dragStart.current = null;
  };

  // --- Touch drag + pinch zoom ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.map-landmark-marker, .map-char-marker')) return;
    if (e.touches.length === 1) {
      isDragging.current = true;
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: offset.x, oy: offset.y };
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current && dragStart.current) {
      setOffset({
        x: dragStart.current.ox + e.touches[0].clientX - dragStart.current.x,
        y: dragStart.current.oy + e.touches[0].clientY - dragStart.current.y,
      });
    } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      setScale(s => Math.max(0.3, Math.min(2.0, s * (dist / lastPinchDist.current!))));
      lastPinchDist.current = dist;
    }
  };
  const handleTouchEnd = () => {
    isDragging.current = false;
    dragStart.current = null;
    lastPinchDist.current = null;
  };

  // --- "Go together" action ---
  const handleGoTogether = async (landmark: MapLandmark) => {
    setSelectedLandmark(null);

    const userMsg: ChatMessage = {
      id: `map-invite-${Date.now()}`,
      contactId: 'jiangxun',
      senderId: 'user',
      senderName: state.userProfile.name || '京京',
      content: `我想去${landmark.name}，一起吗？`,
      timestamp: Date.now(),
      type: 'text',
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_STATE', payload: { pendingOpenContactId: 'jiangxun' } });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: 'wechat' });

    if (state.apiKey) {
      const chatHistory = (state.messages['jiangxun'] ?? []).slice(-12).map(m => ({
        role: m.senderId === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));
      const extraPrompt = buildLandmarkReactionPrompt(landmark);
      const msgs = buildJiangxunMessages(chatHistory, state.relationshipStatus, extraPrompt, state.memories);
      const reply = await callAI(state.apiKey, state.aiModel, msgs);
      if (!reply.startsWith('[')) {
        const aiMsg: ChatMessage = {
          id: `map-ai-${Date.now()}`,
          contactId: 'jiangxun',
          senderId: 'jiangxun',
          senderName: '江浔',
          content: reply.slice(0, 120),
          timestamp: Date.now() + 500,
          type: 'text',
        };
        dispatch({ type: 'ADD_MESSAGE', payload: aiMsg });
        dispatch({
          type: 'UPDATE_CONTACT',
          payload: { id: 'jiangxun', updates: { lastMessage: reply.slice(0, 40), lastMessageTime: Date.now() + 500 } },
        });
      }
    }
  };

  // Connecting line midpoint
  const midX = (jingjingPos.x + jiangxunPos.x) / 2;
  const midY = (jingjingPos.y + jiangxunPos.y) / 2;

  return (
    <div className="map-page">
      {/* Top status bar */}
      <div className="map-status-bar">
        <div className="map-status-left">
          <span className="map-status-pin">📍</span>
          <div>
            <div className="map-status-place">{jingjingPos.label}</div>
            <div className="map-status-sub">京京当前位置</div>
          </div>
        </div>
        <div className="map-status-right">
          <div className="map-distance-label">距江浔 约{distance}</div>
          <button
            className="map-refresh-btn"
            onClick={generateEvent}
            disabled={loading}
            title="刷新江浔位置"
          >
            <RefreshCw size={14} className={loading ? 'map-spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Map canvas */}
      <div
        ref={containerRef}
        className="map-canvas-wrap"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="map-canvas"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          {/* Background campus SVG */}
          <svg
            width="800"
            height="1000"
            className="map-bg-svg"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="800" height="1000" fill="#F5F0E8" />
            {/* Campus boundary */}
            <rect x="30" y="30" width="740" height="940" fill="none" stroke="#DDD5C5" strokeWidth="2" rx="20" />

            {/* Lake */}
            <ellipse cx="158" cy="330" rx="78" ry="95" fill="#C8DDE8" opacity="0.8" />
            <ellipse cx="158" cy="330" rx="66" ry="80" fill="#D8EAF2" opacity="0.5" />
            <text x="158" y="335" textAnchor="middle" fill="#6A9BB0" fontSize="12" fontFamily="sans-serif">梧桐湖</text>

            {/* E-W main road */}
            <rect x="40" y="390" width="720" height="20" fill="#E0D8CA" />
            <line x1="40" y1="400" x2="760" y2="400" stroke="#D0C8B8" strokeWidth="1" strokeDasharray="12 6" />

            {/* N-S main road */}
            <rect x="390" y="40" width="20" height="920" fill="#E0D8CA" />
            <line x1="400" y1="40" x2="400" y2="960" stroke="#D0C8B8" strokeWidth="1" strokeDasharray="12 6" />

            {/* NW diagonal road (林荫道) */}
            <path d="M 238 222 Q 310 305 390 390" fill="none" stroke="#E0D8CA" strokeWidth="16" strokeLinecap="round" />

            {/* SE connecting road */}
            <path d="M 412 612 Q 482 658 580 718" fill="none" stroke="#E0D8CA" strokeWidth="14" strokeLinecap="round" />

            {/* Building zones */}
            <rect x="140" y="68" width="162" height="150" fill="#EDE8DE" rx="8" />
            <text x="221" y="150" textAnchor="middle" fill="#9A917E" fontSize="13" fontFamily="sans-serif" fontWeight="500">宿舍区</text>

            <rect x="578" y="68" width="152" height="140" fill="#EDE8DE" rx="8" />
            <text x="654" y="142" textAnchor="middle" fill="#9A917E" fontSize="13" fontFamily="sans-serif" fontWeight="500">公寓区</text>

            <rect x="325" y="238" width="152" height="102" fill="#EDE8DE" rx="8" />
            <text x="401" y="295" textAnchor="middle" fill="#9A917E" fontSize="13" fontFamily="sans-serif" fontWeight="500">餐饮区</text>

            <rect x="438" y="358" width="172" height="132" fill="#E8E4DC" rx="8" />
            <text x="524" y="430" textAnchor="middle" fill="#9A917E" fontSize="13" fontFamily="sans-serif" fontWeight="500">教学区</text>

            <rect x="268" y="528" width="152" height="130" fill="#E3EAE0" rx="8" />
            <text x="344" y="600" textAnchor="middle" fill="#7A8A78" fontSize="13" fontFamily="sans-serif" fontWeight="500">图书馆</text>

            <rect x="558" y="448" width="172" height="142" fill="#EDE5DA" rx="8" />
            <text x="644" y="526" textAnchor="middle" fill="#9A917E" fontSize="13" fontFamily="sans-serif" fontWeight="500">运动区</text>

            <rect x="348" y="798" width="108" height="68" fill="#E8E4DC" rx="8" />
            <text x="402" y="838" textAnchor="middle" fill="#9A917E" fontSize="12" fontFamily="sans-serif">校门</text>

            {/* Trees */}
            {TREE_DOTS.map(([tx, ty, r], i) => (
              <circle key={i} cx={tx} cy={ty} r={r} fill="#8BB88A" opacity="0.62" />
            ))}
          </svg>

          {/* Connection line + distance badge SVG */}
          <svg width="800" height="1000" className="map-overlay-svg">
            <line
              x1={jingjingPos.x}
              y1={jingjingPos.y}
              x2={jiangxunPos.x}
              y2={jiangxunPos.y}
              stroke="#5B8DEF"
              strokeWidth="2.5"
              strokeDasharray="8 4"
              strokeLinecap="round"
            />
          </svg>

          {/* Distance badge at line midpoint */}
          <div
            className="map-dist-badge"
            style={{ left: midX, top: midY }}
          >
            约{distance}
          </div>

          {/* Landmark markers */}
          {MAP_LANDMARKS.map(lm => (
            <button
              key={lm.id}
              className="map-landmark-marker"
              style={{ left: lm.position.x, top: lm.position.y }}
              onClick={() => setSelectedLandmark(lm)}
            >
              <span className="lm-emoji">{lm.emoji}</span>
              <span className="lm-name">{lm.name}</span>
            </button>
          ))}

          {/* Jingjing character marker */}
          <div
            className="map-char-marker"
            style={{ left: jingjingPos.x, top: jingjingPos.y }}
          >
            <div className="char-bubble char-bubble-jj">👧</div>
            <div className="char-label">京京</div>
          </div>

          {/* Jiangxun character marker */}
          <div
            className="map-char-marker"
            style={{ left: jiangxunPos.x, top: jiangxunPos.y }}
          >
            <div className="char-bubble char-bubble-jx">🧑</div>
            <div className="char-label">江浔</div>
            <div className="char-status-popup">{jiangxunStatus}</div>
          </div>
        </div>
      </div>

      {/* Landmark detail card */}
      {selectedLandmark && (
        <div className="lm-overlay" onClick={() => setSelectedLandmark(null)}>
          <div className="lm-card" onClick={e => e.stopPropagation()}>
            <div className="lm-card-handle" />

            <div className="lm-card-header">
              <div className="lm-card-title-row">
                <span className="lm-card-emoji">{selectedLandmark.emoji}</span>
                <span className="lm-card-name">{selectedLandmark.name}</span>
              </div>
              <div className="lm-card-rating">★ {selectedLandmark.rating}</div>
            </div>

            <div className="lm-card-meta">
              {CATEGORY_LABELS[selectedLandmark.category]} · {selectedLandmark.hours}
            </div>

            <div className="lm-card-tags">
              {selectedLandmark.tags.map(tag => (
                <span key={tag} className="lm-tag">{tag}</span>
              ))}
            </div>

            <div className="lm-card-desc">{selectedLandmark.description}</div>

            <div className="lm-reviews-title">📝 评价</div>
            <div className="lm-reviews">
              {selectedLandmark.reviews.map((rv, i) => (
                <div key={i} className="lm-review">
                  <div className="lm-review-header">
                    <span className="lm-review-author">{rv.author}</span>
                    <span className="lm-review-stars">
                      {'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}
                    </span>
                    <span className="lm-review-date">{rv.date}</span>
                  </div>
                  <div className="lm-review-content">{rv.content}</div>
                </div>
              ))}
            </div>

            <div className="lm-card-actions">
              <button
                className="lm-go-btn"
                onClick={() => handleGoTogether(selectedLandmark)}
              >
                🚶 和江浔一起去
              </button>
              <button
                className="lm-close-btn"
                onClick={() => setSelectedLandmark(null)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
