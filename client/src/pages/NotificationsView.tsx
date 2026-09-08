import React, { useState, useEffect } from 'react';
import { NotificationItem } from '../types';
import { api } from '../services/api';
import {
  Bell,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Clapperboard,
  Check,
  Clock,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Filter,
} from 'lucide-react';

interface NotificationsViewProps {
  onSelectAsset: (assetId: string) => void;
  onSelectProject: (projectId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onSelectAsset,
  onSelectProject,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'comment' | 'approval' | 'upload'>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const parseMetadata = (metaStr?: string): any => {
    if (!metaStr) return {};
    try {
      return JSON.parse(metaStr);
    } catch {
      return {};
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'comment') return n.event_type.includes('comment');
    if (activeTab === 'approval') return n.event_type === 'approval' || n.event_type === 'changes_requested';
    if (activeTab === 'upload') return n.event_type === 'upload' || n.event_type === 'version_created';
    return true;
  });

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'comment':
        return {
          icon: <MessageSquare className="w-4 h-4 text-indigo-400" />,
          label: 'Feedback Comment',
          color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        };
      case 'approval':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          label: 'Cut Approved',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      case 'changes_requested':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          label: 'Revisions Requested',
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        };
      case 'upload':
      case 'version_created':
        return {
          icon: <Upload className="w-4 h-4 text-blue-400" />,
          label: 'Media Uploaded',
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
      case 'comment_status_change':
        return {
          icon: <Check className="w-4 h-4 text-purple-400" />,
          label: 'Status Updated',
          color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-slate-400" />,
          label: 'Activity',
          color: 'bg-slate-800 text-slate-400 border-slate-700',
        };
    }
  };

  return (
    <div className="flex flex-col space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b1f2e] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-md">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Notifications & Studio Audit</h1>
            <p className="text-xs text-slate-400">
              Live updates for client comments, timecode reviews, approvals, and media cuts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="px-3 py-1.5 rounded-lg bg-[#141724] hover:bg-[#1a1f30] border border-[#23283b] text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 text-slate-400" />
            <span>Mark all read</span>
          </button>

          <button
            onClick={loadNotifications}
            className="p-1.5 rounded-lg bg-[#141724] hover:bg-[#1a1f30] border border-[#23283b] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-[#111420] text-slate-400 hover:text-slate-200 border border-[#202538]'
          }`}
        >
          All Activity ({notifications.length})
        </button>

        <button
          onClick={() => setActiveTab('comment')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'comment'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-[#111420] text-slate-400 hover:text-slate-200 border border-[#202538]'
          }`}
        >
          Comments ({notifications.filter((n) => n.event_type.includes('comment')).length})
        </button>

        <button
          onClick={() => setActiveTab('approval')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'approval'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-[#111420] text-slate-400 hover:text-slate-200 border border-[#202538]'
          }`}
        >
          Approvals ({notifications.filter((n) => n.event_type === 'approval' || n.event_type === 'changes_requested').length})
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-[#111420] text-slate-400 hover:text-slate-200 border border-[#202538]'
          }`}
        >
          Uploads ({notifications.filter((n) => n.event_type === 'upload' || n.event_type === 'version_created').length})
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 bg-[#111420] border border-[#202538] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <Bell className="w-12 h-12 text-slate-600 mb-3 opacity-30" />
          <h3 className="text-sm font-semibold text-slate-300">No activity in this view</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Activity events like comments, review approvals, and cut uploads will appear here in chronological order.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const meta = parseMetadata(notif.metadata);
            const badge = getEventBadge(notif.event_type);
            const isRead = readIds.has(notif.id);

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (notif.target_asset_id) {
                    onSelectAsset(notif.target_asset_id);
                  } else {
                    onSelectProject(notif.project_id);
                  }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isRead
                    ? 'bg-[#0f121d] border-[#1e2338] opacity-80'
                    : 'bg-[#111420] hover:bg-[#141828] border-[#202538] hover:border-indigo-500/40 shadow-sm'
                }`}
              >
                {/* Left: Avatar + Event details */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                    {getInitials(notif.actor_name)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${badge.color}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {notif.actor_name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        in <strong className="text-slate-300">{notif.project_name}</strong>
                      </span>
                      <span className="text-[11px] text-slate-500">•</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(notif.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Content preview */}
                    {meta.commentSnippet && (
                      <p className="text-xs text-slate-300 bg-[#0b0d14] px-3 py-1.5 rounded-lg border border-[#1d2235] font-sans italic inline-block mt-0.5">
                        "{meta.commentSnippet}"
                      </p>
                    )}

                    {meta.timeSeconds !== undefined && meta.timeSeconds !== null && (
                      <span className="ml-2 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 font-mono text-[10px] font-bold text-amber-400">
                        @ {Math.floor(meta.timeSeconds / 60)}:{(meta.timeSeconds % 60).toFixed(0).padStart(2, '0')}
                      </span>
                    )}

                    {meta.message && (
                      <p className="text-xs text-slate-300 mt-1 bg-[#0b0d14] px-3 py-1.5 rounded-lg border border-[#1d2235]">
                        {meta.message}
                      </p>
                    )}

                    {meta.filename && (
                      <p className="text-xs font-mono text-slate-400 mt-1">
                        File: {meta.filename} {meta.sizeBytes ? `(${((meta.sizeBytes) / (1024 * 1024)).toFixed(1)} MB)` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Navigate button */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                    <span>View Cut</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
