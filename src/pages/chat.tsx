import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { chatAPI, type Session, type ChatMessage } from '@/services/api';
import { UserCircleIcon, Bars3Icon, XMarkIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useTheme } from 'next-themes';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

type MarkdownProps = {
  children: string | string[];
};

type CodeBlockProps = MarkdownProps & {
  inline?: boolean;
  className?: string;
};

type LinkProps = MarkdownProps & {
  href?: string;
};

export default function ChatPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [updateKey, setUpdateKey] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLButtonElement>(null);
  const mobileDropdownMenuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle mounting
  useEffect(() => {
    setMounted(true);
    // Add click outside listener for dropdown
    const handleClickOutside = (event: MouseEvent) => {
      const isClickInsideDesktopDropdown = 
        (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) ||
        (dropdownMenuRef.current && dropdownMenuRef.current.contains(event.target as Node));
      
      const isClickInsideMobileDropdown = 
        (mobileDropdownRef.current && mobileDropdownRef.current.contains(event.target as Node)) ||
        (mobileDropdownMenuRef.current && mobileDropdownMenuRef.current.contains(event.target as Node));

      if (!isClickInsideDesktopDropdown && !isClickInsideMobileDropdown) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadSessions();
  }, [user, router]);

  useEffect(() => {
    if (mounted && resolvedTheme === 'dark') {
      document.documentElement.style.setProperty(
        '--brightness-overlay',
        String(brightness / 100 * 0.7)
      );
    } else {
      document.documentElement.style.setProperty('--brightness-overlay', '0');
    }
  }, [brightness, resolvedTheme, mounted]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    try {
      const sessionsData = await chatAPI.getSessions();
      setSessions(sessionsData);
    } catch (error) {
      toast.error('Failed to load chat sessions');
    }
  };

  const loadChatHistory = async (sessionId: string) => {
    try {
      setIsLoading(true);
      console.log('Loading chat history for session:', sessionId);
      
      const history = await chatAPI.getChatHistory(sessionId);
      console.log('Received chat history:', history);
      
      if (!Array.isArray(history)) {
        console.error('Invalid history format:', history);
        throw new Error('Invalid chat history format');
      }
      
      setMessages(history);
      setCurrentSession(sessionId);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      toast.error('Failed to load chat history');
      setMessages([]); // Reset to empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  // Function to close sidebar
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Modify handleSessionClick to close sidebar on mobile after selection
  const handleSessionClick = (sessionId: string) => {
    setMessages([]); // Reset messages before loading new session
    loadChatHistory(sessionId);
    closeSidebar(); // Close sidebar on mobile after selecting a session
  };

  // Modify handleNewChat function
  const handleNewChat = () => {
    setCurrentSession(null);
    setMessages([]);
    closeSidebar();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const messageText = inputMessage.trim();
    setInputMessage('');

    try {
      setIsLoading(true);
      setIsStreaming(true);
      setStreamingMessage('');
      
      // Add user message immediately
      const userMessage = {
        content: messageText,
        role: 'user' as const,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Create assistant message placeholder
      const assistantMessage = {
        content: '',
        role: 'assistant' as const,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Send message to API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          user_query: messageText,
          session_id: currentSession || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Get new session ID from headers if this is a new chat
      const newSessionId = response.headers.get('session-id');
      if (!currentSession && newSessionId) {
        setCurrentSession(newSessionId);
        await loadSessions(); // Refresh sessions list
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let accumulatedContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);
        accumulatedContent += chunk;

        // Update the assistant message with accumulated content
        setMessages(prev => prev.map((msg, index) => 
          index === prev.length - 1 ? { ...msg, content: accumulatedContent } : msg
        ));
      }

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Remove the assistant message if the API call failed
      setMessages(prev => prev.slice(0, -1));
      setInputMessage(messageText); // Restore the message to the input
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessage('');
    }
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setIsLoading(true);
      setIsDropdownOpen(false);
      
      if (isSidebarOpen) {
        closeSidebar();
      }
      
      await logout(); // This should be your API logout call from AuthContext
      
      // Clear any local storage data
      localStorage.clear();
      
      // Use router for navigation instead of direct window.location
      router.push('/');
      
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigation = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setIsDropdownOpen(false);
      if (isSidebarOpen) {
        closeSidebar();
      }
      // Use router for navigation instead of direct window.location
      router.push(path);
    } catch (error: any) {
      console.error('Navigation error:', error);
      toast.error('Navigation failed. Please try again.');
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering session click
    try {
      if (window.confirm('Are you sure you want to delete this chat session?')) {
        setIsLoading(true);
        await chatAPI.deleteSession(sessionId);
        toast.success('Chat session deleted');
        
        // If the deleted session was the current one, reset the view
        if (sessionId === currentSession) {
          setCurrentSession(null);
          setMessages([]);
        }
        
        // Refresh sessions list
        await loadSessions();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete chat session');
    } finally {
      setIsLoading(false);
    }
  };

  // Render loading state while not mounted
  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse flex space-x-2">
          <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
          <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
          <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Update the theme toggle button JSX
  const renderThemeToggle = () => {
    if (!mounted) return null;

    return (
      <>
        {resolvedTheme === 'dark' && (
          <div className="flex items-center space-x-2">
            <SunIcon className="h-5 w-5 text-gray-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 dark:accent-indigo-400"
              title="Adjust screen darkness"
            />
            <MoonIcon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {resolvedTheme === 'dark' ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </button>
      </>
    );
  };

  return (
    <>
      <div className="brightness-overlay" />
      <div className="h-screen flex bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {/* Mobile sidebar backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-30 w-80 bg-white dark:bg-gray-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Chat History</h2>
              <button
                onClick={closeSidebar}
                className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Chat Sessions */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-colors mb-4"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Chat
              </button>
              {sessions.map((session) => (
                <button
                  key={session.session_id}
                  onClick={() => handleSessionClick(session.session_id)}
                  className={`w-full p-4 text-left rounded-lg transition-colors ${
                    currentSession === session.session_id
                      ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-2">{session.first_message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(session.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.session_id, e);
                      }}
                      className="ml-2 p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </button>
              ))}
            </div>

            {/* Mobile User Profile Section - at bottom */}
            <div className="lg:hidden border-t border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <button
                  ref={mobileDropdownRef}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <UserCircleIcon className="h-10 w-10 text-gray-400" />
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">{user?.full_name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <ChevronUpIcon 
                    className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                      isDropdownOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                {isDropdownOpen && (
                  <div 
                    ref={mobileDropdownMenuRef}
                    className="mt-2 space-y-1"
                  >
                    <button
                      onClick={(e) => handleNavigation(e, '/')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      Home
                    </button>
                    <button
                      onClick={(e) => handleNavigation(e, '/dashboard')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      Profile Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 min-w-0 h-screen overflow-hidden">
          {/* Fixed Header */}
          <div className="h-16 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 mr-2 rounded-md text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                {currentSession ? 'Chat Session' : 'New Chat'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {renderThemeToggle()}
              
              {/* Desktop User Profile */}
              <div className="hidden lg:block relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                  ref={dropdownRef}
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.full_name}</span>
                  <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                    isDropdownOpen ? 'transform rotate-180' : ''
                  }`} />
                </button>
                
                {/* Desktop Dropdown Menu */}
                {isDropdownOpen && (
                  <div 
                    ref={dropdownMenuRef}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-600"
                  >
                    <div className="py-1">
                      <button
                        onClick={(e) => handleNavigation(e, '/')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        Home
                      </button>
                      <button
                        onClick={(e) => handleNavigation(e, '/dashboard')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        Profile Settings
                      </button>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Messages Container */}
          <div 
            key={updateKey} 
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900"
          >
            {messages.length === 0 && !isLoading && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p className="text-xl font-medium">Welcome to Chat</p>
                <p className="text-sm mt-2">Start typing to begin a conversation</p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.timestamp}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'
                  } shadow-sm`}
                >
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="text-sm whitespace-pre-wrap">
                      <div className={`${
                        message.role === 'user'
                          ? 'prose-a:text-white prose-a:hover:text-indigo-200'
                          : 'prose-a:text-indigo-600 prose-a:dark:text-indigo-400 prose-a:hover:text-indigo-800 prose-a:dark:hover:text-indigo-300'
                      }`}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {/* Streaming message */}
            {isStreaming && streamingMessage && (
              <div className="flex justify-start">
                <div className="max-w-2xl rounded-2xl px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white shadow-sm">
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="text-sm whitespace-pre-wrap">
                      <div className="prose-a:text-indigo-600 prose-a:dark:text-indigo-400 prose-a:hover:text-indigo-800 prose-a:dark:hover:text-indigo-300">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingMessage}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {(isLoading || isStreaming) && !streamingMessage && (
              <div className="flex justify-center">
                <div className="animate-pulse flex space-x-2">
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Fixed Input Form at Bottom */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex-shrink-0">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </span>
                  ) : (
                    <span>Send</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}