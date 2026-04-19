import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { fetchWeather, type WeatherInfo } from '../../services/weather';
import './StatusBar.css';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDate(d: Date) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const wd = WEEKDAYS[d.getDay()];
  return `${m.toString().padStart(2, '0')}月${day.toString().padStart(2, '0')}日 星期${wd}`;
}

function formatTime(d: Date) {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function StatusBar() {
  const { state, dispatch } = useApp();
  const [now, setNow] = useState<Date>(new Date());
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  // Tick every second so the minute rolls over accurately
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch weather on mount and every 20 minutes
  useEffect(() => {
    let mounted = true;
    async function run() {
      const w = await fetchWeather();
      if (mounted && w) setWeather(w);
    }
    run();
    const id = setInterval(run, 20 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const isMobileDrawerClosed =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 768px)').matches &&
    !state.sidebarExpanded;

  return (
    <div className="status-bar">
      {isMobileDrawerClosed && (
        <button
          className="status-menu-btn"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          title="打开菜单"
          aria-label="打开侧边栏"
        >
          <Menu size={18} />
        </button>
      )}
      <div className="status-date">{formatDate(now)}</div>
      <div className="status-time">{formatTime(now)}</div>
      <div className="status-weather">
        {weather ? (
          <>
            <span className="weather-emoji">{weather.emoji}</span>
            <span className="weather-text">南京 {weather.tempC}° {weather.label}</span>
          </>
        ) : (
          <span className="weather-text muted">南京 --°</span>
        )}
      </div>
    </div>
  );
}
