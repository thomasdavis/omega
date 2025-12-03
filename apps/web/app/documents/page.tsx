'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';

interface Document {
  id: string;
  title: string;
  content: string;
  created_by_user_id: string;
  created_by_username: string | null;
  created_at: number;
  updated_at: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [useQATemplate, setUseQATemplate] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Load username from localStorage
    const saved = localStorage.getItem('omega-username');
    if (saved) setUsername(saved);

    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      const response = await fetch('/api/documents?limit=50');
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents);
      } else {
        setError(data.error || 'Failed to load documents');
      }
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  function getQATemplate() {
    return `# Questions for Lisa and Ajax

Please answer the following questions by adding your responses below each question.

**Question 1:** [Enter your first question here]
- **Lisa's response:**
- **Ajax's response:**

**Question 2:** [Enter your second question here]
- **Lisa's response:**
- **Ajax's response:**

**Question 3:** [Enter your third question here]
- **Lisa's response:**
- **Ajax's response:**

---
*Add more questions as needed using the same format*`;
  }

  async function createDocument() {
    if (!newTitle.trim()) {
      alert('Please enter a document title');
      return;
    }

    // Get or create user ID
    let userId = localStorage.getItem('omega-user-id');
    if (!userId) {
      userId = 'user-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('omega-user-id', userId);
    }

    // Save username
    if (username) {
      localStorage.setItem('omega-username', username);
    }

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: useQATemplate ? getQATemplate() : '',
          userId,
          username: username || 'Anonymous',
        }),
      });

      const document = await response.json();
      setShowCreateModal(false);
      setNewTitle('');
      setUseQATemplate(false);

      // Navigate to editor
      window.location.href = `/documents/${document.id}`;
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Failed to create document');
    }
  }

  async function createQADocument() {
    // Get or create user ID
    let userId = localStorage.getItem('omega-user-id');
    if (!userId) {
      userId = 'user-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('omega-user-id', userId);
    }

    const title = 'Q&A Session - ' + new Date().toLocaleDateString();

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: getQATemplate(),
          userId,
          username: username || 'Anonymous',
        }),
      });

      const document = await response.json();
      window.location.href = `/documents/${document.id}`;
    } catch (error) {
      console.error('Error creating Q&A document:', error);
      alert('Failed to create Q&A document');
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading documents..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Error: {error}</p>
          <p className="text-zinc-500">Failed to load documents</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-5xl font-light text-white tracking-tight">Documents</h1>
              <p className="mt-3 text-zinc-400 font-light max-w-2xl">
                Collaborative real-time documents with live editing
              </p>
            </div>
            <div className="text-zinc-500 text-sm font-mono">{documents.length} documents</div>
          </div>
        </div>
      </div>

      {/* Username Input */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-mono text-zinc-500 uppercase tracking-wider">
              Your Name:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-mono text-sm transition-colors"
            >
              + New Document
            </button>
            <button
              onClick={createQADocument}
              className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-mono text-sm transition-colors"
            >
              + Q&A Template
            </button>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {documents.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No documents found"
            description="Create your first collaborative document to get started."
            action={
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-mono text-sm transition-colors"
              >
                + Create Document
              </button>
            }
          />
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="group block bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <h2 className="text-xl font-light text-white mb-3 group-hover:text-teal-400 transition-colors">
                    {doc.title}
                  </h2>
                  <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 mb-4">
                    <span>👤 {doc.created_by_username || 'Anonymous'}</span>
                    <span>•</span>
                    <span>
                      {new Date(doc.created_at * 1000).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm font-light line-clamp-3">
                    {doc.content.substring(0, 150)}{doc.content.length > 150 ? '...' : ''}
                  </p>
                  <div className="mt-4 text-teal-400 text-sm font-mono flex items-center gap-2">
                    Open Document
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-light text-white mb-6">Create New Document</h2>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Document Title"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all mb-4"
              onKeyPress={(e) => e.key === 'Enter' && createDocument()}
              autoFocus
            />
            <label className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
              <input
                type="checkbox"
                checked={useQATemplate}
                onChange={(e) => setUseQATemplate(e.target.checked)}
                className="w-4 h-4"
              />
              Use Q&A Template (prepopulate with questions for Lisa and Ajax)
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTitle('');
                  setUseQATemplate(false);
                }}
                className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createDocument}
                className="flex-1 px-4 py-3 bg-teal-500 hover:bg-teal-600 text-white font-mono text-sm transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
