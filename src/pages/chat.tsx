import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { chatAPI, type Session, type ChatMessage } from '@/services/api';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [updateKey, setUpdateKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadSessions();
  }, [user, router]);

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

  const handleSessionClick = (sessionId: string) => {
    setMessages([]); // Reset messages before loading new session
    loadChatHistory(sessionId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const messageText = inputMessage.trim();
    setInputMessage('');

    try {
      setIsLoading(true);
      
      // Add user message immediately
      const userMessage = {
        content: messageText,
        role: 'user' as const,
        timestamp: new Date().toISOString(),
      };
      console.log('Adding user message:', userMessage);
      setMessages(prev => [...prev, userMessage]);
      setUpdateKey(key => key + 1);

      // Send message to API
      console.log('Sending message to API:', { messageText, currentSession });
      const response = await chatAPI.sendMessage(messageText, currentSession || undefined);
      console.log('Raw API response:', response);

      if (!response || !response.response) {
        throw new Error('Invalid response format from API');
      }

      // Add assistant response
      const assistantMessage = {
        content: response.response,
        role: 'assistant' as const,
        timestamp: new Date().toISOString(),
      };
      console.log('Adding assistant message:', assistantMessage);
      
      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        console.log('Updated messages:', newMessages);
        return newMessages;
      });
      setUpdateKey(key => key + 1);

      // Update session if it's a new chat
      if (!currentSession && response.session_id) {
        console.log('Setting new session:', response.session_id);
        setCurrentSession(response.session_id);
        await loadSessions(); // Refresh sessions list
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Remove the user message if the API call failed
      setMessages(prev => {
        console.log('Reverting messages after error:', prev.slice(0, -1));
        return prev.slice(0, -1);
      });
      setUpdateKey(key => key + 1);
      setInputMessage(messageText); // Restore the message to the input
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 text-xl font-bold border-b border-gray-700">Chats</div>
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <button
              key={session.session_id}
              onClick={() => handleSessionClick(session.session_id)}
              className={`w-full p-4 text-left hover:bg-gray-700 ${
                currentSession === session.session_id ? 'bg-gray-700' : ''
              }`}
            >
              {session.first_message}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setCurrentSession(null);
            setMessages([]);
          }}
          className="p-4 bg-indigo-600 hover:bg-indigo-700 text-center"
        >
          New Chat
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            {currentSession ? 'Chat Session' : 'New Chat'}
          </h1>
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <UserCircleIcon className="h-8 w-8 text-gray-600" />
              )}
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => router.push('/dashboard')}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                    >
                      Profile
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                    >
                      Logout
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>

        {/* Chat messages */}
        <div key={updateKey} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-lg rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex space-x-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 