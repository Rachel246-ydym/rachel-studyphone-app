import { useState, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { callAI, buildBookCommentPrompt } from '../../services/ai';
import { Upload, BookOpen, ChevronLeft, MessageSquare, Bookmark } from 'lucide-react';
import './Library.css';
import type { Book, BookMark } from '../../types';

export default function Library() {
  const { state, dispatch } = useApp();
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [readingView, setReadingView] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showMarks, setShowMarks] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBook = state.books.find(b => b.id === selectedBookId);
  const bookMarks = selectedBookId ? state.bookmarks.filter(bm => bm.bookId === selectedBookId) : [];

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.txt')) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const title = file.name.replace('.txt', '');
      const book: Book = {
        id: `book-${Date.now()}`,
        title,
        content,
        chapters: [{ index: 0, title: '全文', startPos: 0, endPos: content.length }],
        userProgress: 0,
        jiangxunProgress: 0,
        jiangxunDailyReadAmount: Math.floor(Math.random() * 500) + 200,
        addedAt: Date.now(),
      };
      dispatch({ type: 'ADD_BOOK', payload: book });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function updateProgress(bookId: string, pos: number) {
    dispatch({ type: 'UPDATE_BOOK', payload: { id: bookId, updates: { userProgress: pos } } });
  }

  function getProgressPercent(pos: number, total: number) {
    if (total === 0) return 0;
    return Math.round((pos / total) * 100);
  }

  function handleTextSelect() {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() && selectedBook) {
      const text = selection.toString().trim();
      const start = selectedBook.content.indexOf(text, Math.max(0, (selectedBook.userProgress || 0) - 1000));
      if (start >= 0) {
        setSelectionStart(start);
        setSelectionEnd(start + text.length);
      }
    }
  }

  async function addBookmark() {
    if (selectionStart === null || selectionEnd === null || !selectedBook) return;
    const markedText = selectedBook.content.slice(selectionStart, selectionEnd);

    const mark: BookMark = {
      id: `bm-${Date.now()}`,
      bookId: selectedBook.id,
      authorId: 'user',
      authorName: state.userProfile.name,
      startPos: selectionStart,
      endPos: selectionEnd,
      markedText,
      comment: commentText.trim(),
      timestamp: Date.now(),
      replies: [],
    };
    dispatch({ type: 'ADD_BOOKMARK', payload: mark });

    // Generate Jiangxun's comment on this passage
    if (state.apiKey) {
      const jiangxunComment = await callAI(
        state.apiKey,
        state.aiModel,
        [{ role: 'system', content: buildBookCommentPrompt(markedText, selectedBook.title) }],
      );
      dispatch({
        type: 'ADD_BOOKMARK_REPLY',
        payload: {
          bookmarkId: mark.id,
          reply: {
            id: `reply-${Date.now()}`,
            authorId: 'jiangxun',
            authorName: '江浔',
            content: jiangxunComment,
            timestamp: Date.now(),
          },
        },
      });
    }

    setSelectionStart(null);
    setSelectionEnd(null);
    setCommentText('');
  }

  function addReply(bookmarkId: string, content: string) {
    dispatch({
      type: 'ADD_BOOKMARK_REPLY',
      payload: {
        bookmarkId,
        reply: {
          id: `reply-${Date.now()}`,
          authorId: 'user',
          authorName: state.userProfile.name,
          content,
          timestamp: Date.now(),
        },
      },
    });
  }

  // Reading view
  if (readingView && selectedBook) {
    const PAGE_SIZE = 1000;
    const currentPage = Math.floor(selectedBook.userProgress / PAGE_SIZE);
    const pageStart = currentPage * PAGE_SIZE;
    const pageEnd = Math.min(pageStart + PAGE_SIZE, selectedBook.content.length);
    const pageText = selectedBook.content.slice(pageStart, pageEnd);
    const totalPages = Math.ceil(selectedBook.content.length / PAGE_SIZE);

    return (
      <div className="library-reading">
        <div className="reading-header">
          <button className="back-btn" onClick={() => setReadingView(false)}>
            <ChevronLeft size={20} />
          </button>
          <h3>{selectedBook.title}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`header-btn ${showMarks ? 'active' : ''}`}
              onClick={() => setShowMarks(!showMarks)}
              title="批注"
            >
              <Bookmark size={18} />
            </button>
          </div>
        </div>

        {showMarks ? (
          <div className="marks-panel">
            <h4 style={{ padding: '12px 16px', margin: 0 }}>批注与评论</h4>
            {bookMarks.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <p>还没有批注</p>
              </div>
            ) : (
              bookMarks.map(mark => (
                <div key={mark.id} className="mark-card">
                  <div className="mark-text">"{mark.markedText.slice(0, 100)}{mark.markedText.length > 100 ? '...' : ''}"</div>
                  <div className="mark-comment">
                    <strong>{mark.authorName}：</strong>{mark.comment}
                  </div>
                  {mark.replies.map(r => (
                    <div key={r.id} className="mark-reply">
                      <strong>{r.authorName}：</strong>{r.content}
                    </div>
                  ))}
                  <input
                    className="mark-reply-input"
                    placeholder="回复..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                        addReply(mark.id, (e.target as HTMLInputElement).value.trim());
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="reading-content" onMouseUp={handleTextSelect}>
              <pre className="reading-text">{pageText}</pre>
            </div>

            {selectionStart !== null && (
              <div className="selection-toolbar">
                <input
                  placeholder="写点评论..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                />
                <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={addBookmark}>
                  <MessageSquare size={14} /> 标记
                </button>
                <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => { setSelectionStart(null); setSelectionEnd(null); }}>
                  取消
                </button>
              </div>
            )}

            <div className="reading-footer">
              <button
                className="btn-secondary"
                disabled={currentPage === 0}
                onClick={() => updateProgress(selectedBook.id, Math.max(0, pageStart - PAGE_SIZE))}
              >上一页</button>
              <span className="page-info">{currentPage + 1} / {totalPages}</span>
              <button
                className="btn-secondary"
                disabled={pageEnd >= selectedBook.content.length}
                onClick={() => updateProgress(selectedBook.id, pageEnd)}
              >下一页</button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Book list view
  return (
    <div className="library-page">
      <div className="page-header">
        <h3 style={{ flex: 1 }}>图书馆</h3>
        <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} /> 上传TXT
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>

      <div className="book-list">
        {state.books.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <p>图书馆还是空的<br />上传一本TXT书籍开始阅读吧</p>
          </div>
        ) : (
          state.books.map(book => (
            <div key={book.id} className="book-card" onClick={() => { setSelectedBookId(book.id); setReadingView(true); }}>
              <div className="book-icon">📖</div>
              <div className="book-info">
                <div className="book-title">{book.title}</div>
                <div className="book-meta">{(book.content.length / 1000).toFixed(1)}k 字</div>
                <div className="book-progress-row">
                  <div className="progress-item">
                    <span>我</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${getProgressPercent(book.userProgress, book.content.length)}%` }} />
                    </div>
                    <span>{getProgressPercent(book.userProgress, book.content.length)}%</span>
                  </div>
                  <div className="progress-item">
                    <span>江浔</span>
                    <div className="progress-bar">
                      <div className="progress-fill jiangxun" style={{ width: `${getProgressPercent(book.jiangxunProgress, book.content.length)}%` }} />
                    </div>
                    <span>{getProgressPercent(book.jiangxunProgress, book.content.length)}%</span>
                  </div>
                </div>
              </div>
              <BookOpen size={20} color="var(--primary)" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
