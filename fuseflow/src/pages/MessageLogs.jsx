import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, AlertCircle, CheckCircle, Clock, Smartphone, Mail, Calendar } from 'lucide-react';

const MessageLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sessions/logs');
      setLogs(data);
    } catch (err) {
      setError('Failed to retrieve message logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.messageText?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'ALL' || log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const groupLogsByDate = (logsList) => {
    const groups = {};
    logsList.forEach((log) => {
      const date = new Date(log.sentAt || log.createdAt);
      const dateStr = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      let label = dateStr;
      if (date.toDateString() === today.toDateString()) {
        label = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday';
      }
      
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(log);
    });
    return groups;
  };

  const groupedLogs = groupLogsByDate(filteredLogs);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Message Logs</h1>
        <p className="text-slate-500 text-sm mt-1">Audit trail of all individual and bulk broadcast messages dispatched through connected WhatsApp nodes.</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-655 text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filters Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 text-slate-450" size={16} />
          <input
            type="text"
            placeholder="Search phone or text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:outline-none focus:border-indigo-650 placeholder-slate-400 font-semibold"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-extrabold text-slate-500 uppercase shrink-0">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:outline-none focus:border-indigo-650 cursor-pointer font-bold"
          >
            <option value="ALL">All Statuses</option>
            <option value="SENT">Sent</option>
            <option value="DELIVERED">Delivered</option>
            <option value="READ">Read</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Logs View */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-semibold text-sm">
            No message dispatch logs found matching your filters.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {Object.keys(groupedLogs).map((dateLabel) => (
              <div key={dateLabel} className="flex flex-col gap-3">
                {/* Date Header Tag */}
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-indigo-50 border border-indigo-100 text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} /> {dateLabel}
                  </span>
                  <div className="h-px bg-slate-100 flex-1"></div>
                </div>

                {/* Table for this date */}
                <div className="overflow-x-auto border border-slate-150 rounded-2xl bg-white shadow-sm">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-450 font-bold text-xs uppercase tracking-wider bg-slate-50/40">
                        <th className="py-3 px-5">Recipient</th>
                        <th className="py-3 px-4">Device / Node</th>
                        <th className="py-3 px-4">Message Preview</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedLogs[dateLabel].map((log) => (
                        <tr key={log._id} className="text-slate-750 hover:bg-slate-50/50">
                          <td className="py-3.5 px-5 font-bold text-slate-900">+{log.phone}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                              <Smartphone size={13} className="text-slate-405" />
                              {log.whatsappSessionId?.sessionName || 'Device Link'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs md:max-w-sm">
                            <div className="truncate text-xs font-semibold text-slate-655" title={log.messageText}>
                              {log.messageText}
                            </div>
                            {log.mediaUrl && (
                              <span className="text-[10px] text-indigo-650 font-extrabold uppercase mt-0.5 block">Image Attached</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border inline-flex items-center gap-1 w-fit ${
                              log.status === 'SENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                              log.status === 'DELIVERED' || log.status === 'READ' ? 'bg-blue-50 text-blue-700 border-blue-150' :
                              'bg-red-50 text-red-600 border-red-150'
                            }`}>
                              {log.status === 'SENT' && <CheckCircle size={10} />}
                              {log.status === 'FAILED' && <AlertCircle size={10} />}
                              {log.status === 'PENDING' && <Clock size={10} />}
                              {log.status}
                            </span>
                            {log.errorReason && (
                              <p className="text-[10px] text-red-500 font-bold mt-1 max-w-[150px] truncate" title={log.errorReason}>
                                {log.errorReason}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-450 font-bold text-right">
                            {new Date(log.sentAt || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageLogs;
