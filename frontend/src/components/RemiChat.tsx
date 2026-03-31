import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string | null;
}

export default function RemiChat({ isOpen, onClose, initialMessage }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [initialSent, setInitialSent] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto-send initial message when opening with wine context
  useEffect(() => {
    if (isOpen && initialMessage && initialMessage !== initialSent && !sending) {
      setInitialSent(initialMessage);
      setInput('');
      // Auto-send after history loads
      setTimeout(async () => {
        setSending(true);
        const tempId = Date.now();
        setMessages(prev => [...prev, { id: tempId, role: 'user', content: initialMessage, createdAt: new Date().toISOString() }]);
        try {
          await api.remiChat(initialMessage);
          const data = await api.remiGetChat();
          setMessages(data.messages || []);
        } catch {
          setMessages(prev => [...prev, { id: tempId + 1, role: 'assistant', content: 'Sorry, had trouble with that. Try again?', createdAt: new Date().toISOString() }]);
        } finally {
          setSending(false);
        }
      }, 500);
    }
  }, [isOpen, initialMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function loadHistory() {
    try {
      setLoading(true);
      const data = await api.remiGetChat();
      setMessages(data.messages || []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    try {
      await api.remiClearChat();
      setMessages([]);
    } catch {
      // Silent
    }
  }

  async function handleSend() {
    if (!input.trim() || sending) return;

    const userMsg = input.trim();
    setInput('');
    setSending(true);

    // Optimistically add user message
    const tempId = Date.now();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMsg, createdAt: new Date().toISOString() }]);

    try {
      await api.remiChat(userMsg);
      // Reload full history
      const data = await api.remiGetChat();
      setMessages(data.messages || []);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: tempId + 1, role: 'assistant', content: 'Sorry, I had trouble with that. Try again?', createdAt: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="remi-chat-overlay" onClick={onClose}>
      <div className="remi-chat-panel" onClick={(e) => e.stopPropagation()}>
        <div className="remi-chat-header">
          <div className="remi-chat-title">
            <span className="remi-chat-name">Remi</span>
            <span className="remi-chat-subtitle">Your wine companion</span>
          </div>
          <div className="remi-chat-header-actions">
            {messages.length > 0 && (
              <button className="remi-chat-clear" onClick={handleClear} title="Start new conversation">New</button>
            )}
            <button className="remi-chat-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="remi-chat-messages">
          {loading ? (
            <div className="remi-chat-loading">Loading conversation...</div>
          ) : messages.length === 0 ? (
            <div className="remi-chat-empty">
              <p className="remi-chat-welcome">Ask me anything about your wines. I know your collection, your ratings, and the wine world.</p>
              <div className="remi-chat-starters">
                <button onClick={() => { setInput('What should I open tonight?'); }}>What should I open tonight?</button>
                <button onClick={() => { setInput('Tell me about my recent favorites'); }}>Tell me about my recent favorites</button>
                <button onClick={() => { setInput('Help me plan my next case'); }}>Help me plan my next case</button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`remi-chat-msg ${msg.role}`}>
                {msg.role === 'assistant' && <span className="remi-chat-msg-label">Remi</span>}
                <p className="remi-chat-msg-text">{msg.content}</p>
              </div>
            ))
          )}
          {sending && (
            <div className="remi-chat-msg assistant">
              <span className="remi-chat-msg-label">Remi</span>
              <p className="remi-chat-msg-text remi-typing">Thinking...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="remi-chat-input-area">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Ask Remi anything..."
            className="remi-chat-input"
            disabled={sending}
          />
          <button
            className="remi-chat-send"
            onClick={handleSend}
            disabled={sending || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
