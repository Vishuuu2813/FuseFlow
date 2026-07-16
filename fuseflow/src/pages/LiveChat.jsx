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
  ChevronDown,
  ChevronUp,
  PlusCircle,
  MessageSquare,
  Star,
  Pin,
  Archive,
  BellOff,
  Smile,
  Mic,
  MoreVertical,
  Inbox,
  FileText
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commonEmojis = [
    "😀", "😂", "😍", "🤔", "😢", "👍", "❤️", "🎉", "🔥", "👏", "😎", "🤗", "😴", "😱", "🙏", "👍🏻", "👏🏻", "😂", "🔥", "❤️"
  ];
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'

  // UI Control States
  const [showCrmPanel, setShowCrmPanel] = useState(true);
  const [showVariablesSection, setShowVariablesSection] = useState(false);
  const [showInternalNotesSection, setShowInternalNotesSection] = useState(true);
  const [showNotesSection, setShowNotesSection] = useState(true);

  // Contact Details Panel States
  const [contactDetails, setContactDetails] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [newInternalNote, setNewInternalNote] = useState('');
  const [newNote, setNewNote] = useState('');
  const [quickReplies, setQuickReplies] = useState([
    'Hey there! How can I help you?',
    'Thank you for reaching out!',
    'Can you please share more details?',
    'We will get back to you shortly.',
    'Sure! Let me check that for you.'
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const getDisplayName = (name, phone) => {
    if (!name || name === 'Unknown Contact' || name === 'New Contact') {
      return `+${phone}`;
    }
    return name;
  };

  const getAvatarColor = (str) => {
    const sum = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = ['#4338ca','#059669','#b45309','#7c3aed','#0369a1'];
    return colors[sum % colors.length];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const { data } = await api.get('/chat/contacts', {
        params: { includeArchived: activeTab === 'archived' ? 'true' : 'false' }
      });
      setChats(data);
    } catch (err) {
      setError('Failed to load active chats.');
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [activeTab]);

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
          variables: {},
          isPinned: false,
          isArchived: false,
          isMuted: false,
          mutedUntil: null,
          assignedAgentId: null,
          notes: [],
          internalNotes: [],
          customFields: {},
          customerScore: 0,
          leadScore: 0,
          birthday: null,
          anniversary: null
        });
      }
    } catch (err) {
      console.error('Failed to load contact details.');
    }
  };

  useEffect(() => {
    fetchChats();

    const socket = io('http://localhost:5000', {
      auth: { token: localStorage.getItem('accessToken') },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.emit('join-tenant', user.tenantId);

    socket.on('connect', () => {
      socket.emit('join-tenant', user.tenantId);
      fetchChats();
    });

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

    socket.on('typing-start', (data) => {
      if (selectedChat && selectedChat.phone === data.phone) {
        setIsTyping(true);
      }
    });

    socket.on('typing-stop', (data) => {
      if (selectedChat && selectedChat.phone === data.phone) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user.tenantId, activeTab, selectedChat]);

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
              isPinned: false,
              isArchived: false,
              isMuted: false
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
              isPinned: false,
              isArchived: false,
              isMuted: false
            };
            setChats(prev => [newChat, ...prev]);
            handleSelectChat(newChat);
          });
      }
      searchParams.delete('phone');
      setSearchParams(searchParams);
    }
  }, [phoneParam, chats]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setMessages([]);
    setContactDetails(null);
    fetchMessages(chat.phone);
    fetchContactDetails(chat.phone);
  };

  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };
  
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
      handleTypingStop();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

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

  const handleTogglePin = async () => {
    if (!contactDetails?.phone) return;
    const identifier = contactDetails._id || contactDetails.phone;
    try {
      const { data } = await api.put(`/contacts/${identifier}`, { isPinned: !contactDetails.isPinned });
      setContactDetails(data);
      setChats(prev => prev.map(c => c.phone === data.phone ? { ...c, isPinned: data.isPinned } : c));
      setSelectedChat(prev => prev ? { ...prev, isPinned: data.isPinned } : prev);
    } catch (err) {
      alert('Failed to update pin status');
    }
  };

  const handleToggleArchive = async () => {
    if (!contactDetails?.phone) return;
    const identifier = contactDetails._id || contactDetails.phone;
    try {
      const { data } = await api.put(`/contacts/${identifier}`, { isArchived: !contactDetails.isArchived });
      setContactDetails(data);
      setChats(prev => prev.filter(c => c.phone !== data.phone));
      setSelectedChat(null);
    } catch (err) {
      alert('Failed to update archive status');
    }
  };

  const handleToggleMute = async () => {
    if (!contactDetails?.phone) return;
    const identifier = contactDetails._id || contactDetails.phone;
    try {
      const { data } = await api.put(`/contacts/${identifier}`, { isMuted: !contactDetails.isMuted });
      setContactDetails(data);
      setChats(prev => prev.map(c => c.phone === data.phone ? { ...c, isMuted: data.isMuted } : c));
      setSelectedChat(prev => prev ? { ...prev, isMuted: data.isMuted } : prev);
    } catch (err) {
      alert('Failed to update mute status');
    }
  };

  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!newInternalNote.trim() || !contactDetails?.phone) return;
    const identifier = contactDetails._id || contactDetails.phone;
    const newNoteObj = {
      text: newInternalNote,
      authorId: user._id,
      createdAt: new Date().toISOString()
    };
    const updatedNotes = [...(contactDetails.internalNotes || []), newNoteObj];
    try {
      const { data } = await api.put(`/contacts/${identifier}`, { internalNotes: updatedNotes });
      setContactDetails(data);
      setNewInternalNote('');
    } catch (err) {
      alert('Failed to add internal note');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !contactDetails?.phone) return;
    const identifier = contactDetails._id || contactDetails.phone;
    const newNoteObj = {
      text: newNote,
      authorId: user._id,
      createdAt: new Date().toISOString()
    };
    const updatedNotes = [...(contactDetails.notes || []), newNoteObj];
    try {
      const { data } = await api.put(`/contacts/${identifier}`, { notes: updatedNotes });
      setContactDetails(data);
      setNewNote('');
    } catch (err) {
      alert('Failed to add note');
    }
  };

  const handleToggleStarMessage = async (messageId, currentStarred) => {
    try {
      const { data } = await api.put(`/chat/message/${messageId}/star`, { starred: !currentStarred });
      setMessages(prev => prev.map(m => m._id === messageId ? data : m));
    } catch (err) {
      alert('Failed to update message star status');
    }
  };

  const handleTypingStart = () => {
    if (!selectedChat || !socketRef.current) return;
    socketRef.current.emit('typing-start', { tenantId: user.tenantId, phone: selectedChat.phone });
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    const timeout = setTimeout(() => {
      handleTypingStop();
    }, 2000);
    setTypingTimeout(timeout);
  };

  const handleTypingStop = () => {
    if (!selectedChat || !socketRef.current) return;
    socketRef.current.emit('typing-stop', { tenantId: user.tenantId, phone: selectedChat.phone });
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  };

  const handleUpdateContact = async (fields) => {
    if (!contactDetails?.phone) return;
    const identifier = contactDetails._id || contactDetails.phone;
    try {
      const { data } = await api.put(`/contacts/${identifier}`, fields);
      setContactDetails(data);
    } catch (err) {
      console.error('Failed to update contact:', err);
    }
  };


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

  const S = {
    panel: { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' },
    header: { backgroundColor: 'var(--bg-header)', borderColor: 'var(--border)' },
    input: { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' },
    base: { backgroundColor: 'var(--bg-base)' },
    text: { color: 'var(--text-primary)' },
    sub: { color: 'var(--text-secondary)' },
    muted: { color: 'var(--text-muted)' },
    border: { borderColor: 'var(--border)' },
    accent: { backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' },
    msgOut: { backgroundColor: '#25a244', color: '#ffffff' },
    msgIn: { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' },
  };

  return (
    <div className="flex h-[calc(100vh-73px)] -mx-4 -my-6 sm:-mx-6 lg:-mx-8 lg:-my-8" style={S.base}>
      {/* LEFT: Conversations Sidebar */}
      <div className="w-[300px] shrink-0 border-r flex flex-col overflow-hidden" style={S.panel}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b" style={S.border}>
          <h2 className="font-extrabold text-base mb-3" style={S.text}>Chats</h2>
          <div className="flex gap-1 p-1 rounded-xl border mb-3" style={{ ...S.border, backgroundColor: 'var(--bg-input)' }}>
            {['active','archived'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                style={activeTab === tab ? { backgroundColor: 'var(--accent)', color: '#fff' } : S.sub}>
                {tab === 'active' ? <><Inbox size={12} className="inline mr-1"/>Active</> : <><Archive size={12} className="inline mr-1"/>Archived</>}
              </button>
            ))}
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5" size={14} style={S.muted}/>
            <input type="text" placeholder="Search..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-semibold focus:outline-none border"
              style={S.input}/>
          </div>
          <div className="flex gap-2">
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase focus:outline-none border"
              style={S.input}>
              <option value="">All Stages</option>
              {['lead','contact','demo','negotiation','won','lost'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <input type="text" placeholder="Tag filter..." value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs focus:outline-none border"
              style={S.input}/>
          </div>
        </div>
        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="flex justify-center py-10"><div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"/></div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold" style={S.muted}>
              <MessageSquare size={36} className="mx-auto mb-3 opacity-30"/>No conversations
            </div>
          ) : filteredChats.map(c => {
            const isSelected = selectedChat?.phone === c.phone;
            const name = getDisplayName(c.name, c.phone);
            const initials = name.replace('+','').slice(0,2).toUpperCase();
            return (
              <button key={c.phone} onClick={() => handleSelectChat(c)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left border-b transition-colors relative"
                style={{ borderColor: 'var(--border)', backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent' }}>
                {c.isPinned && <Pin size={10} className="absolute top-2 right-2 text-amber-500"/>}
                <div className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white font-black text-xs"
                  style={{ backgroundColor: getAvatarColor(name) }}>{initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm truncate" style={S.text}>{name}{c.isMuted && <BellOff size={10} className="inline ml-1 opacity-50"/>}</span>
                    <span className="text-[10px] shrink-0 ml-1" style={S.muted}>{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : ''}</span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={S.muted}>{c.lastDirection==='INCOMING'?'← ':'→ '}{c.lastMessage||'Media'}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase border" style={S.border}>{c.stage||'lead'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER: Chat Window */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {selectedChat ? (<>
          {/* Chat Header */}
          <div className="px-5 py-3 border-b flex items-center justify-between" style={S.header}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-white font-black text-xs"
                style={{ backgroundColor: getAvatarColor(getDisplayName(selectedChat.name, selectedChat.phone)) }}>
                {getDisplayName(selectedChat.name, selectedChat.phone).replace('+','').slice(0,2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm" style={S.text}>{getDisplayName(selectedChat.name, selectedChat.phone)}</h3>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/>
                  {selectedChat.isPinned && <Pin size={12} className="text-amber-500"/>}
                </div>
                {getDisplayName(selectedChat.name,selectedChat.phone) !== `+${selectedChat.phone}` && (
                  <p className="text-[10px] font-bold" style={S.muted}>+{selectedChat.phone}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {error && <span className="text-[10px] text-red-400 mr-2 flex items-center gap-1"><AlertCircle size={12}/>{error}</span>}
              {[
                {fn: handleTogglePin, icon: Pin, active: contactDetails?.isPinned, title: 'Pin'},
                {fn: handleToggleArchive, icon: Archive, active: false, title: 'Archive'},
                {fn: handleToggleMute, icon: BellOff, active: contactDetails?.isMuted, title: 'Mute'},
                {fn: () => setShowCrmPanel(v=>!v), icon: User, active: showCrmPanel, title: 'CRM Panel'},
              ].map(({fn, icon: Icon, active, title}) => (
                <button key={title} onClick={fn} title={title}
                  className="p-2 rounded-lg border transition-colors cursor-pointer"
                  style={active ? S.accent : { ...S.border, ...S.sub, backgroundColor: 'transparent' }}>
                  <Icon size={16}/>
                </button>
              ))}
            </div>
          </div>

          {/* Messages Area — WhatsApp chat background */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3"
            style={{ backgroundColor: 'var(--bg-base)' }}>
            {loadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"/>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                <MessageSquare size={44} className="mb-4 opacity-20" style={S.muted}/>
                <p className="text-sm font-bold" style={S.muted}>No messages yet</p>
              </div>
            ) : messages.map((msg, idx) => {
              const isIn = msg.direction === 'INCOMING';
              return (
                <div key={msg._id||idx} className={`flex ${isIn ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-xs border ${isIn ? 'rounded-tl-sm' : 'rounded-tr-sm border-transparent'}`}
                    style={isIn ? S.msgIn : S.msgOut}>
                    {msg.mediaUrl && <img src={msg.mediaUrl} alt="media" className="rounded-lg mb-2 max-w-xs object-cover"/>}
                    <p className="font-medium leading-relaxed whitespace-pre-wrap">{msg.messageText}</p>
                    <div className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${isIn ? 'opacity-50' : 'opacity-70'}`}>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                      <button type="button" onClick={() => handleToggleStarMessage(msg._id, msg.starred)}
                        className={msg.starred ? 'text-amber-400' : 'opacity-40 hover:opacity-100'}>
                        <Star size={9} fill={msg.starred ? 'currentColor' : 'none'}/>
                      </button>
                      {!isIn && (msg.status==='READ' ? <CheckCheck size={10} className="text-sky-300"/> : <Check size={10}/>)}
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 border" style={S.msgIn}>
                  <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          {/* Quick Replies */}
          <div className="px-4 pt-3 overflow-x-auto border-t" style={{ ...S.border, backgroundColor: 'var(--bg-header)' }}>
            <div className="flex gap-2 pb-2">
              {quickReplies.map((r,i) => (
                <button key={i} type="button" onClick={() => setNewMessage(r)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-colors cursor-pointer"
                  style={{ ...S.border, ...S.sub, backgroundColor: 'transparent' }}
                  onMouseEnter={e=>{e.currentTarget.style.backgroundColor='var(--accent-soft)';e.currentTarget.style.color='var(--accent-text)';}}
                  onMouseLeave={e=>{e.currentTarget.style.backgroundColor='transparent';e.currentTarget.style.color='var(--text-secondary)';}}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-20 left-4 z-20 rounded-2xl p-3 shadow-xl border" style={S.panel}>
              <div className="grid grid-cols-8 gap-1.5">
                {commonEmojis.map((e,i) => (
                  <button key={i} type="button" onClick={() => handleEmojiClick(e)}
                    className="text-xl hover:scale-125 transition-transform rounded-lg p-1">{e}</button>
                ))}
              </div>
              <button type="button" onClick={() => setShowEmojiPicker(false)}
                className="w-full mt-2 text-[10px] font-bold" style={S.muted}>Close</button>
            </div>
          )}

          {/* Compose Bar */}
          <form onSubmit={handleSendMessage} className="px-4 py-3 border-t" style={S.header}>
            {showMediaInput && (
              <div className="mb-2 px-3 py-2 rounded-xl border flex items-center gap-2" style={S.input}>
                <Image size={13} style={{ color: 'var(--accent-text)' }}/>
                <input type="url" placeholder="Attach image URL..." value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  className="flex-1 bg-transparent text-xs focus:outline-none" style={S.sub}/>
                <button type="button" onClick={() => { setMediaUrl(''); setShowMediaInput(false); }}>
                  <X size={12} style={S.muted}/>
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              {[
                { fn: () => setShowMediaInput(v=>!v), icon: Paperclip, active: showMediaInput, title: 'Attach' },
                { fn: () => setShowEmojiPicker(v=>!v), icon: Smile, active: showEmojiPicker, title: 'Emoji' },
                { fn: ()=>{}, icon: Mic, active: false, title: 'Voice' },
              ].map(({fn, icon: Icon, active, title}) => (
                <button key={title} type="button" onClick={fn} title={title}
                  className="p-2.5 rounded-xl border transition-colors cursor-pointer"
                  style={active ? S.accent : { ...S.border, ...S.sub, backgroundColor: 'transparent' }}>
                  <Icon size={17}/>
                </button>
              ))}
              <input type="text" placeholder="Type a message..." value={newMessage}
                onChange={e => { setNewMessage(e.target.value); handleTypingStart(); }}
                onBlur={handleTypingStop}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none border"
                style={S.input}/>
              <button type="submit" disabled={!newMessage.trim() || sending}
                className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors"
                style={{ backgroundColor: '#25a244', color: '#fff' }}>
                {sending ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/> : <><Send size={15}/> Send</>}
              </button>
            </div>
          </form>
        </>) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10" style={S.base}>
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4 border" style={{ ...S.accent, ...S.border }}>
              <MessageSquare size={32}/>
            </div>
            <h3 className="font-bold text-lg mb-2" style={S.text}>Select a Conversation</h3>
            <p className="text-sm max-w-xs" style={S.muted}>Choose a contact from the sidebar to start chatting in real-time.</p>
          </div>
        )}
      </div>

      {/* RIGHT: CRM Panel */}
      {selectedChat && contactDetails && showCrmPanel && (
        <div className="w-[300px] shrink-0 border-l flex flex-col overflow-hidden" style={S.panel}>
          {/* Contact Header */}
          <div className="px-4 py-5 border-b text-center" style={{ ...S.border, backgroundColor: 'var(--bg-header)' }}>
            <div className="h-14 w-14 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-black text-lg"
              style={{ backgroundColor: getAvatarColor(getDisplayName(contactDetails.name, contactDetails.phone)) }}>
              {getDisplayName(contactDetails.name, contactDetails.phone).replace('+','').slice(0,2).toUpperCase()}
            </div>
            <h4 className="font-bold text-sm" style={S.text}>{getDisplayName(contactDetails.name, contactDetails.phone)}</h4>
            {getDisplayName(contactDetails.name,contactDetails.phone)!==`+${contactDetails.phone}` && (
              <p className="text-[11px] mt-0.5" style={S.muted}>+{contactDetails.phone}</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
            {/* Stage */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={S.muted}>CRM Stage</label>
              <select value={contactDetails.stage} onChange={e => handleUpdateStage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm font-bold focus:outline-none border"
                style={S.input}>
                {['lead','contact','demo','negotiation','won','lost'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-3">
              {[['customerScore','Customer'],['leadScore','Lead']].map(([key,label])=>(
                <div key={key}>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={S.muted}>{label} Score</label>
                  <input type="number" min="0" max="100" value={contactDetails[key]||0}
                    onChange={e=>{const v=Math.max(0,Math.min(100,Number(e.target.value)));setContactDetails(p=>({...p,[key]:v}));handleUpdateContact({[key]:v});}}
                    className="w-full px-3 py-2 rounded-xl text-sm font-bold focus:outline-none border"
                    style={S.input}/>
                </div>
              ))}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              {[['birthday','Birthday'],['anniversary','Anniversary']].map(([key,label])=>(
                <div key={key}>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={S.muted}>{label}</label>
                  <input type="date" value={contactDetails[key]?new Date(contactDetails[key]).toISOString().split('T')[0]:''}
                    onChange={e=>{const v=e.target.value?new Date(e.target.value):null;setContactDetails(p=>({...p,[key]:v}));handleUpdateContact({[key]:v});}}
                    className="w-full px-3 py-2 rounded-xl text-sm font-bold focus:outline-none border"
                    style={S.input}/>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={S.muted}>Tags</label>
              <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border min-h-[40px] mb-2" style={{ ...S.border, backgroundColor: 'var(--bg-input)' }}>
                {contactDetails.tags?.length===0 ? (
                  <span className="text-[11px] italic" style={S.muted}>No tags</span>
                ) : contactDetails.tags?.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border" style={S.accent}>
                    {tag}<button type="button" onClick={()=>handleRemoveTag(tag)}><X size={9}/></button>
                  </span>
                ))}
              </div>
              <form onSubmit={handleAddTag} className="flex gap-2">
                <input type="text" placeholder="Add tag..." value={newTag} onChange={e=>setNewTag(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none border" style={S.input}/>
                <button type="submit" className="p-1.5 rounded-xl border cursor-pointer" style={S.accent}><Plus size={14}/></button>
              </form>
            </div>

            {/* Internal Notes */}
            <div>
              <button type="button" onClick={()=>setShowInternalNotesSection(v=>!v)}
                className="flex items-center justify-between w-full mb-2">
                <label className="text-[10px] font-black uppercase tracking-wider cursor-pointer" style={S.muted}>Internal Notes</label>
                {showInternalNotesSection ? <ChevronUp size={13} style={S.muted}/> : <ChevronDown size={13} style={S.muted}/>}
              </button>
              {showInternalNotesSection && (<>
                <div className="flex flex-col gap-2 max-h-36 overflow-y-auto p-2.5 rounded-xl border mb-2" style={{ ...S.border, backgroundColor: 'var(--bg-input)' }}>
                  {contactDetails.internalNotes?.length===0 ? (
                    <span className="text-[11px] italic" style={S.muted}>No notes yet</span>
                  ) : contactDetails.internalNotes?.map((note,i)=>(
                    <div key={i} className="p-2 rounded-lg border text-[11px]" style={S.panel}>
                      <p className="font-semibold" style={S.text}>{note.text}</p>
                      <p className="mt-0.5" style={S.muted}>{new Date(note.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddInternalNote} className="flex flex-col gap-1.5">
                  <textarea placeholder="Add internal note..." value={newInternalNote}
                    onChange={e=>setNewInternalNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none border resize-none"
                    style={S.input} rows={2}/>
                  <button type="submit" className="py-1.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer border" style={S.accent}>
                    <PlusCircle size={11}/> Add Note
                  </button>
                </form>
              </>)}
            </div>

            {/* Notes */}
            <div>
              <button type="button" onClick={()=>setShowNotesSection(v=>!v)}
                className="flex items-center justify-between w-full mb-2">
                <label className="text-[10px] font-black uppercase tracking-wider cursor-pointer" style={S.muted}>Notes</label>
                {showNotesSection ? <ChevronUp size={13} style={S.muted}/> : <ChevronDown size={13} style={S.muted}/>}
              </button>
              {showNotesSection && (<>
                <div className="flex flex-col gap-2 max-h-36 overflow-y-auto p-2.5 rounded-xl border mb-2" style={{ ...S.border, backgroundColor: 'var(--bg-input)' }}>
                  {contactDetails.notes?.length===0 ? (
                    <span className="text-[11px] italic" style={S.muted}>No notes yet</span>
                  ) : contactDetails.notes?.map((note,i)=>(
                    <div key={i} className="p-2 rounded-lg border text-[11px]" style={S.panel}>
                      <p className="font-semibold" style={S.text}>{note.text}</p>
                      <p className="mt-0.5" style={S.muted}>{new Date(note.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddNote} className="flex flex-col gap-1.5">
                  <textarea placeholder="Add note..." value={newNote}
                    onChange={e=>setNewNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none border resize-none"
                    style={S.input} rows={2}/>
                  <button type="submit" className="py-1.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer border" style={S.accent}>
                    <PlusCircle size={11}/> Add Note
                  </button>
                </form>
              </>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChat;

