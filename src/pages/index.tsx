import React from 'react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ChatBubbleLeftRightIcon, UserCircleIcon, AcademicCapIcon, BeakerIcon, LightBulbIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  const features = [
    {
      name: 'Interactive Learning',
      description: 'Engage in dynamic conversations with our AI tutor',
      icon: BeakerIcon,
    },
    {
      name: 'Personalized Experience',
      description: 'Get customized responses based on your learning style',
      icon: UserCircleIcon,
    },
    {
      name: 'Academic Support',
      description: 'Receive help with assignments and academic questions',
      icon: AcademicCapIcon,
    },
    {
      name: 'Smart Insights',
      description: 'Gain valuable insights and explanations',
      icon: LightBulbIcon,
    },
  ];

  return (
    <Layout>
      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-900 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        {/* Main content */}
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                <span className="block">Welcome to</span>
                <span className="block text-indigo-600 dark:text-indigo-400">Student Portal</span>
              </h1>
              <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                Your intelligent academic companion. Get instant help with your studies, manage your profile, and enhance your learning experience.
              </p>

              {/* Animated chat bubble */}
              <div className="mt-8 flex justify-center">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                  <ChatBubbleLeftRightIcon className="relative h-24 w-24 text-indigo-600 dark:text-indigo-400 animate-bounce" />
                </div>
              </div>

              <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center">
                {user ? (
                  <div className="space-y-4 sm:space-y-0 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5">
                    <Link
                      href="/chat"
                      className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Go to Chat
                    </Link>
                    <Link
                      href="/dashboard"
                      className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      View Profile
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-0 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5">
                    <Link
                      href="/login"
                      className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Features section */}
            <div className="mt-24">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {features.map((feature) => (
                  <div
                    key={feature.name}
                    className="relative group bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg blur opacity-0 group-hover:opacity-25 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative">
                      <feature.icon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{feature.name}</h3>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes tilt {
          0%, 50%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(2deg); }
          75% { transform: rotate(-2deg); }
        }
        .animate-tilt {
          animation: tilt 10s infinite linear;
        }
      `}</style>
    </Layout>
  );
} 