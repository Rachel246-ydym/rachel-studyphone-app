import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { ArrowLeft, Plus, Star, Trash2, Pencil, Check } from 'lucide-react';
import type { MemoryCategory, MemoryEntry } from '../../types';

interface Props {
  onBack: () => void;
}

const CATEGORIES: { value: MemoryCategory; label: string; hint: string }[] = [
  { value: 'event', label: '重要时刻', hint: '重要的对话、承诺、第一次' },
  { value: 'hobby', label: '爱好偏好', hint: '口味、讨厌什么、习惯' },
  { value: 'detail', label: '聊天细节', hint: '提到过的名字、地点、小事' },
  { value: 'achievement', label: '任务成就', hint: '完成的任务、获得的成就' },
];

export default function MemoryManager({ onBack }: Props) {
  const { state, dispatch } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState<MemoryCategory>('event');
  const [content, setContent] = useState('');
  const [filter, setFilter] = useState<'all' | MemoryCategory>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState('');

  function add() {
    if (!content.trim()) return;
    const entry: MemoryEntry = {
      id: `mem-${Date.now()}`,
      category,
      content: content.trim(),
      starred: false,
      createdAt: Date.now(),
      charId: 'jiangxun',
    };
    dispatch({ type: 'ADD_MEMORY', payload: entry });
    setContent('');
    setShowAdd(false);
  }

  function toggleStar(id: string, cur: boolean) {
    dispatch({ type: 'UPDATE_MEMORY', payload: { id, updates: { starred: !cur } } });
  }

  function remove(id: string) {
    dispatch({ type: 'DELETE_MEMORY', payload: id });
  }

  function startEdit(m: MemoryEntry) {
    setEditingId(m.id);
    setEditBuf(m.content);
  }
  function saveEdit() {
    if (!editingId) return;
    dispatch({ type: 'UPDATE_MEMORY', payload: { id: editingId, updates: { content: editBuf } } });
    setEditingId(null);
  }

  const list = state.memories
    .filter(m => filter === 'all' || m.category === filter)
    .sort((a, b) => Number(b.starred) - Number(a.starred) || b.createdAt - a.createdAt);

  return (
    <div className="characters-page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={20} /></button>
        <h3>江浔的记忆库</h3>
        <button className="header-btn" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={18} />
        </button>
      </div>

      <div className="memory-filters">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部</button>
        {CATEGORIES.map(c => (
          <button key={c.value} className={filter === c.value ? 'active' : ''} onClick={() => setFilter(c.value)}>
            {c.label}
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="add-character-form">
          <div className="form-group">
            <label>分类</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  className={category === c.value ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => setCategory(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
              {CATEGORIES.find(c => c.value === category)?.hint}
            </div>
          </div>
          <div className="form-group">
            <label>记忆内容</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="江浔应当记住的关于你的这件事…"
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setShowAdd(false)}>取消</button>
            <button className="btn-primary" onClick={add}>
              <Plus size={14} /> 加入记忆
            </button>
          </div>
        </div>
      )}

      <div className="characters-list">
        {list.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🧠</div>
            <p>还没有记忆条目。<br />标星的记忆会长期保留在 prompt 里。</p>
          </div>
        )}
        {list.map(m => {
          const cat = CATEGORIES.find(c => c.value === m.category);
          return (
            <div key={m.id} className="character-card" style={{ alignItems: 'flex-start' }}>
              <button
                className="msg-tool-btn"
                onClick={() => toggleStar(m.id, m.starred)}
                title={m.starred ? '取消标星' : '加入重要记忆'}
                style={{ background: m.starred ? '#fff4d6' : 'var(--primary-lightest)', color: m.starred ? '#f08c00' : 'var(--primary-dark)' }}
              >
                <Star size={14} fill={m.starred ? '#f08c00' : 'none'} />
              </button>
              <div className="character-details">
                <div className="character-name" style={{ fontSize: 12, color: 'var(--primary-dark)' }}>
                  {cat?.label || m.category}
                </div>
                {editingId === m.id ? (
                  <textarea
                    value={editBuf}
                    onChange={e => setEditBuf(e.target.value)}
                    style={{
                      width: '100%', minHeight: 50, padding: 6, marginTop: 4,
                      border: '1px solid var(--border)', borderRadius: 6,
                      fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', resize: 'vertical',
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{m.content}</div>
                )}
              </div>
              <div className="character-actions" style={{ flexDirection: 'column', gap: 4 }}>
                {editingId === m.id ? (
                  <button className="header-btn" onClick={saveEdit} title="保存"><Check size={14} /></button>
                ) : (
                  <button className="header-btn" onClick={() => startEdit(m)} title="编辑"><Pencil size={14} /></button>
                )}
                <button className="btn-danger" onClick={() => remove(m.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
