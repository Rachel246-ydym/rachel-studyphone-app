import { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { BookOpen, TrendingUp, Trophy } from 'lucide-react';
import type { ChatMessage } from '../../types';
import TodayTab from './TodayTab';
import ProgressTab from './ProgressTab';
import AchievementsTab from './AchievementsTab';
import { buildDailyTasks, PLAN_START, PLAN_START_STR, toDateStr } from './utils';
import './ExamSimulator.css';

type TabKey = 'today' | 'progress' | 'achievements';

export default function ExamSimulator() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<TabKey>('today');

  const today = toDateStr(new Date());

  // Generate today's tasks + backfill past 13 days + Ebbinghaus reviews
  useEffect(() => {
    if (today < PLAN_START_STR) return;

    const todayTasks = state.studyTasks.filter(t => t.date === today);
    if (todayTasks.length === 0) {
      buildDailyTasks(today).forEach(t => dispatch({ type: 'ADD_STUDY_TASK', payload: t }));
    }

    // Backfill past 13 days as makeup-available
    for (let i = 1; i <= 13; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (d < PLAN_START) continue;
      const ds = toDateStr(d);
      const existing = state.studyTasks.filter(t => t.date === ds);
      if (existing.length === 0) {
        buildDailyTasks(ds).forEach(t => dispatch({ type: 'ADD_STUDY_TASK', payload: t }));
      }
    }

    // Ebbinghaus reviews: 1/2/4/7/15/30 days after completion
    const intervals = [1, 2, 4, 7, 15, 30];
    const completedTasks = state.studyTasks.filter(
      t => t.isCompleted && !t.isReview && !t.makeup && t.completedAt,
    );
    completedTasks.forEach(task => {
      intervals.forEach(interval => {
        const reviewDate = new Date(task.completedAt!);
        reviewDate.setDate(reviewDate.getDate() + interval);
        const reviewDateStr = toDateStr(reviewDate);
        if (reviewDateStr !== today) return;
        const exists = state.studyTasks.some(
          t => t.isReview && t.reviewOf === task.id && t.date === reviewDateStr,
        );
        if (exists) return;
        dispatch({
          type: 'ADD_STUDY_TASK',
          payload: {
            id: `review-${Date.now()}-${task.id}-${interval}`,
            date: reviewDateStr,
            subject: task.subject,
            title: `复习：${task.title}`,
            description: `第${interval}天复习 · ${task.description}`,
            isCompleted: false,
            isReview: true,
            reviewOf: task.id,
            haibiReward: 3,
          },
        });
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function notifyUnlock(title: string) {
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
    // 数学讲次覆盖数（从 title 解析"第X讲"）
    const mathLecturesSet = new Set(
      state.studyTasks
        .filter(t => t.subject === 'math' && t.isCompleted)
        .map(t => {
          const m = t.title.match(/第(\d+)讲/);
          return m ? m[1] : '';
        })
        .filter(Boolean),
    );
    const lecturesCovered = mathLecturesSet.size;

    const checks: Record<string, boolean> = {
      first_checkin: state.studyStats.totalDaysCheckedIn === 0,
      streak_3: streak >= 3,
      streak_7: streak >= 7,
      streak_15: streak >= 15,
      streak_30: streak >= 30,
      math_1: lecturesCovered >= 1 || mathTasksDone >= 1,
      math_9: lecturesCovered >= 9,
      math_18: lecturesCovered >= 18,
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

  function completeTask(taskId: string) {
    const task = state.studyTasks.find(t => t.id === taskId);
    if (!task || task.isCompleted) return;

    dispatch({ type: 'COMPLETE_TASK', payload: taskId });
    dispatch({ type: 'ADD_HAIBI', payload: { target: 'user', amount: task.haibiReward } });

    // Update stats only if it's a "today" completion and all today tasks are done.
    if (task.date === today) {
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
        checkAchievements(newStreak);
      }
    }
  }

  // Per-task makeup: half reward, marked as makeup, no streak update, no notify.
  function makeupSingle(taskId: string) {
    const task = state.studyTasks.find(t => t.id === taskId);
    if (!task || task.isCompleted) return;
    dispatch({ type: 'COMPLETE_TASK', payload: taskId });
    dispatch({ type: 'ADD_HAIBI', payload: { target: 'user', amount: Math.floor(task.haibiReward / 2) } });
    // First-time makeup achievement
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

  return (
    <div className="exam-page">
      <div className="page-header">
        <h3 style={{ flex: 1 }}>考研模拟器</h3>
        <div className="haibi-display" style={{ fontSize: 12, padding: '3px 10px' }}>
          🪙 {state.userHaibi} 海币
        </div>
      </div>

      {/* Today's quick progress bar (always visible) */}
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
          <div className="exam-stat">📊 专注 {state.studyStats.focus}</div>
          <div className="exam-stat">💪 毅力 {state.studyStats.perseverance}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="exam-tabs">
        <button className={`exam-tab ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>
          <BookOpen size={14} /> 今日
        </button>
        <button className={`exam-tab ${tab === 'progress' ? 'active' : ''}`} onClick={() => setTab('progress')}>
          <TrendingUp size={14} /> 总进度
        </button>
        <button className={`exam-tab ${tab === 'achievements' ? 'active' : ''}`} onClick={() => setTab('achievements')}>
          <Trophy size={14} /> 成就
        </button>
      </div>

      <div className="exam-content">
        {tab === 'today' && (
          <TodayTab
            allTasks={state.studyTasks}
            today={today}
            onComplete={completeTask}
            onMakeupSingle={makeupSingle}
          />
        )}
        {tab === 'progress' && (
          <ProgressTab
            tasks={state.studyTasks}
            stats={state.studyStats}
            today={today}
            onComplete={completeTask}
          />
        )}
        {tab === 'achievements' && <AchievementsTab achievements={state.achievements} />}
      </div>
    </div>
  );
}
