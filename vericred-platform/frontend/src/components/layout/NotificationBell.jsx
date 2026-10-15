import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCircle2, XCircle, Award, X, Check } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

const POLL_INTERVAL_MS = 30_000;

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_CONFIG = {
  CLAIM_APPROVED_CSV: {
    icon: <Award className="w-4 h-4 text-emerald-400" />,
    dot: 'bg-emerald-500',
    label: 'Auto-Verified',
  },
  CLAIM_APPROVED_FACULTY: {
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    dot: 'bg-emerald-500',
    label: 'Approved',
  },
  CLAIM_REJECTED: {
    icon: <XCircle className="w-4 h-4 text-red-400" />,
    dot: 'bg-red-500',
    label: 'Rejected',
  },
};

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Lightweight poll for unread count
  const pollUnreadCount = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/notifications/unread-count');
      if (res.data?.success) setUnreadCount(res.data.unreadCount);
    } catch (_) {}
  }, []);

  useEffect(() => {
    pollUnreadCount();
    const interval = setInterval(pollUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollUnreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    setLoading(true);

    try {
      const res = await axiosInstance.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(0); // optimistic reset after opening
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }

    // Mark all as read silently
    axiosInstance.patch('/notifications/read-all').catch(() => {});
  };

  const cfg = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.CLAIM_APPROVED_CSV;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Notifications
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const { icon, dot } = cfg(n.type);
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                      !n.isRead ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Type icon */}
                    <div className="shrink-0 mt-0.5">{icon}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-bold text-white leading-tight">
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                        {n.body}
                      </p>
                      {n.metadata?.certificateNo && (
                        <span className="inline-block mt-1 font-mono text-[10px] text-amber-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                          {n.metadata.certificateNo}
                          {n.metadata.creditPoints ? ` · +${n.metadata.creditPoints} pts` : ''}
                        </span>
                      )}
                      <span className="block mt-1 text-[10px] text-slate-600">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                Last {notifications.length} notifications
              </span>
              <button
                type="button"
                onClick={() => {
                  axiosInstance.patch('/notifications/read-all').catch(() => {});
                  setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                  setUnreadCount(0);
                }}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
