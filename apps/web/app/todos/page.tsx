'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Todo {
  id: number;
  task: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  completed: number;
  incomplete: number;
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadTodos();
  }, [page]);

  async function loadTodos() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });

      const res = await fetch(`/api/todos?${params}`);
      const data = await res.json();
      setTodos(data.todos);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  const stats: Stats = {
    total: todos.length,
    completed: todos.filter(t => t.is_completed).length,
    incomplete: todos.filter(t => !t.is_completed).length,
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-light text-white tracking-tight">Todo List</h1>
          <p className="mt-3 text-zinc-400 font-light max-w-2xl">
            Omega&apos;s task list sorted by completion status (incomplete tasks first)
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Stats Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                    Total Tasks
                  </p>
                  <p className="text-3xl font-light text-white">
                    {total.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-teal-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                    Incomplete
                  </p>
                  <p className="text-3xl font-light text-amber-400">
                    {stats.incomplete.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                    Completed
                  </p>
                  <p className="text-3xl font-light text-green-400">
                    {stats.completed.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Todos List */}
        <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
          {loading ? (
            <div className="p-12">
              <LoadingSpinner message="Loading todos..." />
            </div>
          ) : todos.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="mt-4 text-zinc-400 font-light">No todos found</p>
              <p className="mt-1 text-sm text-zinc-500">The todo list is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`p-6 hover:bg-zinc-800/50 transition-colors ${
                    todo.is_completed ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox Icon */}
                    <div className="flex-shrink-0 w-6 h-6 mt-1">
                      {todo.is_completed ? (
                        <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 text-xs font-mono rounded border ${
                            todo.is_completed
                              ? 'bg-zinc-800 text-green-400 border-zinc-700'
                              : 'bg-zinc-800 text-amber-400 border-zinc-700'
                          }`}
                        >
                          {todo.is_completed ? 'COMPLETED' : 'PENDING'}
                        </span>
                        <span className="text-xs font-mono text-zinc-500">
                          Created: {formatTimestamp(todo.created_at)}
                        </span>
                      </div>

                      <p
                        className={`text-zinc-300 whitespace-pre-wrap break-words font-light ${
                          todo.is_completed ? 'line-through' : ''
                        }`}
                      >
                        {todo.task}
                      </p>

                      {todo.is_completed && (
                        <p className="mt-2 text-xs font-mono text-zinc-500">
                          Completed: {formatTimestamp(todo.updated_at)}
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
            <div className="bg-zinc-900/50 px-6 py-4 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <p className="text-sm font-mono text-zinc-400">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of{' '}
                  {total.toLocaleString()} todos
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 text-sm font-mono text-white bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-4 py-2 text-sm font-mono text-white bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
