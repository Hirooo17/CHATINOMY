import React, { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import './App.css'
function App() {
  const [socket, setSocket] = useState(null)
  const [chatState, setChatState] = useState('home') // home, waiting, chatting
  const [messages, setMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [roomId, setRoomId] = useState(null)
  const [isPartnerTyping, setIsPartnerTyping] = useState(false)
  const [userName, setUserName] = useState('')
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('https://chatinomy-backend.onrender.com')
    
    setSocket(newSocket)

    // Socket event listeners
    newSocket.on('waitingForPartner', () => {
      setChatState('waiting')
      setMessages([])
    })

    newSocket.on('partnerFound', ({ roomId: newRoomId }) => {
      setRoomId(newRoomId)
      setChatState('chatting')
      setMessages([{ 
        type: 'system', 
        message: 'Connected to a stranger! Say hello!',
        timestamp: new Date()
      }])
    })

    newSocket.on('messageReceived', ({ message, timestamp }) => {
      setMessages(prev => [...prev, {
        type: 'received',
        message,
        timestamp: new Date(timestamp)
      }])
    })

    newSocket.on('partnerTyping', ({ isTyping }) => {
      setIsPartnerTyping(isTyping)
    })

    newSocket.on('partnerDisconnected', () => {
      setMessages(prev => [...prev, {
        type: 'system',
        message: 'Stranger disconnected. Click "New Chat" to find someone else.',
        timestamp: new Date()
      }])
    })

    newSocket.on('partnerLeft', () => {
      setMessages(prev => [...prev, {
        type: 'system',
        message: 'Stranger left the chat. Click "New Chat" to find someone else.',
        timestamp: new Date()
      }])
    })

    return () => newSocket.close()
  }, [])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startChat = () => {
    if (!userName.trim()) {
      alert('Please enter your name')
      return
    }
    socket.emit('findPartner', { name: userName })
  }

  const sendMessage = (e) => {
    e.preventDefault()
    if (!currentMessage.trim() || !roomId) return

    const messageData = {
      roomId,
      message: currentMessage,
      timestamp: new Date()
    }

    socket.emit('sendMessage', messageData)
    
    setMessages(prev => [...prev, {
      type: 'sent',
      message: currentMessage,
      timestamp: new Date()
    }])
    
    setCurrentMessage('')
  }

  const handleTyping = (e) => {
    setCurrentMessage(e.target.value)
    
    if (roomId) {
      socket.emit('typing', { roomId, isTyping: true })
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { roomId, isTyping: false })
      }, 1000)
    }
  }

  const newChat = () => {
    if (roomId) {
      socket.emit('leaveChat', { roomId })
    }
    setRoomId(null)
    setChatState('home')
    setMessages([])
    setCurrentMessage('')
    setIsPartnerTyping(false)
  }

  const renderHome = () => (
  <div className="home-screen">
    <div className="logo-section">
      <h1 className="logo">Amang Tilag Finder</h1>
      <p className="tagline">Connect with fellow EARIST students</p>
    </div>
    
    <div className="start-section">
      <input
        type="text"
        placeholder="Your name (optional)"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        className="name-input"
      />
      <button onClick={startChat} className="start-btn">
        <span>Start Chatting</span>
        <svg className="arrow-icon" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
    </div>
    
    <div className="info-section">
      <div className="info-card">
        <svg className="info-icon" viewBox="0 0 24 24">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01"/>
        </svg>
        <p>Chat anonymously with random people</p>
      </div>
      <div className="info-card">
        <svg className="info-icon" viewBox="0 0 24 24">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        <p>No registration required</p>
      </div>
      <div className="info-card">
        <svg className="info-icon" viewBox="0 0 24 24">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
        <p>Be respectful and have fun!</p>
      </div>
    </div>
  </div>
);

  const renderWaiting = () => (
  <div className="waiting-screen">
    <div className="waiting-content">
      <div className="spinner"></div>
      <h2>Finding you a partner...</h2>
      <p>This usually takes less than a minute</p>
      <button onClick={newChat} className="cancel-btn">
        Cancel Search
      </button>
    </div>
  </div>
);

 const renderChat = () => (
  <div className="chat-screen">
    <div className="chat-header">
      <div className="header-left">
        <div className="active-indicator"></div>
        <h3>Active Chat</h3>
      </div>
      <button onClick={newChat} className="new-chat-btn">
        <svg className="refresh-icon" viewBox="0 0 24 24">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        New Chat
      </button>
    </div>
    
    <div className="messages-container">
      {messages.map((msg, index) => (
        <div key={index} className={`message ${msg.type}`}>
          <div className="message-content">
            {msg.message}
          </div>
          <div className="message-time">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ))}
      {isPartnerTyping && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>Stranger is typing</span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
    
    <form onSubmit={sendMessage} className="message-form">
      <input
        type="text"
        value={currentMessage}
        onChange={handleTyping}
        placeholder="Type your message..."
        className="message-input"
        autoFocus
      />
      <button type="submit" className="send-btn">
        <svg className="send-icon" viewBox="0 0 24 24">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
      </button>
    </form>
  </div>
);

  return (
    <div className="App">
      {chatState === 'home' && renderHome()}
      {chatState === 'waiting' && renderWaiting()}
      {chatState === 'chatting' && renderChat()}
    </div>
  )
}

export default App
