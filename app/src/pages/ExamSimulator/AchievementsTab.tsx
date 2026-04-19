import type { Achievement } from '../../types';

const CONDITION_ICONS: Record<string, string> = {
  first_checkin:    '🌱',
  streak_3:         '🔥',
  streak_7:         '🔥',
  streak_15:        '🔥',
  streak_30:        '🔥',
  streak_perfect_30:'💯',
  math_1:           '📐',
  math_9:           '📐',
  math_18:          '📐',
  first_book:       '📚',
  review_10:        '🔁',
  total_100:        '🗓️',
  focus_max:        '🧠',
  perseverance_max: '💪',
  first_moment:     '📸',
  first_makeup:     '🩹',
  eng_30:           '🗣️',
  pro_1:            '🎯',
  pol_1:            '📜',
  haibi_1000:       '🪙',
};

function formatUnlockDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 解锁`;
}

export default function AchievementsTab({ achievements }: { achievements: Achievement[] }) {
  const unlocked = achievements.filter(a => a.isUnlocked);
  const locked   = achievements.filter(a => !a.isUnlocked);
  const totalReward = unlocked.reduce((s, a) => s + a.haibiReward, 0);

  return (
    <div className="achievement-list">
      <div className="ach-summary">
        已解锁 <strong>{unlocked.length}</strong> / {achievements.length}
        <span style={{ float: 'right', color: '#e65100' }}>已获得 +{totalReward} 🪙</span>
      </div>

      {unlocked.length > 0 && (
        <>
          <div className="ach-group-label">✅ 已解锁</div>
          {unlocked.map(a => (
            <AchCard key={a.id} a={a} />
          ))}
        </>
      )}

      {locked.length > 0 && (
        <>
          <div className="ach-group-label" style={{ marginTop: 12 }}>🔒 待解锁</div>
          {locked.map(a => (
            <AchCard key={a.id} a={a} />
          ))}
        </>
      )}
    </div>
  );
}

function AchCard({ a }: { a: Achievement }) {
  const icon = CONDITION_ICONS[a.condition] ?? '🏅';
  return (
    <div className={`achievement-card ${a.isUnlocked ? 'unlocked' : 'locked'}`}>
      <div className="achievement-icon">{icon}</div>
      <div className="achievement-info">
        <div className="achievement-title">{a.title}</div>
        <div className="achievement-desc">{a.description}</div>
        {a.isUnlocked && a.unlockedAt && (
          <div className="achievement-unlock-date">{formatUnlockDate(a.unlockedAt)}</div>
        )}
      </div>
      <div className="achievement-reward">
        {a.isUnlocked ? (
          <span className="ach-got">已获得<br />+{a.haibiReward} 🪙</span>
        ) : (
          <span>+{a.haibiReward} 🪙</span>
        )}
      </div>
    </div>
  );
}
