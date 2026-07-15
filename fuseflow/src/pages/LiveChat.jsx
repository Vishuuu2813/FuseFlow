import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Send,
  User,
  Tag,
  Clock,
  CheckCheck,
  Image,
  Paperclip,
  Check,
  AlertCircle,
  Plus,
  X,
  Sliders,
  ChevronRight,
  Info,
  ChevronDown,
  ChevronUp,
  Settings,
  HelpCircle,
  PlusCircle,
  MessageSquare
} from 'lucide-react';

const LiveChat = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const phoneParam = searchParams.get('phone');
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // UI Control States
  const [showCrmPanel, setShowCrmPanel] = useState(true);
  const [showVariablesSection, setShowVariablesSection] = useState(false); // Collapsed by default, making it completely optional

  // Contact Details Panel States
  const [contactDetails, setContactDetails] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const getDisplayName = (name, phone) => {
    if (!name || name === 'Unknown Contact' || name === 'New Contact') {
      return `+${phone}`;
    }
    return name;
  };

  // Generate dynamic gradient for avatars based on contact name
  const getAvatarGradient = (str) => {
    const sum = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      'from-indigo-500 to-purple-500',
      'from-emerald-400 to-teal-500',
      'from-rose-500 to-pink-500',
      'from-blue-500 to-sky-500',
      'from-amber-400 to-orange-500'
    ];
    return gradients[sum % gradients.length];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch recent active chats
  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const { data } = await api.get('/chat/contacts');
      setChats(data);
    } catch (err) {
      setError('Failed to load active chats.');
    } finally {
      setLoadingChats(false);
    }
  };

  // Fetch message history for selected contact
  const fetchMessages = async (phone) => {
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/chat/messages/${phone}`);
      setMessages(data);
    } catch (err) {
      setError('Failed to load message history.');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch contact details for the side CRM panel
  const fetchContactDetails = async (phone) => {
    try {
      const { data } = await api.get(`/contacts`, { params: { search: phone } });
      const found = data.contacts?.find(c => c.phone === phone);
      if (found) {
        setContactDetails(found);
      } else {
        setContactDetails({
          phone,
          name: 'Unknown Contact',
          stage: 'lead',
          tags: [],
          variables: {}
        });
      }
    } catch (err) {
      console.error('Failed to load contact details.');
    }
  };

  // Initialize socket connection and data fetching
  useEffect(() => {
    fetchChats();

    // Setup Socket
    const socket = io('http://localhost:5000', {
      auth: { token: localStorage.getItem('accessToken') },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.emit('join-tenant', user.tenantId);

    // Re-join tenant room and refresh chats after reconnect (server restart etc.)
    socket.on('connect', () => {
      socket.emit('join-tenant', user.tenantId);
      fetchChats();
    });

    // Listen to real-time chat messages
    socket.on('chat-message', (data) => {
      setSelectedChat((currentChat) => {
        if (currentChat && currentChat.phone === data.phone) {
          setMessages((prev) => {
            const alreadyExists = prev.some((m) => m._id === data._id || (m.messageId && m.messageId === data.messageId));
            if (alreadyExists) return prev;
            return [...prev, data];
          });
        }
        return currentChat;
      });

      // Update recent chats list in sidebar
      setChats((prevChats) => {
        const existingIdx = prevChats.findIndex((c) => c.phone === data.phone);
        if (existingIdx !== -1) {
          const updatedChats = [...prevChats];
          updatedChats[existingIdx] = {
            ...updatedChats[existingIdx],
            lastMessage: data.messageText,
            lastMessageAt: data.createdAt,
            lastDirection: data.direction,
            lastStatus: data.status,
          };
          const item = updatedChats.splice(existingIdx, 1)[0];
          return [item, ...updatedChats];
        } else {
          fetchChats();
          return prevChats;
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user.tenantId]);

  // Handle auto-selecting contact from URL parameters (e.g. from CRM contacts page)
  useEffect(() => {
    if (phoneParam && chats.length > 0) {
      const existingChat = chats.find(c => c.phone === phoneParam);
      if (existingChat) {
        handleSelectChat(existingChat);
      } else {
        api.get(`/contacts`, { params: { search: phoneParam } })
          .then(({ data }) => {
            const contact = data.contacts?.find(c => c.phone === phoneParam);
            const newChat = {
              phone: phoneParam,
              name: contact ? contact.name : 'New Contact',
              stage: contact ? contact.stage : 'lead',
              tags: contact ? contact.tags : [],
              lastMessage: '',
              lastMessageAt: new Date().toISOString(),
              lastDirection: 'OUTGOING',
            };
            setChats(prev => [newChat, ...prev]);
            handleSelectChat(newChat);
          })
          .catch(() => {
            const newChat = {
              phone: phoneParam,
              name: 'New Contact',
              stage: 'lead',
              tags: [],
              lastMessage: '',
              lastMessageAt: new Date().toISOString(),
              lastDirection: 'OUTGOING',
            };
            setChats(prev => [newChat, ...prev]);
            handleSelectChat(newChat);
          });
      }
      searchParams.delete('phone');
      setSearchParams(searchParams);
    }
  }, [phoneParam, chats]);

  // Handle clicking a contact chat
  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setMessages([]);
    setContactDetails(null);
    fetchMessages(chat.phone);
    fetchContactDetails(chat.phone);
  };

  // Send message manual handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !selectedChat) return;

    setSending(true);
    setError('');
    try {
      const payload = {
        phone: selectedChat.phone,
        messageText: newMessage,
      };
      if (mediaUrl.trim()) {
        payload.mediaUrl = mediaUrl;
      }

      const { data: savedLog } = await api.post('/chat/send', payload);

      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m._id === savedLog._id);
        if (alreadyExists) return prev;
        return [...prev, savedLog];
      });

      setChats((prevChats) => {
        const existingIdx = prevChats.findIndex((c) => c.phone === savedLog.phone);
        const updatedEntry = {
          ...(prevChats[existingIdx] || { phone: savedLog.phone, name: selectedChat.name || savedLog.phone }),
          lastMessage: savedLog.messageText,
          lastMessageAt: savedLog.createdAt || new Date().toISOString(),
          lastDirection: 'OUTGOING',
          lastStatus: savedLog.status,
        };
        if (existingIdx !== -1) {
          const updatedChats = [...prevChats];
          updatedChats.splice(existingIdx, 1);
          return [updatedEntry, ...updatedChats];
        }
        return [updatedEntry, ...prevChats];
      });

      setNewMessage('');
      setMediaUrl('');
      setShowMediaInput(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // CRM Update: Stage
  const handleUpdateStage = async (stage) => {
    if (!contactDetails?.phone) return;
    const identifier = contactDetails._id || contactDetails.phone;
    try {
      const { data } = await api.put(`/contacts/${identifier}`, { stage });
      setContactDetails(data);
      setChats(prev => prev.map(c => c.phone === contactDetails.phone ? { ...c, stage } : c));
    } catch (err) {
      alert('Failed to update stage');
    }
  };

  // CRM Update: Add Tag
  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTag.trim() || !contactDetails?.phone) return;

    const identifier = contactDetails._id || contactDetails.phone;
    const updatedTags = [...(contactDetails.tags || []), newTag.trim()];
    try {
      const { data } = await api.put(`/contacts/${identifier}`, { tags: updatedTags });
      setContactDetails(data);
      setNewTag('');
    } catch (err) {
      alert('Failed to add tag');
    }
  };

  // CRM Update: Remove Tag
  const handleRemoveTag = async (tagToRemove) => {
    if (!contactDetails?.phone) return;
    const identifier = contactDetails._id || contactDetails.phone;
    const updatedTags = contactDetails.tags.filter(t => t !== tagToRemove);
    try {
      const { data } = await api.put(`/contacts/${identifier}`, { tags: updatedTags });
      setContactDetails(data);
    } catch (err) {
      alert('Failed to remove tag');
    }
  };

  // CRM Update: Add Variable
  const handleAddVariable = async (e) => {
    e.preventDefault();
    if (!newVarKey.trim() || !newVarValue.trim() || !contactDetails?.phone) return;

    const identifier = contactDetails._id || contactDetails.phone;
    const currentVars = contactDetails.variables || {};
    const updatedVars = { ...currentVars, [newVarKey.trim()]: newVarValue.trim() };

    try {
      const { data } = await api.put(`/contacts/${identifier}`, { variables: updatedVars });
      setContactDetails(data);
      setNewVarKey('');
      setNewVarValue('');
    } catch (err) {
      alert('Failed to add custom variable');
    }
  };

  // CRM Update: Remove Variable
  const handleRemoveVariable = async (keyToRemove) => {
    if (!contactDetails?.phone) return;
    const identifier = contactDetails._id || contactDetails.phone;
    const currentVars = { ...contactDetails.variables };
    delete currentVars[keyToRemove];

    try {
      const { data } = await api.put(`/contacts/${identifier}`, { variables: currentVars });
      setContactDetails(data);
    } catch (err) {
      alert('Failed to remove custom variable');
    }
  };

  // Filtered sidebar chats
  const filteredChats = chats.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery);

    const matchesStage = !filterStage || c.stage === filterStage;

    const matchesTag =
      !filterTag ||
      c.tags?.some((t) => t.toLowerCase().includes(filterTag.toLowerCase()));

    return matchesSearch && matchesStage && matchesTag;
  });

  const getStageBadgeStyle = (stg) => {
    switch (stg) {
      case 'lead': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'contact': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'demo': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'negotiation': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'won': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'lost': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="flex h-[calc(100vh-73px)] -mx-4 -my-6 sm:-mx-6 lg:-mx-8 lg:-my-8 gap-4 bg-slate-100/30 p-4">
      {/* 1. Chats Sidebar (Left) */}
      <div className="w-80 shrink-0 bg-white border border-slate-200/80 rounded-3xl flex flex-col overflow-hidden shadow-sm">
        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
          <h2 className="font-extrabold text-slate-800 text-lg tracking-tight">Active Conversations</h2>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search chat or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-xs focus:outline-none focus:border-indigo-650 transition-colors font-semibold placeholder-slate-400"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="flex-1 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wide focus:outline-none focus:border-indigo-650 cursor-pointer"
            >
              <option value="">All Stages</option>
              <option value="lead">Lead</option>
              <option value="contact">Contact</option>
              <option value="demo">Demo</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <input
              type="text"
              placeholder="Filter tag..."
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="flex-1 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-650"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loadingChats ? (
            <div className="flex justify-center items-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs font-bold leading-relaxed">
              No conversations active matching criteria.
            </div>
          ) : (
            filteredChats.map((c) => {
              const isSelected = selectedChat && selectedChat.phone === c.phone;
              const displayName = getDisplayName(c.name, c.phone);
              const initials = displayName.replace('+', '').slice(0, 2).toUpperCase();
              
              return (
                <button
                  key={c.phone}
                  onClick={() => handleSelectChat(c)}
                  className={`w-full flex items-start gap-3.5 p-4 transition-all text-left ${
                    isSelected ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50/60 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className={`h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br ${getAvatarGradient(displayName)} text-white font-black text-xs flex items-center justify-center shadow-sm`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-800 text-sm truncate">{displayName}</span>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">
                        {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1 font-semibold leading-snug">
                      {c.lastDirection === 'INCOMING' ? '← ' : '→ '}
                      {c.lastMessage || 'Media / attachments'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${getStageBadgeStyle(c.stage)}`}>
                        {c.stage}
                      </span>
                      {displayName !== `+${c.phone}` && (
                        <span className="text-[9px] text-slate-450 font-bold tracking-tight">+{c.phone}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Chat Window (Center) */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-3xl flex flex-col overflow-hidden shadow-sm">
        {selectedChat ? (
          <>
            {/* Active Chat Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/40">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${getAvatarGradient(getDisplayName(selectedChat.name, selectedChat.phone))} text-white font-black text-xs flex items-center justify-center shadow-sm`}>
                  {getDisplayName(selectedChat.name, selectedChat.phone).replace('+', '').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">{getDisplayName(selectedChat.name, selectedChat.phone)}</h3>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Active connection" />
                  </div>
                  {getDisplayName(selectedChat.name, selectedChat.phone) !== `+${selectedChat.phone}` && (
                    <p className="text-[10px] text-slate-400 mt-0.5 font-bold">+{selectedChat.phone}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {error && (
                  <div className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-[10px] font-black flex items-center gap-1.5">
                    <AlertCircle size={12} /> {error}
                  </div>
                )}
                <button
                  onClick={() => setShowCrmPanel(!showCrmPanel)}
                  className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                    showCrmPanel
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-650'
                      : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                  title={showCrmPanel ? 'Hide CRM details' : 'Show CRM details'}
                >
                  <Info size={16} className="stroke-[2.2]" />
                </button>
              </div>
            </div>

            {/* Message Pane */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/15 flex flex-col gap-4">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-12 font-bold">
                  No log messages found. Type below to send a WhatsApp message.
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isIncoming = msg.direction === 'INCOMING';
                  return (
                    <div
                      key={msg._id || index}
                      className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-md rounded-2xl px-4 py-3 shadow-sm text-xs ${
                          isIncoming
                            ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                            : 'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                        }`}
                      >
                        {msg.mediaUrl && (
                          <img
                            src={msg.mediaUrl}
                            alt="Sent attachment"
                            className="rounded-xl mb-2.5 max-w-xs object-cover border border-slate-100 shadow-sm"
                          />
                        )}
                        <p className="font-semibold whitespace-pre-wrap leading-relaxed">{msg.messageText}</p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1.5 text-[9px] font-bold ${
                            isIncoming ? 'text-slate-400' : 'text-indigo-200'
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {!isIncoming && (
                            <CheckCheck size={11} className={msg.status === 'READ' ? 'text-emerald-400' : ''} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose Message Footer */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-150 bg-white">
              {showMediaInput && (
                <div className="mb-3.5 p-3 rounded-2xl border border-indigo-100 bg-indigo-50/20 flex items-center gap-2 animate-fadeIn">
                  <Image size={15} className="text-indigo-600 shrink-0" />
                  <input
                    type="url"
                    placeholder="Attach external image URL (e.g. https://domain.com/promo.png)"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-slate-700 focus:outline-none placeholder:text-slate-400 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMediaUrl('');
                      setShowMediaInput(false);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-650"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowMediaInput(!showMediaInput)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                    showMediaInput
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-650'
                      : 'border-slate-200 hover:border-slate-350 text-slate-500 hover:text-slate-750 hover:bg-slate-50'
                  }`}
                  title="Attach media URL"
                >
                  <Paperclip size={16} className="stroke-[2.2]" />
                </button>
                <input
                  type="text"
                  placeholder="Type your WhatsApp message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200/80 focus:outline-none focus:border-indigo-650 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-slate-50/40 focus:bg-white transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-5 py-3 bg-indigo-605 hover:bg-indigo-700 disabled:opacity-40 rounded-xl text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95 transition-all"
                >
                  {sending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <Send size={13} /> Send
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-10 bg-slate-50/20 text-center">
            <div className="h-16 w-16 bg-indigo-50/60 text-indigo-600 rounded-3xl flex items-center justify-center mb-4 border border-indigo-100 shadow-sm animate-pulse">
              <MessageSquare size={26} className="stroke-[1.8]" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">Select a conversation</h3>
            <p className="text-xs text-slate-450 mt-1.5 max-w-xs font-bold leading-relaxed">Choose a contact from the left sidebar to start chatting in real-time.</p>
          </div>
        )}
      </div>

      {/* 3. CRM Detail Panel (Right) - Toggleable & Enabled only when chat selected */}
      {selectedChat && contactDetails && showCrmPanel && (
        <div className="w-80 shrink-0 bg-white border border-slate-200/80 rounded-3xl p-5 flex flex-col gap-5 overflow-y-auto shadow-sm animate-fadeIn">
          {/* Header */}
          <div className="pb-4 border-b border-slate-100 flex flex-col items-center text-center gap-3">
            <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${getAvatarGradient(getDisplayName(contactDetails.name, contactDetails.phone))} text-white font-black text-base flex items-center justify-center shadow-md`}>
              {getDisplayName(contactDetails.name, contactDetails.phone).replace('+', '').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="font-black text-slate-850 text-sm tracking-tight">{getDisplayName(contactDetails.name, contactDetails.phone)}</h4>
              {getDisplayName(contactDetails.name, contactDetails.phone) !== `+${contactDetails.phone}` && (
                <p className="text-[10px] text-slate-450 font-bold mt-1">+{contactDetails.phone}</p>
              )}
            </div>
          </div>

          {/* CRM Stage */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-450 uppercase flex items-center gap-1.5 tracking-wider">
              <Sliders size={11} className="text-indigo-600" /> CRM Funnel Stage
            </span>
            <select
              value={contactDetails.stage}
              onChange={(e) => handleUpdateStage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-indigo-650"
            >
              <option value="lead">Lead</option>
              <option value="contact">Contact</option>
              <option value="demo">Demo Scheduled</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won / Customer</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-450 uppercase flex items-center gap-1.5 tracking-wider">
              <Tag size={11} className="text-indigo-600" /> CRM Tags
            </span>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/50 rounded-2xl border border-slate-150/70 min-h-12 max-h-24 overflow-y-auto">
              {contactDetails.tags?.length === 0 ? (
                <span className="text-[9px] text-slate-400 italic p-1 font-semibold">No tags assigned.</span>
              ) : (
                contactDetails.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-black rounded-lg flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))
              )}
            </div>
            
            <form onSubmit={handleAddTag} className="flex gap-2">
              <input
                type="text"
                placeholder="New tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-650 placeholder-slate-400"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-xl cursor-pointer transition-colors"
              >
                <Plus size={14} />
              </button>
            </form>
          </div>

          {/* Collapsible/Optional Personalization Variables Section */}
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowVariablesSection(!showVariablesSection)}
              className="flex items-center justify-between text-left cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="text-[9px] font-black text-slate-450 uppercase flex items-center gap-1.5 tracking-wider">
                <Clock size={11} className="text-indigo-600" /> Personalization variables
              </span>
              {showVariablesSection ? (
                <ChevronUp size={14} className="text-slate-400" />
              ) : (
                <ChevronDown size={14} className="text-slate-400" />
              )}
            </button>
            
            {showVariablesSection ? (
              <div className="flex flex-col gap-3 mt-1.5 animate-fadeIn">
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Optional: Map custom fields (like name, city, deal size) for bulk broadcast customization.
                </p>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto p-2 bg-slate-50/50 rounded-2xl border border-slate-150/70">
                  {Object.keys(contactDetails.variables || {}).length === 0 ? (
                    <span className="text-[9px] text-slate-400 italic p-1 font-semibold">No variables mapped yet.</span>
                  ) : (
                    Object.entries(contactDetails.variables || {}).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-650"
                      >
                        <span className="truncate">
                          <strong className="text-slate-800">{key}:</strong> {val}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariable(key)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer shrink-0"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddVariable} className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="e.g. city"
                      required
                      value={newVarKey}
                      onChange={(e) => setNewVarKey(e.target.value)}
                      className="px-2 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-650"
                    />
                    <input
                      type="text"
                      placeholder="Delhi"
                      required
                      value={newVarValue}
                      onChange={(e) => setNewVarValue(e.target.value)}
                      className="px-2 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-650"
                    />
                  </div>
                  <button
                    type="submit"
                    className="py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm active:scale-95"
                  >
                    <PlusCircle size={12} /> Save Variable
                  </button>
                </form>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowVariablesSection(true)}
                className="text-left text-[10px] text-indigo-650 font-bold hover:underline mt-1 cursor-pointer"
              >
                + View / add personalization variables
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChat;
