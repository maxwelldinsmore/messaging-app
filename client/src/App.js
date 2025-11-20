import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = React.useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for messages from server
  useEffect(() => {
    const processedMessageIds = new Set();
    
    const pollMessages = async () => {
      console.log('🔄 Polling server for messages...');
      try {
        console.log('🌐 Fetching from: /api/messages');
        const response = await fetch('/api/messages');
        console.log('📥 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📦 Received data:', data);
          
          if (data.messages && Array.isArray(data.messages)) {
            console.log(`📨 Found ${data.messages.length} messages from server`);
            
            // Replace all messages with server's version
            setMessages(data.messages);
          } else {
            console.log('ℹ️ No messages in response or not an array');
          }
        } else {
          console.error('❌ Response not OK:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Error polling messages:', error);
      }
    };

    // Poll every 3 seconds
    console.log('⏰ Setting up polling interval (3 seconds)');
    const interval = setInterval(pollMessages, 3000);
    
    // Initial poll
    pollMessages();

    return () => {
      console.log('🛑 Clearing polling interval');
      clearInterval(interval);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim() || !message.trim()) {
      setStatus('Please fill in both name and message fields.');
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          message: message.trim(),
          timestamp: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const newMessage = {
          id: data.messageId || Date.now(),
          name: name.trim(),
          message: message.trim(),
          timestamp: new Date().toISOString(),
          isSent: true, // Mark as sent message
        };
        setMessages(prev => [...prev, newMessage]);
        setStatus('✓ Message sent successfully!');
        setMessage('');
      } else {
        setStatus(`✗ Error: ${data.error || 'Failed to send message'}`);
      }
    } catch (error) {
      setStatus(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="messaging-container">
        <div className="chat-container">
          <div className="chat-header">
            <h2>💬 Conversation</h2>
            <p className="message-count">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.isSent ? 'sent' : 'received'}`}>
                <div className="message-bubble">
                  <div className="bubble-header">
                    <span className="bubble-name">{msg.name}</span>
                    <span className="bubble-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bubble-content">
                    {msg.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="form-container">
          <h1>📨 Send a Message</h1>
          <p className="subtitle">Your message will be sent to Amazon SQS</p>
          
          <form onSubmit={handleSubmit} className="message-form">
          <div className="form-group">
            <label htmlFor="name">Your Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows="6"
              disabled={loading}
              maxLength={1000}
            />
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>

        {status && (
          <div className={`status-message ${status.includes('✓') ? 'success' : 'error'}`}>
            {status}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default App;
