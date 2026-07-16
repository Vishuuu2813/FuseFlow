
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MessageSquare,
  Smartphone,
  Send,
  Zap,
  Workflow,
  FileText,
  Contact,
  User,
  BarChart3,
  X,
  Moon,
  Sun,
  Sparkles
} from 'lucide-react';

const commandGroups = [
  {
    label: 'Navigation',
    commands: [
      { id: 'dashboard', name: 'Go to Overview', icon: MessageSquare, action: '/dashboard' },
      { id: 'analytics', name: 'Open Analytics', icon: BarChart3, action: '/dashboard/analytics' },
      { id: 'live-chat', name: 'Go to Live Chat', icon: MessageSquare, action: '/dashboard/live-chat' },
      { id: 'sessions', name: 'Go to WhatsApp Sessions', icon: Smartphone, action: '/dashboard/sessions' },
      { id: 'send-message', name: 'Go to Send Message', icon: Send, action: '/dashboard/send-message' },
      { id: 'campaigns', name: 'Go to Campaigns', icon: Zap, action: '/dashboard/smart-broadcast' },
      { id: 'contacts', name: 'Go to CRM Contacts', icon: Contact, action: '/dashboard/contacts' },
      { id: 'flows', name: 'Go to Flow Builder', icon: Workflow, action: '/dashboard/flows' },
      { id: 'message-logs', name: 'Go to Message Logs', icon: FileText, action: '/dashboard/message-logs' },
      { id: 'profile', name: 'Go to Profile', icon: User, action: '/dashboard/profile' },
    ],
  },
  {
    label: 'Settings',
    commands: [
      { id: 'toggle-dark-mode', name: 'Toggle Dark Mode', icon: Moon, action: 'toggle-dark-mode' },
    ],
  },
];

const CommandPalette = ({ isOpen, onClose, dark, setDark }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    const commands = getFilteredCommands();
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (commands.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % commands.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commands.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + commands.length) % commands.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (commands[selectedIndex]) {
        handleCommandSelect(commands[selectedIndex]);
      }
    }
  };

  const getFilteredCommands = () => {
    const allCommands = commandGroups.flatMap((group) =>
      group.commands.map((cmd) => ({ ...cmd, group: group.label }))
    );
    return allCommands.filter((cmd) =>
      cmd.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  const handleCommandSelect = (cmd) => {
    if (cmd.action === 'toggle-dark-mode') {
      setDark((prev) => !prev);
      localStorage.setItem('fuseflow-theme', !dark ? 'dark' : 'light');
    } else if (typeof cmd.action === 'string') {
      navigate(cmd.action);
    }
    onClose();
  };

  if (!isOpen) return null;

  const filteredCommands = getFilteredCommands();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[24px] border shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <Search style={{ color: 'var(--text-muted)' }} size={18} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search commands or type an action..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm font-semibold focus:outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 transition hover:bg-slate-500/10"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Close command palette"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {filteredCommands.length > 0 ? (
          <div className="max-h-80 overflow-y-auto p-2">
            {commandGroups.map((group) => {
              const groupCommands = filteredCommands.filter(
                (cmd) => cmd.group === group.label
              );
              if (groupCommands.length === 0) return null;

              return (
                <div key={group.label} className="mb-2">
                  <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                    {group.label}
                  </div>
                  {groupCommands.map((cmd, idx) => {
                    const Icon = cmd.icon;
                    const isSelected =
                      filteredCommands.indexOf(cmd) === selectedIndex;
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => handleCommandSelect(cmd)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'hover:bg-slate-500/10'
                        }`}
                        style={!isSelected ? { color: 'var(--text-secondary)' } : undefined}
                      >
                        <Icon
                          size={16}
                          className={
                            isSelected
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }
                        />
                        {cmd.name}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center">
            <Sparkles className="mx-auto mb-3 opacity-40" size={28} style={{ color: 'var(--accent-text)' }} />
            <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>No matching command</p>
            <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Try a page name like chat, contacts, campaign, or settings.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandPalette;
