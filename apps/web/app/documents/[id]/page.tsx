'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Script from 'next/script';

interface DocumentEditorProps {
  params: Promise<{ id: string }>;
}

export default function DocumentEditor({ params }: DocumentEditorProps) {
  const { id: documentId } = use(params);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('Loading...');
  const [onlineCount, setOnlineCount] = useState(0);
  const [collaborators, setCollaborators] = useState<Map<string, string>>(new Map());
  const [yjsLoaded, setYjsLoaded] = useState(false);
  const [pusherLoaded, setPusherLoaded] = useState(false);

  useEffect(() => {
    if (!yjsLoaded || !pusherLoaded) return;

    // Initialize editor once both libraries are loaded
    initializeEditor();
  }, [yjsLoaded, pusherLoaded, documentId]);

  function initializeEditor() {
    // This will be called from the inline script after Yjs loads
    console.log('Editor initialization ready');
  }

  return (
    <>
      {/* Load Pusher */}
      <Script
        src="https://js.pusher.com/8.2.0/pusher.min.js"
        onLoad={() => setPusherLoaded(true)}
      />

      {/* Load Yjs as ES module */}
      <Script
        id="yjs-loader"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            import('https://esm.sh/yjs@13.6.20').then((YjsModule) => {
              window.Y = YjsModule;
              window.dispatchEvent(new Event('yjs-loaded'));
            });
          `,
        }}
        type="module"
      />

      {/* Main editor UI */}
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/documents"
                className="text-teal-400 hover:text-teal-300 transition-colors text-2xl"
              >
                ←
              </Link>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled Document"
                className="text-xl font-light bg-transparent border-none text-white focus:outline-none focus:bg-zinc-800 px-3 py-2 transition-colors min-w-[300px]"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                id="copy-plain-url-btn"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-mono transition-colors"
                title="Copy plain text URL"
              >
                📋 Copy Text URL
              </button>
              <button
                id="send-to-omega-btn"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-mono transition-colors"
                title="Send to Omega for AI analysis"
              >
                🤖 Send to Omega
              </button>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
                <span id="online-count" className="text-zinc-400 text-sm font-mono">
                  {onlineCount} online
                </span>
              </div>
              <span id="status" className="text-zinc-500 text-sm font-mono">
                {status}
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-3">
          <div className="max-w-7xl mx-auto flex gap-2 flex-wrap">
            <button
              onClick={() => (window as any).formatText?.('bold')}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm border border-zinc-700 transition-colors"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => (window as any).formatText?.('italic')}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm border border-zinc-700 transition-colors"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => (window as any).formatText?.('underline')}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm border border-zinc-700 transition-colors"
            >
              <u>U</u>
            </button>
            <button
              onClick={() => (window as any).insertList?.()}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm border border-zinc-700 transition-colors"
            >
              • List
            </button>
            <button
              onClick={() => (window as any).insertLink?.()}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm border border-zinc-700 transition-colors"
            >
              🔗 Link
            </button>
            <button
              onClick={() => (window as any).syncToDatabase?.()}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm border border-teal-700 transition-colors"
            >
              💾 Save
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div id="editor-container" className="bg-zinc-900 border border-zinc-800 p-8 min-h-[600px]">
              <div className="text-zinc-500 text-center py-12">Loading document...</div>
            </div>
          </div>
        </div>

        {/* Collaborators Panel */}
        <div className="fixed bottom-6 right-6 bg-zinc-900 border border-zinc-800 p-4 min-w-[200px] shadow-lg">
          <h3 className="text-sm font-mono text-zinc-400 uppercase tracking-wider mb-3">
            Active Collaborators
          </h3>
          <div id="presence-users">
            <div className="flex items-center gap-2 py-1 text-sm text-zinc-300">
              <div className="w-2 h-2 rounded-full bg-teal-400"></div>
              <span>You</span>
            </div>
          </div>
        </div>

        {/* Notification */}
        <div
          id="notification"
          className="fixed top-6 right-6 bg-zinc-900 border border-zinc-800 px-6 py-4 shadow-lg hidden"
        >
          <span id="notification-text" className="text-white text-sm"></span>
        </div>
      </div>

      {/* Editor Logic */}
      <Script
        id="editor-logic"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
// Wait for Yjs to load
window.addEventListener('yjs-loaded', () => {
  console.log('Yjs loaded, initializing editor...');
  initEditor();
});

async function initEditor() {
  const documentId = '${documentId}';

  // Get user info
  let userId = localStorage.getItem('omega-user-id');
  if (!userId) {
    userId = 'user-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('omega-user-id', userId);
  }

  const username = localStorage.getItem('omega-username') || 'Anonymous';
  const clientId = 'client-' + Math.random().toString(36).substr(2, 9);

  let ydoc, ytext, isRemoteUpdate = false;
  let pusher, channel;
  let collaborators = new Map();

  // Load document
  try {
    const response = await fetch('/api/documents/' + documentId);
    const docData = await response.json();

    document.getElementById('title').value = docData.title;
    document.getElementById('editor-container').innerHTML = \`
      <textarea
        id="content"
        placeholder="Start typing..."
        class="w-full min-h-[500px] bg-transparent border-none text-white font-['Georgia',serif] text-base leading-relaxed resize-vertical focus:outline-none"
      ></textarea>
    \`;

    // Initialize Yjs
    ydoc = new window.Y.Doc();
    ytext = ydoc.getText('content');

    // Load state
    const stateResponse = await fetch('/api/documents/' + documentId + '/yjs-state');
    const stateData = await stateResponse.json();

    if (stateData.state) {
      const stateBytes = Uint8Array.from(atob(stateData.state), c => c.charCodeAt(0));
      window.Y.applyUpdate(ydoc, stateBytes);
    } else if (stateData.content) {
      ytext.insert(0, stateData.content);
    }

    const contentEl = document.getElementById('content');
    contentEl.value = ytext.toString();

    // Handle text changes
    ytext.observe((event, transaction) => {
      if (transaction.origin === 'local') return;
      isRemoteUpdate = true;
      const cursorPos = contentEl.selectionStart;
      contentEl.value = ytext.toString();
      contentEl.setSelectionRange(cursorPos, cursorPos);
      isRemoteUpdate = false;
    });

    // Handle input
    contentEl.addEventListener('input', (e) => {
      if (isRemoteUpdate || !ytext || !ydoc) return;

      const newText = e.target.value;
      const oldText = ytext.toString();
      if (newText === oldText) return;

      ydoc.transact(() => {
        let i = 0;
        while (i < Math.min(oldText.length, newText.length) && oldText[i] === newText[i]) i++;

        let j = 0;
        while (
          j < Math.min(oldText.length - i, newText.length - i) &&
          oldText[oldText.length - 1 - j] === newText[newText.length - 1 - j]
        ) j++;

        const deleteLen = oldText.length - i - j;
        const insertText = newText.substring(i, newText.length - j);

        if (deleteLen > 0) ytext.delete(i, deleteLen);
        if (insertText.length > 0) ytext.insert(i, insertText);
      }, 'local');

      scheduleAutoSave();
    });

    // Handle local updates
    ydoc.on('update', (update, origin) => {
      if (origin === 'remote') return;

      const updateBase64 = btoa(String.fromCharCode.apply(null, update));
      fetch('/api/documents/' + documentId + '/yjs-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ update: updateBase64, clientId }),
      });
    });

    // Initialize Pusher
    const configResponse = await fetch('/api/documents/pusher-config');
    const config = await configResponse.json();

    if (config.enabled && typeof Pusher !== 'undefined') {
      pusher = new Pusher(config.key, {
        cluster: config.cluster,
        forceTLS: true,
      });

      channel = pusher.subscribe('document-' + documentId);

      channel.bind('yjs-update', (data) => {
        if (data.clientId !== clientId) {
          const updateBytes = Uint8Array.from(atob(data.update), c => c.charCodeAt(0));
          window.Y.applyUpdate(ydoc, updateBytes, 'remote');
          showNotification('Document updated by collaborator');
        }
      });

      channel.bind('presence', (data) => {
        if (data.action === 'join' && data.userId !== userId) {
          collaborators.set(data.userId, data.username || 'Anonymous');
          showNotification(data.username + ' joined');
        } else if (data.action === 'leave') {
          collaborators.delete(data.userId);
        }
        updatePresenceUI();
      });

      document.getElementById('status').textContent = 'Connected';
    } else {
      document.getElementById('status').textContent = 'Offline mode';
    }

    // Join document
    await fetch('/api/documents/' + documentId + '/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username }),
    });

  } catch (error) {
    console.error('Error loading document:', error);
    document.getElementById('editor-container').innerHTML = \`
      <div class="text-center py-12 text-red-400">
        Error loading document. <a href="/documents" class="text-teal-400 hover:underline">Go back</a>
      </div>
    \`;
  }

  // Helper functions
  let saveTimeout;
  function scheduleAutoSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => syncToDatabase(), 2000);
  }

  async function syncToDatabase() {
    if (!ytext) return;
    document.getElementById('status').textContent = 'Saving...';
    const content = ytext.toString();
    await fetch('/api/documents/' + documentId + '/yjs-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    document.getElementById('status').textContent = 'Saved';
    setTimeout(() => {
      document.getElementById('status').textContent = 'Connected';
    }, 2000);
  }

  function updatePresenceUI() {
    const count = collaborators.size + 1;
    document.getElementById('online-count').textContent = count + ' online';

    const html = '<div class="flex items-center gap-2 py-1 text-sm text-zinc-300"><div class="w-2 h-2 rounded-full bg-teal-400"></div><span>You</span></div>' +
      Array.from(collaborators.values()).map(name =>
        '<div class="flex items-center gap-2 py-1 text-sm text-zinc-300"><div class="w-2 h-2 rounded-full bg-teal-400"></div><span>' + name + '</span></div>'
      ).join('');
    document.getElementById('presence-users').innerHTML = html;
  }

  function showNotification(text) {
    const notif = document.getElementById('notification');
    document.getElementById('notification-text').textContent = text;
    notif.classList.remove('hidden');
    setTimeout(() => notif.classList.add('hidden'), 3000);
  }

  // Expose functions
  window.syncToDatabase = syncToDatabase;
  window.formatText = function(format) {
    const textarea = document.getElementById('content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    if (!selectedText) { alert('Please select text'); return; }

    let prefix = '', suffix = '';
    if (format === 'bold') { prefix = '**'; suffix = '**'; }
    else if (format === 'italic') { prefix = '*'; suffix = '*'; }
    else if (format === 'underline') { prefix = '__'; suffix = '__'; }

    ydoc.transact(() => {
      ytext.delete(start, end - start);
      ytext.insert(start, prefix + selectedText + suffix);
    }, 'local');

    textarea.value = ytext.toString();
  };

  window.insertList = function() {
    const textarea = document.getElementById('content');
    const start = textarea.selectionStart;
    ydoc.transact(() => ytext.insert(start, '\\n- '), 'local');
    textarea.value = ytext.toString();
  };

  window.insertLink = function() {
    const url = prompt('Enter URL:');
    if (!url) return;
    const textarea = document.getElementById('content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || 'link';
    ydoc.transact(() => {
      ytext.delete(start, end - start);
      ytext.insert(start, '[' + selectedText + '](' + url + ')');
    }, 'local');
    textarea.value = ytext.toString();
  };

  // Copy URL button
  document.getElementById('copy-plain-url-btn').addEventListener('click', async () => {
    const url = window.location.origin + '/api/documents/' + documentId + '/plain';
    await navigator.clipboard.writeText(url);
    showNotification('URL copied to clipboard');
  });

  // Send to Omega button
  document.getElementById('send-to-omega-btn').addEventListener('click', async () => {
    if (!confirm('Send to Omega for AI analysis?')) return;
    await syncToDatabase();
    const response = await fetch('/api/documents/' + documentId + '/send-to-omega', { method: 'POST' });
    const result = await response.json();
    if (result.success) {
      showNotification('Issue created: #' + result.issueNumber);
      window.open(result.issueUrl, '_blank');
    } else {
      alert('Failed: ' + result.error);
    }
  });

  // Update title
  document.getElementById('title').addEventListener('blur', async function() {
    const newTitle = this.value.trim();
    if (!newTitle) return;
    await fetch('/api/documents/' + documentId + '/title', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    showNotification('Title updated');
  });

  // Cleanup
  window.addEventListener('beforeunload', () => {
    fetch('/api/documents/' + documentId + '/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username }),
    });
  });
}
          `,
        }}
      />
    </>
  );
}
