import { useState, useEffect, useRef } from 'react';
import {
  Send,
  MessageSquare,
  MessageCircle,
  Plus,
  Sun,
  Moon,
  Settings,
  Database,
  Cpu,
  ShieldAlert,
  BookOpen,
  Trash2,
  FileText,
  Upload,
  X,
  Check,
  ChevronRight,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatApi } from './api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  chunks?: string[];
  escalate?: boolean;
  reason?: string;
}

interface Session {
  id: string;
  created_at: string;
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [userId] = useState('user_demo_123');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge'>('chat');

  // Knowledge management state
  const [chunks, setChunks] = useState<any[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [chunkSettings, setChunkSettings] = useState({
    method: 'static',
    size: 500,
    overlap: 50,
    regex: ''
  });
  const [previewChunks, setPreviewChunks] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Chunk Detail Modal
  const [isChunkModalOpen, setIsChunkModalOpen] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<any>(null);
  const [isChunkLoading, setIsChunkLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    loadSessions();
    if (activeTab === 'knowledge') loadChunks();
  }, [activeTab]);

  const loadSessions = async () => {
    try {
      const res = await chatApi.getSessions(userId);
      if (res.data.status === 'success') {
        setSessions(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadChunks = async () => {
    try {
      const res = await chatApi.getChunks();
      if (res.data.status === 'success') {
        setChunks(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startNewSession = async () => {
    try {
      const res = await chatApi.createSession(userId);
      if (res.data.status === 'success') {
        const newSid = res.data.data.session_id;
        setActiveSession(newSid);
        setMessages([]);
        loadSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectSession = async (sid: string) => {
    setActiveSession(sid);
    try {
      const res = await chatApi.getHistory(userId, sid);
      if (res.data.status === 'success') {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      await chatApi.deleteSession(userId, sid);
      if (activeSession === sid) {
        setActiveSession(null);
        setMessages([]);
      }
      loadSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSession || isLoading) return;

    const userMsg = input;
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const res = await chatApi.sendMessage(userId, activeSession, userMsg);
      if (res.data.status === 'success') {
        const { reply, escalate, chunks } = res.data.data;
        setMessages(prev => [...prev, { role: 'assistant', content: reply, escalate, chunks }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.', escalate: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!uploadFile) return;
    setIsPreviewLoading(true);
    const fd = new FormData();
    fd.append('file', uploadFile);
    fd.append('chunk_method', chunkSettings.method);
    fd.append('chunk_size', chunkSettings.size.toString());
    fd.append('chunk_overlap', chunkSettings.overlap.toString());
    if (chunkSettings.regex) fd.append('regex_pattern', chunkSettings.regex);

    try {
      const res = await chatApi.previewKnowledge(fd);
      if (res.data.status === 'success') {
        setPreviewChunks(res.data.data.chunks);
      }
    } catch (err) {
      console.error(err);
      alert('Preview failed');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleFinalUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    const fd = new FormData();
    fd.append('file', uploadFile);
    fd.append('chunk_method', chunkSettings.method);
    fd.append('chunk_size', chunkSettings.size.toString());
    fd.append('chunk_overlap', chunkSettings.overlap.toString());
    if (chunkSettings.regex) fd.append('regex_pattern', chunkSettings.regex);

    try {
      const res = await chatApi.uploadKnowledge(fd);
      if (res.data.status === 'success') {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setPreviewChunks([]);
        loadChunks();
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteChunk = async (cid: string) => {
    if (!confirm('Are you sure you want to delete this chunk?')) return;
    try {
      await chatApi.deleteChunk(cid);
      loadChunks();
    } catch (err) {
      console.error(err);
    }
  };

  const openChunkDetail = async (cid: string) => {
    setIsChunkModalOpen(true);
    setIsChunkLoading(true);
    try {
      const res = await chatApi.getChunkDetail(cid);
      if (res.data.status === 'success') {
        setSelectedChunk(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setSelectedChunk(null);
    } finally {
      setIsChunkLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ padding: '0.5rem', background: 'var(--accent)', borderRadius: '10px' }}>
            <Cpu size={24} color="white" />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Customer Service AI</h1>
        </div>

        <button className="button button-primary" onClick={startNewSession} style={{ marginBottom: '1.5rem', width: '100%' }}>
          <Plus size={20} /> New Consultation
        </button>

        <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Consultations
          </div>
          {sessions.map(s => (
            <button
              key={s.id}
              className={`button button-ghost ${activeSession === s.id ? 'glass' : ''}`}
              onClick={() => selectSession(s.id)}
              style={{ justifyContent: 'flex-start', background: activeSession === s.id ? 'var(--bg-tertiary)' : 'transparent', position: 'relative', paddingRight: '2.5rem' }}
            >
              <MessageSquare size={18} />
              <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                <div style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{s.id.slice(0, 12)}...</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString()}</div>
              </div>
              <div
                className="delete-session-btn"
                onClick={(e) => deleteSession(e, s.id)}
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', padding: '0.4rem', borderRadius: '8px', opacity: 0.5 }}
              >
                <Trash2 size={14} />
              </div>
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
          <button className={`button button-ghost ${activeTab === 'chat' ? 'glass' : ''}`} onClick={() => setActiveTab('chat')} style={{ flex: 1 }}>
            <MessageCircle size={18} />
          </button>
          <button className={`button button-ghost ${activeTab === 'knowledge' ? 'glass' : ''}`} onClick={() => setActiveTab('knowledge')} style={{ flex: 1 }}>
            <Database size={18} />
          </button>
          <button className="button button-ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} style={{ flex: 1 }}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="chat-main">
        {activeTab === 'chat' ? (
          <>
            <header className="glass" style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Active Consultation</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {activeSession ? `ID: ${activeSession}` : 'Select or start a new consultation'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="glass" style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></div>
                  Assistant Ready
                </div>
                <button className="button button-ghost" style={{ padding: '0.5rem' }}><Settings size={20} /></button>
              </div>
            </header>

            <div className="messages-container">
              {messages.length === 0 && !activeSession && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, textAlign: 'center' }}>
                  <BookOpen size={64} style={{ marginBottom: '1rem' }} />
                  <h3>Welcome to MyTelco Support</h3>
                  <p>How can I assist you with your billing or accounts today?</p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`message ${m.role === 'user' ? 'message-user' : 'message-agent'}`}
                  >
                    <div>{m.content}</div>
                    {m.reason && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Reason: {m.reason}
                      </div>
                    )}
                    {m.escalate && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                        <ShieldAlert size={14} /> Escalated to human support
                      </div>
                    )}
                    {m.chunks && m.chunks.length > 0 && (
                      <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ExternalLink size={10} /> REFERENCED SOURCES:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {m.chunks.map(cid => (
                            <button
                              key={cid}
                              onClick={() => openChunkDetail(cid)}
                              className="glass"
                              style={{
                                fontSize: '0.65rem', padding: '0.2rem 0.6rem', borderRadius: '6px',
                                border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s',
                                color: 'var(--accent)', fontWeight: 500
                              }}
                            >
                              #{cid.slice(0, 8)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', padding: '1rem' }}>
                  <div className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)' }}></div>
                  <div className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', animationDelay: '0.2s' }}></div>
                  <div className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', animationDelay: '0.4s' }}></div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-area glass">
              <input
                type="text"
                className="message-input"
                placeholder="Type your inquiry here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={!activeSession}
              />
              <button className="button button-primary" onClick={handleSend} disabled={!activeSession || isLoading}>
                <Send size={18} /> Send
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Knowledge Base</h2>
                <p style={{ color: 'var(--text-muted)' }}>Manage ingested documents and processed chunks.</p>
              </div>
              <button className="button button-primary" onClick={() => setIsUploadModalOpen(true)}>
                <Plus size={20} /> Add Document
              </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {chunks.map(c => (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={c.id}
                  className="glass"
                  style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 600, fontSize: '0.875rem' }}>
                      <FileText size={16} /> {c.document_name}
                    </div>
                    <button className="button button-ghost" onClick={() => deleteChunk(c.id)} style={{ padding: '0.25rem', color: '#f43f5e' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {c.content}
                  </div>
                  <div style={{ marginTop: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Chunk ID: {c.id.slice(0, 8)}... • {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Upload & Configuration Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
              zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '2rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass"
              style={{
                width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden',
                borderRadius: '24px', display: 'flex', flexDirection: 'column'
              }}
            >
              <header style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Knowledge Ingestion Configuration</h3>
                <button className="button button-ghost" onClick={() => setIsUploadModalOpen(false)} style={{ padding: '0.5rem' }}><X size={20} /></button>
              </header>

              <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Settings Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>1. Select Document</label>
                    <div
                      style={{
                        border: '2px dashed var(--border)', borderRadius: '16px', padding: '2rem',
                        textAlign: 'center', cursor: 'pointer', position: 'relative'
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files[0]) setUploadFile(e.dataTransfer.files[0]);
                      }}
                    >
                      <input type="file" style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }} onChange={(e) => e.target.files && setUploadFile(e.target.files[0])} />
                      {uploadFile ? (
                        <div style={{ color: 'var(--accent)', fontWeight: 600 }}>
                          <FileText size={32} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
                          {uploadFile.name}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)' }}>
                          <Upload size={32} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
                          Click or drag file to upload (.txt, .md)
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>2. Chunking Strategy</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className={`button button-ghost ${chunkSettings.method === 'static' ? 'glass' : ''}`}
                        onClick={() => setChunkSettings({ ...chunkSettings, method: 'static' })}
                        style={{ flex: 1, border: chunkSettings.method === 'static' ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                      >Static</button>
                      <button
                        className={`button button-ghost ${chunkSettings.method === 'regex' ? 'glass' : ''}`}
                        onClick={() => setChunkSettings({ ...chunkSettings, method: 'regex' })}
                        style={{ flex: 1, border: chunkSettings.method === 'regex' ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                      >Regex</button>
                    </div>
                  </div>

                  {chunkSettings.method === 'regex' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Custom Separator Pattern (Regex)</label>
                      <input
                        type="text"
                        value={chunkSettings.regex}
                        onChange={(e) => setChunkSettings({ ...chunkSettings, regex: e.target.value })}
                        className="message-input"
                        placeholder="e.g. \n\n###"
                      />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Chunk Size</label>
                      <input
                        type="number"
                        value={chunkSettings.size}
                        onChange={(e) => setChunkSettings({ ...chunkSettings, size: parseInt(e.target.value) })}
                        className="message-input"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Overlap</label>
                      <input
                        type="number"
                        value={chunkSettings.overlap}
                        onChange={(e) => setChunkSettings({ ...chunkSettings, overlap: parseInt(e.target.value) })}
                        className="message-input"
                      />
                    </div>
                  </div>

                  <button
                    className="button button-ghost"
                    onClick={handlePreview}
                    disabled={!uploadFile || isPreviewLoading}
                    style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
                  >
                    {isPreviewLoading ? <Loader2 className="animate-spin" size={20} /> : <ChevronRight size={20} />}
                    Preview Chunks
                  </button>
                </div>

                {/* Preview Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-tertiary)', borderRadius: '16px', padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    Preview ({previewChunks.length} Chunks)
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {previewChunks.length > 0 ? (
                      previewChunks.map((c, idx) => (
                        <div key={idx} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '12px', fontSize: '0.75rem', border: '1px solid var(--border)' }}>
                          {c}
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '4rem' }}>
                        Chunks preview will appear here
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <footer style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="button button-ghost" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
                <button
                  className="button button-primary"
                  disabled={!uploadFile || previewChunks.length === 0 || isUploading}
                  onClick={handleFinalUpload}
                >
                  {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                  Save & Index Documents
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chunk Detail Popover/Modal */}
      <AnimatePresence>
        {isChunkModalOpen && (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)',
              zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '2rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass"
              style={{
                width: '100%', maxWidth: '600px', borderRadius: '20px', overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
              }}
            >
              <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <Database size={18} color="var(--accent)" /> Source Knowledge
                </div>
                <button className="button button-ghost" onClick={() => setIsChunkModalOpen(false)} style={{ padding: '0.4rem' }}><X size={18} /></button>
              </header>
              <div style={{ padding: '1.5rem' }}>
                {isChunkLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', opacity: 0.5 }} />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Fetching chunk details...</p>
                  </div>
                ) : selectedChunk ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid var(--border)' }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.7rem' }}>DOCUMENT SOURCE</div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={14} /> {selectedChunk.document_name}
                      </div>
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '0.9rem', lineHeight: 1.6, maxHeight: '300px', overflowY: 'auto' }}>
                      {selectedChunk.content}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Chunk ID: {selectedChunk.id}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#f43f5e' }}>
                    Failed to load chunk details.
                  </div>
                )}
              </div>
              <footer style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                <button className="button button-primary" onClick={() => setIsChunkModalOpen(false)}>Close</button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .dot {
          animation: bounce 1.4s infinite ease-in-out both;
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .delete-session-btn {
          opacity: 0;
          transition: opacity 0.2s;
        }
        button:hover .delete-session-btn {
          opacity: 1;
        }
        .delete-session-btn:hover {
          background: rgba(244, 63, 94, 0.1);
          color: #f43f5e;
        }
      `}</style>
    </div>
  );
}

export default App;
