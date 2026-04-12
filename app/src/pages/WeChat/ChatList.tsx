import type { ChatContact } from '../../types';
import { UserPlus, Users, Camera, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../store/AppContext';

interface Props {
  contacts: ChatContact[];
  onOpenChat: (id: string) => void;
  onOpenMoments: () => void;
  onOpenHomework: () => void;
  onOpenCharacters: () => void;
}

export default function ChatList({ contacts, onOpenChat, onOpenMoments, onOpenHomework, onOpenCharacters }: Props) {
  const { state } = useApp();
  const [showMenu, setShowMenu] = useState(false);

  function formatTime(ts?: number) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  function getAvatar(contact: ChatContact) {
    if (contact.id === 'jiangxun' && state.jiangxunProfile.avatar) {
      return <img src={state.jiangxunProfile.avatar} alt="" />;
    }
    if (contact.avatar) {
      return <img src={contact.avatar} alt="" />;
    }
    return contact.type === 'group' ? <Users size={20} /> : contact.name[0];
  }

  const sorted = [...contacts].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

  return (
    <>
      <div className="chat-list-header">
        <h2>微信</h2>
        <div className="header-actions">
          <button className="header-btn" onClick={onOpenCharacters} title="角色管理">
            <UserPlus size={18} />
          </button>
          <div style={{ position: 'relative' }}>
            <button className="header-btn" onClick={() => setShowMenu(!showMenu)} title="更多">
              <MoreHorizontal size={18} />
            </button>
            {showMenu && (
              <div className="menu-dropdown" style={{ position: 'absolute', top: '100%', right: 0 }}>
                <button className="menu-item" onClick={() => { onOpenMoments(); setShowMenu(false); }}>
                  <Camera size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  朋友圈
                </button>
                <button className="menu-item" onClick={() => { onOpenHomework(); setShowMenu(false); }}>
                  📋 作业板
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="chat-list">
        {sorted.map(contact => (
          <div key={contact.id} className="chat-item" onClick={() => onOpenChat(contact.id)}>
            <div className="chat-avatar">{getAvatar(contact)}</div>
            <div className="chat-info">
              <div className="chat-name">
                {contact.name}
                {contact.passwordProtected && ' 🔒'}
              </div>
              <div className="chat-preview">{contact.lastMessage || '开始聊天吧'}</div>
            </div>
            <div className="chat-meta">
              <div className="chat-time">{formatTime(contact.lastMessageTime)}</div>
              {contact.unread > 0 && <div className="chat-unread">{contact.unread}</div>}
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <p>暂无聊天</p>
          </div>
        )}
      </div>
    </>
  );
}
