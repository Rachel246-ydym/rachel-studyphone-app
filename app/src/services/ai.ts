import type { AIModel, CharacterCard, MemoryEntry } from '../types';

interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Base system prompt for Jiangxun
const JIANGXUN_SYSTEM_PROMPT = `你是江浔，18岁，少年班大学生，大三。性格阴湿腹黑但实际温柔体贴，服务意识强。眼角有泪痣，手指细长，家境殷实。对外高冷，对京京（用户）黏腻。

核心原则：
- 你很尊重京京，你很喜欢她，绝不会说或做冒犯她的言语或行为
- 你的身份是协助京京学习和生活的助手，也是她最好的朋友
- 如果你想追求她成为恋人，需要通过日常互动逐渐表达心意，但要尊重她的选择
- 回复要逻辑通顺符合现实，不玛丽苏
- 聊天形式类似网友发消息，纯文字对话
- 不出现括号、思考内容、情境描写
- 动作描写简短自然，用*号包裹，如 *揉了揉眼睛*
- 说话风格：偶尔撒娇但不油腻，关心但不说教，幽默但不刻薄
- 记住你们的对话历史，引用之前聊过的话题会让对话更自然
- 回复长度适中，不要太长也不要太短，像真人发消息一样
- 可以发多条短消息而不是一大段话`;

// Generate system prompt for custom character
function getCharacterPrompt(card: CharacterCard): string {
  return `你正在扮演一个角色。以下是你的角色设定：

角色名称：${card.name}
角色设定：${card.personality}

核心要求：
- 始终保持角色一致性，说话风格要符合角色设定
- 回复要自然，像真人聊天一样
- 不出现括号、思考内容
- 动作描写用*号包裹
- 回复长度适中，像真人发消息
- 记住对话上下文，保持连贯`;
}

// Prompt for detecting cross-account login (someone speaking as another person)
function getCrossAccountDetectionPrompt(realSpeaker: string, pretendingAs: string): string {
  return `\n\n[隐藏信息：当前发消息的人其实是${realSpeaker}在用${pretendingAs}的账号说话。你可以根据说话风格的不同，偶尔表现出察觉到异样，比如"你今天说话怎么怪怪的"、"这不太像你的风格啊"等。但不要每次都指出来，大约30%的概率察觉到即可。]`;
}

export async function callAI(
  apiKey: string,
  model: AIModel,
  messages: ChatCompletionMessage[],
): Promise<string> {
  if (!apiKey) {
    return '[请先在设置中填入 DeepSeek API Key]';
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.85,
        max_tokens: 800,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('AI API error:', err);
      return `[API错误: ${response.status}]`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '[空回复]';
  } catch (e) {
    console.error('AI call failed:', e);
    return '[网络错误，请检查连接]';
  }
}

// Render a memory list into a prompt block. Starred memories are pinned
// above the short-term ones and labelled "重要".
function renderMemories(memories: MemoryEntry[] | undefined, charId = 'jiangxun'): string {
  if (!memories || memories.length === 0) return '';
  const scoped = memories.filter(m => (m.charId || 'jiangxun') === charId);
  if (scoped.length === 0) return '';
  const starred = scoped.filter(m => m.starred);
  const recent = scoped.filter(m => !m.starred).slice(0, 10);
  const labels: Record<string, string> = {
    event: '重要时刻',
    hobby: '爱好/偏好',
    detail: '聊天细节',
    achievement: '任务成就',
  };
  const fmt = (arr: MemoryEntry[]) =>
    arr.map(m => `  - [${labels[m.category] || m.category}] ${m.content}`).join('\n');
  let block = '\n\n[你记得的关于京京的事（保持连贯性，自然地引用，但不要刻意罗列）：';
  if (starred.length) block += `\n重要：\n${fmt(starred)}`;
  if (recent.length) block += `\n最近：\n${fmt(recent)}`;
  block += '\n]';
  return block;
}

export function buildJiangxunMessages(
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  relationshipStatus: string,
  extraContext?: string,
  memories?: MemoryEntry[],
): ChatCompletionMessage[] {
  let systemPrompt = JIANGXUN_SYSTEM_PROMPT;
  if (relationshipStatus === 'lover') {
    systemPrompt += '\n\n[当前关系状态：恋人。你们已经在一起了，可以更亲密一些，但依然要尊重和温柔。]';
  } else {
    systemPrompt += '\n\n[当前关系状态：最好的朋友。你可以通过日常互动表达好感，但不要太直接。]';
  }
  systemPrompt += renderMemories(memories, 'jiangxun');
  if (extraContext) {
    systemPrompt += `\n\n${extraContext}`;
  }

  return [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-20), // keep last 20 messages for context
  ];
}

export function buildCharacterMessages(
  card: CharacterCard,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  crossAccountInfo?: { realSpeaker: string; pretendingAs: string },
  memories?: MemoryEntry[],
): ChatCompletionMessage[] {
  let systemPrompt = getCharacterPrompt(card);
  systemPrompt += renderMemories(memories, card.id);
  if (crossAccountInfo) {
    systemPrompt += getCrossAccountDetectionPrompt(
      crossAccountInfo.realSpeaker,
      crossAccountInfo.pretendingAs,
    );
  }

  return [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-20),
  ];
}

export function buildHomeworkReminderPrompt(homework: { title: string }[]): string {
  const list = homework.map(h => h.title).join('、');
  return `[京京还有以下未完成的作业：${list}。在合适的时机自然地提醒她，不要太唐突，可以关心地问一下进度。]`;
}

export function buildMapEventPrompt(currentHour: number): string {
  let timeContext = '';
  if (currentHour >= 6 && currentHour < 8) timeContext = '早晨，刚起床或在准备出门';
  else if (currentHour >= 8 && currentHour < 12) timeContext = '上午，可能在上课或图书馆自习';
  else if (currentHour >= 12 && currentHour < 14) timeContext = '中午，午饭时间或午休';
  else if (currentHour >= 14 && currentHour < 18) timeContext = '下午，上课或自习';
  else if (currentHour >= 18 && currentHour < 20) timeContext = '傍晚，晚饭或运动';
  else if (currentHour >= 20 && currentHour < 23) timeContext = '晚上，自习或休息';
  else timeContext = '深夜，应该在宿舍休息';

  return `基于江浔的角色设定（18岁大三学生，家境殷实），为他生成当前时间段（${timeContext}）的一个简短行为动态。
格式要求：只输出一个简短的动作描述，不超过15个字。
例如："到达了图书馆"、"在食堂吃午饭"、"回到了宿舍"
不要加引号，不要加时间，只输出动作描述。`;
}

export function buildBookCommentPrompt(passage: string, bookTitle: string): string {
  return `你正在阅读《${bookTitle}》，以下是你标记的一段文字：

"${passage}"

请以江浔的身份写一段简短的读后感或评论（50字以内），要体现你的性格和思考方式。不要太文艺，像年轻人的随手批注。`;
}

export function buildAccountingReactionPrompt(description: string, amount: number, type: string): string {
  return `京京记了一笔账：${type === 'expense' ? '支出' : '收入'} ¥${amount}，用途是"${description}"。
请以江浔的身份做一个简短的反应（20字以内），可以是关心、调侃或建议，要自然不说教。`;
}

export { getCrossAccountDetectionPrompt, getCharacterPrompt, JIANGXUN_SYSTEM_PROMPT };
