// ai-chat-hub/frontend/src/App.jsx

import { useEffect, useState } from 'react';
import { useAuthStore, useChatStore } from './store/useStore';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { TopBar } from './components/chat/TopBar';
import { McpPanel } from './components/mcp/McpPanel';
import { SettingsDialog } from './components/settings/SettingsDialog';

export default function App() {
  const { user } = useAuthStore();
  const { fetchModels, fetchConversations, sidebarOpen, mcpPanelOpen, settingsOpen } = useChatStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (user) {
      Promise.all([fetchModels(), fetchConversations()]).then(() => {
        setInitialized(true);
      });
    } else {
      setInitialized(true);
    }
  }, [user]);

  if (!initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot"></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot"></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <aside className="w-64 lg:w-72 xl:w-80 flex-shrink-0 border-r border-border bg-card overflow-hidden
                           max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:w-72">
            <Sidebar />
          </aside>
        )}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatArea />
        </main>
        {mcpPanelOpen && (
          <aside className="w-80 lg:w-96 flex-shrink-0 border-l border-border bg-card overflow-hidden
                           max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-40 max-md:w-80">
            <McpPanel />
          </aside>
        )}
      </div>
      {settingsOpen && <SettingsDialog />}
    </div>
  );
}
