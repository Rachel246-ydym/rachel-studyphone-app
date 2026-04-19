// Today tab — today's task list + today progress card.
import { CheckCircle, Circle } from 'lucide-react';
import { SUBJECT_LABELS } from '../../utils/prompts';
import type { StudyTask } from '../../types';

interface TodayTabProps {
  tasks: StudyTask[];
  onComplete: (id: string) => void;
}

export default function TodayTab({ tasks, onComplete }: TodayTabProps) {
  const normal = tasks.filter(t => !t.isReview);
  const reviews = tasks.filter(t => t.isReview);
  const done = tasks.filter(t => t.isCompleted).length;
  const reward = tasks.filter(t => t.isCompleted).reduce((s, t) => s + t.haibiReward, 0);

  return (
    <div className="task-list">
      <div className="today-progress-card">
        <div className="today-progress-row">
          <span>今日任务 {done}/{tasks.length}</span>
          <span style={{ color: '#e65100' }}>已获得 +{reward} 🪙</span>
        </div>
        {tasks.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>
            今天没有任务（可能计划尚未开始）
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="review-section">
          <div className="section-title">🔁 今日复习</div>
          {reviews.map(task => (
            <TaskRow key={task.id} task={task} onComplete={onComplete} />
          ))}
        </div>
      )}

      {normal.length > 0 && (
        <>
          <div className="section-title">📌 今日任务</div>
          {normal.map(task => (
            <TaskRow key={task.id} task={task} onComplete={onComplete} />
          ))}
        </>
      )}
    </div>
  );
}

function TaskRow({ task, onComplete }: { task: StudyTask; onComplete: (id: string) => void }) {
  return (
    <div className={`task-item ${task.isCompleted ? 'completed' : ''} ${task.isReview ? 'review' : ''}`}>
      <button
        className="task-check"
        onClick={() => onComplete(task.id)}
        disabled={task.isCompleted}
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
      <div className="task-reward">+{task.haibiReward} 🪙</div>
    </div>
  );
}
