import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import ChatList from './ChatList';
import ChatRoom from './ChatRoom';
import Moments from './Moments';
import HomeworkBoard from './HomeworkBoard';
import CharacterManager from './CharacterManager';
import MemoryManager from './MemoryManager';
import './WeChat.css';
import type { StoryReplay } from '../../types';

type WeChatView = 'list' | 'chat' | 'moments' | 'homework' | 'characters' | 'memories';

export default function WeChat() {
  const { state, dispatch } = useApp();
  const [view, setView] = useState<WeChatView>('list');
  const [activeContactId, setActiveContactId] = useState<string | null>(null);

  function openChat(contactId: string) {
    setActiveContactId(contactId);
    setView('chat');
  }

  function goBack() {
    if (view === 'chat') {
      setActiveContactId(null);
      setView('list');
    } else {
      setView('list');
    }
  }

  // Story replay "save" callback from ChatRoom multiselect.
  // Prompts for a title, then stores a StoryReplay entry. The viewer
  // itself lives on the Virtual Space page (batch 4).
  function handleStoryReplay(selectedIds: string[]) {
    if (!activeContactId || selectedIds.length === 0) return;
    const title = window.prompt('给这段剧情取个标题：', '一段回忆');
    if (!title) return;
    const replay: StoryReplay = {
      id: `sr-${Date.now()}`,
      title: title.trim() || '一段回忆',
      contactId: activeContactId,
      messageIds: selectedIds,
      createdAt: Date.now(),
      format: 'text',
    };
    dispatch({ type: 'ADD_STORY_REPLAY', payload: replay });
    alert('已存入剧情回放，可在虚拟空间页查看');
  }

  return (
    <div className="wechat-module">
      {view === 'list' && (
        <ChatList
          contacts={state.contacts}
          onOpenChat={openChat}
          onOpenMoments={() => setView('moments')}
          onOpenHomework={() => setView('homework')}
          onOpenCharacters={() => setView('characters')}
          onOpenMemories={() => setView('memories')}
        />
      )}
      {view === 'chat' && activeContactId && (
        <ChatRoom
          contactId={activeContactId}
          onBack={goBack}
          onOpenStoryReplay={handleStoryReplay}
        />
      )}
      {view === 'moments' && (
        <Moments onBack={goBack} />
      )}
      {view === 'homework' && (
        <HomeworkBoard onBack={goBack} />
      )}
      {view === 'characters' && (
        <CharacterManager onBack={goBack} />
      )}
      {view === 'memories' && (
        <MemoryManager onBack={goBack} />
      )}
    </div>
  );
}
