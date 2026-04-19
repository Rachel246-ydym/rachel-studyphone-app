import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { ArrowLeft, Check, Plus } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export default function HomeworkBoard({ onBack }: Props) {
  const { state, dispatch } = useApp();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const unfinished = state.homework.filter(h => !h.isCompleted);
  const finished = state.homework.filter(h => h.isCompleted);

  function addHomework() {
    if (!title.trim()) return;
    dispatch({
      type: 'ADD_HOMEWORK',
      payload: {
        id: `hw-${Date.now()}`,
        title: title.trim(),
        description: desc.trim() || undefined,
        createdAt: Date.now(),
        isCompleted: false,
      },
    });
    setTitle('');
    setDesc('');
  }

  function formatDate(ts: number) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  return (
    <div className="homework-page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <h3>作业板</h3>
      </div>

      <div className="homework-list">
        {unfinished.length === 0 && finished.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>还没有作业，添加一个吧</p>
          </div>
        )}

        {unfinished.length > 0 && (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-light)', padding: '8px 4px', fontWeight: 500 }}>
              未完成 ({unfinished.length})
            </div>
            {unfinished.map(hw => (
              <div key={hw.id} className="homework-item">
                <button
                  className="homework-check"
                  onClick={() => dispatch({ type: 'COMPLETE_HOMEWORK', payload: hw.id })}
                >
                </button>
                <div className="homework-info">
                  <div className="homework-title">{hw.title}</div>
                  {hw.description && <div className="homework-desc">{hw.description}</div>}
                </div>
                <div className="homework-date">{formatDate(hw.createdAt)}</div>
              </div>
            ))}
          </>
        )}

        {finished.length > 0 && (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-light)', padding: '12px 4px 8px', fontWeight: 500 }}>
              已完成 ({finished.length})
            </div>
            {finished.map(hw => (
              <div key={hw.id} className="homework-item completed">
                <div className="homework-check done">
                  <Check size={14} />
                </div>
                <div className="homework-info">
                  <div className="homework-title" style={{ textDecoration: 'line-through' }}>{hw.title}</div>
                </div>
                <div className="homework-date">
                  {hw.completedAt && formatDate(hw.completedAt)}
                  <div style={{ fontSize: 11, color: '#aaa' }}>7天后自动删除</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="add-homework-form">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            placeholder="作业标题"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addHomework(); }}
          />
          <input
            placeholder="描述（可选）"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>
        <button className="send-btn" onClick={addHomework} disabled={!title.trim()}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
