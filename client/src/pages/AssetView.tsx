import React, { useState, useEffect, useRef } from 'react';
import { Asset, AssetVersion, ReviewLink, Comment } from '../types';
import { api } from '../services/api';
import { VideoPlayer, VideoPlayerRef, Marker } from '../components/VideoPlayer';
import { ImagePreview } from '../components/ImagePreview';
import { PdfPreview } from '../components/PdfPreview';
import { CommentThread } from '../components/CommentThread';
import { CreateReviewLinkModal } from '../components/CreateReviewLinkModal';
import { UploadVersionModal } from '../components/UploadVersionModal';
import { useAuth } from '../context/AuthContext';
import {
  ChevronLeft,
  Share2,
  Upload,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Download,
  SidebarClose,
  SidebarOpen,
} from 'lucide-react';

interface AssetViewProps {
  assetId: string;
  onBack: () => void;
}

export const AssetView: React.FC<AssetViewProps> = ({ assetId, onBack }) => {
  const { user } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<AssetVersion | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviewLinks, setReviewLinks] = useState<ReviewLink[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // Modals
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Video player reference & playback time
  const playerRef = useRef<VideoPlayerRef | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);

  const fetchAssetData = async () => {
    try {
      setLoading(true);
      const data = await api.getAsset(assetId);
      setAsset(data.asset);
      setVersions(data.versions);

      const currVer = data.versions.find((v) => v.id === data.asset.current_version_id) || data.versions[0];
      setSelectedVersion(currVer || null);

      // Fetch review links
      const linksData = await api.getReviewLinks(assetId);
      setReviewLinks(linksData.reviewLinks);

      if (currVer) {
        await fetchComments(currVer.id, linksData.reviewLinks);
      }
    } catch (err: any) {
      console.error('Failed to load asset workspace', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (versionId: string) => {
    try {
      const data = await api.getVersionComments(versionId);
      if (data.comments) {
        setComments(data.comments);
        return;
      }
    } catch (e) {
      console.warn('Could not fetch comments via version API, trying fallback', e);
    }

    try {
      const activeToken = reviewLinks[0]?.raw_token_display;
      if (activeToken) {
        const reviewData = await api.getClientReview(activeToken);
        if (reviewData.comments) {
          const verComments = reviewData.comments.filter((c) => c.asset_version_id === versionId);
          setComments(verComments);
        }
      }
    } catch (e) {
      console.warn('Could not fetch comments via review fallback', e);
    }
  };

  useEffect(() => {
    fetchAssetData();
  }, [assetId]);

  const handleSelectVersion = async (ver: AssetVersion) => {
    setSelectedVersion(ver);
    await fetchComments(ver.id);
  };

  // Toggle tick button (resolve comment)
  const handleToggleResolve = async (commentId: string, isResolved: boolean) => {
    const newStatus = isResolved ? 'done' : 'open';
    try {
      await api.updateCommentStatus(commentId, newStatus);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, status: newStatus } : c))
      );
    } catch (e) {
      console.warn('Failed to update status', e);
    }
  };

  // Add Comment from staff workspace
  const handleAddComment = async (commentData: { body: string; authorName: string; timeSeconds?: number | null }) => {
    if (!selectedVersion) return;
    const targetTime = playerRef.current ? playerRef.current.getCurrentTime() : currentPlaybackTime;

    try {
      const res = await api.addStaffComment(selectedVersion.id, {
        body: commentData.body,
        timeSeconds: targetTime,
        authorName: commentData.authorName || user?.fullName || 'Editor',
      });
      setComments((prev) => [...prev, res.comment]);
    } catch (e) {
      // Fallback to client review link if present
      const activeToken = reviewLinks[0]?.raw_token_display;
      if (activeToken) {
        const res = await api.submitClientComment(activeToken, {
          ...commentData,
          timeSeconds: targetTime,
          versionId: selectedVersion.id,
        });
        setComments((prev) => [...prev, res.comment]);
      }
    }
  };

  // Staff marks asset as Delivered
  const handleMarkDelivered = async () => {
    if (!asset) return;
    try {
      await api.updateAssetStatus(asset.id, 'delivered');
      setAsset({ ...asset, status: 'delivered' });
    } catch (err: any) {
      alert(err.message || 'Failed to update asset status');
    }
  };

  // Revoke review link
  const handleRevokeLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to revoke this review link?')) return;
    try {
      await api.revokeReviewLink(linkId);
      setReviewLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, revoked_at: new Date().toISOString() } : l))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to revoke link');
    }
  };

  const handleCopyLink = (link: ReviewLink) => {
    const url = `${window.location.origin}/review/${link.raw_token_display}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(link.id);
    setTimeout(() => setCopiedLinkId(null), 2500);
  };

  if (loading || !asset || !selectedVersion) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-slate-500">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">Loading media cut and version history...</p>
      </div>
    );
  }

  const mediaUrl = api.getStaffMediaUrl(asset.id, selectedVersion.id);

  // Map comments to video player markers
  const videoMarkers: Marker[] = comments
    .filter((c) => c.time_seconds !== null && c.time_seconds !== undefined)
    .map((c) => ({
      id: c.id,
      time: c.time_seconds!,
      authorName: c.author_name,
      label: c.body,
      isResolved: c.status === 'done',
    }));

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#090b11] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] -m-6">
      {/* Frame.io Top Header Bar */}
      <header className="h-14 bg-[#0e1017] border-b border-[#1b1f2e] px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Back Arrow, Asset Breadcrumb, Version Tabs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-[#1a1e2d] text-slate-400 hover:text-white transition-colors"
            title="Back to project"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
            <span className="text-slate-300 font-medium truncate">{asset.name}</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold truncate font-mono">
              {selectedVersion.download_filename}
            </span>

            {/* Version Switcher Tabs */}
            <div className="ml-2 flex items-center gap-1 bg-[#141724] border border-[#23283b] rounded-md px-1 py-0.5">
              {versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleSelectVersion(v)}
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
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {asset.status === 'approved' && (
            <button
              onClick={handleMarkDelivered}
              className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mark Delivered</span>
            </button>
          )}

          <button
            onClick={() => setShowVersionModal(true)}
            className="px-3 py-1.5 rounded-lg bg-[#141724] hover:bg-[#1a1f30] border border-[#23283b] text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>New Cut (V{(versions[0]?.version_number || 1) + 1})</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Review Link</span>
          </button>

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 rounded-lg hover:bg-[#1a1e2d] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle comment panel"
          >
            {showSidebar ? <SidebarClose className="w-4 h-4" /> : <SidebarOpen className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Workspace: Full-Bleed Video + Frame.io Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Maximized Video Player Viewport */}
        <div className="flex-1 flex flex-col p-3 bg-[#0a0c13] overflow-hidden">
          <div className="flex-1 w-full h-full flex flex-col">
            {asset.asset_type === 'video' ? (
              <VideoPlayer
                ref={playerRef}
                src={mediaUrl}
                markers={videoMarkers}
                onTimeUpdate={(t) => setCurrentPlaybackTime(t)}
                onMarkerClick={(t) => {
                  if (playerRef.current) playerRef.current.seekTo(t);
                }}
              />
            ) : asset.asset_type === 'image' ? (
              <ImagePreview src={mediaUrl} alt={asset.name} />
            ) : asset.asset_type === 'pdf' ? (
              <PdfPreview src={mediaUrl} filename={selectedVersion.download_filename} />
            ) : (
              <div className="p-12 text-center bg-[#11131c] rounded-2xl border border-slate-800 text-slate-400">
                Unsupported preview format.
              </div>
            )}
          </div>
        </div>

        {/* Right: Comments Sidebar */}
        {showSidebar && (
          <div className="w-80 md:w-96 h-full border-l border-[#1b1f2e] bg-[#0e1017] flex flex-col shrink-0">
            <CommentThread
              comments={comments}
              isStaff={true}
              canComment={true}
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

      {/* Share Modal */}
      {showShareModal && (
        <CreateReviewLinkModal
          assetId={asset.id}
          assetName={asset.name}
          onClose={() => setShowShareModal(false)}
          onCreated={(newLink) => {
            setReviewLinks((prev) => [newLink, ...prev]);
          }}
        />
      )}

      {/* Upload Version Modal */}
      {showVersionModal && (
        <UploadVersionModal
          assetId={asset.id}
          assetName={asset.name}
          nextVersionNumber={(versions[0]?.version_number || 1) + 1}
          onClose={() => setShowVersionModal(false)}
          onSuccess={() => fetchAssetData()}
        />
      )}
    </div>
  );
};
