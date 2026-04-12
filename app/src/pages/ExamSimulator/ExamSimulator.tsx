import { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { CheckCircle, Circle, Trophy, Calendar, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { SUBJECT_LABELS } from '../../utils/prompts';
import './ExamSimulator.css';

export default function ExamSimulator() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'tasks' | 'calendar' | 'achievements'>('tasks');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const today = new Date().toISOString().slice(0, 10);

  // Generate today's tasks if not exist
  useEffect(() => {
    const todayTasks = state.studyTasks.filter(t => t.date === today);
    if (todayTasks.length === 0) {
      generateDailyTasks();
    }
    // Check for review tasks
    generateReviewTasks();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function generateDailyTasks() {
    const now = new Date();
    const month = now.getMonth() + 1;

    const tasks = [];
    // Math task - always present
    const mathLecture = Math.min(18, Math.max(1, state.studyStats.totalDaysCheckedIn + 1));
    tasks.push({
      id: `task-${Date.now()}-math`,
      date: today,
      subject: 'math' as const,
      title: `张宇高数第${mathLecture}讲`,
      description: `完成张宇基础30讲高数分册第${mathLecture}讲的学习`,
      isCompleted: false,
      isReview: false,
      haibiReward: 5 + Math.floor(Math.random() * 5),
    });

    // English - always present
    tasks.push({
      id: `task-${Date.now()}-eng`,
      date: today,
      subject: 'english' as const,
      title: '英语每日任务',
      description: '单词背诵 + 听力精听 + 阅读练习',
      isCompleted: false,
      isReview: false,
      haibiReward: 5 + Math.floor(Math.random() * 3),
    });

    // Professional course - from April
    if (month >= 4) {
      tasks.push({
        id: `task-${Date.now()}-pro`,
        date: today,
        subject: 'professional' as const,
        title: '专业课学习',
        description: '摄影测量与遥感基础知识',
        isCompleted: false,
        isReview: false,
        haibiReward: 5 + Math.floor(Math.random() * 3),
      });
    }

    // Politics - from July
    if (month >= 7) {
      tasks.push({
        id: `task-${Date.now()}-pol`,
        date: today,
        subject: 'politics' as const,
        title: '政治学习',
        description: '考研政治基础内容',
        isCompleted: false,
        isReview: false,
        haibiReward: 3 + Math.floor(Math.random() * 3),
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

  function checkAchievements(streak: number) {
    const checks: Record<string, boolean> = {
      first_checkin: state.studyStats.totalDaysCheckedIn === 0,
      streak_3: streak >= 3,
      streak_7: streak >= 7,
      streak_15: streak >= 15,
      streak_30: streak >= 30,
    };

    state.achievements.forEach(a => {
      if (!a.isUnlocked && checks[a.condition]) {
        dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: a.id });
        dispatch({ type: 'ADD_HAIBI', payload: { target: 'user', amount: a.haibiReward } });
      }
    });
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
                const isToday = getDateStr(day) === today;
                return (
                  <div key={day} className={`calendar-day ${status} ${isToday ? 'today' : ''}`}>
                    {day}
                    {status === 'complete' && <div className="day-check">✓</div>}
                  </div>
                );
              })}
            </div>
            <div className="calendar-legend">
              <span><span className="legend-dot complete" /> 全部完成</span>
              <span><span className="legend-dot partial" /> 部分完成</span>
              <span><span className="legend-dot pending" /> 未完成</span>
            </div>
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
