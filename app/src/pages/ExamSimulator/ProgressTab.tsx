// Progress tab — overall progress bars + countdown + pending reviews.
import { MATH_LECTURES, CET6_DATE, EXAM_DATE } from '../../utils/prompts';
import type { StudyTask, StudyStats } from '../../types';
import { daysToExam } from './utils';

interface ProgressTabProps {
  tasks: StudyTask[];
  stats: StudyStats;
  today: string;
  onComplete: (taskId: string) => void;
}

export default function ProgressTab({ tasks, stats, today, onComplete }: ProgressTabProps) {
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

  // Math lectures covered (parse "第X讲" from completed math task titles)
  const mathLecturesTouched = new Set(
    tasks
      .filter(t => t.subject === 'math' && t.isCompleted)
      .map(t => {
        const m = t.title.match(/第(\d+)讲/);
        return m ? m[1] : '';
      })
      .filter(Boolean),
  );

  // Pending reviews (past, incomplete)
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
          <div className="section-title">⏰ 待复习（已过期）</div>
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
