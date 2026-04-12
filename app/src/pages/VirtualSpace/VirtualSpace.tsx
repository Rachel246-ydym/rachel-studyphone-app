import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { ChevronLeft, ChevronRight, Plus, Eye, EyeOff } from 'lucide-react';
import './VirtualSpace.css';

export default function VirtualSpace() {
  const { state, dispatch } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState('');
  const [newFeeling, setNewFeeling] = useState('');
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [showTab, setShowTab] = useState<'notes' | 'period'>('notes');
  const [viewAs, setViewAs] = useState<'user' | 'jiangxun'>('user');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  function formatDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  // Check if date has entries
  function hasEntry(day: number) {
    const dateStr = formatDateStr(day);
    return state.virtualSpaceEntries.some(e => e.date === dateStr);
  }

  // Check if date is in period
  function isInPeriod(day: number) {
    const dateStr = formatDateStr(day);
    return state.periodRecords.some(p => {
      if (!p.startDate) return false;
      const start = p.startDate;
      const end = p.endDate || start;
      return dateStr >= start && dateStr <= end;
    });
  }

  // Get entries for selected date
  const selectedEntries = selectedDate
    ? state.virtualSpaceEntries.filter(e => e.date === selectedDate)
    : [];

  const selectedFootprints = selectedDate
    ? state.footprints.filter(f => {
        const entry = state.virtualSpaceEntries.find(e => e.id === f.entryId);
        return entry?.date === selectedDate;
      })
    : [];

  function addEntry() {
    if (!newEntry.trim() || !selectedDate) return;
    const entry = {
      id: `vs-${Date.now()}`,
      date: selectedDate,
      authorId: viewAs,
      content: newEntry.trim(),
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_VS_ENTRY', payload: entry });

    // If there's a feeling, add it as a "hidden" footprint
    if (newFeeling.trim()) {
      dispatch({
        type: 'ADD_FOOTPRINT',
        payload: {
          id: `fp-${Date.now()}`,
          entryId: entry.id,
          authorId: viewAs,
          content: `${viewAs === 'user' ? state.userProfile.name : '江浔'}到此一游`,
          feeling: newFeeling.trim(),
          timestamp: Date.now(),
        },
      });
    }

    setNewEntry('');
    setNewFeeling('');
  }

  function addPeriodRecord() {
    if (!periodStart) return;
    dispatch({
      type: 'ADD_PERIOD',
      payload: {
        id: `period-${Date.now()}`,
        startDate: periodStart,
      },
    });
    setPeriodStart('');
    setShowPeriodForm(false);
  }

  function endPeriod(id: string) {
    const today = new Date().toISOString().slice(0, 10);
    dispatch({ type: 'UPDATE_PERIOD', payload: { id, updates: { endDate: today } } });
  }

  // Predict next period
  const completedPeriods = state.periodRecords.filter(p => p.endDate);
  let predictedNext = '';
  if (completedPeriods.length >= 2) {
    const cycles = completedPeriods.slice(-3).map((p, i, arr) => {
      if (i === 0) return null;
      const prev = new Date(arr[i - 1].startDate);
      const curr = new Date(p.startDate);
      return Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    }).filter(Boolean) as number[];
    const avgCycle = Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length);
    const lastStart = new Date(completedPeriods[completedPeriods.length - 1].startDate);
    const nextDate = new Date(lastStart.getTime() + avgCycle * 24 * 60 * 60 * 1000);
    predictedNext = nextDate.toISOString().slice(0, 10);
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="virtual-space">
      <div className="vs-header">
        <h2>虚拟空间</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={showTab === 'notes' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '4px 12px', fontSize: 13 }}
            onClick={() => setShowTab('notes')}
          >备忘录</button>
          <button
            className={showTab === 'period' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '4px 12px', fontSize: 13 }}
            onClick={() => setShowTab('period')}
          >经期记录</button>
        </div>
      </div>

      {/* Calendar */}
      <div className="vs-calendar">
        <div className="calendar-nav">
          <button className="back-btn" onClick={prevMonth}><ChevronLeft size={18} /></button>
          <span className="calendar-month">{year}年{month + 1}月</span>
          <button className="back-btn" onClick={nextMonth}><ChevronRight size={18} /></button>
        </div>
        <div className="calendar-weekdays">
          {weekDays.map(d => <div key={d} className="calendar-weekday">{d}</div>)}
        </div>
        <div className="calendar-days">
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = formatDateStr(day);
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const hasPeriod = isInPeriod(day);
            const hasNote = hasEntry(day);

            return (
              <div
                key={day}
                className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasPeriod ? 'period' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                {day}
                {hasNote && <div className="day-dot note-dot" />}
                {hasPeriod && <div className="day-dot period-dot" />}
              </div>
            );
          })}
        </div>
      </div>

      {showTab === 'notes' && (
        <div className="vs-content">
          {selectedDate ? (
            <>
              <div className="vs-date-title">{selectedDate} 的记录</div>
              <div className="vs-switch-view">
                <button
                  className={viewAs === 'user' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 12px', fontSize: 12 }}
                  onClick={() => setViewAs('user')}
                >我的视角</button>
                <button
                  className={viewAs === 'jiangxun' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 12px', fontSize: 12 }}
                  onClick={() => setViewAs('jiangxun')}
                >江浔的视角</button>
              </div>

              <div className="vs-entries">
                {selectedEntries.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <p>这天还没有记录</p>
                  </div>
                ) : (
                  selectedEntries.map(entry => {
                    const entryFootprints = selectedFootprints.filter(f => f.entryId === entry.id);
                    return (
                      <div key={entry.id} className="vs-entry-card">
                        <div className="vs-entry-author">
                          {entry.authorId === 'user' ? state.userProfile.name : '江浔'}
                        </div>
                        <div className="vs-entry-content">{entry.content}</div>
                        {entryFootprints.map(fp => (
                          <div key={fp.id} className="vs-footprint">
                            <div className="footprint-visible">
                              👣 {fp.content}
                            </div>
                            {/* "Hidden" feelings - actually visible to the other person */}
                            {fp.authorId !== viewAs && fp.feeling && (
                              <div className="footprint-feeling">
                                <Eye size={12} /> 对方的隐藏感受：{fp.feeling}
                              </div>
                            )}
                            {fp.authorId === viewAs && fp.feeling && (
                              <div className="footprint-feeling own">
                                <EyeOff size={12} /> 你的隐藏感受（对方看不见...吗？）：{fp.feeling}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="vs-input-area">
                <input
                  className="chat-input"
                  placeholder="写点什么..."
                  value={newEntry}
                  onChange={e => setNewEntry(e.target.value)}
                />
                <input
                  className="chat-input"
                  placeholder="隐藏感受（对方看不见哦~）"
                  value={newFeeling}
                  onChange={e => setNewFeeling(e.target.value)}
                  style={{ fontSize: 13 }}
                />
                <button className="btn-primary" onClick={addEntry} style={{ marginTop: 4 }}>
                  <Plus size={14} /> 添加
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>点击日历上的日期查看或添加记录</p>
            </div>
          )}
        </div>
      )}

      {showTab === 'period' && (
        <div className="vs-content">
          <div className="vs-date-title">经期记录</div>

          {predictedNext && (
            <div className="period-prediction">
              🔮 预测下次经期开始日：<strong>{predictedNext}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn-primary" onClick={() => setShowPeriodForm(!showPeriodForm)}>
              <Plus size={14} /> 记录经期
            </button>
          </div>

          {showPeriodForm && (
            <div style={{ padding: 12, background: 'var(--bg-white)', borderRadius: 'var(--radius-sm)', marginBottom: 12, border: '1px solid var(--border-light)' }}>
              <div className="form-group">
                <label>开始日期</label>
                <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={addPeriodRecord}>保存</button>
                <button className="btn-secondary" onClick={() => setShowPeriodForm(false)}>取消</button>
              </div>
            </div>
          )}

          <div className="period-list">
            {state.periodRecords.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <p>还没有经期记录</p>
              </div>
            ) : (
              [...state.periodRecords].reverse().map(record => (
                <div key={record.id} className="period-item">
                  <div>
                    <span style={{ fontWeight: 500 }}>开始：{record.startDate}</span>
                    {record.endDate && <span style={{ marginLeft: 12 }}>结束：{record.endDate}</span>}
                  </div>
                  {!record.endDate && (
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '2px 10px' }} onClick={() => endPeriod(record.id)}>
                      标记结束
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
