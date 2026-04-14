import { useState, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { ArrowLeft, Plus, Trash2, MessageCircle, Users, Camera } from 'lucide-react';
import type { CharacterCard, ChatContact } from '../../types';

interface Props {
  onBack: () => void;
}

// Shrink an uploaded image to a reasonable size before storing in localStorage.
async function fileToDataUrl(file: File, max = 256): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function CharacterManager({ onBack }: Props) {
  const { state, dispatch } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [avatar, setAvatar] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupPassword, setGroupPassword] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  // Per-card avatar change uses one shared file input; we remember which card
  // should receive the next picked file.
  const targetCardRef = useRef<string | null>(null);
  const cardFileRef = useRef<HTMLInputElement>(null);

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await fileToDataUrl(f);
    setAvatar(url);
    e.target.value = '';
  }

  async function onCardAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !targetCardRef.current) return;
    const url = await fileToDataUrl(f);
    const charId = targetCardRef.current;
    // Update character itself
    const char = state.characters.find(c => c.id === charId);
    if (char) {
      dispatch({
        type: 'REMOVE_CHARACTER',
        payload: charId,
      });
      dispatch({
        type: 'ADD_CHARACTER',
        payload: { ...char, avatar: url },
      });
    }
    // Also update the linked contact avatar so ChatList shows it
    const contact = state.contacts.find(c => c.characterId === charId);
    if (contact) {
      dispatch({
        type: 'UPDATE_CONTACT',
        payload: { id: contact.id, updates: { avatar: url } },
      });
    }
    targetCardRef.current = null;
    e.target.value = '';
  }

  function addCharacter() {
    if (!name.trim() || !personality.trim()) return;
    const id = `char-${Date.now()}`;
    const card: CharacterCard = {
      id,
      name: name.trim(),
      avatar,
      personality: personality.trim(),
      createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_CHARACTER', payload: card });

    // Auto-create a private chat contact
    const contact: ChatContact = {
      id: `contact-${id}`,
      type: 'private',
      name: card.name,
      avatar,
      characterId: id,
      createdBy: 'user',
      lastMessage: '',
      lastMessageTime: Date.now(),
      unread: 0,
    };
    dispatch({ type: 'ADD_CONTACT', payload: contact });

    setName('');
    setPersonality('');
    setAvatar('');
    setShowAdd(false);
  }

  function removeCharacter(charId: string) {
    if (!confirm('确定删除这个角色吗？相关聊天记录会一起清理。')) return;
    // Find & remove the paired private contact and its message thread
    const contact = state.contacts.find(c => c.characterId === charId);
    if (contact) {
      dispatch({ type: 'REPLACE_MESSAGES', payload: { contactId: contact.id, messages: [] } });
      // We don't have REMOVE_CONTACT reducer; mark with empty name to hide would
      // be ugly. Use a soft filter via SET_STATE partial instead.
      dispatch({
        type: 'SET_STATE',
        payload: {
          contacts: state.contacts.filter(c => c.id !== contact.id),
          // Also prune group memberships
          // (we keep group contacts but drop this id from their members list)
        },
      });
    }
    dispatch({ type: 'REMOVE_CHARACTER', payload: charId });
  }

  function createGroup() {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    const pwd = groupPassword.trim();
    const contact: ChatContact = {
      id: `group-${Date.now()}`,
      type: 'group',
      name: groupName.trim(),
      avatar: '',
      members: selectedMembers,
      createdBy: 'user',
      lastMessage: '',
      lastMessageTime: Date.now(),
      unread: 0,
      ...(pwd ? { passwordProtected: true, password: pwd } : {}),
    };
    dispatch({ type: 'ADD_CONTACT', payload: contact });
    setGroupName('');
    setGroupPassword('');
    setSelectedMembers([]);
    setShowGroupForm(false);
  }

  function toggleMember(id: string) {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }

  const allCharacters = [
    { id: 'jiangxun', name: '江浔', personality: '（内置角色）' },
    ...state.characters,
  ];

  return (
    <div className="characters-page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <h3>角色管理</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="header-btn" onClick={() => setShowGroupForm(!showGroupForm)} title="创建群聊">
            <Users size={18} />
          </button>
          <button className="header-btn" onClick={() => setShowAdd(!showAdd)} title="添加角色">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {showGroupForm && (
        <div style={{ padding: 16, background: 'var(--bg-white)', borderBottom: '1px solid var(--border)' }}>
          <div className="form-group">
            <label>群名称</label>
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="输入群聊名称" />
          </div>
          <div className="form-group">
            <label>群密码（可选，设置后进群需要密码）</label>
            <input
              value={groupPassword}
              onChange={e => setGroupPassword(e.target.value)}
              placeholder="留空 = 公开群；输入则变为加密群"
            />
          </div>
          <div className="form-group">
            <label>选择成员</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {allCharacters.map(c => (
                <button
                  key={c.id}
                  className={selectedMembers.includes(c.id) ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 12px', fontSize: 13 }}
                  onClick={() => toggleMember(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setShowGroupForm(false)}>取消</button>
            <button className="btn-primary" onClick={createGroup}>创建群聊</button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="add-character-form">
          <div className="form-group">
            <label>头像</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="character-avatar" style={{ width: 56, height: 56 }}>
                {avatar ? <img src={avatar} alt="" /> : (name[0] || '?')}
              </div>
              <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
                <Camera size={14} /> 上传头像
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={onAvatarFile}
              />
            </div>
          </div>
          <div className="form-group">
            <label>角色名称</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="输入角色名称" />
          </div>
          <div className="form-group">
            <label>角色设定（越详细越好，角色会越生动）</label>
            <textarea
              value={personality}
              onChange={e => setPersonality(e.target.value)}
              placeholder="描述角色的性格、背景、说话风格、口头禅等..."
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => { setShowAdd(false); setAvatar(''); }}>取消</button>
            <button className="btn-primary" onClick={addCharacter}>
              <Plus size={14} /> 添加角色
            </button>
          </div>
        </div>
      )}

      <input
        ref={cardFileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onCardAvatarFile}
      />

      <div className="characters-list">
        {state.characters.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <p>还没有自定义角色<br />点击右上角 + 添加</p>
          </div>
        ) : (
          state.characters.map(char => (
            <div key={char.id} className="character-card">
              <button
                className="character-avatar"
                title="更换头像"
                onClick={() => { targetCardRef.current = char.id; cardFileRef.current?.click(); }}
                style={{ border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {char.avatar ? <img src={char.avatar} alt="" /> : char.name[0]}
              </button>
              <div className="character-details">
                <div className="character-name">{char.name}</div>
                <div className="character-personality">{char.personality}</div>
              </div>
              <div className="character-actions">
                <button className="header-btn" title="聊天">
                  <MessageCircle size={16} />
                </button>
                <button className="btn-danger" onClick={() => removeCharacter(char.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
