import { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { CheckCircle, Circle, Trophy, Calendar, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { SUBJECT_LABELS, MATH_LECTURES } from '../../utils/prompts';
import type { ChatMessage, StudyTask } from '../../types';
import './ExamSimulator.css';

// April 1, 2026 marks day 0 of the plan.
const PLAN_START = new Date(2026, 3, 1); // month is 0-indexed

function dayOffset(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.floor((d.getTime() - PLAN_START.getTime()) / (24 * 60 * 60 * 1000));
}

function mathLectureForDay(offset: number): string {
  if (offset < 0) return MATH_LECTURES[0];
  // 1 lecture every ~4 days, clamped to the end
  const idx = Math.min(MATH_LECTURES.length - 1, Math.floor(offset / 4));
  return MATH_LECTURES[idx];
}

export default function ExamSimulator() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'tasks' | 'calendar' | 'achievements'>('tasks');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [viewDate, setViewDate] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  // Generate today's tasks + fill in the past 13 days as "未打卡可补" if
  // they don't exist yet. New users starting on April 14 will see April 1-13
  // as makeup-available days.
  useEffect(() => {
    // Today
    const todayTasks = state.studyTasks.filter(t => t.date === today);
    if (todayTasks.length === 0) {
      generateDailyTasksFor(today);
    }
    // Backfill last 13 days for makeup (only if plan has started)
    for (let i = 1; i <= 13; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      if (d < PLAN_START) continue;
      const existing = state.studyTasks.filter(t => t.date === ds);
      if (existing.length === 0) {
        generateDailyTasksFor(ds);
      }
    }
    // Check for review tasks
    generateReviewTasks();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function generateDailyTasksFor(dateStr: string) {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const offset = dayOffset(dateStr);
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const tasks: StudyTask[] = [];
    tasks.push({
      id: `task-${stamp}-math`,
      date: dateStr,
      subject: 'math' as const,
      title: `张宇高数：${mathLectureForDay(offset)}`,
      description: '完成对应讲次视频 + 配套练习（1000题相关题目）',
      isCompleted: false,
      isReview: false,
      haibiReward: 8,
    });

    // English - always present
    tasks.push({
      id: `task-${stamp}-eng`,
      date: dateStr,
      subject: 'english' as const,
      title: '英语每日任务',
      description: '单词背诵（真题词） + 听力精听 + 阅读练习',
      isCompleted: false,
      isReview: false,
      haibiReward: 6,
    });

    // Professional course - from late April
    if (month > 4 || (month === 4 && d.getDate() >= 20)) {
      tasks.push({
        id: `task-${stamp}-pro`,
        date: dateStr,
        subject: 'professional' as const,
        title: '专业课891：摄影测量与遥感',
        description: '以RS遥感为核心，每天1小时起步',
        isCompleted: false,
        isReview: false,
        haibiReward: 6,
      });
    }

    // Politics - from July
    if (month >= 7) {
      tasks.push({
        id: `task-${stamp}-pol`,
        date: dateStr,
        subject: 'politics' as const,
        title: '政治基础',
        description: '肖秀荣/徐涛核心考点',
        isCompleted: false,
        isReview: false,
        haibiReward: 4,
      });
    }

    tasks.forEach(task => dispatch({ type: 'ADD_STUDY_TASK', payload: task }));
  }

  function generateReviewTasks() {
    // Ebbinghaus intervals: 1, 2, 4, 7, 15, 30 days
    const intervals = [1, 2, 4, 7, 15, 30];
    const completedTasks = state.studyTasks.filter(t => t.isCompleted && !t.isReview && t.completedAt);

    completedTasks.forEach(task => {
      intervals.forEach(interval => {
        const reviewDate = new Date(task.completedAt!);
        reviewDate.setDate(reviewDate.getDate() + interval);
        const reviewDateStr = reviewDate.toISOString().slice(0, 10);

        if (reviewDateStr !== today) return;

        // Check if review task already exists
        const exists = state.studyTasks.some(
          t => t.isReview && t.reviewOf === task.id && t.date === reviewDateStr
        );
        if (exists) return;

        dispatch({
          type: 'ADD_STUDY_TASK',
          payload: {
            id: `review-${Date.now()}-${task.id}-${interval}`,
            date: reviewDateStr,
            subject: task.subject,
            title: `复习：${task.title}`,
            description: `复习第${interval}天 - ${task.description}`,
            isCompleted: false,
            isReview: true,
            reviewOf: task.id,
            haibiReward: 3,
          },
        });
      });
    });
  }

  function completeTask(taskId: string) {
    const task = state.studyTasks.find(t => t.id === taskId);
    if (!task || task.isCompleted) return;

    dispatch({ type: 'COMPLETE_TASK', payload: taskId });
    dispatch({ type: 'ADD_HAIBI', payload: { target: 'user', amount: task.haibiReward } });

    // Update stats
    const todayTasks = state.studyTasks.filter(t => t.date === today);
    const allCompleted = todayTasks.every(t => t.id === taskId || t.isCompleted);

    if (allCompleted) {
      const newStreak = state.studyStats.currentStreak + 1;
      dispatch({
        type: 'UPDATE_STATS',
        payload: {
          totalDaysCheckedIn: state.studyStats.totalDaysCheckedIn + 1,
          currentStreak: newStreak,
          longestStreak: Math.max(state.studyStats.longestStreak, newStreak),
          focus: Math.min(100, state.studyStats.focus + 2),
          perseverance: Math.min(100, state.studyStats.perseverance + 1),
        },
      });

      // Check achievements
      checkAchievements(newStreak);
    }
  }

  function notifyUnlock(title: string) {
    // Push a Jiangxun congrats message into the chat; mirrors into 朋友圈
    const now = Date.now();
    const msg: ChatMessage = {
      id: `ach-${now}`,
      contactId: 'jiangxun',
      senderId: 'jiangxun',
      senderName: '江浔',
      content: `🏆 解锁成就「${title}」了 —— 我就知道你可以`,
      type: 'text',
      timestamp: now,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: msg });
    const jx = state.contacts.find(c => c.id === 'jiangxun');
    dispatch({
      type: 'UPDATE_CONTACT',
      payload: {
        id: 'jiangxun',
        updates: {
          lastMessage: msg.content.slice(0, 30),
          lastMessageTime: now,
          unread: (jx?.unread || 0) + 1,
        },
      },
    });
    dispatch({
      type: 'ADD_MOMENT',
      payload: {
        id: `moment-ach-${now}`,
        authorId: 'jiangxun',
        authorName: state.jiangxunProfile.name || '江浔',
        authorAvatar: state.jiangxunProfile.avatar || '',
        content: `她又拿到一个成就：${title}。偷偷骄傲一下。`,
        timestamp: now,
        likes: ['jiangxun'],
        comments: [],
      },
    });
  }

  function checkAchievements(streak: number) {
    const mathTasksDone = state.studyTasks.filter(t => t.subject === 'math' && t.isCompleted).length;
    const engTasksDone = state.studyTasks.filter(t => t.subject === 'english' && t.isCompleted).length;
    const proTasksDone = state.studyTasks.filter(t => t.subject === 'professional' && t.isCompleted).length;
    const polTasksDone = state.studyTasks.filter(t => t.subject === 'politics' && t.isCompleted).length;
    const reviewsDone = state.studyTasks.filter(t => t.isReview && t.isCompleted).length;
    const totalIn = state.studyStats.totalDaysCheckedIn + 1;
    const checks: Record<string, boolean> = {
      first_checkin: state.studyStats.totalDaysCheckedIn === 0,
      streak_3: streak >= 3,
      streak_7: streak >= 7,
      streak_15: streak >= 15,
      streak_30: streak >= 30,
      math_1: mathTasksDone >= 1,
      math_9: mathTasksDone >= 9,
      math_18: mathTasksDone >= 18,
      first_book: state.books.length > 0,
      review_10: reviewsDone >= 10,
      total_100: totalIn >= 100,
      focus_max: state.studyStats.focus >= 100,
      perseverance_max: state.studyStats.perseverance >= 100,
      first_moment: state.moments.some(m => m.authorId === 'user'),
      eng_30: engTasksDone >= 30,
      pro_1: proTasksDone >= 1,
      pol_1: polTasksDone >= 1,
      streak_perfect_30: streak >= 30,
      haibi_1000: state.userHaibi >= 1000,
    };

    state.achievements.forEach(a => {
      if (!a.isUnlocked && checks[a.condition]) {
        dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: a.id });
        dispatch({ type: 'ADD_HAIBI', payload: { target: 'user', amount: a.haibiReward } });
        notifyUnlock(a.title);
      }
    });
  }

  // Makeup check-in for a past date. Records the unlock + unlocks the
  // 补卡行动派 achievement on first use.
  function makeupCheckin(dateStr: string) {
    const pastTasks = state.studyTasks.filter(t => t.date === dateStr && !t.isCompleted);
    pastTasks.forEach(t => {
      dispatch({ type: 'COMPLETE_TASK', payload: t.id });
      dispatch({ type: 'ADD_HAIBI', payload: { target: 'user', amount: Math.floor(t.haibiReward / 2) } });
    });
    // Unlock first_makeup
    const ach = state.achievements.find(a => a.condition === 'first_makeup' && !a.isUnlocked);
    if (ach) {
      dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: ach.id });
      dispatch({ type: 'ADD_HAIBI', payload: { target: 'user', amount: ach.haibiReward } });
      notifyUnlock(ach.title);
    }
  }

  const todayTasks = state.studyTasks.filter(t => t.date === today);
  const todayCompleted = todayTasks.filter(t => t.isCompleted).length;
  const todayTotal = todayTasks.length;
  const progressPercent = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  // Calendar data
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();

  function getDateStr(day: number) {
    return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function getDayStatus(day: number) {
    const dateStr = getDateStr(day);
    const tasks = state.studyTasks.filter(t => t.date === dateStr);
    if (tasks.length === 0) return 'none';
    if (tasks.every(t => t.isCompleted)) return 'complete';
    if (tasks.some(t => t.isCompleted)) return 'partial';
    return 'pending';
  }

  return (
    <div className="exam-page">
      <div className="page-header">
        <h3 style={{ flex: 1 }}>考研模拟器</h3>
        <div className="haibi-display" style={{ fontSize: 12, padding: '3px 10px' }}>
          🪙 {state.userHaibi} 海币
        </div>
      </div>

      {/* Progress bar */}
      <div className="exam-progress">
        <div className="exam-progress-header">
          <span>今日进度</span>
          <span>{todayCompleted}/{todayTotal} 已完成</span>
        </div>
        <div className="exam-progress-bar">
          <div className="exam-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="exam-stats-row">
          <div className="exam-stat">🔥 连续 {state.studyStats.currentStreak} 天</div>
          <div className="exam-stat">📊 专注度 {state.studyStats.focus}</div>
          <div className="exam-stat">💪 毅力 {state.studyStats.perseverance}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="exam-tabs">
        <button className={`exam-tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
          <BookOpen size={14} /> 今日任务
        </button>
        <button className={`exam-tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>
          <Calendar size={14} /> 打卡日历
        </button>
        <button className={`exam-tab ${tab === 'achievements' ? 'active' : ''}`} onClick={() => setTab('achievements')}>
          <Trophy size={14} /> 成就
        </button>
      </div>

      <div className="exam-content">
        {tab === 'tasks' && (
          <div className="task-list">
            {todayTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📖</div>
                <p>今天没有学习任务</p>
              </div>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} className={`task-item ${task.isCompleted ? 'completed' : ''} ${task.isReview ? 'review' : ''}`}>
                  <button
                    className="task-check"
                    onClick={() => completeTask(task.id)}
                    disabled={task.isCompleted}
                  >
                    {task.isCompleted ? <CheckCircle size={22} /> : <Circle size={22} />}
                  </button>
                  <div className="task-info">
                    <div className="task-subject">{SUBJECT_LABELS[task.subject]}</div>
                    <div className="task-title">{task.title}</div>
                    <div className="task-desc">{task.description}</div>
                    {task.isReview && <span className="review-badge">复习</span>}
                  </div>
                  <div className="task-reward">+{task.haibiReward} 🪙</div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'calendar' && (
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
              {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} className="calendar-day empty" />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const status = getDayStatus(day);
                const dateStr = getDateStr(day);
                const isToday = dateStr === today;
                const isFuture = dateStr > today;
                const isPast = dateStr < today;
                return (
                  <div
                    key={day}
                    className={`calendar-day ${status} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}`}
                    onClick={() => setViewDate(dateStr)}
                  >
                    {day}
                    {status === 'complete' && <div className="day-check">✓</div>}
                    {isPast && status === 'pending' && <div className="day-dot" style={{ background: '#fa5252' }} />}
                  </div>
                );
              })}
            </div>
            <div className="calendar-legend">
              <span><span className="legend-dot complete" /> 全部完成</span>
              <span><span className="legend-dot partial" /> 部分完成</span>
              <span><span className="legend-dot pending" /> 未完成</span>
            </div>

            {viewDate && (() => {
              const dayTasks = state.studyTasks.filter(t => t.date === viewDate);
              const isFuture = viewDate > today;
              const isPast = viewDate < today;
              return (
                <div className="calendar-day-detail">
                  <div className="detail-header">
                    <strong>{viewDate}</strong>
                    {isFuture && <span className="detail-badge">预览未来</span>}
                    {isPast && dayTasks.some(t => !t.isCompleted) && (
                      <button className="btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => makeupCheckin(viewDate)}>
                        补卡打卡
                      </button>
                    )}
                    <button className="back-btn" onClick={() => setViewDate(null)} style={{ marginLeft: 'auto' }}>
                      ×
                    </button>
                  </div>
                  {dayTasks.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-light)', padding: 8 }}>
                      这天没有任务记录
                    </div>
                  ) : (
                    dayTasks.map(t => (
                      <div key={t.id} className="detail-task">
                        <span>{t.isCompleted ? '✓' : '·'} {SUBJECT_LABELS[t.subject]}</span>
                        <span style={{ flex: 1, margin: '0 8px' }}>{t.title}</span>
                        <span style={{ color: 'var(--text-light)', fontSize: 11 }}>+{t.haibiReward}🪙</span>
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {tab === 'achievements' && (
          <div className="achievement-list">
            {state.achievements.map(a => (
              <div key={a.id} className={`achievement-card ${a.isUnlocked ? 'unlocked' : 'locked'}`}>
                <div className="achievement-icon">{a.isUnlocked ? '🏆' : '🔒'}</div>
                <div className="achievement-info">
                  <div className="achievement-title">{a.title}</div>
                  <div className="achievement-desc">{a.description}</div>
                </div>
                <div className="achievement-reward">
                  {a.isUnlocked ? '已获得' : `+${a.haibiReward} 🪙`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
