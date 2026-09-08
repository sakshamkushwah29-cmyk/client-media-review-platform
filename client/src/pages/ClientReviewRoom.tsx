import React, { useState, useEffect, useRef } from 'react';
import { ClientReviewData, AssetVersion, Comment } from '../types';
import { api } from '../services/api';
import { VideoPlayer, VideoPlayerRef, Marker } from '../components/VideoPlayer';
import { ImagePreview } from '../components/ImagePreview';
import { PdfPreview } from '../components/PdfPreview';
import { CommentThread } from '../components/CommentThread';
import { ReviewDecisionModal } from '../components/ReviewDecisionModal';
import {
  ChevronLeft,
  Download,
  Lock,
  ShieldAlert,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  SidebarClose,
  SidebarOpen,
  User,
  Sparkles,
} from 'lucide-react';

interface ClientReviewRoomProps {
  token: string;
}

export const ClientReviewRoom: React.FC<ClientReviewRoomProps> = ({ token }) => {
  const [data, setData] = useState<ClientReviewData | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<AssetVersion | null>(null);
  const [passphrase, setPassphrase] = useState<string>('');
  const [passphraseInput, setPassphraseInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // Decision modal
  const [decisionModalType, setDecisionModalType] = useState<'approved' | 'changes_requested' | null>(null);

  // Video player reference & live playback time
  const playerRef = useRef<VideoPlayerRef | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);

  const fetchReview = async (pass?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getClientReview(token, pass);
      setData(res);
      if (res.currentVersion) {
        setSelectedVersion(res.currentVersion);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load review room');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReview();
  }, [token]);

  const handleUnlockWithPassphrase = (e: React.FormEvent) => {
    e.preventDefault();
    setPassphrase(passphraseInput);
    fetchReview(passphraseInput);
  };

  // Add Comment: Automatically attaches current committed playback time and adds marker!
  const handleAddComment = async (commentData: { body: string; authorName: string; timeSeconds?: number | null }) => {
    if (!selectedVersion) return;

    // Use current playback time from player ref or state
    const targetTime = playerRef.current ? playerRef.current.getCurrentTime() : currentPlaybackTime;

    const res = await api.submitClientComment(
      token,
      {
        ...commentData,
        timeSeconds: targetTime,
        versionId: selectedVersion.id,
      },
      passphrase
    );

    // Update local comment list (immediately creates marker on timeline)
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: [...(prev.comments || []), res.comment],
      };
    });
  };

  // Toggle tick button (resolve comment)
  const handleToggleResolve = async (commentId: string, isResolved: boolean) => {
    const newStatus = isResolved ? 'done' : 'open';
    try {
      await api.updateCommentStatus(commentId, newStatus);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: (prev.comments || []).map((c) =>
            c.id === commentId ? { ...c, status: newStatus } : c
          ),
        };
      });
    } catch (e) {
      console.warn('Could not update comment status', e);
    }
  };

  const handleSubmitDecision = async (
    decision: 'approved' | 'changes_requested',
    message: string,
    reviewerName: string
  ) => {
    if (!selectedVersion) return;
    const res = await api.submitClientDecision(
      token,
      {
        decision,
        message,
        reviewerName,
        versionId: selectedVersion.id,
      },
      passphrase
    );

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        asset: prev.asset ? { ...prev.asset, status: res.assetStatus as any } : undefined,
        latestDecision: res.decision,
      };
    });
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#090b11] flex flex-col items-center justify-center p-4 text-slate-400">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Entering Frame-accurate Review Room...</p>
      </div>
    );
  }

  // Access Denied / Expired / Revoked
  if (error) {
    return (
      <div className="h-screen w-screen bg-[#090b11] flex items-center justify-center p-4">
        <div className="bg-[#121520] border border-[#22273b] rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Review Access Restricted</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">{error}</p>
          <div className="p-3 bg-[#0a0c13] rounded-xl border border-[#1b1f2e] text-[11px] text-slate-400">
            Please contact your editor for an updated review link.
          </div>
        </div>
      </div>
    );
  }

  // Passphrase Protection
  if (data?.requiresPassphrase) {
    return (
      <div className="h-screen w-screen bg-[#090b11] flex items-center justify-center p-4">
        <div className="bg-[#121520] border border-[#22273b] rounded-2xl max-w-md w-full p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Passphrase Protected</h2>
            <p className="text-xs text-slate-400 mt-1">
              Review room for <strong className="text-indigo-300">{data.projectName || 'this project'}</strong> requires a passphrase.
            </p>
          </div>

          <form onSubmit={handleUnlockWithPassphrase} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Passphrase</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                className="w-full bg-[#0a0c13] border border-[#22273b] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Unlock Review Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data || !data.asset || !selectedVersion) {
    return (
      <div className="h-screen w-screen bg-[#090b11] flex items-center justify-center p-4 text-slate-400 text-xs">
        No active media asset available for review.
      </div>
    );
  }

  const { project, asset, permissions, versions = [], comments = [] } = data;
  const mediaUrl = api.getClientMediaUrl(token, selectedVersion.id, passphrase);
  const downloadUrl = api.getClientDownloadUrl(token, selectedVersion.id, passphrase);

  // Filter comments for current version
  const versionComments = comments.filter((c) => c.asset_version_id === selectedVersion.id);

  // Markers placed directly on the video timeline
  const videoMarkers: Marker[] = versionComments
    .filter((c) => c.time_seconds !== null && c.time_seconds !== undefined)
    .map((c) => ({
      id: c.id,
      time: c.time_seconds!,
      authorName: c.author_name,
      label: c.body,
      isResolved: c.status === 'done',
    }));

  const isApproved = asset.status === 'approved';
  const isChangesRequested = asset.status === 'changes_requested';

  return (
    <div className="h-screen w-screen bg-[#090b11] text-slate-100 flex flex-col overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Frame.io Top Header Bar */}
      <header className="h-14 bg-[#0e1017] border-b border-[#1b1f2e] px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Back Icon, Avatar, Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => window.history.back()}
            className="p-1 rounded-md hover:bg-[#1a1e2d] text-slate-400 hover:text-white transition-colors"
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
            <User className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
            <span className="text-slate-300 font-medium truncate">{project?.name || 'Media Project'}</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold truncate font-mono">
              {selectedVersion.download_filename || asset.name}
            </span>

            {/* Version Switcher if permitted */}
            {permissions?.showPreviousVersions && versions.length > 1 && (
              <div className="ml-2 flex items-center gap-1 bg-[#141724] border border-[#23283b] rounded-md px-1 py-0.5">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersion(v)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      selectedVersion.id === v.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    V{v.version_number}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Decision & Download Button */}
        <div className="flex items-center gap-3">
          {/* Approval / Change Request Action Buttons */}
          {permissions?.canApprove && (
            <div className="flex items-center gap-1.5">
              {isApproved ? (
                <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approved</span>
                </span>
              ) : isChangesRequested ? (
                <span className="px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Revisions Requested</span>
                </span>
              ) : null}

              <button
                onClick={() => setDecisionModalType('changes_requested')}
                className="px-3 py-1.5 rounded-lg bg-[#181c2b] hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 border border-[#252b40] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Request Changes</span>
              </button>

              <button
                onClick={() => setDecisionModalType('approved')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve Cut</span>
              </button>
            </div>
          )}

          {/* Frame.io Download Pill Button (Purple) */}
          {permissions?.canDownload && (
            <a
              href={downloadUrl}
              download={selectedVersion.download_filename}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          )}

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 rounded-lg hover:bg-[#1a1e2d] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle comment panel"
          >
            {showSidebar ? <SidebarClose className="w-4 h-4" /> : <SidebarOpen className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Review Room Body: Full-Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Maximized Video Player Viewport */}
        <div className="flex-1 flex flex-col p-3 bg-[#0a0c13] overflow-hidden">
          <div className="flex-1 w-full h-full flex flex-col">
            {asset.type === 'video' ? (
              <VideoPlayer
                ref={playerRef}
                src={mediaUrl}
                markers={videoMarkers}
                onTimeUpdate={(t) => setCurrentPlaybackTime(t)}
                onMarkerClick={(t) => {
                  if (playerRef.current) playerRef.current.seekTo(t);
                }}
              />
            ) : asset.type === 'image' ? (
              <ImagePreview src={mediaUrl} alt={asset.name} />
            ) : asset.type === 'pdf' ? (
              <PdfPreview src={mediaUrl} downloadUrl={downloadUrl} filename={selectedVersion.download_filename} />
            ) : (
              <div className="p-12 text-center bg-[#11131c] rounded-2xl border border-slate-800 text-slate-400">
                Unsupported preview format.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Frame.io Style Comments Sidebar */}
        {showSidebar && (
          <div className="w-80 md:w-96 h-full border-l border-[#1b1f2e] bg-[#0e1017] flex flex-col shrink-0">
            <CommentThread
              comments={versionComments}
              isStaff={false}
              canComment={permissions?.canComment ?? true}
              currentPlaybackTime={currentPlaybackTime}
              currentVersionNumber={selectedVersion.version_number}
              onSeekToTime={(t) => {
                if (playerRef.current) {
                  playerRef.current.seekTo(t);
                }
              }}
              onAddComment={handleAddComment}
              onToggleResolve={handleToggleResolve}
            />
          </div>
        )}
      </div>

      {/* Review Decision Modal */}
      {decisionModalType && (
        <ReviewDecisionModal
          type={decisionModalType}
          assetName={asset.name}
          versionNumber={selectedVersion.version_number}
          initialClientName={project?.clientName || ''}
          onClose={() => setDecisionModalType(null)}
          onSubmit={handleSubmitDecision}
        />
      )}
    </div>
  );
};
