import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { ArrowLeft, Plus, Trash2, MessageCircle, Users } from 'lucide-react';
import type { CharacterCard, ChatContact } from '../../types';

interface Props {
  onBack: () => void;
}

export default function CharacterManager({ onBack }: Props) {
  const { state, dispatch } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  function addCharacter() {
    if (!name.trim() || !personality.trim()) return;
    const id = `char-${Date.now()}`;
    const card: CharacterCard = {
      id,
      name: name.trim(),
      avatar: '',
      personality: personality.trim(),
      createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_CHARACTER', payload: card });

    // Auto-create a private chat contact
    const contact: ChatContact = {
      id: `contact-${id}`,
      type: 'private',
      name: card.name,
      avatar: '',
      characterId: id,
      createdBy: 'user',
      lastMessage: '',
      lastMessageTime: Date.now(),
      unread: 0,
    };
    dispatch({ type: 'ADD_CONTACT', payload: contact });

    setName('');
    setPersonality('');
    setShowAdd(false);
  }

  function removeCharacter(charId: string) {
    dispatch({ type: 'REMOVE_CHARACTER', payload: charId });
  }

  function createGroup() {
    if (!groupName.trim() || selectedMembers.length === 0) return;
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
    };
    dispatch({ type: 'ADD_CONTACT', payload: contact });
    setGroupName('');
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
            <button className="btn-secondary" onClick={() => setShowAdd(false)}>取消</button>
            <button className="btn-primary" onClick={addCharacter}>
              <Plus size={14} /> 添加角色
            </button>
          </div>
        </div>
      )}

      <div className="characters-list">
        {state.characters.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <p>还没有自定义角色<br />点击右上角 + 添加</p>
          </div>
        ) : (
          state.characters.map(char => (
            <div key={char.id} className="character-card">
              <div className="character-avatar">
                {char.avatar ? <img src={char.avatar} alt="" /> : char.name[0]}
              </div>
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
