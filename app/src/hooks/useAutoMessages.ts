// Hook that periodically triggers Jiangxun to send the user unprompted messages,
// based on the current time of day and real-time weather.
//
// Design:
//   - Runs a check every 5 minutes.
//   - Respects a cooldown: at most one auto-message every 45 minutes.
//   - Only triggers between 08:00 and 23:30 local time.
//   - Per tick there's a 25% chance of firing once cooldown has elapsed.
//   - If a DeepSeek API key is configured it calls the AI with weather + time
//     context; otherwise it falls back to a small pool of canned lines so the
//     feature still works out of the box.
//   - All generated messages land in the `jiangxun` contact, bump unread, and
//     update the contact preview — this drives the sidebar red dot.

import { useEffect, useRef } from 'react';
import { useApp } from '../store/AppContext';
import type { AppState, ChatMessage } from '../types';
import { callAI, buildJiangxunMessages } from '../services/ai';
import { fetchWeather, weatherMood, type WeatherInfo } from '../services/weather';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_COOLDOWN_MS = 45 * 60 * 1000; // 45 minutes
const TRIGGER_PROBABILITY = 0.25;
const LAST_AUTO_KEY = 'jiangxun-last-auto-msg';

function currentHour() {
  return new Date().getHours();
}

function timeContext(hour: number): string {
  if (hour >= 6 && hour < 9) return '清晨刚起床';
  if (hour >= 9 && hour < 12) return '上午上课或自习';
  if (hour >= 12 && hour < 14) return '午饭或午休';
  if (hour >= 14 && hour < 18) return '下午上课或自习';
  if (hour >= 18 && hour < 20) return '傍晚晚饭';
  if (hour >= 20 && hour < 23) return '晚上自习或放松';
  return '深夜';
}

const CANNED_LINES: string[] = [
  '在忙吗？突然想到你',
  '今天学得怎么样了',
  '刚路过你常去的地方，顺手发你',
  '喝水没有？别光顾着学习',
  '刚刚走神想到你了',
  '*抬头看了眼天空* 你那边天气怎么样',
  '今天的任务还顺利吗',
  '吃饭了吗？别又跳餐',
  '要不要一会儿一起复习？',
  '刚刚在想，你肯定又在学习',
];

function pickCanned(weather: WeatherInfo | null): string {
  const pool = [...CANNED_LINES];
  if (weather) {
    if (weather.code >= 51 && weather.code <= 67) {
      pool.push('外面下雨了，带伞了吗？', '雨天别着凉');
    } else if (weather.code >= 71 && weather.code <= 86) {
      pool.push('下雪了，你知道吗？', '外面冷，多穿点');
    } else if (weather.code === 0 || weather.code === 1) {
      pool.push('今天天气不错，出来走走吗', '阳光很好，别总闷在屋里');
    } else if (weather.code >= 95) {
      pool.push('打雷了，不许害怕，我在呢', '雷雨天别出门');
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function getLastAuto(): number {
  try {
    const v = localStorage.getItem(LAST_AUTO_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

function setLastAuto(ts: number) {
  try {
    localStorage.setItem(LAST_AUTO_KEY, String(ts));
  } catch {
    /* ignore */
  }
}

function makeMessage(content: string, type: ChatMessage['type'] = 'text'): ChatMessage {
  return {
    id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    contactId: 'jiangxun',
    senderId: 'jiangxun',
    senderName: '江浔',
    content,
    type,
    timestamp: Date.now(),
  };
}

export function useAutoMessages() {
  const { state, dispatch } = useApp();
  const stateRef = useRef<AppState>(state);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      const s = stateRef.current;

      // Don't spam: cooldown
      const last = getLastAuto();
      if (Date.now() - last < MIN_COOLDOWN_MS) return;

      // Only during awake hours
      const hour = currentHour();
      if (hour < 8 || hour >= 23) return;

      // Random probability gate
      if (Math.random() > TRIGGER_PROBABILITY) return;

      // Weather context (non-blocking: cached value is fine)
      const weather = await fetchWeather();
      const mood = weatherMood(weather);

      let content: string | null = null;

      // If API key present, try the model first, else fall back.
      if (s.apiKey) {
        const history = (s.messages['jiangxun'] || []).slice(-15).map((m) => ({
          role: (m.senderId === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content,
        }));
        const extra =
          `[此刻是你主动给京京发消息的场景。现在是${hour}点，时段是"${timeContext(hour)}"，` +
          `南京天气${mood}${weather ? `（${weather.tempC}°C，${weather.label}）` : ''}。` +
          `请自然地发一两句简短的消息给她，像朋友间突然想到就发的那种，不要过长，不要说教。]`;

        try {
          const reply = await callAI(
            s.apiKey,
            s.aiModel,
            buildJiangxunMessages(history, s.relationshipStatus, extra),
          );
          if (reply && !reply.startsWith('[')) {
            // Take only the first 120 chars to keep auto-messages short
            content = reply.trim().slice(0, 200);
          }
        } catch {
          /* fall through to canned */
        }
      }

      if (!content) {
        content = pickCanned(weather);
      }

      if (cancelled) return;

      // Parse * action markers (like ChatRoom does)
      const parts = content.split(/(\*[^*]+\*)/g).filter((p) => p.trim().length > 0);
      for (const part of parts) {
        if (part.startsWith('*') && part.endsWith('*')) {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: makeMessage(part.slice(1, -1), 'action'),
          });
        } else {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: makeMessage(part.trim(), 'text'),
          });
        }
      }

      // Update contact preview + unread
      const preview = parts[parts.length - 1]?.replace(/^\*|\*$/g, '') || content;
      const contact = s.contacts.find((c) => c.id === 'jiangxun');
      dispatch({
        type: 'UPDATE_CONTACT',
        payload: {
          id: 'jiangxun',
          updates: {
            lastMessage: preview.slice(0, 30),
            lastMessageTime: Date.now(),
            unread: (contact?.unread || 0) + 1,
          },
        },
      });

      setLastAuto(Date.now());
    }

    // Kick off one check shortly after mount so the user sees it within the
    // first few minutes, then continue on a normal cadence.
    const initial = setTimeout(tick, 90 * 1000);
    const id = setInterval(tick, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(id);
    };
    // We intentionally keep this effect to mount-only; fresh state is read via
    // the ref above. Restarting the interval on every state change would be
    // both wasteful and could cause double-fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
