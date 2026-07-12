import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL;

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
        <h1>InkQuery</h1>
        <p className="subtitle">Chat with your documents using AI</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <p className="auth-toggle">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <a onClick={() => setIsSignUp(!isSignUp)}>{isSignUp ? 'Log In' : 'Sign Up'}</a>
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
    setUploadStatus(`Processing "${file.name}"... this can take up to 30 seconds.`);

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
          <h2>InkQuery</h2>
          <button className="logout-link" onClick={handleLogout}>
            Log out
          </button>
        </div>

        <div className="upload-zone">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            disabled={uploading}
          />
          {uploadStatus && <p className="status-text">{uploadStatus}</p>}
        </div>

        <div className="doc-list">
          {documents.length === 0 && <p className="status-text">No documents yet. Upload a PDF to get started.</p>}
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`doc-item ${selectedDoc?.id === doc.id ? 'active' : ''}`}
              onClick={() => setSelectedDoc(doc)}
            >
              <div>{doc.filename}</div>
              <div className="doc-date">{new Date(doc.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedDoc ? (
        <ChatPanel key={selectedDoc.id} document={selectedDoc} token={token} />
      ) : (
        <div className="chat-area">
          <div className="chat-empty">Select a document, or upload a new PDF to start chatting.</div>
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
      <h2 style={{ fontSize: '16px', margin: '0 0 10px' }}>{document.filename}</h2>

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
                <div key={i} style={{ marginBottom: '6px' }}>
                  <strong>Chunk {i + 1}</strong> (similarity: {s.similarity.toFixed(3)})
                  <br />
                  {s.content}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
