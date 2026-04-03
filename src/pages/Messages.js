import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiSend, FiArrowLeft, FiMessageCircle } from 'react-icons/fi';
import { messageAPI, formatDate } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import './Messages.css';

const API_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';

export default function Messages() {
  const { userId: selectedUserId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  // Socket.io connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    socketRef.current = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('new_message', (msg) => {
      if (
        (msg.sender_id === selectedUserId) ||
        (msg.receiver_id === selectedUserId)
      ) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
      queryClient.invalidateQueries(['conversations']);
    });

    return () => socketRef.current?.disconnect();
  }, [selectedUserId]);

  const { data: conversationsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messageAPI.getConversations().then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: messagesData } = useQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: () => messageAPI.getMessages(selectedUserId).then((r) => r.data),
    enabled: !!selectedUserId,
  });

  useEffect(() => {
    if (messagesData?.messages) {
      setMessages(messagesData.messages);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
    }
  }, [messagesData]);

  async function handleSend(e) {
    e.preventDefault();
    if (!message.trim()) return;

    const text = message.trim();
    setMessage('');

    // Optimistic update
    const optimistic = {
      id: Date.now().toString(),
      sender_id: user.id,
      receiver_id: selectedUserId,
      content: text,
      created_at: new Date(),
      sender: user,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      await messageAPI.send(selectedUserId, { content: text });
      queryClient.invalidateQueries(['conversations']);
    } catch {
      toast.error('Erreur envoi du message');
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  }

  const conversations = conversationsData?.conversations ?? [];
  const otherUser = messagesData?.other_user;

  // Vue liste conversations (mobile)
  if (!selectedUserId) {
    return (
      <div className="page messages">
        <div className="messages__list-header container">
          <h2>Messages</h2>
        </div>

        {conversations.length === 0 && (
          <div className="messages__empty">
            <FiMessageCircle size={48} color="var(--text-light)" />
            <h3>Pas encore de messages</h3>
            <p>Abonnez-vous à des créateurs et envoyez-leur un message.</p>
          </div>
        )}

        <div className="messages__conversation-list">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              to={`/messages/${conv.other_user_id}`}
              className="messages__conversation"
            >
              <div className="messages__conversation-avatar">
                {conv.other_user?.avatar_url ? (
                  <img src={conv.other_user.avatar_url} alt="" className="avatar avatar--md" />
                ) : (
                  <div className="avatar avatar--md messages__avatar-placeholder">
                    {conv.other_user?.display_name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="messages__conversation-info">
                <div className="messages__conversation-name">
                  {conv.other_user?.display_name}
                </div>
                <div className="messages__conversation-preview">
                  {conv.content?.length > 40 ? conv.content.slice(0, 40) + '...' : conv.content}
                </div>
              </div>
              <div className="messages__conversation-meta">
                <span className="messages__conversation-time">{formatDate(conv.created_at)}</span>
                {parseInt(conv.unread_count) > 0 && (
                  <span className="messages__unread-badge">{conv.unread_count}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Vue conversation
  return (
    <div className="page messages messages--chat">
      {/* Header conversation */}
      <div className="messages__chat-header">
        <Link to="/messages" className="messages__back-btn">
          <FiArrowLeft size={22} />
        </Link>
        {otherUser && (
          <Link to={`/profil/${otherUser.username}`} className="messages__chat-user">
            {otherUser.avatar_url ? (
              <img src={otherUser.avatar_url} alt="" className="avatar avatar--sm" />
            ) : (
              <div className="avatar avatar--sm messages__avatar-placeholder">
                {otherUser.display_name?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="messages__chat-name">{otherUser.display_name}</div>
              <div className="messages__chat-username">@{otherUser.username}</div>
            </div>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="messages__chat-body">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              className={`messages__bubble-wrap ${isMe ? 'messages__bubble-wrap--me' : ''}`}
            >
              <div className={`messages__bubble ${isMe ? 'messages__bubble--me' : 'messages__bubble--them'}`}>
                <p>{msg.content}</p>
                <span className="messages__bubble-time">{formatDate(msg.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="messages__input-form" onSubmit={handleSend}>
        <input
          type="text"
          className="messages__input"
          placeholder="Écrire un message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
        />
        <button
          type="submit"
          className="messages__send-btn"
          disabled={!message.trim()}
        >
          <FiSend size={20} />
        </button>
      </form>
    </div>
  );
}
