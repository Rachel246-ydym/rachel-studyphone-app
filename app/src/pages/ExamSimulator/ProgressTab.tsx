// Progress tab — overall progress bars + countdown + monthly calendar with
// milestones + day detail panel with per-task makeup buttons.
import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Circle } from 'lucide-react';
import {
  SUBJECT_LABELS,
  MATH_LECTURES,
  CALENDAR_MILESTONES,
  CET6_DATE,
  EXAM_DATE,
} from '../../utils/prompts';
import type { StudyTask, StudyStats } from '../../types';
import { daysToExam, toDateStr } from './utils';

interface ProgressTabProps {
  tasks: StudyTask[];
  stats: StudyStats;
  today: string;
  onMakeupSingle: (taskId: string) => void;
  onComplete: (taskId: string) => void;
}

export default function ProgressTab({
  tasks,
  stats,
  today,
  onMakeupSingle,
  onComplete,
}: ProgressTabProps) {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [viewDate, setViewDate] = useState<string | null>(null);

  // Countdown
  const leftDays = daysToExam();
  const cet6Left = Math.max(
    0,
    Math.ceil(
      (new Date(CET6_DATE + 'T00:00:00').getTime() - Date.now()) / 86400000,
    ),
  );

  // Overall progress by subject
  const totalMath = tasks.filter(t => t.subject === 'math').length;
  const doneMath = tasks.filter(t => t.subject === 'math' && t.isCompleted).length;
  const totalEng = tasks.filter(t => t.subject === 'english').length;
  const doneEng = tasks.filter(t => t.subject === 'english' && t.isCompleted).length;
  const totalPro = tasks.filter(t => t.subject === 'professional').length;
  const donePro = tasks.filter(t => t.subject === 'professional' && t.isCompleted).length;
  const totalPol = tasks.filter(t => t.subject === 'politics').length;
  const donePol = tasks.filter(t => t.subject === 'politics' && t.isCompleted).length;

  // Math lectures fully covered (rough): count distinct lectures touched via math task titles
  const mathLecturesTouched = new Set(
    tasks
      .filter(t => t.subject === 'math' && t.isCompleted)
      .map(t => {
        const m = t.title.match(/第(\d+)讲/);
        return m ? m[1] : '';
      })
      .filter(Boolean),
  );

  // Calendar info
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();

  function getDateStr(day: number) {
    return toDateStr(new Date(calYear, calMonth, day));
  }
  function getDayStatus(day: number): 'none' | 'complete' | 'partial' | 'pending' {
    const dateStr = getDateStr(day);
    const dayTasks = tasks.filter(t => t.date === dateStr);
    if (dayTasks.length === 0) return 'none';
    if (dayTasks.every(t => t.isCompleted)) return 'complete';
    if (dayTasks.some(t => t.isCompleted)) return 'partial';
    return 'pending';
  }
  function getMilestone(dateStr: string) {
    return CALENDAR_MILESTONES.find(m => m.date === dateStr);
  }

  // Pending reviews (not today, not future)
  const pendingReviews = tasks
    .filter(t => t.isReview && !t.isCompleted && t.date < today)
    .slice(0, 5);

  return (
    <div className="progress-tab">
      {/* Countdown card */}
      <div className="overall-card">
        <div className="big-countdown">
          <div className="count-num">{leftDays}</div>
          <div className="count-label">距 12/19 初试</div>
        </div>
        <div className="count-sub">
          六级考试 {CET6_DATE} · 还有 {cet6Left} 天 · 考研 {EXAM_DATE}
        </div>
      </div>

      {/* Subject progress */}
      <div className="overall-card">
        <div className="section-title">📈 各科进度</div>
        <ProgressRow label="数学（张宇18讲）" done={mathLecturesTouched.size} total={MATH_LECTURES.length} unit="讲" />
        <ProgressRow label="数学任务天数" done={doneMath} total={totalMath} unit="天" />
        <ProgressRow label="英语小项" done={doneEng} total={totalEng} unit="项" />
        {totalPro > 0 && <ProgressRow label="专业课 891" done={donePro} total={totalPro} unit="天" />}
        {totalPol > 0 && <ProgressRow label="政治" done={donePol} total={totalPol} unit="天" />}
      </div>

      {/* Stats chips */}
      <div className="stat-chips">
        <div className="chip">🔥 连续 {stats.currentStreak} 天</div>
        <div className="chip">🏆 最长 {stats.longestStreak} 天</div>
        <div className="chip">📊 专注 {stats.focus}</div>
        <div className="chip">💪 毅力 {stats.perseverance}</div>
        <div className="chip">🗓️ 累计 {stats.totalDaysCheckedIn} 天</div>
      </div>

      {/* Pending reviews panel */}
      {pendingReviews.length > 0 && (
        <div className="review-panel">
          <div className="section-title">⏰ 待复习</div>
          {pendingReviews.map(r => (
            <div key={r.id} className="review-row">
              <span style={{ flex: 1 }}>{r.date} · {r.title}</span>
              <button className="btn-primary small" onClick={() => onComplete(r.id)}>
                完成
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <div className="exam-calendar">
        <div className="calendar-nav">
          <button className="back-btn" onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))}>
            <ChevronLeft size={18} />
          </button>
          <span className="calendar-month">{calYear}年{calMonth + 1}月</span>
          <button className="back-btn" onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="calendar-weekdays">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d} className="calendar-weekday">{d}</div>
          ))}
        </div>
        <div className="calendar-days">
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`e${i}`} className="calendar-day empty" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const status = getDayStatus(day);
            const dateStr = getDateStr(day);
            const ms = getMilestone(dateStr);
            const isToday = dateStr === today;
            const isFuture = dateStr > today;
            return (
              <div
                key={day}
                className={`calendar-day ${status} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''} ${ms ? 'milestone' : ''}`}
                onClick={() => setViewDate(dateStr)}
                title={ms ? ms.label : undefined}
              >
                {day}
                {ms && <div className="day-milestone">{ms.emoji}</div>}
                {status === 'complete' && <div className="day-check">✓</div>}
              </div>
            );
          })}
        </div>
        <div className="calendar-legend">
          <span><span className="legend-dot complete" /> 全完成</span>
          <span><span className="legend-dot partial" /> 部分</span>
          <span><span className="legend-dot pending" /> 未完成</span>
        </div>

        {viewDate && (() => {
          const dayTasks = tasks.filter(t => t.date === viewDate);
          const isFuture = viewDate > today;
          const isPast = viewDate < today;
          const ms = getMilestone(viewDate);
          return (
            <div className="calendar-day-detail">
              <div className="detail-header">
                <strong>{viewDate}</strong>
                {ms && <span className="detail-badge">{ms.emoji} {ms.label}</span>}
                {isFuture && !ms && <span className="detail-badge">预览未来</span>}
                <button className="back-btn" onClick={() => setViewDate(null)} style={{ marginLeft: 'auto' }}>×</button>
              </div>
              {dayTasks.length === 0 ? (
                <div className="empty-hint">这天没有任务记录</div>
              ) : (
                dayTasks.map(t => (
                  <div key={t.id} className="detail-task">
                    <button
                      className="task-check"
                      onClick={() => !t.isCompleted && onComplete(t.id)}
                      disabled={t.isCompleted}
                      style={{ marginRight: 6 }}
                    >
                      {t.isCompleted ? <CheckCircle size={16} /> : <Circle size={16} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="detail-subject">{SUBJECT_LABELS[t.subject]}</div>
                      <div className="detail-title">{t.title}</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-light)', marginRight: 6 }}>
                      +{t.haibiReward}🪙
                    </span>
                    {isPast && !t.isCompleted && (
                      <button
                        className="btn-secondary tiny"
                        onClick={() => onMakeupSingle(t.id)}
                      >
                        补卡
                      </button>
                    )}
                  </div>
                ))
              )}
              {isPast && dayTasks.some(t => !t.isCompleted) && (
                <div className="detail-hint">补卡仅获得一半海币，不计入连续打卡</div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  done,
  total,
  unit,
}: {
  label: string;
  done: number;
  total: number;
  unit: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="pr-row">
      <div className="pr-label">
        <span>{label}</span>
        <span>{done}/{total} {unit}</span>
      </div>
      <div className="pr-bar">
        <div className="pr-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
