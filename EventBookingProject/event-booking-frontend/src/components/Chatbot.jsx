import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { getEvents } from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ sender: 'bot', text: 'Hi there! I am the EventSphere AI. You can ask me about upcoming events, workshops, or past events!' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      // Simulate AI searching logic
      const { data } = await getEvents({ search: userMsg });
      
      let botResponse = '';
      let isReactNode = false;
      if (data && data.length > 0) {
        isReactNode = true;
        botResponse = (
          <div>
            <p>I found {data.length} event(s) matching "{userMsg}":</p>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              {data.slice(0, 3).map(e => (
                <li key={e.id} style={{ marginBottom: '0.4rem' }}>
                  <a 
                    href={`/book/${e.id}`} 
                    onClick={(ev) => { ev.preventDefault(); navigate(`/book/${e.id}`); setIsOpen(false); }}
                    style={{ color: '#1e3a8a', textDecoration: 'none', fontWeight: 600, borderBottom: '1px dotted #1e3a8a' }}
                  >
                    {e.eventName}
                  </a>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.3rem' }}>
                    ({e.department}) - {new Date(e.startDate || e.date).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
            {data.length > 3 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>...and {data.length - 3} more. Check the events page!</p>}
          </div>
        );
      } else {
        botResponse = `I couldn't find any events matching "${userMsg}". Try searching for departments like 'CSE' or types like 'Hackathon'.`;
      }

      setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'bot', text: botResponse, isReactNode }]);
        setLoading(false);
      }, 600);

    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I am having trouble connecting to the event database right now.' }]);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1e3a8a, #800000)',
          color: 'white',
          border: 'none',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: isOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'transform 0.3s ease',
        }}
      >
        <MessageSquare size={28} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '350px',
          height: '500px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, #1e3a8a, #800000)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} />
              <span style={{ fontWeight: 700 }}>EventSphere AI</span>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
                flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: msg.sender === 'user' ? '#1e3a8a' : '#800000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {msg.sender === 'user' ? <User size={14} color="white" /> : <Bot size={14} color="white" />}
                </div>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: msg.sender === 'user' ? '#1e3a8a' : '#f1f5f9',
                  color: msg.sender === 'user' ? 'white' : '#0f172a',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}>
                  {msg.isReactNode ? msg.text : <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div className="spinner spinner-sm" style={{ borderColor: '#800000 transparent transparent transparent' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Searching...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '0.5rem',
            background: 'var(--bg-secondary)'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about events..."
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <button type="submit" disabled={!input.trim() || loading} style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: input.trim() ? '#1e3a8a' : '#e2e8f0',
              color: input.trim() ? 'white' : '#94a3b8', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
