// Default products for the shop
import type { Product } from '../types';

export const DEFAULT_PRODUCTS: Product[] = [
  // Food / Ingredients
  { id: 'p1', name: '鸡蛋 (一盒)', category: 'food', price: 5, description: '新鲜土鸡蛋', emoji: '🥚' },
  { id: 'p2', name: '牛奶', category: 'food', price: 3, description: '纯牛奶一盒', emoji: '🥛' },
  { id: 'p3', name: '大米 (5斤)', category: 'food', price: 8, description: '东北大米', emoji: '🍚' },
  { id: 'p4', name: '蔬菜套餐', category: 'food', price: 6, description: '时令蔬菜组合', emoji: '🥬' },
  { id: 'p5', name: '水果拼盘', category: 'food', price: 10, description: '当季水果', emoji: '🍎' },
  { id: 'p6', name: '鸡胸肉', category: 'food', price: 7, description: '新鲜鸡胸肉', emoji: '🍗' },
  { id: 'p7', name: '意面', category: 'food', price: 4, description: '进口意大利面', emoji: '🍝' },
  { id: 'p8', name: '酱油', category: 'food', price: 3, description: '生抽酱油', emoji: '🫙' },

  // Daily necessities
  { id: 'p9', name: '洗衣液', category: 'daily', price: 8, description: '薰衣草味洗衣液', emoji: '🧴' },
  { id: 'p10', name: '纸巾 (一提)', category: 'daily', price: 5, description: '柔软纸巾', emoji: '🧻' },
  { id: 'p11', name: '牙膏', category: 'daily', price: 4, description: '薄荷牙膏', emoji: '🪥' },
  { id: 'p12', name: '洗发水', category: 'daily', price: 10, description: '去屑洗发水', emoji: '🧴' },
  { id: 'p13', name: '卫生巾', category: 'daily', price: 6, description: '日用/夜用卫生巾', emoji: '🩹' },
  { id: 'p14', name: '沐浴露', category: 'daily', price: 8, description: '花香沐浴露', emoji: '🛁' },
  { id: 'p15', name: '垃圾袋', category: 'daily', price: 2, description: '一卷垃圾袋', emoji: '🗑️' },

  // Bakery
  { id: 'p16', name: '可颂', category: 'bakery', price: 5, description: '法式黄油可颂', emoji: '🥐' },
  { id: 'p17', name: '吐司面包', category: 'bakery', price: 4, description: '全麦吐司', emoji: '🍞' },
  { id: 'p18', name: '蛋糕', category: 'bakery', price: 15, description: '草莓奶油蛋糕', emoji: '🎂' },
  { id: 'p19', name: '泡芙', category: 'bakery', price: 6, description: '奶油泡芙', emoji: '🧁' },
  { id: 'p20', name: '饼干礼盒', category: 'bakery', price: 12, description: '黄油曲奇礼盒', emoji: '🍪' },

  // Flowers
  { id: 'p21', name: '玫瑰花束', category: 'flowers', price: 20, description: '红玫瑰一束', emoji: '🌹' },
  { id: 'p22', name: '向日葵', category: 'flowers', price: 12, description: '三支向日葵', emoji: '🌻' },
  { id: 'p23', name: '满天星', category: 'flowers', price: 8, description: '一束满天星', emoji: '💐' },
  { id: 'p24', name: '百合花', category: 'flowers', price: 15, description: '白色百合', emoji: '🤍' },
  { id: 'p25', name: '薰衣草', category: 'flowers', price: 10, description: '干花薰衣草', emoji: '💜' },

  // Gifts
  { id: 'p26', name: '毛绒玩偶', category: 'gifts', price: 25, description: '可爱小熊', emoji: '🧸' },
  { id: 'p27', name: '手写信', category: 'gifts', price: 5, description: '一封手写情书', emoji: '💌' },
  { id: 'p28', name: '香薰蜡烛', category: 'gifts', price: 18, description: '助眠香薰', emoji: '🕯️' },
  { id: 'p29', name: '马克杯', category: 'gifts', price: 15, description: '定制马克杯', emoji: '☕' },
  { id: 'p30', name: '相册', category: 'gifts', price: 30, description: '纪念相册', emoji: '📸' },
  { id: 'p31', name: '手链', category: 'gifts', price: 35, description: '银色手链', emoji: '📿' },
  { id: 'p32', name: '围巾', category: 'gifts', price: 28, description: '柔软羊绒围巾', emoji: '🧣' },
  { id: 'p32a', name: '鲜花束', category: 'gifts', price: 22, description: '手扎小花束', emoji: '🌷' },
  { id: 'p32b', name: '拼装积木', category: 'gifts', price: 40, description: '解压的小积木套装', emoji: '🧱' },
  { id: 'p32c', name: '定制贴纸', category: 'gifts', price: 6, description: '你们俩的名字贴纸', emoji: '🏷️' },
  { id: 'p32d', name: '星空灯', category: 'gifts', price: 32, description: '投影星空小夜灯', emoji: '✨' },
  { id: 'p32e', name: '小钱包', category: 'gifts', price: 26, description: '可以装小纸条的', emoji: '👛' },

  // Adult (only visible when relationship = lover)
  { id: 'p33', name: '安全套', category: 'adult', price: 10, description: '安全措施', emoji: '🛡️', adultOnly: true },
  { id: 'p34', name: '情趣香薰', category: 'adult', price: 20, description: '浪漫氛围香薰', emoji: '🌸', adultOnly: true },
  { id: 'p35', name: '情侣睡衣', category: 'adult', price: 35, description: '棉质情侣睡衣套装', emoji: '👘', adultOnly: true },
];

// Default achievements
export const DEFAULT_ACHIEVEMENTS = [
  { id: 'a1', title: '初出茅庐', description: '完成第一天的学习任务', condition: 'first_checkin', isUnlocked: false, haibiReward: 10 },
  { id: 'a2', title: '三天打鱼', description: '连续打卡3天', condition: 'streak_3', isUnlocked: false, haibiReward: 15 },
  { id: 'a3', title: '一周坚持', description: '连续打卡7天', condition: 'streak_7', isUnlocked: false, haibiReward: 30 },
  { id: 'a4', title: '半月之约', description: '连续打卡15天', condition: 'streak_15', isUnlocked: false, haibiReward: 50 },
  { id: 'a5', title: '月度达人', description: '连续打卡30天', condition: 'streak_30', isUnlocked: false, haibiReward: 100 },
  { id: 'a6', title: '数学入门', description: '完成高数第1讲', condition: 'math_1', isUnlocked: false, haibiReward: 20 },
  { id: 'a7', title: '数学进阶', description: '完成高数前9讲', condition: 'math_9', isUnlocked: false, haibiReward: 50 },
  { id: 'a8', title: '高数通关', description: '完成高数全部18讲', condition: 'math_18', isUnlocked: false, haibiReward: 100 },
  { id: 'a9', title: '书虫觉醒', description: '在图书馆上传第一本书', condition: 'first_book', isUnlocked: false, haibiReward: 15 },
  { id: 'a10', title: '复习达人', description: '完成10次复习任务', condition: 'review_10', isUnlocked: false, haibiReward: 40 },
  { id: 'a11', title: '百日筑基', description: '累计打卡100天', condition: 'total_100', isUnlocked: false, haibiReward: 200 },
  { id: 'a12', title: '专注满格', description: '专注度首次达到100', condition: 'focus_max', isUnlocked: false, haibiReward: 60 },
  { id: 'a13', title: '毅力满格', description: '毅力首次达到100', condition: 'perseverance_max', isUnlocked: false, haibiReward: 60 },
  { id: 'a14', title: '朋友圈写手', description: '第一次发朋友圈', condition: 'first_moment', isUnlocked: false, haibiReward: 10 },
  { id: 'a15', title: '补卡行动派', description: '补卡一次过去漏掉的学习日', condition: 'first_makeup', isUnlocked: false, haibiReward: 10 },
  { id: 'a16', title: '英语打卡王', description: '累计完成30次英语任务', condition: 'eng_30', isUnlocked: false, haibiReward: 40 },
  { id: 'a17', title: '专业课开荒', description: '完成第一次专业课任务', condition: 'pro_1', isUnlocked: false, haibiReward: 20 },
  { id: 'a18', title: '政治觉醒', description: '完成第一次政治任务', condition: 'pol_1', isUnlocked: false, haibiReward: 20 },
  { id: 'a19', title: '月末复盘', description: '连续30天打卡且全任务通过', condition: 'streak_perfect_30', isUnlocked: false, haibiReward: 150 },
  { id: 'a20', title: '海币万元户', description: '海币累计余额超过1000', condition: 'haibi_1000', isUnlocked: false, haibiReward: 80 },
];

// 张宇《基础30讲·高数分册》第1-18讲（零基础部分跳过）。
// 用户要求：从高数分册基础第1讲起，共18讲。
export const MATH_LECTURES = [
  '第1讲：函数极限与连续基础知识 + 函数概念/特性/图像/极限',
  '第2讲：函数极限性质与计算 + 函数连续与间断 + 数列极限',
  '第3讲：一元函数微分学概念',
  '第4讲：一元函数微分学计算',
  '第5讲：一元微分应用（一）极值/单调/凹凸/拐点/渐近',
  '第6讲：一元微分应用（二）中值定理 + 微分等式与不等式',
  '第7讲：一元微分应用（三）物理应用/复利/经济',
  '第8讲：一元积分学概念与性质',
  '第9讲：不定积分/定积分/变限积分/反常积分 + 积分法',
  '第10讲：一元积分应用（一）',
  '第11讲：一元积分应用（二）',
  '第12讲：一元积分应用（三）+ 积分等式与不等式',
  '第13讲：多元函数微分学基础',
  '第14讲：二重积分',
  '第15讲：微分方程基础',
  '第16讲：微分方程求解 + 无穷级数',
  '第17讲：多元积分预备知识 + 傅里叶级数',
  '第18讲：多元函数积分学（数一）',
];

// 按计划表"4月1日启动→7月完成基础期约100天"分配：每讲按难度/时长给权重，
// 总权重求和后映射到天数。下面的权重大致正比于 1.5 倍速时长（取整小时）。
// 权重单位是"相对天数"——每天按 2.5 小时学习量计。
export const MATH_LECTURE_WEIGHTS = [
  5, // 第1讲（极限基础量大）
  6, // 第2讲（极限计算 + 数列极限）
  5, // 第3讲（微分概念）
  4, // 第4讲（微分计算）
  8, // 第5讲★（一元微分应用·重点多）
  6, // 第6讲（中值定理）
  4, // 第7讲（物理经济应用）
  3, // 第8讲（积分概念）
  8, // 第9讲★（积分计算·重点）
  4, // 第10讲
  4, // 第11讲
  5, // 第12讲
  6, // 第13讲（多元微分）
  5, // 第14讲（二重积分）
  3, // 第15讲（微分方程基础）
  8, // 第16讲★（微分方程求解 + 级数）
  5, // 第17讲（多元积分预备 + 傅里叶）
  6, // 第18讲★（多元积分 数一）
];
// 累积权重，用于"给定日期偏移 → 对应讲次索引"的 O(1) 查表。
export const MATH_LECTURE_CUM_DAYS: number[] = (() => {
  let acc = 0;
  return MATH_LECTURE_WEIGHTS.map(w => (acc += w));
})();

// Calendar milestone markers (生日 / 考试节点)
export interface CalendarMilestone {
  date: string; // YYYY-MM-DD
  label: string;
  emoji: string;
  kind: 'exam' | 'birthday' | 'notice';
}
export const CALENDAR_MILESTONES: CalendarMilestone[] = [
  { date: '2026-06-13', label: '英语六级考试', emoji: '🎧', kind: 'exam' },
  { date: '2026-07-09', label: '京京生日 🎂', emoji: '🎂', kind: 'birthday' },
  { date: '2026-08-15', label: '地大27考研大纲发布（预计）', emoji: '📢', kind: 'notice' },
  { date: '2026-09-21', label: '江浔生日 🎉', emoji: '🎉', kind: 'birthday' },
  { date: '2026-12-19', label: '考研初试·政治/英语', emoji: '📝', kind: 'exam' },
  { date: '2026-12-20', label: '考研初试·数学一/891', emoji: '📝', kind: 'exam' },
];

// 六级日期分界：6/13 之前英语任务走六级，之后切到考研英语
export const CET6_DATE = '2026-06-13';

// 考研初试首日（用于倒计时）
export const EXAM_DATE = '2026-12-19';

// Default sidebar items
export const DEFAULT_SIDEBAR_ITEMS = [
  { id: 'wechat', label: '微信', icon: 'MessageCircle', order: 0 },
  { id: 'virtual-space', label: '虚拟空间', icon: 'Sparkles', order: 1 },
  { id: 'library', label: '图书馆', icon: 'BookOpen', order: 2 },
  { id: 'map', label: '地图', icon: 'MapPin', order: 3 },
  { id: 'shopping', label: '购物', icon: 'ShoppingBag', order: 4 },
  { id: 'accounting', label: '记账', icon: 'Calculator', order: 5 },
  { id: 'exam', label: '考研模拟器', icon: 'GraduationCap', order: 6 },
  { id: 'settings', label: '设置', icon: 'Settings', order: 7 },
];

// Transaction category labels
export const TRANSACTION_CATEGORIES: Record<string, string> = {
  food: '餐饮',
  transport: '交通',
  shopping: '购物',
  entertainment: '娱乐',
  education: '教育',
  medical: '医疗',
  housing: '住房',
  salary: '工资',
  other: '其他',
};

// Exam subjects
export const SUBJECT_LABELS: Record<string, string> = {
  math: '📖 数学',
  english: '🎧 英语',
  professional: '📚 专业课',
  politics: '🗓️ 政治',
};
