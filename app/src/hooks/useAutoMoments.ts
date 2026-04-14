// Periodically lets Jiangxun post to Moments on his own and lets custom
// characters proactively message the user and react to posts in Moments.
//
// Cadence:
//   - Check every 10 minutes.
//   - Jiangxun posts at most once every 1-7 hours (random window).
//   - Each custom character has its own cooldown (~ 2-6 hours) before it may
//     proactively DM the user.
//   - Each new Moment has a chance to receive likes/comments from Jiangxun and
//     any active custom characters.

import { useEffect, useRef } from 'react';
import { useApp } from '../store/AppContext';
import type { AppState, MomentsPost, ChatMessage, MomentsComment, VirtualSpaceEntry } from '../types';
import { callAI, buildJiangxunMessages, buildCharacterMessages } from '../services/ai';
import { fetchWeather, weatherMood } from '../services/weather';

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

const JIANGXUN_POST_KEY = 'jiangxun-last-post';
const JIANGXUN_VS_KEY = 'jiangxun-last-vs';
const JX_VS_CANNED = [
  '今天的晚风很轻，像小时候被揉过的头发',
  '在自习室待了一下午，抬头发现已经黄昏',
  '路过樱花树下，想起你说过喜欢',
  '翻到了旧笔记本，中间夹着一张你写的便签',
  '看了一小时云，什么都没想，却又好像想了很多',
];
const CHAR_LAST_MSG_PREFIX = 'char-last-msg-';
const CHAR_LAST_REACT_PREFIX = 'char-last-react-';

function readTs(key: string): number {
  try { return Number(localStorage.getItem(key) || 0); } catch { return 0; }
}
function writeTs(key: string, ts: number) {
  try { localStorage.setItem(key, String(ts)); } catch { /* ignore */ }
}

const JX_CANNED_POSTS = [
  '自习室的灯太亮了，有点刺眼',
  '*把外套搭在椅背上* 今天的风比昨天冷',
  '今天的云拍下来像棉花糖',
  '咖啡又点错了，不甜',
  '在图书馆四楼，这里很安静',
  '翻到一页很旧的书，莫名有点想笑',
  '路过小花坛，三月的风很慢',
  '写完一道题站起来走了两圈',
];

const JX_LIKE_COMMENTS = ['嗯', '看到了', '*路过点赞*', '好', '收到', '我也觉得'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useAutoMoments() {
  const { state, dispatch } = useApp();
  const stateRef = useRef<AppState>(state);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      const s = stateRef.current;
      const now = Date.now();
      const hour = new Date().getHours();

      // ===== 1. Jiangxun Moments auto-post =====
      const lastPost = readTs(JIANGXUN_POST_KEY);
      const gap = 60 * 60 * 1000 + Math.floor(Math.random() * 6 * 60 * 60 * 1000); // 1-7h
      if (hour >= 8 && hour < 23 && now - lastPost > gap) {
        // Try AI first
        let content: string | null = null;
        if (s.apiKey) {
          try {
            const weather = await fetchWeather();
            const mood = weatherMood(weather);
            const extra =
              `[你此刻要发一条朋友圈（不是发给京京的私聊，是公开的朋友圈动态）。` +
              `现在${hour}点，南京天气${mood}${weather ? `（${weather.tempC}°C）` : ''}。` +
              `写一条符合你性格的短动态，20字以内，不要@任何人，不要说教，像真实的朋友圈。]`;
            const reply = await callAI(
              s.apiKey,
              s.aiModel,
              buildJiangxunMessages([], s.relationshipStatus, extra, s.memories),
            );
            if (reply && !reply.startsWith('[')) content = reply.trim().slice(0, 120);
          } catch { /* ignore */ }
        }
        if (!content) content = pick(JX_CANNED_POSTS);

        const post: MomentsPost = {
          id: `moment-jx-${now}`,
          authorId: 'jiangxun',
          authorName: s.jiangxunProfile.name || '江浔',
          authorAvatar: s.jiangxunProfile.avatar || '',
          content,
          timestamp: now,
          likes: [],
          comments: [],
        };
        dispatch({ type: 'ADD_MOMENT', payload: post });
        writeTs(JIANGXUN_POST_KEY, now);
      }

      // ===== 1b. Jiangxun virtual-space memo (1-2 per day) =====
      const lastVs = readTs(JIANGXUN_VS_KEY);
      const sinceLast = now - lastVs;
      // Target: 12-20 hour gap so we get ~1-2 per day naturally
      if (hour >= 9 && hour < 23 && sinceLast > (12 + Math.random() * 8) * 60 * 60 * 1000) {
        let content: string | null = null;
        if (s.apiKey) {
          try {
            const extra =
              `[此刻你在空间里写一条只给京京一个人看的小短句（不超过20字），` +
              `像QQ情侣空间那种随手记录心情。不要@，不要说教，不要emoji堆砌。]`;
            const reply = await callAI(
              s.apiKey,
              s.aiModel,
              buildJiangxunMessages([], s.relationshipStatus, extra, s.memories),
            );
            if (reply && !reply.startsWith('[')) content = reply.trim().slice(0, 80);
          } catch { /* ignore */ }
        }
        if (!content) content = pick(JX_VS_CANNED);

        const entry: VirtualSpaceEntry = {
          id: `vs-jx-${now}`,
          date: new Date().toISOString().slice(0, 10),
          authorId: 'jiangxun',
          content,
          timestamp: now,
        };
        dispatch({ type: 'ADD_VS_ENTRY', payload: entry });
        writeTs(JIANGXUN_VS_KEY, now);
      }

      // ===== 2. Custom character proactive chats =====
      for (const char of s.characters) {
        const key = CHAR_LAST_MSG_PREFIX + char.id;
        const last = readTs(key);
        const charGap = 2 * 60 * 60 * 1000 + Math.floor(Math.random() * 4 * 60 * 60 * 1000);
        if (now - last < charGap) continue;
        if (hour < 9 || hour >= 23) continue;
        if (Math.random() > 0.2) continue;

        const contact = s.contacts.find(c => c.characterId === char.id);
        if (!contact) continue;

        let content: string | null = null;
        if (s.apiKey) {
          try {
            const history = (s.messages[contact.id] || []).slice(-10).map(m => ({
              role: (m.senderId === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
              content: m.content,
            }));
            const extra = `[此刻你主动发消息给对方，就说一两句话，像突然想到就发的那种，不要说教。]`;
            const reply = await callAI(
              s.apiKey,
              s.aiModel,
              buildCharacterMessages(char, [...history, { role: 'user', content: extra }], undefined, s.memories),
            );
            if (reply && !reply.startsWith('[')) content = reply.trim().slice(0, 200);
          } catch { /* ignore */ }
        }
        if (!content) content = `${char.name[0] || '我'}在想你`;

        const msg: ChatMessage = {
          id: `auto-char-${char.id}-${now}`,
          contactId: contact.id,
          senderId: char.id,
          senderName: char.name,
          content,
          type: 'text',
          timestamp: now,
        };
        dispatch({ type: 'ADD_MESSAGE', payload: msg });
        dispatch({
          type: 'UPDATE_CONTACT',
          payload: {
            id: contact.id,
            updates: {
              lastMessage: content.slice(0, 30),
              lastMessageTime: now,
              unread: (contact.unread || 0) + 1,
            },
          },
        });
        writeTs(key, now);
        break; // one character per tick
      }

      // ===== 3. Random likes/comments on recent user moments =====
      const recentUserMoments = s.moments
        .filter(m => m.authorId === 'user' && now - m.timestamp < 12 * 60 * 60 * 1000);
      for (const mm of recentUserMoments) {
        // Jiangxun reacts
        if (!mm.likes.includes('jiangxun') && Math.random() < 0.5) {
          dispatch({
            type: 'UPDATE_MOMENT',
            payload: {
              id: mm.id,
              updates: {
                likes: [...mm.likes, 'jiangxun'],
                ...(Math.random() < 0.4
                  ? {
                      comments: [
                        ...mm.comments,
                        {
                          id: `c-jx-${now}-${mm.id}`,
                          authorId: 'jiangxun',
                          authorName: s.jiangxunProfile.name || '江浔',
                          content: pick(JX_LIKE_COMMENTS),
                          timestamp: now,
                        } as MomentsComment,
                      ],
                    }
                  : {}),
              },
            },
          });
        }
        // Each custom character may react too
        for (const char of s.characters) {
          const rkey = CHAR_LAST_REACT_PREFIX + char.id + '-' + mm.id;
          if (readTs(rkey)) continue;
          if (Math.random() < 0.25) {
            const already = mm.likes.includes(char.id);
            dispatch({
              type: 'UPDATE_MOMENT',
              payload: {
                id: mm.id,
                updates: {
                  likes: already ? mm.likes : [...mm.likes, char.id],
                },
              },
            });
            writeTs(rkey, now);
          }
        }
      }
    }

    const initial = setTimeout(tick, 120 * 1000);
    const id = setInterval(tick, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
