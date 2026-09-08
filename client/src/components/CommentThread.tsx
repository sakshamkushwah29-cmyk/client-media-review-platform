import React, { useState, useEffect } from 'react';
import { Comment } from '../types';
import { formatTimecode } from './VideoPlayer';
import {
  Send,
  Check,
  Smile,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  CornerDownRight,
  User,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface CommentThreadProps {
  comments: Comment[];
  isStaff?: boolean;
  canComment?: boolean;
  currentPlaybackTime: number;
  onSeekToTime?: (timeSeconds: number) => void;
  onAddComment?: (data: { body: string; authorName: string; timeSeconds?: number | null }) => Promise<void>;
  onToggleResolve?: (commentId: string, isResolved: boolean) => Promise<void>;
  currentVersionNumber?: number;
  activeTab?: 'comments' | 'fields';
  onTabChange?: (tab: 'comments' | 'fields') => void;
}

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-amber-600',
    'bg-indigo-600',
    'bg-rose-600',
    'bg-emerald-600',
    'bg-sky-600',
    'bg-purple-600',
    'bg-orange-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date().getTime();
  const past = new Date(dateStr).getTime();
  const diffMs = now - past;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  isStaff = false,
  canComment = true,
  currentPlaybackTime = 0,
  onSeekToTime,
  onAddComment,
  onToggleResolve,
  currentVersionNumber = 1,
  activeTab = 'comments',
  onTabChange,
}) => {
  const [tab, setTab] = useState<'comments' | 'fields'>(activeTab);
  const [commentText, setCommentText] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  const handleTabClick = (t: 'comments' | 'fields') => {
    setTab(t);
    if (onTabChange) onTabChange(t);
  };

  // Filter by search query if any
  const displayedComments = comments.filter((c) => {
    if (!searchQuery.trim()) return true;
    return (
      c.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.author_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !onAddComment) return;

    try {
      setIsSubmitting(true);
      // Automatically marks the exact committed video time when user comments!
      await onAddComment({
        body: commentText.trim(),
        authorName: authorName.trim() || (isStaff ? 'Staff Editor' : 'Client Reviewer'),
        timeSeconds: currentPlaybackTime,
      });
      setCommentText('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTickToggle = async (comment: Comment) => {
    if (!onToggleResolve) return;
    try {
      setResolvingId(comment.id);
      const isCurrentlyDone = comment.status === 'done';
      await onToggleResolve(comment.id, !isCurrentlyDone);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle resolution');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#11131d] border border-[#1e2235] rounded-2xl overflow-hidden shadow-2xl">
      {/* Frame.io Top Navigation Tabs: Comments | Fields */}
      <div className="flex items-center border-b border-[#1d2133] bg-[#0c0e17] px-3 pt-2">
        <button
          onClick={() => handleTabClick('comments')}
          className={`flex-1 pb-2.5 text-xs font-semibold tracking-wide text-center transition-all ${
            tab === 'comments'
              ? 'text-white border-b-2 border-indigo-500 font-bold'
              : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
          }`}
        >
          Comments ({comments.length})
        </button>
        <button
          onClick={() => handleTabClick('fields')}
          className={`flex-1 pb-2.5 text-xs font-semibold tracking-wide text-center transition-all ${
            tab === 'fields'
              ? 'text-white border-b-2 border-indigo-500 font-bold'
              : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
          }`}
        >
          Fields
        </button>
      </div>

      {/* Tab 1: Comments View */}
      {tab === 'comments' ? (
        <>
          {/* Subheader: All Comments & Icons */}
          <div className="px-4 py-2.5 border-b border-[#1b1f2e] bg-[#0f111a] flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">All comments</span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-1 hover:text-white rounded hover:bg-[#1a1e2e] transition-colors"
                title="Search comments"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <button
                className="p-1 hover:text-white rounded hover:bg-[#1a1e2e] transition-colors"
                title="Filter / Sort"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                className="p-1 hover:text-white rounded hover:bg-[#1a1e2e] transition-colors"
                title="Options"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search bar toggle */}
          {showSearch && (
            <div className="px-3 py-2 bg-[#0d0f17] border-b border-[#1b1f2e]">
              <input
                type="text"
                placeholder="Search comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161926] border border-[#23283d] rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          )}

          {/* Comment List (Exact Frame.io Card Layout) */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1a1e2f] p-3 space-y-3">
            {displayedComments.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500 p-4">
                <p className="text-xs font-medium">No comments on this cut yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Pause the video at any frame to leave precise feedback.
                </p>
              </div>
            ) : (
              displayedComments.map((comment, idx) => {
                const initials = getInitials(comment.author_name);
                const avatarBg = getAvatarColor(comment.author_name);
                const hasTimestamp = comment.time_seconds !== null && comment.time_seconds !== undefined;
                const isDone = comment.status === 'done';
                const isResolving = resolvingId === comment.id;

                return (
                  <div
                    key={comment.id}
                    className={`pt-3 first:pt-0 rounded-xl p-3 transition-colors ${
                      isDone ? 'bg-[#121820]/40 opacity-80' : 'bg-[#131622]/60 hover:bg-[#151928]'
                    }`}
                  >
                    {/* Author & Header */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {/* Circular Author Avatar with Initials */}
                        <div
                          className={`w-6 h-6 rounded-full ${avatarBg} text-white font-bold text-[10px] flex items-center justify-center shadow-xs shrink-0`}
                        >
                          {initials}
                        </div>
                        <span className="text-xs font-bold text-slate-200">{comment.author_name}</span>
                        <span className="text-[10px] text-slate-500">{formatRelativeTime(comment.created_at)}</span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Frame.io Yellow Clickable Timestamp Badge */}
                    {hasTimestamp && (
                      <div className="mb-2 pl-8">
                        <button
                          onClick={() => onSeekToTime && onSeekToTime(comment.time_seconds!)}
                          title="Click to seek video to this exact frame"
                          className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold tracking-wider transition-colors cursor-pointer"
                        >
                          {formatTimecode(comment.time_seconds!)}
                        </button>
                      </div>
                    )}

                    {/* Comment Body Text */}
                    <p className="text-xs text-slate-300 pl-8 leading-relaxed whitespace-pre-wrap">
                      {comment.body}
                    </p>

                    {/* Footer Row: Reply & Tick Button (Like Frame.io) */}
                    <div className="flex items-center justify-between pl-8 mt-2.5 pt-1.5 border-t border-[#1b1f2e]/60 text-[11px] text-slate-400">
                      <button
                        onClick={() => setCommentText(`@${comment.author_name} `)}
                        className="hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <CornerDownRight className="w-3 h-3 text-slate-500" />
                        <span>Reply</span>
                      </button>

                      {/* Right action icons: Smile, Options, and TICK BUTTON */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="React"
                          className="p-1 hover:text-white rounded hover:bg-[#1f2438] transition-colors"
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          title="More options"
                          className="p-1 hover:text-white rounded hover:bg-[#1f2438] transition-colors"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {/* TICK BUTTON (Resolve / Complete) */}
                        <button
                          onClick={() => handleTickToggle(comment)}
                          disabled={isResolving}
                          title={isDone ? 'Mark as Open' : 'Mark as Complete (Tick)'}
                          className={`p-1 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-xs'
                              : 'text-slate-500 border-slate-700 hover:text-emerald-400 hover:border-emerald-500/60 hover:bg-[#1c2236]'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Comment Input (Exact Frame.io: Auto Timestamp Badge + Clean Input) */}
          {canComment && (
            <form onSubmit={handleSubmit} className="p-3 bg-[#0d0f17] border-t border-[#1d2133]">
              {/* Optional Author Name field for external client reviewers */}
              <div className="mb-2">
                <input
                  type="text"
                  placeholder={isStaff ? 'Your Name (optional)' : 'Your Name (e.g. Diya Verma)'}
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full bg-[#141724] border border-[#202538] rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Main Input Box with Integrated Active Playhead Timestamp Pill */}
              <div className="relative bg-[#161928] border border-[#242a3d] focus-within:border-indigo-500 rounded-xl p-2 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  {/* Automatic Video Timestamp Pill (Frame.io Yellow Pill) */}
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-[10px] font-bold tracking-wider select-none shrink-0">
                    {formatTimecode(currentPlaybackTime)}
                  </span>
                  <span className="text-[10px] text-slate-500">Live playhead time</span>
                </div>

                <textarea
                  rows={2}
                  placeholder="Leave your comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden resize-none leading-relaxed"
                />

                {/* Bottom Row Icons: Smile, Paper Airplane Send */}
                <div className="flex items-center justify-between pt-1 border-t border-[#1f243a]/50 text-slate-400">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-1 hover:text-white rounded transition-colors"
                      title="Add emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !commentText.trim()}
                    className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center justify-center"
                    title="Send Comment (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          )}
        </>
      ) : (
        /* Tab 2: Fields View (Exact Frame.io Screenshot 3) */
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div className="p-3 bg-[#141724] border border-[#202538] rounded-xl text-xs">
            <span className="text-slate-400 block mb-1">Asset</span>
            <span className="font-semibold text-slate-200">Cut Version {currentVersionNumber}</span>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block mb-2">
              All Fields (1)
            </span>
            <div className="p-3 bg-[#141724] border border-[#202538] rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-300">Status</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800 text-[11px] font-medium">
                In Review
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
