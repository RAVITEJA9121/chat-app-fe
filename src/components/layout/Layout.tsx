import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { useTheme } from 'next-themes';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [brightness, setBrightness] = useState(0);

  // Update CSS variable when brightness changes
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--brightness-overlay',
      theme === 'dark' ? String(brightness / 100 * 0.5) : '0'
    );
  }, [brightness, theme]);

  return (
    <>
      <div className="brightness-overlay" />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <nav className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Student Portal</span>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                {theme === 'dark' && (
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
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <SunIcon className="h-5 w-5" />
                  ) : (
                    <MoonIcon className="h-5 w-5" />
                  )}
                </button>
                {user ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-700 dark:text-gray-300">{user.full_name}</span>
                    <button
                      onClick={() => logout()}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <a
                      href="/login"
                      className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
                    >
                      Login
                    </a>
                    <a
                      href="/register"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-colors"
                    >
                      Register
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>

        <Toaster
          position="top-right"
          toastOptions={{
            className: 'dark:bg-gray-700 dark:text-white',
            style: {
              background: 'rgb(var(--toast-bg))',
              color: 'rgb(var(--toast-color))',
            },
          }}
        />
      </div>
    </>
  );
} 