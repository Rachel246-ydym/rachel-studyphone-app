// Achievements tab — simple grid card list.
import type { Achievement } from '../../types';

export default function AchievementsTab({ achievements }: { achievements: Achievement[] }) {
  const unlocked = achievements.filter(a => a.isUnlocked).length;

  return (
    <div className="achievement-list">
      <div className="ach-summary">
        已解锁 <strong>{unlocked}</strong> / {achievements.length}
      </div>
      {achievements.map(a => (
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
  );
}
