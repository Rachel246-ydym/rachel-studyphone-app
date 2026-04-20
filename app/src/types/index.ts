// ============ Common Types ============
export type RelationshipStatus = 'friend' | 'lover';
export type AIModel = 'deepseek-chat' | 'deepseek-reasoner';

export interface UserProfile {
  name: string;
  avatar: string; // base64 or URL
}

// ============ Sidebar ============
export interface SidebarItem {
  id: string;
  label: string;
  icon: string; // lucide icon name
  order: number;
}

// ============ WeChat Module ============
export interface CharacterCard {
  id: string;
  name: string;
  avatar: string;
  personality: string; // role setting / system prompt
  createdAt: number;
  /** 是否允许该角色主动发消息/朋友圈。默认 true，设为 false 可节省 API 调用。 */
  autoEnabled?: boolean;
}

export interface ChatContact {
  id: string;
  type: 'private' | 'group';
  name: string;
  avatar: string;
  characterId?: string; // for private chats with AI characters
  members?: string[]; // character IDs for group chats
  createdBy: 'user' | 'jiangxun';
  lastMessage?: string;
  lastMessageTime?: number;
  unread: number;
  passwordProtected?: boolean; // for jiangxun's private groups
  password?: string;
  /** 是否 session 内已临时解锁（仅本次聊天内，退出后需再次输入） */
  sessionUnlocked?: boolean;
}

export interface ChatMessage {
  id: string;
  contactId: string;
  senderId: string; // 'user' | 'jiangxun' | characterId
  senderName: string;
  content: string;
  type: 'text' | 'action' | 'red-packet' | 'location' | 'system';
  timestamp: number;
  redPacketAmount?: number;
  redPacketClaimed?: boolean;
  redPacketNote?: string; // WeChat-style 留言
  redPacketKind?: 'small' | 'big'; // drives UI and amount range
  location?: string; // from map module
  edited?: boolean; // user manually edited or regenerated
}

// ============ Long-term Memory (batch 2) ============
export type MemoryCategory = 'event' | 'hobby' | 'detail' | 'achievement';

export interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  content: string;
  starred: boolean; // always pinned into prompt
  createdAt: number;
  // Which AI character this memory belongs to. Defaults to 'jiangxun'.
  charId?: string;
}

export interface MomentsPost {
  id: string;
  authorId: string; // 'user' | 'jiangxun'
  authorName: string;
  authorAvatar: string;
  content: string;
  images?: string[];
  timestamp: number;
  likes: string[];
  comments: MomentsComment[];
  backgroundImage?: string;
}

export interface MomentsComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  replyTo?: string; // comment id
  timestamp: number;
}

export interface HomeworkItem {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  completedAt?: number;
  isCompleted: boolean;
  autoDeleteAt?: number; // 7 days after completion
}

// ============ Virtual Space ============
export interface VirtualSpaceEntry {
  id: string;
  date: string; // YYYY-MM-DD
  authorId: string; // 'user' | 'jiangxun'
  content: string;
  timestamp: number;
  /** 江浔对"我的备忘录"留下的 AI 印记；可重新生成/编辑 */
  jiangxunImprint?: string;
  /** 江浔的 AI 备忘录子类型（心里话/情书/记忆） */
  jxKind?: 'memory' | 'heart' | 'loveletter';
}

export interface Footprint {
  id: string;
  entryId: string;
  authorId: string;
  content: string; // visible footprint
  feeling: string; // "hidden" feeling (actually visible to the other)
  timestamp: number;
}

export interface PeriodRecord {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  cycleLength?: number;
}

// ============ Story Replay (batch 4) ============
export interface StoryReplay {
  id: string;
  title: string;
  contactId: string;
  messageIds: string[];
  createdAt: number;
  format: 'text' | 'image';
}

// ============ Library ============
export interface Book {
  id: string;
  title: string;
  content: string; // full text
  chapters: BookChapter[];
  userProgress: number; // character index
  jiangxunProgress: number;
  jiangxunDailyReadAmount: number; // variable
  addedAt: number;
}

export interface BookChapter {
  index: number;
  title: string;
  startPos: number;
  endPos: number;
}

export interface BookMark {
  id: string;
  bookId: string;
  authorId: string;
  authorName: string;
  startPos: number;
  endPos: number;
  markedText: string;
  comment: string;
  timestamp: number;
  replies: BookMarkReply[];
}

export interface BookMarkReply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: number;
}

// ============ Map ============
export interface MapEvent {
  id: string;
  timestamp: number;
  location: string;
  action: string; // "到达了超市" "离开了超市"
  detail?: string;
  linkedShoppingId?: string; // link to shopping receipt
}

export interface MapLandmark {
  id: string;
  name: string;
  category: 'cafe' | 'restaurant' | 'bookstore' | 'park' | 'historical' | 'shop' | 'campus';
  position: { x: number; y: number };
  rating: number;
  description: string;
  hours: string;
  tags: string[];
  reviews: Array<{
    author: string;
    content: string;
    date: string;
    rating: number;
  }>;
  emoji: string;
}

// ============ Shopping ============
export type ProductCategory =
  | 'food'
  | 'daily'
  | 'bakery'
  | 'flowers'
  | 'gifts'
  | 'adult'; // only visible when relationship = lover

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number; // in 海币
  description: string;
  emoji: string; // visual representation
  adultOnly?: boolean;
}

export interface ShoppingReceipt {
  id: string;
  items: { product: Product; quantity: number }[];
  buyerId: string; // 'user' | 'jiangxun'
  sharedWith?: string; // if shopping together
  totalPrice: number;
  timestamp: number;
  jiangxunComment?: string; // his opinion on the purchase
}

// ============ Accounting ============
export type TransactionType = 'income' | 'expense';
export type TransactionCategory =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'education'
  | 'medical'
  | 'housing'
  | 'salary'
  | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

// ============ Exam Simulator ============
export type EnglishSubtype = 'words' | 'listening' | 'reading' | 'writing';

export interface StudyTask {
  id: string;
  date: string; // YYYY-MM-DD
  subject: 'math' | 'english' | 'professional' | 'politics';
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt?: number;
  isReview: boolean;
  reviewOf?: string; // original task id
  haibiReward: number;
  /** 英语子类型，用于成就与进度统计 */
  englishSubtype?: EnglishSubtype;
  /** 是否由补卡完成（不触发江浔聊天、不计入连续打卡） */
  makeup?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  condition: string;
  isUnlocked: boolean;
  unlockedAt?: number;
  haibiReward: number;
}

export interface StudyStats {
  focus: number; // 0-100
  perseverance: number;
  totalDaysCheckedIn: number;
  currentStreak: number;
  longestStreak: number;
}

// ============ App State ============
export interface AppState {
  // User
  userProfile: UserProfile;
  jiangxunProfile: UserProfile;

  // Settings
  apiKey: string;
  aiModel: AIModel;
  groupChatMessageLimit: number;
  sidebarItems: SidebarItem[];

  // Relationship
  relationshipStatus: RelationshipStatus;

  // Currency
  userHaibi: number;
  jiangxunHaibi: number;

  // WeChat
  characters: CharacterCard[];
  contacts: ChatContact[];
  messages: Record<string, ChatMessage[]>; // contactId -> messages
  moments: MomentsPost[];
  homework: HomeworkItem[];
  memories: MemoryEntry[];
  momentsBackgroundImage?: string; // base64 or URL, used on the Moments page
  storyReplays?: StoryReplay[];

  // Virtual Space
  virtualSpaceEntries: VirtualSpaceEntry[];
  footprints: Footprint[];
  periodRecords: PeriodRecord[];
  jiangxunMemo?: string;
  userMemo?: string;
  userMemoImprint?: string;

  // Library
  books: Book[];
  bookmarks: BookMark[];

  // Map
  mapEvents: MapEvent[];

  // Shopping
  products: Product[];
  receipts: ShoppingReceipt[];

  // Accounting
  transactions: Transaction[];

  // Exam Simulator
  studyTasks: StudyTask[];
  achievements: Achievement[];
  studyStats: StudyStats;

  // UI State
  activePage: string;
  sidebarExpanded: boolean;
  pendingOpenContactId?: string;
}
