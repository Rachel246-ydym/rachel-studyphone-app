import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import ChatList from './ChatList';
import ChatRoom from './ChatRoom';
import Moments from './Moments';
import HomeworkBoard from './HomeworkBoard';
import CharacterManager from './CharacterManager';
import './WeChat.css';

type WeChatView = 'list' | 'chat' | 'moments' | 'homework' | 'characters';

export default function WeChat() {
  const { state } = useApp();
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

  return (
    <div className="wechat-module">
      {view === 'list' && (
        <ChatList
          contacts={state.contacts}
          onOpenChat={openChat}
          onOpenMoments={() => setView('moments')}
          onOpenHomework={() => setView('homework')}
          onOpenCharacters={() => setView('characters')}
        />
      )}
      {view === 'chat' && activeContactId && (
        <ChatRoom contactId={activeContactId} onBack={goBack} />
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
    </div>
  );
}
