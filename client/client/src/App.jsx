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
        <h1 className="logo">AMANG TILAG FINDER</h1>
        <p className="tagline">Connect with other fellow earist students</p>
      </div>
      
      <div className="start-section">
        <input
          type="text"
          placeholder="Enter your name (optional)"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="name-input"
        />
        <button onClick={startChat} className="start-btn">
          Start Chatting
        </button>
      </div>
      
      <div className="info-section">
        <p>• Chat anonymously with random people</p>
        <p>• No registration required</p>
        <p>• Be respectful and have fun!</p>
      </div>
    </div>
  );

  const renderWaiting = () => (
    <div className="waiting-screen">
      <div className="waiting-content">
        <div className="spinner"></div>
        <h2>Looking for someone to chat with...</h2>
        <p>Please wait while we find you a conversation partner</p>
        <button onClick={newChat} className="cancel-btn">
          Cancel
        </button>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="chat-screen">
      <div className="chat-header">
        <h3>CHATONIMY</h3>
        <div className="chat-controls">
          <button onClick={newChat} className="new-chat-btn">
            New Chat
          </button>
        </div>
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
            <span>Stranger is typing</span>
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
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
          Send
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
