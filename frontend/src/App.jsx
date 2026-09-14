import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL;

function QuillIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 4c-4.5 0-9.5 2-12.5 5C4 12.5 3 17 3 20c0 .55.45 1 1 1 3 0 7.5-1 11-4.5 3-3 5-8 5-12.5 0-.55-.45-1-1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M11 13 4 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 15V4M12 4 8 8M12 4l4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loadingSession) return null;

  return session ? <MainApp session={session} /> : <AuthScreen />;
}

function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const action = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });

    const { error } = await action;
    setLoading(false);

    if (error) setError(error.message);
  }

  return (
    <div className="centered-screen">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-icon">
            <QuillIcon size={24} />
          </span>
          <h1>InkQuery</h1>
        </div>
        <p className="subtitle">Chat with your documents using AI</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="6+ characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Log in'}
          </button>
        </form>

        <p className="auth-toggle">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <a onClick={() => setIsSignUp(!isSignUp)}>{isSignUp ? 'Log in' : 'Sign up'}</a>
        </p>
      </div>
    </div>
  );
}

function MainApp({ session }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef(null);

  const token = session.access_token;

  async function loadDocuments() {
    try {
      const res = await fetch(`${API_URL}/api/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to load documents', err);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(`Reading "${file.name}"... this can take up to 30 seconds.`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (data.error) {
        setUploadStatus(`Error: ${data.error}`);
      } else {
        setUploadStatus('');
        await loadDocuments();
        setSelectedDoc({ id: data.documentId, filename: data.filename });
      }
    } catch (err) {
      setUploadStatus(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="brand-mark">
            <span className="brand-icon">
              <QuillIcon size={18} />
            </span>
            <h2>InkQuery</h2>
          </div>
          <button className="logout-link" onClick={handleLogout}>
            Log out
          </button>
        </div>

        <label className="upload-zone" htmlFor="pdf-upload">
          <input
            ref={fileInputRef}
            id="pdf-upload"
            className="upload-input"
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            disabled={uploading}
          />
          <span className="upload-icon">
            <UploadIcon />
          </span>
          <span className="upload-label">{uploading ? 'Reading...' : 'Add a document'}</span>
          <span className="upload-hint">PDF, up to 8 MB</span>
        </label>
        {uploadStatus && <p className="status-text">{uploadStatus}</p>}

        <div className="doc-list">
          {documents.length === 0 && (
            <p className="status-text">Your shelf is empty. Add a PDF to start a conversation.</p>
          )}
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`doc-item ${selectedDoc?.id === doc.id ? 'active' : ''}`}
              onClick={() => setSelectedDoc(doc)}
            >
              <div className="doc-title">{doc.filename}</div>
              <div className="doc-date">{new Date(doc.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedDoc ? (
        <ChatPanel key={selectedDoc.id} document={selectedDoc} token={token} />
      ) : (
        <div className="chat-area">
          <div className="chat-empty">Open a document from the shelf, or add a new one to begin.</div>
        </div>
      )}
    </div>
  );
}

function ChatPanel({ document, token }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim() || asking) return;

    const userMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setAsking(true);

    try {
      const res = await fetch(`${API_URL}/api/documents/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId: document.id, question: userMessage.content }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.answer, sources: data.sources },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="chat-area">
      <h2 className="chat-title">{document.filename}</h2>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty" style={{ height: '100%' }}>
            Ask anything about this document.
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-row" onSubmit={handleAsk}>
        <input
          type="text"
          placeholder="Ask a question about this document..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={asking}
        />
        <button type="submit" className="btn-primary" disabled={asking || !question.trim()}>
          {asking ? 'Thinking...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false);

  return (
    <div className={`message ${message.role}`}>
      <div className="message-bubble">{message.content}</div>
      {message.sources && message.sources.length > 0 && (
        <div>
          <div className="sources-toggle" onClick={() => setShowSources(!showSources)}>
            {showSources ? 'Hide sources' : `Show ${message.sources.length} source(s)`}
          </div>
          {showSources && (
            <div className="sources-list">
              {message.sources.map((s, i) => (
                <div className="source-note" key={i}>
                  <span className="source-index">{i + 1}.</span>
                  <span>
                    {s.content}{' '}
                    <span className="source-similarity">(similarity {s.similarity.toFixed(3)})</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}