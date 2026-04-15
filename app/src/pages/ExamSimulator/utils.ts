// Exam simulator pure helpers — shared by container + tabs.
import type { StudyTask } from '../../types';
import {
  MATH_LECTURES,
  MATH_LECTURE_WEIGHTS,
  MATH_LECTURE_CUM_DAYS,
  CET6_DATE,
  EXAM_DATE,
} from '../../utils/prompts';

export const PLAN_START = new Date(2026, 3, 1); // 2026-04-01
export const PLAN_START_STR = '2026-04-01';

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayOffset(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  return Math.floor((d.getTime() - PLAN_START.getTime()) / 86400000);
}

export interface MathLectureInfo {
  index: number;
  lecture: string;
  sub: number;      // 该讲的第几小块 (1..subTotal)
  subTotal: number; // 该讲共分几天
}

// 按 MATH_LECTURE_CUM_DAYS 累积权重反查"第 offset 天对应第几讲的第几小块"
export function mathLectureAt(offset: number): MathLectureInfo | null {
  if (offset < 0) return null;
  for (let i = 0; i < MATH_LECTURE_CUM_DAYS.length; i++) {
    if (offset < MATH_LECTURE_CUM_DAYS[i]) {
      const start = i === 0 ? 0 : MATH_LECTURE_CUM_DAYS[i - 1];
      return {
        index: i,
        lecture: MATH_LECTURES[i],
        sub: offset - start + 1,
        subTotal: MATH_LECTURE_WEIGHTS[i],
      };
    }
  }
  return null;
}

export interface EnglishSlot {
  subtype: 'words' | 'listening' | 'reading' | 'writing';
  title: string;
  desc: string;
  reward: number;
}

// 英语每日 4 小项，写作/翻译隔天交替
export function englishTasksFor(dateStr: string): EnglishSlot[] {
  const beforeCet6 = dateStr < CET6_DATE;
  const tag = beforeCet6 ? '六级' : '考研英语';
  const writingToday = dayOffset(dateStr) % 2 === 0;
  return [
    {
      subtype: 'words',
      title: `📝 ${tag}单词打卡`,
      desc: beforeCet6 ? '六级核心词 50 个' : '恋练有词 / 红宝书 60 个',
      reward: 3,
    },
    {
      subtype: 'listening',
      title: `🎧 ${tag}听力精听一套`,
      desc: beforeCet6 ? '六级真题听力（精听逐句对照）' : '考研听力专项练习',
      reward: 4,
    },
    {
      subtype: 'reading',
      title: `📖 ${tag}阅读`,
      desc: beforeCet6 ? '六级阅读 2 篇限时练习' : '考研英语阅读 1 篇精读',
      reward: 4,
    },
    writingToday
      ? { subtype: 'writing', title: `✍️ ${tag}写作练习`, desc: beforeCet6 ? '六级作文 1 篇' : '考研大作文 / 小作文', reward: 3 }
      : { subtype: 'writing', title: `✍️ ${tag}翻译练习`, desc: beforeCet6 ? '六级汉译英 1 段' : '考研英语翻译 1 段', reward: 3 },
  ];
}

// 为某个日期生成该日任务（不含复习），由调用方 dispatch。
export function buildDailyTasks(dateStr: string): StudyTask[] {
  if (dateStr < PLAN_START_STR) return [];
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const dom = d.getDate();
  const offset = dayOffset(dateStr);
  const stamp = `${dateStr}-${Math.random().toString(36).slice(2, 6)}`;
  const tasks: StudyTask[] = [];

  // 数学
  const math = mathLectureAt(offset);
  if (math) {
    tasks.push({
      id: `task-${stamp}-math`,
      date: dateStr,
      subject: 'math',
      title: `张宇高数 · ${math.lecture}`,
      description: `Day ${math.sub}/${math.subTotal} · 配套 1000 题练习 2.5h`,
      isCompleted: false,
      isReview: false,
      haibiReward: 8,
    });
  } else {
    tasks.push({
      id: `task-${stamp}-math`,
      date: dateStr,
      subject: 'math',
      title: '张宇高数 · 基础期复盘',
      description: '基础 30 讲已完成，进入 1000 题强化',
      isCompleted: false,
      isReview: false,
      haibiReward: 8,
    });
  }

  // 英语 4 小项
  englishTasksFor(dateStr).forEach(slot => {
    tasks.push({
      id: `task-${stamp}-eng-${slot.subtype}`,
      date: dateStr,
      subject: 'english',
      title: slot.title,
      description: slot.desc,
      isCompleted: false,
      isReview: false,
      haibiReward: slot.reward,
      englishSubtype: slot.subtype,
    });
  });

  // 专业课：4 月下旬起
  if (month > 4 || (month === 4 && dom >= 20)) {
    tasks.push({
      id: `task-${stamp}-pro`,
      date: dateStr,
      subject: 'professional',
      title: '📚 专业课 891：RS 遥感',
      description: '张军《3S 技术基础》+ 摄影测量基础，1h',
      isCompleted: false,
      isReview: false,
      haibiReward: 6,
    });
  }

  // 政治：7 月起
  if (month >= 7) {
    tasks.push({
      id: `task-${stamp}-pol`,
      date: dateStr,
      subject: 'politics',
      title: '🗓️ 政治基础',
      description: '肖秀荣精讲精练 + 核心考点',
      isCompleted: false,
      isReview: false,
      haibiReward: 4,
    });
  }

  return tasks;
}

export function daysFromPlanStart(today: string): number {
  return Math.max(
    1,
    Math.floor((new Date(today + 'T00:00:00').getTime() - PLAN_START.getTime()) / 86400000) + 1,
  );
}

export function daysToExam(nowTs = Date.now()): number {
  const examTs = new Date(EXAM_DATE + 'T00:00:00').getTime();
  return Math.max(0, Math.ceil((examTs - nowTs) / 86400000));
}
