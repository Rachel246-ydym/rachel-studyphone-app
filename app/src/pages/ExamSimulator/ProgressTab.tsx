// Progress tab — overall weighted progress + attributes + countdown + pending reviews.
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
  const leftDays = daysToExam();
  const cet6Left = Math.max(
    0,
    Math.ceil((new Date(CET6_DATE + 'T00:00:00').getTime() - Date.now()) / 86400000),
  );

  const totalMath = tasks.filter(t => t.subject === 'math' && !t.isReview).length;
  const doneMath  = tasks.filter(t => t.subject === 'math' && !t.isReview && t.isCompleted).length;
  const totalEng  = tasks.filter(t => t.subject === 'english' && !t.isReview).length;
  const doneEng   = tasks.filter(t => t.subject === 'english' && !t.isReview && t.isCompleted).length;
  const totalPro  = tasks.filter(t => t.subject === 'professional' && !t.isReview).length;
  const donePro   = tasks.filter(t => t.subject === 'professional' && !t.isReview && t.isCompleted).length;
  const totalPol  = tasks.filter(t => t.subject === 'politics' && !t.isReview).length;
  const donePol   = tasks.filter(t => t.subject === 'politics' && !t.isReview && t.isCompleted).length;

  const mathLecturesTouched = new Set(
    tasks
      .filter(t => t.subject === 'math' && t.isCompleted)
      .map(t => { const m = t.title.match(/第(\d+)讲/); return m ? m[1] : ''; })
      .filter(Boolean),
  );

  // Weighted overall progress — only count started subjects
  const WEIGHTS: Record<string, number> = { math: 35, english: 30, professional: 25, politics: 10 };
  const subjects = [
    { key: 'math',         done: doneMath, total: totalMath },
    { key: 'english',      done: doneEng,  total: totalEng  },
    { key: 'professional', done: donePro,  total: totalPro  },
    { key: 'politics',     done: donePol,  total: totalPol  },
  ].filter(s => s.total > 0);
  const totalWeight = subjects.reduce((s, sub) => s + WEIGHTS[sub.key], 0) || 1;
  const overallPct = Math.round(
    subjects.reduce((s, sub) => s + (sub.done / sub.total) * WEIGHTS[sub.key], 0) / totalWeight * 100
  );

  // Derived ability scores (0–100) from task completion
  const mathAbility  = totalMath > 0 ? Math.round(doneMath  / totalMath  * 100) : 0;
  const engAbility   = totalEng  > 0 ? Math.round(doneEng   / totalEng   * 100) : 0;
  const proAbility   = totalPro  > 0 ? Math.round(donePro   / totalPro   * 100) : 0;
  const polAbility   = totalPol  > 0 ? Math.round(donePol   / totalPol   * 100) : 0;

  const pendingReviews = tasks
    .filter(t => t.isReview && !t.isCompleted && t.date < today)
    .slice(0, 5);

  return (
    <div className="progress-tab">
      {/* ── 综合进度 ── */}
      <div className="overall-card overall-hero">
        <div className="overall-pct-row">
          <span className="overall-pct-num">{overallPct}%</span>
          <div style={{ flex: 1 }}>
            <div className="overall-pct-label">综合备考进度</div>
            <div className="overall-bar-wrap">
              <div className="overall-bar-fill" style={{ width: `${overallPct}%` }} />
            </div>
          </div>
        </div>
        <div className="overall-weights">
          <span>数学 35%</span>
          <span>英语 30%</span>
          <span>专业 25%</span>
          <span>政治 10%</span>
        </div>
      </div>

      {/* ── 倒计时 ── */}
      <div className="overall-card">
        <div className="big-countdown">
          <div className="count-num">{leftDays}</div>
          <div className="count-label">距 12/19 初试</div>
        </div>
        <div className="count-sub">
          六级考试 {CET6_DATE} · 还有 {cet6Left} 天 · 考研 {EXAM_DATE}
        </div>
      </div>

      {/* ── 各科进度 ── */}
      <div className="overall-card">
        <div className="section-title">📈 各科进度</div>
        <ProgressRow label="数学（张宇18讲）" done={mathLecturesTouched.size} total={MATH_LECTURES.length} unit="讲" color="var(--primary)" />
        <ProgressRow label="数学任务天数"      done={doneMath} total={totalMath} unit="天" color="var(--primary)" />
        <ProgressRow label="英语小项"          done={doneEng}  total={totalEng}  unit="项" color="#3b82f6" />
        {totalPro > 0 && <ProgressRow label="专业课 891" done={donePro} total={totalPro} unit="天" color="#a855f7" />}
        {totalPol > 0 && <ProgressRow label="政治"       done={donePol} total={totalPol} unit="天" color="#f59e0b" />}
      </div>

      {/* ── 学习属性 ── */}
      <div className="overall-card">
        <div className="section-title">🎯 学习属性</div>
        <AttrRow label="专注度" value={stats.focus}        max={100} color="#4CAF7D" hint="每完成当日全部任务 +2" />
        <AttrRow label="毅力值" value={stats.perseverance} max={100} color="#f59e0b" hint="连续打卡每天 +1" />
        <AttrRow label="数学能力" value={mathAbility}  max={100} color="#6366f1" hint={`${doneMath}/${totalMath} 任务`} />
        <AttrRow label="英语能力" value={engAbility}   max={100} color="#3b82f6" hint={`${doneEng}/${totalEng} 任务`} />
        {totalPro > 0 && <AttrRow label="专业基础" value={proAbility} max={100} color="#a855f7" hint={`${donePro}/${totalPro} 任务`} />}
        {totalPol > 0 && <AttrRow label="政治积累" value={polAbility} max={100} color="#f59e0b" hint={`${donePol}/${totalPol} 任务`} />}
      </div>

      {/* ── 统计数据 ── */}
      <div className="stat-chips">
        <div className="chip">🔥 连续 {stats.currentStreak} 天</div>
        <div className="chip">🏆 最长 {stats.longestStreak} 天</div>
        <div className="chip">🗓️ 累计 {stats.totalDaysCheckedIn} 天</div>
      </div>

      {/* ── 待复习 ── */}
      {pendingReviews.length > 0 && (
        <div className="review-panel">
          <div className="section-title">⏰ 待复习（已过期）</div>
          {pendingReviews.map(r => (
            <div key={r.id} className="review-row">
              <span style={{ flex: 1 }}>{r.date} · {r.title}</span>
              <button className="btn-primary small" onClick={() => onComplete(r.id)}>完成</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressRow({
  label, done, total, unit, color,
}: { label: string; done: number; total: number; unit: string; color: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="pr-row">
      <div className="pr-label">
        <span>{label}</span>
        <span>{done}/{total} {unit}</span>
      </div>
      <div className="pr-bar">
        <div className="pr-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function AttrRow({
  label, value, max, color, hint,
}: { label: string; value: number; max: number; color: string; hint: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="attr-row">
      <div className="attr-label-row">
        <span className="attr-label">{label}</span>
        <span className="attr-value" style={{ color }}>{value}<span className="attr-max">/{max}</span></span>
        <span className="attr-hint">{hint}</span>
      </div>
      <div className="attr-bar">
        <div className="attr-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
