'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Message {
  id: string;
  timestamp: number;
  sender_type: 'human' | 'ai' | 'tool';
  user_id: string | null;
  username: string | null;
  channel_id: string | null;
  channel_name: string | null;
  message_content: string;
  tool_name: string | null;
}

interface Stats {
  total: number;
  byType: Array<{ sender_type: string; count: string }>;
  topUsers: Array<{ username: string; count: string }>;
  last24Hours: number;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [senderType, setSenderType] = useState<string>('');
  const limit = 20;

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadMessages();
  }, [page, search, senderType]);

  async function loadStats() {
    try {
      const res = await fetch('/api/messages/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function loadMessages() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });

      if (search) params.append('search', search);
      if (senderType) params.append('sender_type', senderType);

      const res = await fetch(`/api/messages?${params}`);
      const data = await res.json();
      setMessages(data.messages);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  function getSenderColor(type: string): string {
    switch (type) {
      case 'human':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ai':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'tool':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Messages Explorer</h1>
              <p className="mt-1 text-sm text-slate-600">
                Browse and search through all Discord bot messages
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Messages</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {stats.total.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Last 24 Hours</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {stats.last24Hours.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            {stats.byType.map((item) => (
              <div key={item.sender_type} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 capitalize">{item.sender_type} Messages</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                      {parseInt(item.count).toLocaleString()}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    item.sender_type === 'human' ? 'bg-blue-100' :
                    item.sender_type === 'ai' ? 'bg-purple-100' : 'bg-green-100'
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${
                      item.sender_type === 'human' ? 'bg-blue-600' :
                      item.sender_type === 'ai' ? 'bg-purple-600' : 'bg-green-600'
                    }`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search Messages
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search by content or username..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filter by Sender Type
              </label>
              <select
                value={senderType}
                onChange={(e) => {
                  setSenderType(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="">All Types</option>
                <option value="human">Human</option>
                <option value="ai">AI</option>
                <option value="tool">Tool</option>
              </select>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-slate-600">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-4 text-slate-600 font-medium">No messages found</p>
              <p className="mt-1 text-sm text-slate-500">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {messages.map((message) => (
                <div key={message.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Avatar/Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getSenderColor(message.sender_type)}`}>
                      {message.sender_type === 'human' ? '👤' :
                       message.sender_type === 'ai' ? '🤖' : '⚙️'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">
                          {message.username || 'Unknown'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getSenderColor(message.sender_type)}`}>
                          {message.sender_type}
                        </span>
                        {message.tool_name && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded border bg-amber-100 text-amber-800 border-amber-200">
                            {message.tool_name}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>

                      <p className="text-slate-700 whitespace-pre-wrap break-words">
                        {message.message_content}
                      </p>

                      {message.channel_name && (
                        <p className="mt-2 text-xs text-slate-500">
                          in #{message.channel_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of{' '}
                  {total.toLocaleString()} messages
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Users Section */}
        {stats && stats.topUsers.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Top Contributors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {stats.topUsers.map((user, idx) => (
                <div key={user.username} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {user.username}
                    </p>
                    <p className="text-xs text-slate-500">
                      {parseInt(user.count).toLocaleString()} messages
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
