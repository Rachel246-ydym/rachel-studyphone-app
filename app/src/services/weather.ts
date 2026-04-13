// Real-time weather service for 南京玄武区 via Open-Meteo (no API key required)
// Docs: https://open-meteo.com/en/docs

const NANJING_XUANWU_LAT = 32.0833;
const NANJING_XUANWU_LON = 118.7969;

export interface WeatherInfo {
  tempC: number;
  code: number;
  label: string; // Chinese description
  emoji: string;
  isDay: boolean;
  fetchedAt: number;
}

const CACHE_KEY = 'weather-cache-v1';
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes

// WMO weather codes -> Chinese + emoji
function describeWeatherCode(code: number, isDay: boolean): { label: string; emoji: string } {
  if (code === 0) return { label: '晴', emoji: isDay ? '☀️' : '🌙' };
  if (code === 1) return { label: '晴间多云', emoji: isDay ? '🌤️' : '🌙' };
  if (code === 2) return { label: '多云', emoji: '⛅' };
  if (code === 3) return { label: '阴', emoji: '☁️' };
  if (code === 45 || code === 48) return { label: '雾', emoji: '🌫️' };
  if (code === 51 || code === 53 || code === 55) return { label: '毛毛雨', emoji: '🌦️' };
  if (code === 56 || code === 57) return { label: '冻雨', emoji: '🌧️' };
  if (code === 61) return { label: '小雨', emoji: '🌦️' };
  if (code === 63) return { label: '中雨', emoji: '🌧️' };
  if (code === 65) return { label: '大雨', emoji: '🌧️' };
  if (code === 66 || code === 67) return { label: '冻雨', emoji: '🌧️' };
  if (code === 71) return { label: '小雪', emoji: '🌨️' };
  if (code === 73) return { label: '中雪', emoji: '❄️' };
  if (code === 75) return { label: '大雪', emoji: '❄️' };
  if (code === 77) return { label: '雪粒', emoji: '🌨️' };
  if (code === 80 || code === 81 || code === 82) return { label: '阵雨', emoji: '🌦️' };
  if (code === 85 || code === 86) return { label: '阵雪', emoji: '🌨️' };
  if (code === 95) return { label: '雷阵雨', emoji: '⛈️' };
  if (code === 96 || code === 99) return { label: '雷暴冰雹', emoji: '⛈️' };
  return { label: '未知', emoji: '🌡️' };
}

export async function fetchWeather(): Promise<WeatherInfo | null> {
  // Try cache first
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as WeatherInfo;
      if (Date.now() - cached.fetchedAt < CACHE_TTL) return cached;
    }
  } catch {
    // ignore parse errors, fall through to refetch
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${NANJING_XUANWU_LAT}&longitude=${NANJING_XUANWU_LON}&current=temperature_2m,weather_code,is_day&timezone=Asia%2FShanghai`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const cur = data.current;
    if (!cur) return null;
    const code: number = cur.weather_code;
    const isDay: boolean = cur.is_day === 1;
    const { label, emoji } = describeWeatherCode(code, isDay);
    const info: WeatherInfo = {
      tempC: Math.round(cur.temperature_2m),
      code,
      label,
      emoji,
      isDay,
      fetchedAt: Date.now(),
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(info));
    } catch {
      // storage full; not fatal
    }
    return info;
  } catch (e) {
    console.warn('weather fetch failed', e);
    return null;
  }
}

// Categorize weather into a mood bucket for AI prompts
export function weatherMood(info: WeatherInfo | null): string {
  if (!info) return '普通';
  if ([0, 1].includes(info.code)) return '阳光明媚';
  if ([2, 3].includes(info.code)) return '多云或阴天';
  if (info.code >= 45 && info.code <= 48) return '雾蒙蒙';
  if (info.code >= 51 && info.code <= 67) return '下雨';
  if (info.code >= 71 && info.code <= 86) return '下雪';
  if (info.code >= 95) return '雷雨';
  return '普通';
}
