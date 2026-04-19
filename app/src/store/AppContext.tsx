import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, ChatMessage, ChatContact, CharacterCard, MomentsPost, HomeworkItem, VirtualSpaceEntry, Footprint, PeriodRecord, Book, BookMark, MapEvent, ShoppingReceipt, Transaction, StudyTask, SidebarItem, MemoryEntry, StoryReplay } from '../types';
import { saveData, loadData } from '../services/storage';
import { DEFAULT_PRODUCTS, DEFAULT_ACHIEVEMENTS, DEFAULT_SIDEBAR_ITEMS } from '../utils/prompts';

const initialState: AppState = {
  userProfile: { name: '京京', avatar: '' },
  jiangxunProfile: { name: '江浔', avatar: '' },
  apiKey: '',
  aiModel: 'deepseek-chat',
  groupChatMessageLimit: 10,
  sidebarItems: DEFAULT_SIDEBAR_ITEMS,
  relationshipStatus: 'friend',
  userHaibi: 0,
  jiangxunHaibi: 9999,
  characters: [],
  contacts: [
    {
      id: 'jiangxun',
      type: 'private',
      name: '江浔',
      avatar: '',
      characterId: 'jiangxun',
      createdBy: 'user',
      lastMessage: '点击开始聊天吧~',
      lastMessageTime: Date.now(),
      unread: 0,
    },
  ],
  messages: {},
  moments: [],
  homework: [],
  memories: [],
  momentsBackgroundImage: undefined,
  storyReplays: [],
  virtualSpaceEntries: [],
  footprints: [],
  periodRecords: [],
  books: [],
  bookmarks: [],
  mapEvents: [],
  products: DEFAULT_PRODUCTS,
  receipts: [],
  transactions: [],
  studyTasks: [],
  achievements: DEFAULT_ACHIEVEMENTS.map(a => ({ ...a, unlockedAt: undefined })),
  studyStats: { focus: 0, perseverance: 0, totalDaysCheckedIn: 0, currentStreak: 0, longestStreak: 0 },
  activePage: 'wechat',
  sidebarExpanded: true,
};

type Action =
  | { type: 'SET_STATE'; payload: Partial<AppState> }
  | { type: 'SET_ACTIVE_PAGE'; payload: string }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'SET_AI_MODEL'; payload: AppState['aiModel'] }
  | { type: 'SET_GROUP_LIMIT'; payload: number }
  | { type: 'REORDER_SIDEBAR'; payload: SidebarItem[] }
  | { type: 'SET_RELATIONSHIP'; payload: AppState['relationshipStatus'] }
  | { type: 'ADD_HAIBI'; payload: { target: 'user' | 'jiangxun'; amount: number } }
  | { type: 'SPEND_HAIBI'; payload: { target: 'user' | 'jiangxun'; amount: number } }
  // WeChat
  | { type: 'ADD_CHARACTER'; payload: CharacterCard }
  | { type: 'REMOVE_CHARACTER'; payload: string }
  | { type: 'ADD_CONTACT'; payload: ChatContact }
  | { type: 'UPDATE_CONTACT'; payload: { id: string; updates: Partial<ChatContact> } }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { contactId: string; id: string; updates: Partial<ChatMessage> } }
  | { type: 'DELETE_MESSAGE'; payload: { contactId: string; id: string } }
  | { type: 'REPLACE_MESSAGES'; payload: { contactId: string; messages: ChatMessage[] } }
  | { type: 'ADD_MEMORY'; payload: MemoryEntry }
  | { type: 'UPDATE_MEMORY'; payload: { id: string; updates: Partial<MemoryEntry> } }
  | { type: 'DELETE_MEMORY'; payload: string }
  | { type: 'SET_MOMENTS_BG'; payload: string | undefined }
  | { type: 'ADD_STORY_REPLAY'; payload: StoryReplay }
  | { type: 'DELETE_STORY_REPLAY'; payload: string }
  | { type: 'ADD_MOMENT'; payload: MomentsPost }
  | { type: 'UPDATE_MOMENT'; payload: { id: string; updates: Partial<MomentsPost> } }
  | { type: 'ADD_HOMEWORK'; payload: HomeworkItem }
  | { type: 'COMPLETE_HOMEWORK'; payload: string }
  | { type: 'DELETE_HOMEWORK'; payload: string }
  // Virtual Space
  | { type: 'ADD_VS_ENTRY'; payload: VirtualSpaceEntry }
  | { type: 'ADD_FOOTPRINT'; payload: Footprint }
  | { type: 'ADD_PERIOD'; payload: PeriodRecord }
  | { type: 'UPDATE_PERIOD'; payload: { id: string; updates: Partial<PeriodRecord> } }
  // Library
  | { type: 'ADD_BOOK'; payload: Book }
  | { type: 'UPDATE_BOOK'; payload: { id: string; updates: Partial<Book> } }
  | { type: 'ADD_BOOKMARK'; payload: BookMark }
  | { type: 'ADD_BOOKMARK_REPLY'; payload: { bookmarkId: string; reply: BookMark['replies'][0] } }
  // Map
  | { type: 'ADD_MAP_EVENT'; payload: MapEvent }
  // Shopping
  | { type: 'ADD_RECEIPT'; payload: ShoppingReceipt }
  // Accounting
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  // Exam
  | { type: 'ADD_STUDY_TASK'; payload: StudyTask }
  | { type: 'COMPLETE_TASK'; payload: string }
  | { type: 'UNLOCK_ACHIEVEMENT'; payload: string }
  | { type: 'UPDATE_STATS'; payload: Partial<AppState['studyStats']> }
  // Profile
  | { type: 'UPDATE_USER_PROFILE'; payload: Partial<AppState['userProfile']> }
  | { type: 'UPDATE_JIANGXUN_PROFILE'; payload: Partial<AppState['jiangxunProfile']> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };
    case 'SET_ACTIVE_PAGE':
      return { ...state, activePage: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarExpanded: !state.sidebarExpanded };
    case 'SET_API_KEY':
      return { ...state, apiKey: action.payload };
    case 'SET_AI_MODEL':
      return { ...state, aiModel: action.payload };
    case 'SET_GROUP_LIMIT':
      return { ...state, groupChatMessageLimit: action.payload };
    case 'REORDER_SIDEBAR':
      return { ...state, sidebarItems: action.payload };
    case 'SET_RELATIONSHIP':
      return { ...state, relationshipStatus: action.payload };
    case 'ADD_HAIBI':
      return action.payload.target === 'user'
        ? { ...state, userHaibi: state.userHaibi + action.payload.amount }
        : { ...state, jiangxunHaibi: state.jiangxunHaibi + action.payload.amount };
    case 'SPEND_HAIBI':
      return action.payload.target === 'user'
        ? { ...state, userHaibi: Math.max(0, state.userHaibi - action.payload.amount) }
        : { ...state, jiangxunHaibi: Math.max(0, state.jiangxunHaibi - action.payload.amount) };
    // WeChat
    case 'ADD_CHARACTER':
      return { ...state, characters: [...state.characters, action.payload] };
    case 'REMOVE_CHARACTER':
      return { ...state, characters: state.characters.filter(c => c.id !== action.payload) };
    case 'ADD_CONTACT':
      return { ...state, contacts: [...state.contacts, action.payload] };
    case 'UPDATE_CONTACT':
      return {
        ...state,
        contacts: state.contacts.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        ),
      };
    case 'ADD_MESSAGE': {
      const contactId = action.payload.contactId;
      const existing = state.messages[contactId] || [];
      return {
        ...state,
        messages: { ...state.messages, [contactId]: [...existing, action.payload] },
      };
    }
    case 'UPDATE_MESSAGE': {
      const { contactId, id, updates } = action.payload;
      const list = state.messages[contactId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [contactId]: list.map(m => (m.id === id ? { ...m, ...updates } : m)),
        },
      };
    }
    case 'DELETE_MESSAGE': {
      const { contactId, id } = action.payload;
      const list = state.messages[contactId] || [];
      return {
        ...state,
        messages: { ...state.messages, [contactId]: list.filter(m => m.id !== id) },
      };
    }
    case 'REPLACE_MESSAGES': {
      const { contactId, messages } = action.payload;
      return {
        ...state,
        messages: { ...state.messages, [contactId]: messages },
      };
    }
    case 'ADD_MEMORY':
      return { ...state, memories: [action.payload, ...state.memories] };
    case 'UPDATE_MEMORY':
      return {
        ...state,
        memories: state.memories.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        ),
      };
    case 'DELETE_MEMORY':
      return { ...state, memories: state.memories.filter(m => m.id !== action.payload) };
    case 'SET_MOMENTS_BG':
      return { ...state, momentsBackgroundImage: action.payload };
    case 'ADD_STORY_REPLAY':
      return { ...state, storyReplays: [action.payload, ...(state.storyReplays || [])] };
    case 'DELETE_STORY_REPLAY':
      return {
        ...state,
        storyReplays: (state.storyReplays || []).filter(s => s.id !== action.payload),
      };
    case 'ADD_MOMENT':
      return { ...state, moments: [action.payload, ...state.moments] };
    case 'UPDATE_MOMENT':
      return {
        ...state,
        moments: state.moments.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        ),
      };
    case 'ADD_HOMEWORK':
      return { ...state, homework: [...state.homework, action.payload] };
    case 'COMPLETE_HOMEWORK':
      return {
        ...state,
        homework: state.homework.map(h =>
          h.id === action.payload
            ? { ...h, isCompleted: true, completedAt: Date.now(), autoDeleteAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }
            : h
        ),
      };
    case 'DELETE_HOMEWORK':
      return { ...state, homework: state.homework.filter(h => h.id !== action.payload) };
    // Virtual Space
    case 'ADD_VS_ENTRY':
      return { ...state, virtualSpaceEntries: [...state.virtualSpaceEntries, action.payload] };
    case 'ADD_FOOTPRINT':
      return { ...state, footprints: [...state.footprints, action.payload] };
    case 'ADD_PERIOD':
      return { ...state, periodRecords: [...state.periodRecords, action.payload] };
    case 'UPDATE_PERIOD':
      return {
        ...state,
        periodRecords: state.periodRecords.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
      };
    // Library
    case 'ADD_BOOK':
      return { ...state, books: [...state.books, action.payload] };
    case 'UPDATE_BOOK':
      return {
        ...state,
        books: state.books.map(b =>
          b.id === action.payload.id ? { ...b, ...action.payload.updates } : b
        ),
      };
    case 'ADD_BOOKMARK':
      return { ...state, bookmarks: [...state.bookmarks, action.payload] };
    case 'ADD_BOOKMARK_REPLY': {
      return {
        ...state,
        bookmarks: state.bookmarks.map(bm =>
          bm.id === action.payload.bookmarkId
            ? { ...bm, replies: [...bm.replies, action.payload.reply] }
            : bm
        ),
      };
    }
    // Map
    case 'ADD_MAP_EVENT':
      return { ...state, mapEvents: [...state.mapEvents, action.payload] };
    // Shopping
    case 'ADD_RECEIPT':
      return { ...state, receipts: [...state.receipts, action.payload] };
    // Accounting
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    // Exam
    case 'ADD_STUDY_TASK':
      return { ...state, studyTasks: [...state.studyTasks, action.payload] };
    case 'COMPLETE_TASK':
      return {
        ...state,
        studyTasks: state.studyTasks.map(t =>
          t.id === action.payload ? { ...t, isCompleted: true, completedAt: Date.now() } : t
        ),
      };
    case 'UNLOCK_ACHIEVEMENT':
      return {
        ...state,
        achievements: state.achievements.map(a =>
          a.id === action.payload ? { ...a, isUnlocked: true, unlockedAt: Date.now() } : a
        ),
      };
    case 'UPDATE_STATS':
      return { ...state, studyStats: { ...state.studyStats, ...action.payload } };
    // Profile
    case 'UPDATE_USER_PROFILE':
      return { ...state, userProfile: { ...state.userProfile, ...action.payload } };
    case 'UPDATE_JIANGXUN_PROFILE':
      return { ...state, jiangxunProfile: { ...state.jiangxunProfile, ...action.payload } };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    const saved = loadData<AppState>();
    if (saved) {
      return {
        ...init,
        ...saved,
        // Ensure new fields exist even if loaded from old data
        sidebarItems: saved.sidebarItems || init.sidebarItems,
        products: saved.products?.length ? saved.products : init.products,
        achievements: saved.achievements?.length ? saved.achievements : init.achievements,
        memories: saved.memories || [],
        storyReplays: saved.storyReplays || [],
      };
    }
    return init;
  });

  // Auto-save on state change
  useEffect(() => {
    saveData(state);
  }, [state]);

  // Auto-delete completed homework after 7 days
  useEffect(() => {
    const now = Date.now();
    const expired = state.homework.filter(h => h.autoDeleteAt && h.autoDeleteAt < now);
    expired.forEach(h => dispatch({ type: 'DELETE_HOMEWORK', payload: h.id }));
  }, [state.homework]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
