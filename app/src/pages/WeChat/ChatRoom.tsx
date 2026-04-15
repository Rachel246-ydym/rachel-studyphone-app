import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { callAI, buildJiangxunMessages, buildCharacterMessages, buildHomeworkReminderPrompt, extractLocationFromText } from '../../services/ai';
import { ArrowLeft, MoreVertical, Send, Gift, MapPin, RotateCw, Pencil, Star, Trash2, Plus, X } from 'lucide-react';
import type { ChatMessage, MemoryEntry, MemoryCategory } from '../../types';

interface Props {
  contactId: string;
  onBack: () => void;
  onOpenStoryReplay?: (selectedIds: string[]) => void;
}

export default function ChatRoom({ contactId, onBack, onOpenStoryReplay }: Props) {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showRedPacket, setShowRedPacket] = useState(false);
  const [redPacketAmount, setRedPacketAmount] = useState(5);
  const [redPacketNote, setRedPacketNote] = useState('恭喜发财，大吉大利');
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPlus, setShowPlus] = useState(false);
  // Password gate for protected group chats
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordAttempts, setPasswordAttempts] = useState(0);
  const [passwordPassed, setPasswordPassed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contact = state.contacts.find(c => c.id === contactId);
  const messages = state.messages[contactId] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear this contact's unread badge as soon as the user opens the chat,
  // so the sidebar red dot reflects reality. Also clear sessionUnlocked on
  // unmount so password-protected groups re-prompt next time.
  useEffect(() => {
    if (contact && contact.unread && contact.unread > 0) {
      dispatch({
        type: 'UPDATE_CONTACT',
        payload: { id: contactId, updates: { unread: 0 } },
      });
    }
    return () => {
      const c = state.contacts.find(x => x.id === contactId);
      if (c?.passwordProtected && c.sessionUnlocked) {
        dispatch({
          type: 'UPDATE_CONTACT',
          payload: { id: contactId, updates: { sessionUnlocked: false } },
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  if (!contact) return null;
  const currentContact = contact; // narrowed non-null alias for closures

  // Password gate for JX private groups. Accepts either the contact's own
  // password, 0921 (江浔 birthday), or 0709 (京京 birthday). After three
  // wrong guesses 江浔 silently "lets her in" — but only for this session:
  // we flip sessionUnlocked on the contact and keep passwordProtected true,
  // so leaving and reopening re-prompts. A sessionUnlocked contact skips the
  // gate for as long as the flag survives (until clearSession or reload).
  const effectiveUnlocked =
    passwordPassed || currentContact.sessionUnlocked === true;
  if (currentContact.passwordProtected && !effectiveUnlocked) {
    // Allow custom password + both defaults
    const validPasswords = [
      currentContact.password,
      '0921',
      '0709',
    ].filter(Boolean) as string[];
    const tryPwd = () => {
      if (validPasswords.includes(passwordInput)) {
        setPasswordPassed(true);
        dispatch({
          type: 'UPDATE_CONTACT',
          payload: { id: currentContact.id, updates: { sessionUnlocked: true } },
        });
        return;
      }
      const next = passwordAttempts + 1;
      setPasswordAttempts(next);
      setPasswordInput('');
      if (next >= 3) {
        // Session-only auto-unlock — NOT permanent
        dispatch({
          type: 'UPDATE_CONTACT',
          payload: { id: currentContact.id, updates: { sessionUnlocked: true } },
        });
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: `sys-${Date.now()}`,
            contactId: currentContact.id,
            senderId: 'system',
            senderName: '系统',
            content: '江浔叹了口气：算了算了，这次让你看一眼……（离开后还得再输密码）',
            type: 'system',
            timestamp: Date.now(),
          },
        });
        setPasswordPassed(true);
      }
    };
    return (
      <div className="chat-room">
        <div className="chat-room-header">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <h3>{currentContact.name} 🔒</h3>
        </div>
        <div className="password-gate">
          <div className="password-gate-icon">🔒</div>
          <div className="password-gate-title">这是江浔的私人群聊</div>
          <div className="password-gate-hint">
            输入密码进入（默认可能是 0921 或 0709）<br />
            试错 3 次江浔会"登录"放你进来（仅本次有效，退出后需重新输入）
          </div>
          <input
            type="password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            className="password-input"
            onKeyDown={e => { if (e.key === 'Enter') tryPwd(); }}
            placeholder="密码"
          />
          <div className="password-attempts">
            {passwordAttempts > 0 && <span>已试错 {passwordAttempts}/3 次</span>}
          </div>
          <button className="btn-primary" onClick={tryPwd}>进入</button>
        </div>
      </div>
    );
  }

  function addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const message: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: message });
    dispatch({
      type: 'UPDATE_CONTACT',
      payload: {
        id: contactId,
        updates: {
          lastMessage: msg.type === 'red-packet' ? '[红包]' : msg.type === 'location' ? '[位置]' : msg.content,
          lastMessageTime: Date.now(),
        },
      },
    });
    return message;
  }

  async function generateAIResponse(historyOverride?: { role: 'user' | 'assistant'; content: string }[]) {
    const history = historyOverride ?? messages.map(m => ({
      role: (m.senderId === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));

    let aiReply: string;
    if (contactId === 'jiangxun') {
      const unfinishedHomework = state.homework.filter(h => !h.isCompleted);
      let extraContext = '';
      if (unfinishedHomework.length > 0) {
        extraContext = buildHomeworkReminderPrompt(unfinishedHomework);
      }
      aiReply = await callAI(
        state.apiKey,
        state.aiModel,
        buildJiangxunMessages(history, state.relationshipStatus, extraContext, state.memories),
      );
    } else {
      const character = state.characters.find(c => c.id === contact!.characterId);
      if (character) {
        aiReply = await callAI(
          state.apiKey,
          state.aiModel,
          buildCharacterMessages(character, history, undefined, state.memories),
        );
      } else {
        aiReply = '[角色不存在]';
      }
    }
    return aiReply;
  }

  function splitAndAddAIReply(aiReply: string) {
    const parts = aiReply.split(/(\*[^*]+\*)/g);
    for (const part of parts) {
      if (part.startsWith('*') && part.endsWith('*')) {
        addMessage({
          contactId,
          senderId: contactId === 'jiangxun' ? 'jiangxun' : contact!.characterId || contactId,
          senderName: contact!.name,
          content: part.slice(1, -1),
          type: 'action',
        });
      } else if (part.trim()) {
        addMessage({
          contactId,
          senderId: contactId === 'jiangxun' ? 'jiangxun' : contact!.characterId || contactId,
          senderName: contact!.name,
          content: part.trim(),
          type: 'text',
        });
      }
    }
    // Chat-map consistency: if 江浔 mentioned a known place, auto-log an
    // arrive event (+ a leave event for the previous location).
    if (contactId === 'jiangxun') {
      const newLocation = extractLocationFromText(aiReply);
      if (newLocation) {
        const now = Date.now();
        const todayStr = new Date(now).toISOString().slice(0, 10);
        // Find latest arrive event from today
        const todaysArrivals = state.mapEvents
          .filter(e => new Date(e.timestamp).toISOString().slice(0, 10) === todayStr && e.action.includes('到达'))
          .sort((a, b) => b.timestamp - a.timestamp);
        const prev = todaysArrivals[0];
        if (!prev || prev.location !== newLocation) {
          if (prev) {
            dispatch({
              type: 'ADD_MAP_EVENT',
              payload: {
                id: `map-leave-chat-${now}`,
                timestamp: now,
                location: prev.location,
                action: `离开${prev.location}`,
              },
            });
          }
          dispatch({
            type: 'ADD_MAP_EVENT',
            payload: {
              id: `map-arrive-chat-${now + 1}`,
              timestamp: now + 1,
              location: newLocation,
              action: `到达${newLocation}`,
              detail: '（从聊天推导）',
            },
          });
        }
      }
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    addMessage({
      contactId,
      senderId: 'user',
      senderName: state.userProfile.name,
      content: userMsg,
      type: 'text',
    });
    // Keyword: mentioning 购物 surfaces an interactive system message that
    // jumps straight into the shopping module in "with 江浔" companion mode.
    if (/购物|买东西|购物车/.test(userMsg)) {
      addMessage({
        contactId,
        senderId: 'system',
        senderName: '系统',
        content: '🛍️__SHOPPING_PROMPT__是否跟江浔一起去购物？',
        type: 'system',
      });
    }
    setLoading(true);
    try {
      const history = [...messages, { role: 'user' as const, content: userMsg }].map(m => ({
        role: ('senderId' in m && (m as ChatMessage).senderId === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: 'content' in m ? m.content : '',
      }));
      const aiReply = await generateAIResponse(history);
      splitAndAddAIReply(aiReply);
    } catch {
      addMessage({
        contactId,
        senderId: 'system',
        senderName: '系统',
        content: '消息发送失败',
        type: 'system',
      });
    }
    setLoading(false);
  }

  // Regenerate the most recent AI message (and any *action* siblings it came with).
  async function regenerate(msgId: string) {
    if (loading) return;
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx < 0) return;
    // Walk backwards and forwards to find the contiguous block of this AI reply
    let start = idx;
    while (start > 0 && messages[start - 1].senderId !== 'user' && messages[start - 1].type !== 'system') {
      start--;
    }
    let end = idx;
    while (end < messages.length - 1 && messages[end + 1].senderId !== 'user' && messages[end + 1].type !== 'system') {
      end++;
    }
    const trimmed = messages.slice(0, start);
    dispatch({ type: 'REPLACE_MESSAGES', payload: { contactId, messages: trimmed } });
    setLoading(true);
    try {
      const history = trimmed.map(m => ({
        role: (m.senderId === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      }));
      const aiReply = await generateAIResponse(history);
      splitAndAddAIReply(aiReply);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  function beginEdit(m: ChatMessage) {
    setEditingMsg(m.id);
    setEditBuf(m.content);
  }
  function saveEdit() {
    if (!editingMsg) return;
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: { contactId, id: editingMsg, updates: { content: editBuf, edited: true } },
    });
    setEditingMsg(null);
    setEditBuf('');
  }

  function markAsMemory(m: ChatMessage) {
    const category: MemoryCategory = 'detail';
    const entry: MemoryEntry = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      content: `${m.senderName}：${m.content}`.slice(0, 120),
      starred: true,
      createdAt: Date.now(),
      charId: contactId === 'jiangxun' ? 'jiangxun' : contact!.characterId,
    };
    dispatch({ type: 'ADD_MEMORY', payload: entry });
  }

  function deleteMessage(id: string) {
    dispatch({ type: 'DELETE_MESSAGE', payload: { contactId, id } });
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  function confirmStoryReplay() {
    if (selectedIds.length > 0 && onOpenStoryReplay) {
      onOpenStoryReplay(selectedIds);
    }
    setSelectMode(false);
    setSelectedIds([]);
  }

  function handleSendRedPacket() {
    if (state.userHaibi < redPacketAmount) return;
    dispatch({ type: 'SPEND_HAIBI', payload: { target: 'user', amount: redPacketAmount } });
    addMessage({
      contactId,
      senderId: 'user',
      senderName: state.userProfile.name,
      content: redPacketNote || '恭喜发财',
      type: 'red-packet',
      redPacketAmount,
      redPacketClaimed: false,
      redPacketNote,
      redPacketKind: redPacketAmount >= 50 ? 'big' : 'small',
    });
    setShowRedPacket(false);
    setRedPacketAmount(5);
    setRedPacketNote('恭喜发财，大吉大利');
  }

  function claimRedPacket(msgId: string, amount: number) {
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: { contactId, id: msgId, updates: { redPacketClaimed: true } },
    });
    dispatch({ type: 'ADD_HAIBI', payload: { target: 'user', amount } });
  }

  function formatTimestamp(ts: number) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  function shouldShowTimestamp(index: number): boolean {
    if (index === 0) return true;
    return messages[index].timestamp - messages[index - 1].timestamp > 5 * 60 * 1000;
  }

  function getAvatarContent(senderId: string) {
    if (senderId === 'user') {
      return state.userProfile.avatar
        ? <img src={state.userProfile.avatar} alt="" />
        : state.userProfile.name[0];
    }
    if (senderId === 'jiangxun') {
      return state.jiangxunProfile.avatar
        ? <img src={state.jiangxunProfile.avatar} alt="" />
        : '浔';
    }
    const char = state.characters.find(c => c.id === senderId);
    return char?.avatar ? <img src={char.avatar} alt="" /> : (char?.name[0] || '?');
  }

  // The last non-user text/action message is the candidate for regenerate
  const lastAIBlockEnd = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === 'user') return -1;
      if (messages[i].type === 'system') return -1;
      return messages[i].id;
    }
    return -1;
  })();

  return (
    <div className="chat-room">
      <div className="chat-room-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <h3>{contact.name}</h3>
        <div className="chat-room-menu">
          <button className="back-btn" onClick={() => setShowMenu(!showMenu)}>
            <MoreVertical size={20} />
          </button>
          {showMenu && (
            <div className="menu-dropdown">
              <button className="menu-item" onClick={() => { setSelectMode(!selectMode); setSelectedIds([]); setShowMenu(false); }}>
                {selectMode ? '✖ 退出多选' : '📋 多选 / 剧情回放'}
              </button>
              <button className="menu-item" onClick={() => setShowMenu(false)}>
                📋 作业板
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => {
          const isUser = msg.senderId === 'user';
          const isSelected = selectedIds.includes(msg.id);
          return (
            <div key={msg.id}>
              {shouldShowTimestamp(i) && (
                <div className="message-timestamp">{formatTimestamp(msg.timestamp)}</div>
              )}

              {msg.type === 'system' ? (
                msg.content.includes('__SHOPPING_PROMPT__') ? (
                  <div className="message-system system-interactive">
                    🛍️ 是否跟江浔一起去购物？
                    <button
                      className="btn-primary"
                      style={{ marginLeft: 8, padding: '3px 12px', fontSize: 12 }}
                      onClick={() => {
                        try { localStorage.setItem('shopping-companion', '1'); } catch { /* ignore */ }
                        dispatch({ type: 'SET_ACTIVE_PAGE', payload: 'shopping' });
                      }}
                    >
                      去购物
                    </button>
                  </div>
                ) : (
                  <div className="message-system">{msg.content}</div>
                )
              ) : msg.type === 'action' ? (
                <div className="message-action">{msg.content}{msg.edited && <span className="edited-mark"> · 已编辑</span>}</div>
              ) : msg.type === 'red-packet' ? (
                <div className={`message-bubble-row ${isUser ? 'self' : ''}`}>
                  <div className="message-sender-avatar">{getAvatarContent(msg.senderId)}</div>
                  <div className="message-bubble-wrap">
                    {contact.type === 'group' && !isUser && (
                      <div className="message-sender-name">{msg.senderName}</div>
                    )}
                    <div
                      className={`message-bubble message-red-packet ${msg.redPacketKind === 'big' ? 'big' : ''}`}
                      onClick={() => {
                        if (!isUser && !msg.redPacketClaimed && msg.redPacketAmount) {
                          claimRedPacket(msg.id, msg.redPacketAmount);
                        }
                      }}
                    >
                      <div className="red-packet-content">
                        <span className="red-packet-emoji">🧧</span>
                        <div>
                          <div className="red-packet-note">{msg.redPacketNote || msg.content}</div>
                          <div className="red-packet-label">
                            {msg.redPacketKind === 'big' ? '大红包 · ' : ''}海币红包
                          </div>
                          {msg.redPacketClaimed && <div className="red-packet-claimed">已领取 · {msg.redPacketAmount} 海币</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : msg.type === 'location' ? (
                <div className={`message-bubble-row ${isUser ? 'self' : ''}`}>
                  <div className="message-sender-avatar">{getAvatarContent(msg.senderId)}</div>
                  <div className="message-bubble-wrap">
                    <div className="message-bubble message-location">
                      <div className="location-content">
                        <MapPin size={16} color="var(--primary)" />
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{msg.location || msg.content}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-light)' }}>发来的位置</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`message-bubble-row ${isUser ? 'self' : ''}`}>
                  {selectMode && (
                    <input
                      type="checkbox"
                      className="msg-select-box"
                      checked={isSelected}
                      onChange={() => toggleSelect(msg.id)}
                    />
                  )}
                  <div className="message-sender-avatar">{getAvatarContent(msg.senderId)}</div>
                  <div className="message-bubble-wrap">
                    {contact.type === 'group' && !isUser && (
                      <div className="message-sender-name">{msg.senderName}</div>
                    )}
                    {editingMsg === msg.id ? (
                      <div className="message-edit">
                        <textarea value={editBuf} onChange={e => setEditBuf(e.target.value)} />
                        <div className="message-edit-actions">
                          <button className="btn-secondary" onClick={() => setEditingMsg(null)}>取消</button>
                          <button className="btn-primary" onClick={saveEdit}>保存</button>
                        </div>
                      </div>
                    ) : (
                      <div className="message-bubble">
                        {msg.content}
                        {msg.edited && <span className="edited-mark"> · 已编辑</span>}
                      </div>
                    )}
                    {editingMsg !== msg.id && !selectMode && (
                      <div className={`msg-toolbar ${isUser ? 'right' : 'left'}`}>
                        <button className="msg-tool-btn" onClick={() => beginEdit(msg)} title="编辑">
                          <Pencil size={12} />
                        </button>
                        {!isUser && msg.id === lastAIBlockEnd && (
                          <button className="msg-tool-btn" onClick={() => regenerate(msg.id)} title="重新生成" disabled={loading}>
                            <RotateCw size={12} />
                          </button>
                        )}
                        <button className="msg-tool-btn" onClick={() => markAsMemory(msg)} title="记为重要记忆">
                          <Star size={12} />
                        </button>
                        <button className="msg-tool-btn" onClick={() => deleteMessage(msg.id)} title="删除">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="message-bubble-row">
            <div className="message-sender-avatar">{getAvatarContent(contactId === 'jiangxun' ? 'jiangxun' : contact.characterId || contactId)}</div>
            <div className="message-bubble-wrap">
              <div className="message-bubble" style={{ color: 'var(--text-light)' }}>正在输入...</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {selectMode && (
        <div className="select-action-bar">
          <span>已选 {selectedIds.length}</span>
          <button className="btn-secondary" onClick={() => { setSelectMode(false); setSelectedIds([]); }}>取消</button>
          <button className="btn-primary" disabled={selectedIds.length === 0} onClick={confirmStoryReplay}>
            存入剧情回放
          </button>
        </div>
      )}

      {/* Plus panel (mimicking WeChat: red packet, location, etc.) */}
      {showPlus && !showRedPacket && (
        <div className="plus-panel">
          <button className="plus-item" onClick={() => { setShowRedPacket(true); setShowPlus(false); }}>
            <div className="plus-icon red"><Gift size={22} /></div>
            <span>红包</span>
          </button>
          <button className="plus-item" onClick={() => setShowPlus(false)}>
            <div className="plus-icon"><MapPin size={22} /></div>
            <span>位置</span>
          </button>
        </div>
      )}

      {/* WeChat-style red packet modal */}
      {showRedPacket && (
        <div className="red-packet-modal-backdrop" onClick={() => setShowRedPacket(false)}>
          <div className="red-packet-modal" onClick={e => e.stopPropagation()}>
            <button className="red-packet-close" onClick={() => setShowRedPacket(false)}>
              <X size={18} />
            </button>
            <div className="red-packet-modal-title">塞个海币红包</div>
            <label className="rp-label">留言</label>
            <input
              className="rp-note"
              maxLength={20}
              value={redPacketNote}
              onChange={e => setRedPacketNote(e.target.value)}
              placeholder="恭喜发财，大吉大利"
            />
            <label className="rp-label">金额</label>
            <div className="rp-amount-row">
              <span className="rp-currency">¥</span>
              <input
                type="number"
                min={1}
                max={state.userHaibi}
                value={redPacketAmount}
                onChange={e => setRedPacketAmount(Number(e.target.value))}
                className="rp-amount"
              />
              <span className="rp-unit">海币</span>
            </div>
            <div className="rp-balance">余额 {state.userHaibi} 海币</div>
            <button
              className="rp-send-btn"
              disabled={state.userHaibi < redPacketAmount || redPacketAmount <= 0}
              onClick={handleSendRedPacket}
            >
              塞钱进红包
            </button>
          </div>
        </div>
      )}

      <div className="chat-input-area">
        <input
          className="chat-input"
          placeholder="输入消息..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={loading}
        />
        <button className="extra-btn" onClick={() => setShowPlus(!showPlus)} title="更多">
          <Plus size={18} />
        </button>
        <button className="send-btn" onClick={handleSend} disabled={!input.trim() || loading}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
