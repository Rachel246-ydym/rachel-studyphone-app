import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { callAI, buildJiangxunMessages, buildCharacterMessages, buildHomeworkReminderPrompt } from '../../services/ai';
import { ArrowLeft, MoreVertical, Send, Gift, MapPin } from 'lucide-react';
import type { ChatMessage } from '../../types';

interface Props {
  contactId: string;
  onBack: () => void;
}

export default function ChatRoom({ contactId, onBack }: Props) {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showRedPacket, setShowRedPacket] = useState(false);
  const [redPacketAmount, setRedPacketAmount] = useState(5);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contact = state.contacts.find(c => c.id === contactId);
  const messages = state.messages[contactId] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!contact) return null;

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

    setLoading(true);

    try {
      const history = [...messages, { role: 'user' as const, content: userMsg }].map(m => ({
        role: ('senderId' in m && (m as ChatMessage).senderId === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: 'content' in m ? m.content : '',
      }));

      let aiReply: string;

      if (contactId === 'jiangxun') {
        // Build homework context
        const unfinishedHomework = state.homework.filter(h => !h.isCompleted);
        let extraContext = '';
        if (unfinishedHomework.length > 0) {
          extraContext = buildHomeworkReminderPrompt(unfinishedHomework);
        }

        aiReply = await callAI(
          state.apiKey,
          state.aiModel,
          buildJiangxunMessages(history, state.relationshipStatus, extraContext),
        );
      } else {
        const character = state.characters.find(c => c.id === contact!.characterId);
        if (character) {
          aiReply = await callAI(
            state.apiKey,
            state.aiModel,
            buildCharacterMessages(character, history),
          );
        } else {
          aiReply = '[角色不存在]';
        }
      }

      // Parse action descriptions (wrapped in *)
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

  function handleSendRedPacket() {
    if (state.userHaibi < redPacketAmount) return;

    dispatch({ type: 'SPEND_HAIBI', payload: { target: 'user', amount: redPacketAmount } });

    addMessage({
      contactId,
      senderId: 'user',
      senderName: state.userProfile.name,
      content: `发了一个红包`,
      type: 'red-packet',
      redPacketAmount: redPacketAmount,
      redPacketClaimed: false,
    });

    setShowRedPacket(false);
  }

  function claimRedPacket(msgId: string, amount: number) {
    const updated = (state.messages[contactId] || []).map(m =>
      m.id === msgId ? { ...m, redPacketClaimed: true } : m
    );
    dispatch({ type: 'SET_STATE', payload: { messages: { ...state.messages, [contactId]: updated } } });
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
              <button className="menu-item" onClick={() => { setShowRedPacket(true); setShowMenu(false); }}>
                🧧 发红包
              </button>
              <button className="menu-item" onClick={() => setShowMenu(false)}>
                📋 作业板
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={msg.id}>
            {shouldShowTimestamp(i) && (
              <div className="message-timestamp">{formatTimestamp(msg.timestamp)}</div>
            )}

            {msg.type === 'system' ? (
              <div className="message-system">{msg.content}</div>
            ) : msg.type === 'action' ? (
              <div className="message-action">{msg.content}</div>
            ) : msg.type === 'red-packet' ? (
              <div className={`message-bubble-row ${msg.senderId === 'user' ? 'self' : ''}`}>
                <div className="message-sender-avatar">{getAvatarContent(msg.senderId)}</div>
                <div className="message-bubble-wrap">
                  {contact.type === 'group' && msg.senderId !== 'user' && (
                    <div className="message-sender-name">{msg.senderName}</div>
                  )}
                  <div
                    className="message-bubble message-red-packet"
                    onClick={() => {
                      if (msg.senderId !== 'user' && !msg.redPacketClaimed && msg.redPacketAmount) {
                        claimRedPacket(msg.id, msg.redPacketAmount);
                      }
                    }}
                  >
                    <div className="red-packet-content">
                      <span className="red-packet-emoji">🧧</span>
                      <div>
                        <div className="red-packet-amount">{msg.redPacketAmount} 海币</div>
                        <div className="red-packet-info">{msg.content}</div>
                        {msg.redPacketClaimed && <div className="red-packet-claimed">已领取</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : msg.type === 'location' ? (
              <div className={`message-bubble-row ${msg.senderId === 'user' ? 'self' : ''}`}>
                <div className="message-sender-avatar">{getAvatarContent(msg.senderId)}</div>
                <div className="message-bubble-wrap">
                  <div className="message-bubble message-location">
                    <div className="location-content">
                      <MapPin size={16} color="var(--primary)" />
                      <span>{msg.location || msg.content}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`message-bubble-row ${msg.senderId === 'user' ? 'self' : ''}`}>
                <div className="message-sender-avatar">{getAvatarContent(msg.senderId)}</div>
                <div className="message-bubble-wrap">
                  {contact.type === 'group' && msg.senderId !== 'user' && (
                    <div className="message-sender-name">{msg.senderName}</div>
                  )}
                  <div className="message-bubble">{msg.content}</div>
                </div>
              </div>
            )}
          </div>
        ))}

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

      {showRedPacket && (
        <div style={{ padding: '12px 16px', background: 'var(--bg-white)', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>红包金额（海币）：</span>
            <input
              type="number"
              min={1}
              max={state.userHaibi}
              value={redPacketAmount}
              onChange={e => setRedPacketAmount(Number(e.target.value))}
              style={{ width: 80, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>余额: {state.userHaibi}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={handleSendRedPacket}>
              <Gift size={14} /> 发红包
            </button>
            <button className="btn-secondary" onClick={() => setShowRedPacket(false)}>取消</button>
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
        <button className="send-btn" onClick={handleSend} disabled={!input.trim() || loading}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
