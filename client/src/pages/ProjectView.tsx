import React, { useState, useEffect } from 'react';
import { Project, Asset, AssetVersion, ReviewLink } from '../types';
import { api } from '../services/api';
import { UploadAssetModal } from '../components/UploadAssetModal';
import { ActivityFeed } from '../components/ActivityFeed';
import {
  ArrowLeft,
  Upload,
  Clapperboard,
  Image as ImageIcon,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Users,
  HardDrive,
  Activity,
  ChevronRight,
  MessageSquare,
  Link2,
  Copy,
  Check,
  Eye,
  Trash2,
} from 'lucide-react';

interface ProjectViewProps {
  projectId: string;
  onBack: () => void;
  onSelectAsset: (assetId: string) => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ projectId, onBack, onSelectAsset }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [reviewLinks, setReviewLinks] = useState<ReviewLink[]>([]);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assets' | 'activity' | 'links'>('assets');
  const [loading, setLoading] = useState<boolean>(true);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [projData, actData, linksData] = await Promise.all([
        api.getProject(projectId),
        api.getProjectActivity(projectId).catch(() => ({ activities: [] })),
        api.getAllReviewLinks().catch(() => ({ reviewLinks: [] })),
      ]);

      if (projData && projData.project) {
        setProject(projData.project);
        setAssets(projData.assets || []);
      } else {
        setProject({
          id: projectId,
          organization_id: 'org-wedding-studio',
          name: 'Wedding Project',
          client_name: 'Client',
          status: 'active',
          drive_folder_id: `gdrive_${projectId}`,
          created_by: 'usr-director',
          created_at: new Date().toISOString(),
          asset_count: 0,
          total_bytes: 0,
        });
        setAssets([]);
      }

      setActivities(actData?.activities || []);

      // Filter links belonging to this project or its assets
      const currentAssets = projData?.assets || [];
      const pLinks = (linksData?.reviewLinks || []).filter(
        (l: ReviewLink) => l.project_id === projectId || currentAssets.some((a: Asset) => a.id === l.asset_id)
      );
      setReviewLinks(pLinks);
    } catch (err: any) {
      console.error('Failed to load project details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (link: ReviewLink) => {
    const rawToken = link.raw_token_display || link.id;
    const url = `${window.location.origin}/review/${rawToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(link.id);
    setTimeout(() => setCopiedLinkId(null), 2500);
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to revoke this review link?')) return;
    try {
      await api.revokeReviewLink(linkId);
      setReviewLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, revoked_at: new Date().toISOString() } : l))
      );
    } catch (e: any) {
      alert(e.message || 'Failed to revoke link');
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const handleStatusChange = async (newStatus: 'active' | 'completed' | 'archived') => {
    if (!project) return;
    try {
      await api.updateProject(projectId, { status: newStatus });
      setProject({ ...project, status: newStatus });
    } catch (err: any) {
      alert(err.message || 'Failed to update project status');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">Loading project assets & Google Drive folder...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p className="text-sm text-slate-400 mb-4">Project not found or unavailable.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Clapperboard className="w-5 h-5 text-indigo-400" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-emerald-400" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-400" />;
      default:
        return <Clapperboard className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'changes_requested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Changes Requested
          </span>
        );
      case 'ready_for_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" />
            Ready for Review
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Delivered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumbs */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Projects</span>
      </button>

      {/* Project Banner Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Drive Folder: {project.drive_folder_id}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium capitalize">
                {project.status}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{project.name}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Client: <strong className="text-slate-200">{project.client_name}</strong></span>
              <span>•</span>
              <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
            </div>
            {project.description && (
              <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Asset</span>
            </button>

            {/* Status switcher */}
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="active">Status: Active</option>
              <option value="completed">Status: Completed</option>
              <option value="archived">Status: Archived</option>
            </select>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'assets'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span>Assets & Cuts ({assets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'links'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Review Links ({reviewLinks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'activity'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity Audit Log ({activities.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content View */}
      {activeTab === 'assets' ? (
        assets.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
            <Clapperboard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No media assets in this project</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Upload an MP4 cut, image, or PDF schedule to get started.</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
            >
              Upload First Asset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset.id)}
                className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-indigo-500/50 rounded-2xl p-5 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                        {getAssetIcon(asset.asset_type)}
                      </div>
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/40">
                        Cut V{asset.version_number || 1}
                      </span>
                    </div>
                    {getStatusBadge(asset.status)}
                  </div>

                  <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {asset.name}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400 mt-1 line-clamp-1">
                    {asset.download_filename || asset.original_filename || 'media_asset'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px]">
                      {asset.size_bytes ? `${(asset.size_bytes / (1024 * 1024)).toFixed(1)} MB` : ''}
                    </span>
                    {asset.duration_seconds ? (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{asset.duration_seconds}s</span>
                      </>
                    ) : null}
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <MessageSquare className="w-3 h-3 text-slate-500" />
                      <span>{asset.comment_count || 0}</span>
                      {asset.open_comment_count ? (
                        <span className="text-amber-400 font-bold">({asset.open_comment_count} open)</span>
                      ) : null}
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'links' ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-indigo-400" />
            <span>Active Review Links for this Project</span>
          </h3>

          {reviewLinks.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No review links created for this project yet. Open an asset to generate and share client review links.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {reviewLinks.map((link) => {
                const isRevoked = Boolean(link.revoked_at);
                const rawToken = link.raw_token_display || link.id;
                const fullUrl = `${window.location.origin}/review/${rawToken}`;

                return (
                  <div
                    key={link.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-slate-200">
                          {link.asset_name || 'Wedding Media Cut'}
                        </span>
                        {isRevoked ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Revoked
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-indigo-400 truncate max-w-md">
                        {fullUrl}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCopyLink(link)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedLinkId === link.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`/review/${rawToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Room</span>
                      </a>

                      {!isRevoked && (
                        <button
                          onClick={() => handleRevokeLink(link.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                          title="Revoke Link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Project Audit Trail</span>
          </h3>
          <ActivityFeed activities={activities} />
        </div>
      )}

      {/* Upload Asset Modal */}
      {showUploadModal && (
        <UploadAssetModal
          projectId={projectId}
          projectName={project.name}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => fetchProjectData()}
        />
      )}
    </div>
  );
};
