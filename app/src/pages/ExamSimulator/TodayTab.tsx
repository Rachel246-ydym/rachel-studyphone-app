import { useState } from 'react';
import { CheckCircle, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { SUBJECT_LABELS, CALENDAR_MILESTONES } from '../../utils/prompts';
import type { StudyTask } from '../../types';
import { toDateStr } from './utils';

interface TodayTabProps {
  allTasks: StudyTask[];
  today: string;
  onComplete: (id: string) => void;
  onMakeupSingle: (id: string) => void;
}

export default function TodayTab({ allTasks, today, onComplete, onMakeupSingle }: TodayTabProps) {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [viewDate, setViewDate] = useState<string>(today);

  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();

  function getDateStr(day: number) {
    return toDateStr(new Date(calYear, calMonth, day));
  }

  function getDayStatus(day: number): 'none' | 'complete' | 'partial' | 'pending' {
    const dateStr = getDateStr(day);
    if (dateStr > today) return 'none';
    const dayTasks = allTasks.filter(t => t.date === dateStr && !t.isReview);
    if (dayTasks.length === 0) return 'none';
    if (dayTasks.every(t => t.isCompleted)) return 'complete';
    if (dayTasks.some(t => t.isCompleted)) return 'partial';
    return 'pending';
  }

  function getMilestone(dateStr: string) {
    return CALENDAR_MILESTONES.find(m => m.date === dateStr);
  }

  const selectedTasks = allTasks.filter(t => t.date === viewDate);
  const normal = selectedTasks.filter(t => !t.isReview);
  const reviews = selectedTasks.filter(t => t.isReview);
  const done = selectedTasks.filter(t => t.isCompleted).length;
  const reward = selectedTasks.filter(t => t.isCompleted).reduce((s, t) => s + t.haibiReward, 0);

  const isToday = viewDate === today;
  const isFuture = viewDate > today;
  const isPast = viewDate < today;
  const ms = getMilestone(viewDate);

  return (
    <div className="task-list">
      {/* Calendar */}
      <div className="exam-calendar">
        <div className="calendar-nav">
          <button
            className="back-btn"
            onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="calendar-month">{calYear}年{calMonth + 1}月</span>
          <button
            className="back-btn"
            onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))}
          >
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
            const milestone = getMilestone(dateStr);
            const isCurrentDay = dateStr === today;
            const isFutureDay = dateStr > today;
            const isSelected = dateStr === viewDate;
            return (
              <div
                key={day}
                className={[
                  'calendar-day',
                  status,
                  isCurrentDay ? 'today' : '',
                  isFutureDay ? 'future' : '',
                  milestone ? 'milestone' : '',
                  isSelected ? 'selected' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setViewDate(dateStr)}
                title={milestone ? milestone.label : undefined}
              >
                {day}
                {milestone && <div className="day-milestone">{milestone.emoji}</div>}
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
      </div>

      {/* Day header */}
      <div className="today-progress-card">
        <div className="today-progress-row">
          <span>
            {isToday ? '今日任务' : viewDate}
            {ms && <span style={{ marginLeft: 6 }}>{ms.emoji} {ms.label}</span>}
            {isFuture && !ms && (
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-light)' }}>预览</span>
            )}
          </span>
          <span style={{ color: '#e65100' }}>
            {done}/{selectedTasks.length} 完成 · +{reward} 🪙
          </span>
        </div>
        {selectedTasks.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>
            {isFuture ? '该日任务尚未生成（届时自动创建）' : '这天没有任务记录'}
          </div>
        )}
        {isPast && selectedTasks.some(t => !t.isCompleted) && (
          <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>
            补卡仅获得一半海币，不计入连续打卡
          </div>
        )}
      </div>

      {/* Review tasks */}
      {reviews.length > 0 && (
        <div className="review-section">
          <div className="section-title">🔁 复习任务</div>
          {reviews.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              isPast={isPast}
              isFuture={isFuture}
              onComplete={onComplete}
              onMakeup={onMakeupSingle}
            />
          ))}
        </div>
      )}

      {/* Normal tasks */}
      {normal.length > 0 && (
        <>
          <div className="section-title">
            {isToday ? '📌 今日任务' : isFuture ? '📋 预定任务' : '📋 历史任务'}
          </div>
          {normal.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              isPast={isPast}
              isFuture={isFuture}
              onComplete={onComplete}
              onMakeup={onMakeupSingle}
            />
          ))}
        </>
      )}
    </div>
  );
}

function TaskRow({
  task,
  isPast,
  isFuture,
  onComplete,
  onMakeup,
}: {
  task: StudyTask;
  isPast: boolean;
  isFuture: boolean;
  onComplete: (id: string) => void;
  onMakeup: (id: string) => void;
}) {
  return (
    <div className={`task-item ${task.isCompleted ? 'completed' : ''} ${task.isReview ? 'review' : ''}`}>
      <button
        className="task-check"
        onClick={() => !isFuture && onComplete(task.id)}
        disabled={task.isCompleted || isFuture}
      >
        {task.isCompleted ? <CheckCircle size={22} /> : <Circle size={22} />}
      </button>
      <div className="task-info">
        <div className="task-subject">{SUBJECT_LABELS[task.subject]}</div>
        <div className="task-title">{task.title}</div>
        <div className="task-desc">{task.description}</div>
        {task.isReview && <span className="review-badge">复习</span>}
        {task.makeup && <span className="makeup-badge">补卡</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div className="task-reward">+{task.haibiReward} 🪙</div>
        {isPast && !task.isCompleted && (
          <button className="btn-secondary tiny" onClick={() => onMakeup(task.id)}>
            补卡
          </button>
        )}
      </div>
    </div>
  );
}
