// Periodically lets Jiangxun post to Moments on his own and lets custom
// characters proactively message the user and react to posts in Moments.
//
// Cadence:
//   - Check every 10 minutes.
//   - Jiangxun posts at most once every 1-7 hours (random window).
//   - Jiangxun sends a message to the private group every 2-4 hours.
//   - Jiangxun occasionally DMs a character's contact thread (4-8h, 15%).
//   - Each custom character has its own cooldown (~ 2-6 hours) before it may
//     proactively DM the user.
//   - Each character may post a Moment every 3-8 hours (30% chance).
//   - All actors react (like + optional comment) to recent moments.

import { useEffect, useRef } from 'react';
import { useApp } from '../store/AppContext';
import type { AppState, MomentsPost, ChatMessage, MomentsComment, VirtualSpaceEntry } from '../types';
import { callAI, buildJiangxunMessages, buildCharacterMessages } from '../services/ai';
import { fetchWeather, weatherMood } from '../services/weather';

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

const JIANGXUN_POST_KEY  = 'jiangxun-last-post';
const JIANGXUN_VS_KEY    = 'jiangxun-last-vs';
const JX_GROUP_KEY       = 'jx-group-last-msg';
const CHAR_LAST_MSG_PREFIX   = 'char-last-msg-';
const CHAR_LAST_POST_PREFIX  = 'char-last-post-';
const CHAR_LAST_REACT_PREFIX = 'char-last-react-';
const JX_CHAR_DM_PREFIX      = 'jx-char-dm-';

const JX_VS_CANNED = [
  '今天的晚风很轻，像小时候被揉过的头发',
  '在自习室待了一下午，抬头发现已经黄昏',
  '路过樱花树下，想起你说过喜欢',
  '翻到了旧笔记本，中间夹着一张你写的便签',
  '看了一小时云，什么都没想，却又好像想了很多',
];

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
const JX_GROUP_MSGS = [
  '今天课不多，下午去图书馆',
  '食堂的饭越来越难吃了',
  '最近忙，但还好',
  '*发了一段语音* 算了还是打字吧',
  '这周天气怪，冷暖不定',
  '刚跑完步，现在挺舒服',
];
const CHAR_CANNED_COMMENTS = ['嗯', '好', '有意思', '哈哈', '真的', '同感', '确实', '不错'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function readTs(key: string): number {
  try { return Number(localStorage.getItem(key) || 0); } catch { return 0; }
}
function writeTs(key: string, ts: number) {
  try { localStorage.setItem(key, String(ts)); } catch { /* ignore */ }
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

      // ===== 0. One-time setup: ensure jx-private-group exists =====
      if (!s.contacts.find(c => c.id === 'jx-private-group')) {
        dispatch({
          type: 'ADD_CONTACT',
          payload: {
            id: 'jx-private-group',
            type: 'group',
            name: '浔和朋友们',
            avatar: '',
            members: ['jiangxun'],
            createdBy: 'jiangxun',
            lastMessage: '🔒 密码：0921',
            lastMessageTime: now,
            unread: 0,
            passwordProtected: true,
            password: '0921',
          },
        });
      }

      // ===== 1. Jiangxun Moments auto-post =====
      const lastPost = readTs(JIANGXUN_POST_KEY);
      const gap = 60 * 60 * 1000 + Math.floor(Math.random() * 6 * 60 * 60 * 1000); // 1-7h
      if (hour >= 8 && hour < 23 && now - lastPost > gap) {
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
              s.apiKey, s.aiModel,
              buildJiangxunMessages([], s.relationshipStatus, extra, s.memories),
            );
            if (reply && !reply.startsWith('[')) content = reply.trim().slice(0, 120);
          } catch { /* ignore */ }
        }
        if (!content) content = pick(JX_CANNED_POSTS);

        dispatch({
          type: 'ADD_MOMENT',
          payload: {
            id: `moment-jx-${now}`,
            authorId: 'jiangxun',
            authorName: s.jiangxunProfile.name || '江浔',
            authorAvatar: s.jiangxunProfile.avatar || '',
            content,
            timestamp: now,
            likes: [],
            comments: [],
          } as MomentsPost,
        });
        writeTs(JIANGXUN_POST_KEY, now);
      }

      // ===== 1b. Jiangxun virtual-space memo =====
      const lastVs = readTs(JIANGXUN_VS_KEY);
      if (hour >= 9 && hour < 23 && now - lastVs > (12 + Math.random() * 8) * 60 * 60 * 1000) {
        let content: string | null = null;
        if (s.apiKey) {
          try {
            const extra =
              `[此刻你在空间里写一条只给京京一个人看的小短句（不超过20字），` +
              `像QQ情侣空间那种随手记录心情。不要@，不要说教，不要emoji堆砌。]`;
            const reply = await callAI(
              s.apiKey, s.aiModel,
              buildJiangxunMessages([], s.relationshipStatus, extra, s.memories),
            );
            if (reply && !reply.startsWith('[')) content = reply.trim().slice(0, 80);
          } catch { /* ignore */ }
        }
        if (!content) content = pick(JX_VS_CANNED);

        dispatch({
          type: 'ADD_VS_ENTRY',
          payload: {
            id: `vs-jx-${now}`,
            date: new Date().toISOString().slice(0, 10),
            authorId: 'jiangxun',
            content,
            timestamp: now,
          } as VirtualSpaceEntry,
        });
        writeTs(JIANGXUN_VS_KEY, now);
      }

      // ===== 1c. Jiangxun private group messages =====
      const lastGroupMsg = readTs(JX_GROUP_KEY);
      const groupGap = 2 * 60 * 60 * 1000 + Math.random() * 2 * 60 * 60 * 1000; // 2-4h
      if (hour >= 9 && hour < 23 && now - lastGroupMsg > groupGap) {
        // Jiangxun sends something in the group
        let jxGroupContent: string | null = null;
        if (s.apiKey) {
          try {
            const recentMsgs = (s.messages['jx-private-group'] || []).slice(-8).map(m => ({
              role: (m.senderId === 'jiangxun' ? 'assistant' : 'user') as 'user' | 'assistant',
              content: m.content,
            }));
            const extra = '[你在和朋友的群聊里随便发几句，简短自然，不涉及京京。]';
            const reply = await callAI(
              s.apiKey, s.aiModel,
              buildJiangxunMessages(recentMsgs, s.relationshipStatus, extra, s.memories),
            );
            if (reply && !reply.startsWith('[')) jxGroupContent = reply.trim().slice(0, 100);
          } catch { /* ignore */ }
        }
        if (!jxGroupContent) jxGroupContent = pick(JX_GROUP_MSGS);

        const jxGroupMsg: ChatMessage = {
          id: `jx-group-${now}`,
          contactId: 'jx-private-group',
          senderId: 'jiangxun',
          senderName: s.jiangxunProfile.name || '江浔',
          content: jxGroupContent,
          type: 'text',
          timestamp: now,
        };
        dispatch({ type: 'ADD_MESSAGE', payload: jxGroupMsg });

        // If a character exists, one of them replies in the group
        const autoChars = s.characters.filter(c => c.autoEnabled !== false);
        if (autoChars.length > 0 && s.apiKey) {
          const char = pick(autoChars);
          try {
            const groupHistory = (s.messages['jx-private-group'] || []).slice(-6).map(m => ({
              role: (m.senderId === char.id ? 'assistant' : 'user') as 'user' | 'assistant',
              content: m.content,
            }));
            const reply = await callAI(
              s.apiKey, s.aiModel,
              buildCharacterMessages(char, [
                ...groupHistory,
                { role: 'user', content: '[在群聊中简短回应，一两句，随意自然。]' },
              ], undefined, s.memories),
            );
            if (reply && !reply.startsWith('[')) {
              dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                  id: `char-group-${char.id}-${now}`,
                  contactId: 'jx-private-group',
                  senderId: char.id,
                  senderName: char.name,
                  content: reply.trim().slice(0, 100),
                  type: 'text',
                  timestamp: now + 1000,
                } as ChatMessage,
              });
            }
          } catch { /* ignore */ }
        }

        // Bump group unread so sidebar shows red dot
        const grpContact = s.contacts.find(c => c.id === 'jx-private-group');
        dispatch({
          type: 'UPDATE_CONTACT',
          payload: {
            id: 'jx-private-group',
            updates: {
              lastMessage: jxGroupContent.slice(0, 30),
              lastMessageTime: now,
              unread: (grpContact?.unread || 0) + 1,
            },
          },
        });
        writeTs(JX_GROUP_KEY, now);
      }

      // ===== 2. Custom character proactive chats =====
      for (const char of s.characters) {
        if (char.autoEnabled === false) continue;
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
              s.apiKey, s.aiModel,
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

      // ===== 2b. Character auto-post Moments =====
      for (const char of s.characters) {
        if (char.autoEnabled === false) continue;
        const pkey = CHAR_LAST_POST_PREFIX + char.id;
        const lastCharPost = readTs(pkey);
        const charPostGap = 3 * 60 * 60 * 1000 + Math.random() * 5 * 60 * 60 * 1000; // 3-8h
        if (now - lastCharPost < charPostGap) continue;
        if (hour < 9 || hour >= 23) continue;
        if (Math.random() > 0.3) continue;

        let content: string | null = null;
        if (s.apiKey) {
          try {
            const reply = await callAI(
              s.apiKey, s.aiModel,
              buildCharacterMessages(char, [{
                role: 'user',
                content: '[此刻发一条朋友圈，20字以内，符合你的性格，不要@任何人，不要说教，像真实的朋友圈动态。]',
              }], undefined, s.memories),
            );
            if (reply && !reply.startsWith('[')) content = reply.trim().slice(0, 120);
          } catch { /* ignore */ }
        }
        if (!content) content = `${char.name}：随手记一句`;

        dispatch({
          type: 'ADD_MOMENT',
          payload: {
            id: `moment-char-${char.id}-${now}`,
            authorId: char.id,
            authorName: char.name,
            authorAvatar: char.avatar || '',
            content,
            timestamp: now,
            likes: [],
            comments: [],
          } as MomentsPost,
        });
        writeTs(pkey, now);
        break; // one character per tick
      }

      // ===== 2c. Jiangxun DM into a character's private thread =====
      // Makes Jiangxun's messages appear in the character's 1-on-1 chat room.
      const autoCharsForDm = s.characters.filter(c => c.autoEnabled !== false);
      if (autoCharsForDm.length > 0 && s.apiKey && hour >= 9 && hour < 23) {
        const char = pick(autoCharsForDm);
        const contact = s.contacts.find(c => c.characterId === char.id);
        if (contact) {
          const dmKey = JX_CHAR_DM_PREFIX + char.id;
          const lastDm = readTs(dmKey);
          const dmGap = 4 * 60 * 60 * 1000 + Math.random() * 4 * 60 * 60 * 1000; // 4-8h
          if (now - lastDm > dmGap && Math.random() < 0.15) {
            try {
              const history = (s.messages[contact.id] || []).slice(-8).map(m => ({
                role: (m.senderId === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
                content: m.content,
              }));
              const extra = `[你在给${char.name}发私信，说一两句简短的话，随意自然，不涉及京京。]`;
              const reply = await callAI(
                s.apiKey, s.aiModel,
                buildJiangxunMessages(history, s.relationshipStatus, extra, s.memories),
              );
              if (reply && !reply.startsWith('[')) {
                const dmContent = reply.trim().slice(0, 100);
                dispatch({
                  type: 'ADD_MESSAGE',
                  payload: {
                    id: `jx-dm-${char.id}-${now}`,
                    contactId: contact.id,
                    senderId: 'jiangxun',
                    senderName: s.jiangxunProfile.name || '江浔',
                    content: dmContent,
                    type: 'text',
                    timestamp: now,
                  } as ChatMessage,
                });
                dispatch({
                  type: 'UPDATE_CONTACT',
                  payload: {
                    id: contact.id,
                    updates: {
                      lastMessage: dmContent.slice(0, 30),
                      lastMessageTime: now,
                      unread: (contact.unread || 0) + 1,
                    },
                  },
                });
                writeTs(dmKey, now);
              }
            } catch { /* ignore */ }
          }
        }
      }

      // ===== 3. Reactions on ALL recent moments =====
      // Covers: user posts, Jiangxun posts, character posts.
      const recentMoments = s.moments.filter(m => now - m.timestamp < 12 * 60 * 60 * 1000);

      for (const mm of recentMoments) {
        const isOwnPost = (actorId: string) => mm.authorId === actorId;

        // Jiangxun reacts to user posts
        if (!isOwnPost('jiangxun') && mm.authorId === 'user' && !mm.likes.includes('jiangxun') && Math.random() < 0.5) {
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

        // Jiangxun reacts to character posts (like only, occasionally comment)
        if (!isOwnPost('jiangxun') && mm.authorId !== 'user' && !mm.likes.includes('jiangxun') && Math.random() < 0.3) {
          dispatch({
            type: 'UPDATE_MOMENT',
            payload: {
              id: mm.id,
              updates: {
                likes: [...mm.likes, 'jiangxun'],
                ...(Math.random() < 0.25
                  ? {
                      comments: [
                        ...mm.comments,
                        {
                          id: `c-jx-char-${now}-${mm.id}`,
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

        // Each character reacts to all posts it didn't author
        for (const char of s.characters) {
          if (char.autoEnabled === false) continue;
          if (isOwnPost(char.id)) continue;
          const rkey = CHAR_LAST_REACT_PREFIX + char.id + '-' + mm.id;
          if (readTs(rkey)) continue;
          if (Math.random() > 0.25) continue;

          const alreadyLiked = mm.likes.includes(char.id);
          const shouldComment = Math.random() < 0.35;

          let commentContent: string | null = null;
          if (shouldComment) {
            if (s.apiKey) {
              try {
                const reply = await callAI(
                  s.apiKey, s.aiModel,
                  buildCharacterMessages(char, [{
                    role: 'user',
                    content: `[对这条朋友圈"${mm.content.slice(0, 40)}"发表一句评论，5字以内，符合你的性格，不要emoji堆砌。]`,
                  }], undefined, s.memories),
                );
                if (reply && !reply.startsWith('[')) commentContent = reply.trim().slice(0, 30);
              } catch { /* ignore */ }
            }
            if (!commentContent) commentContent = pick(CHAR_CANNED_COMMENTS);
          }

          dispatch({
            type: 'UPDATE_MOMENT',
            payload: {
              id: mm.id,
              updates: {
                likes: alreadyLiked ? mm.likes : [...mm.likes, char.id],
                ...(commentContent
                  ? {
                      comments: [
                        ...mm.comments,
                        {
                          id: `c-char-${char.id}-${now}-${mm.id}`,
                          authorId: char.id,
                          authorName: char.name,
                          content: commentContent,
                          timestamp: now,
                        } as MomentsComment,
                      ],
                    }
                  : {}),
              },
            },
          });
          writeTs(rkey, now);
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
