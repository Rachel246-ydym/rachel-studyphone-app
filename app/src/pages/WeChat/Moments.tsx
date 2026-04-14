import { useState, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { ArrowLeft, Heart, MessageSquare, Plus, Image as ImageIcon } from 'lucide-react';
import type { MomentsComment } from '../../types';

interface Props {
  onBack: () => void;
}

async function fileToDataUrl(file: File, max = 1024): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export default function Moments({ onBack }: Props) {
  const { state, dispatch } = useApp();
  const [newPost, setNewPost] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const bgFileRef = useRef<HTMLInputElement>(null);

  async function onBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await fileToDataUrl(f);
    dispatch({ type: 'SET_MOMENTS_BG', payload: url });
    e.target.value = '';
  }

  function handlePost() {
    if (!newPost.trim()) return;
    dispatch({
      type: 'ADD_MOMENT',
      payload: {
        id: `moment-${Date.now()}`,
        authorId: 'user',
        authorName: state.userProfile.name,
        authorAvatar: state.userProfile.avatar,
        content: newPost.trim(),
        timestamp: Date.now(),
        likes: [],
        comments: [],
      },
    });
    setNewPost('');
    setShowNewPost(false);
  }

  function toggleLike(momentId: string) {
    const moment = state.moments.find(m => m.id === momentId);
    if (!moment) return;
    const liked = moment.likes.includes('user');
    dispatch({
      type: 'UPDATE_MOMENT',
      payload: {
        id: momentId,
        updates: {
          likes: liked
            ? moment.likes.filter(l => l !== 'user')
            : [...moment.likes, 'user'],
        },
      },
    });
  }

  function addComment(momentId: string) {
    const text = commentInputs[momentId]?.trim();
    if (!text) return;
    const moment = state.moments.find(m => m.id === momentId);
    if (!moment) return;
    const comment: MomentsComment = {
      id: `comment-${Date.now()}`,
      authorId: 'user',
      authorName: state.userProfile.name,
      content: text,
      timestamp: Date.now(),
    };
    dispatch({
      type: 'UPDATE_MOMENT',
      payload: {
        id: momentId,
        updates: { comments: [...moment.comments, comment] },
      },
    });
    setCommentInputs({ ...commentInputs, [momentId]: '' });
  }

  function formatTime(ts: number) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function getAvatar(authorId: string, authorAvatar?: string) {
    if (authorAvatar) return <img src={authorAvatar} alt="" />;
    if (authorId === 'user') return state.userProfile.name[0];
    if (authorId === 'jiangxun') return '浔';
    return '?';
  }

  return (
    <div className="moments-page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <h3>朋友圈</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="header-btn" onClick={() => bgFileRef.current?.click()} title="更换背景图">
            <ImageIcon size={18} />
          </button>
          <button className="header-btn" onClick={() => setShowNewPost(!showNewPost)}>
            <Plus size={18} />
          </button>
        </div>
        <input
          ref={bgFileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onBgUpload}
        />
      </div>

      {state.momentsBackgroundImage && (
        <div className="moments-cover">
          <img src={state.momentsBackgroundImage} alt="" />
        </div>
      )}

      {showNewPost && (
        <div style={{ padding: 16, background: 'var(--bg-white)', borderBottom: '1px solid var(--border)' }}>
          <textarea
            placeholder="说点什么吧..."
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            style={{
              width: '100%', minHeight: 80, padding: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', fontFamily: 'var(--sans)', fontSize: 14,
              resize: 'vertical', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setShowNewPost(false)}>取消</button>
            <button className="btn-primary" onClick={handlePost}>发布</button>
          </div>
        </div>
      )}

      <div className="moments-list">
        {state.moments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📷</div>
            <p>朋友圈还没有内容</p>
          </div>
        ) : (
          state.moments.map(moment => (
            <div key={moment.id} className="moment-card">
              <div className="moment-author">
                <div className="moment-avatar">{getAvatar(moment.authorId, moment.authorAvatar)}</div>
                <div>
                  <div className="moment-name">{moment.authorName}</div>
                  <div className="moment-time">{formatTime(moment.timestamp)}</div>
                </div>
              </div>
              <div className="moment-content">{moment.content}</div>
              <div className="moment-actions">
                <button
                  className={`moment-action-btn ${moment.likes.includes('user') ? 'liked' : ''}`}
                  onClick={() => toggleLike(moment.id)}
                >
                  <Heart size={14} fill={moment.likes.includes('user') ? 'currentColor' : 'none'} />
                  {moment.likes.length || ''}
                </button>
                <button className="moment-action-btn">
                  <MessageSquare size={14} />
                  {moment.comments.length || ''}
                </button>
              </div>
              {moment.comments.length > 0 && (
                <div className="moment-comments">
                  {moment.comments.map(c => (
                    <div key={c.id} className="moment-comment-item">
                      <span className="moment-comment-author">{c.authorName}：</span>
                      {c.content}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  style={{
                    flex: 1, padding: '6px 12px', border: '1px solid var(--border)',
                    borderRadius: 16, fontSize: 13, outline: 'none', fontFamily: 'var(--sans)',
                  }}
                  placeholder="评论..."
                  value={commentInputs[moment.id] || ''}
                  onChange={e => setCommentInputs({ ...commentInputs, [moment.id]: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') addComment(moment.id); }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
