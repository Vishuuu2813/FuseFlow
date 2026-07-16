
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
  Database,
  User,
  Tag,
  Shield,
  Users,
  Settings,
  X,
  Moon,
  Sun
} from 'lucide-react';

const commandGroups = [
  {
    label: 'Navigation',
    commands: [
      { id: 'dashboard', name: 'Go to Overview', icon: MessageSquare, action: '/dashboard' },
      { id: 'live-chat', name: 'Go to Live Chat', icon: MessageSquare, action: '/dashboard/live-chat' },
      { id: 'sessions', name: 'Go to WhatsApp Sessions', icon: Smartphone, action: '/dashboard/sessions' },
      { id: 'send-message', name: 'Go to Send Message', icon: Send, action: '/dashboard/send-message' },
      { id: 'campaigns', name: 'Go to Campaigns', icon: Zap, action: '/dashboard/campaigns' },
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
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % getFilteredCommands().length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + getFilteredCommands().length) % getFilteredCommands().length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const commands = getFilteredCommands();
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3">
            <Search className="text-slate-400 dark:text-slate-500" size={18} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search commands or type an action..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-slate-800 dark:text-white focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {filteredCommands.length > 0 ? (
          <div className="p-2 max-h-80 overflow-y-auto">
            {commandGroups.map((group) => {
              const groupCommands = filteredCommands.filter(
                (cmd) => cmd.group === group.label
              );
              if (groupCommands.length === 0) return null;

              return (
                <div key={group.label} className="mb-2">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
                            ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
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
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            No results found for "{query}"
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandPalette;
