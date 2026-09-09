import React, { useState, useEffect } from 'react';
import { StorageFile, OrganizationUsage, ReviewLink } from '../types';
import { api } from '../services/api';
import {
  Cloud,
  HardDrive,
  ExternalLink,
  Copy,
  Check,
  Search,
  Filter,
  ArrowUpDown,
  Clapperboard,
  Image as ImageIcon,
  FileText,
  Download,
  Play,
  Share2,
  FolderKanban,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Link2,
  Eye,
  Trash2,
} from 'lucide-react';

interface StorageViewProps {
  onSelectAsset: (assetId: string) => void;
}

export const StorageView: React.FC<StorageViewProps> = ({ onSelectAsset }) => {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [reviewLinks, setReviewLinks] = useState<ReviewLink[]>([]);
  const [cloudStorageUrl, setCloudStorageUrl] = useState<string>(
    'https://www.jioaicloud.com/l/?u=g4hmxUTO-wgVwF-fLP9Bx-cyfJyX-vprhmiygn1LPJ50buo7GG7VSBbwMbOf04FwhIb'
  );
  const [usage, setUsage] = useState<OrganizationUsage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'video' | 'image' | 'pdf'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size' | 'name'>('newest');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [filesRes, usageRes, linksRes] = await Promise.all([
        api.getStorageFiles(),
        api.getStorageUsage().catch(() => null),
        api.getAllReviewLinks().catch(() => ({ reviewLinks: [] })),
      ]);
      setFiles(filesRes.files || []);
      setReviewLinks(linksRes?.reviewLinks || []);
      if (filesRes.cloudStorageUrl) {
        setCloudStorageUrl(filesRes.cloudStorageUrl);
      }
      if (usageRes) {
        setUsage(usageRes);
      }
    } catch (e) {
      console.error('Failed to load storage files', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeLink = async (linkId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to revoke this review link? Clients using it will immediately lose access.')) return;
    try {
      await api.revokeReviewLink(linkId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke link');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCloudUrl = () => {
    navigator.clipboard.writeText(cloudStorageUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyReviewLink = (file: StorageFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!file.review_token) return;
    const url = `${window.location.origin}/review/${file.review_token}`;
    navigator.clipboard.writeText(url);
    setCopiedTokenId(file.version_id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  // Distinct projects for filter dropdown
  const uniqueProjects = Array.from(
    new Set(files.map((f) => JSON.stringify({ id: f.project_id, name: f.project_name })))
  ).map((str) => JSON.parse(str));

  // Filter and sort files
  const filteredFiles = files
    .filter((f) => {
      const matchesSearch =
        f.original_filename.toLowerCase().includes(search.toLowerCase()) ||
        f.asset_name.toLowerCase().includes(search.toLowerCase()) ||
        f.project_name.toLowerCase().includes(search.toLowerCase()) ||
        f.client_name.toLowerCase().includes(search.toLowerCase());

      const matchesFormat = formatFilter === 'all' || f.asset_type === formatFilter;
      const matchesProject = projectFilter === 'all' || f.project_id === projectFilter;

      return matchesSearch && matchesFormat && matchesProject;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'size') {
        return (b.size_bytes || 0) - (a.size_bytes || 0);
      }
      return a.original_filename.localeCompare(b.original_filename);
    });

  const totalBytes = files.reduce((acc, f) => acc + (f.size_bytes || 0), 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

  const getFormatIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Clapperboard className="w-5 h-5 text-indigo-400" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-emerald-400" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-400" />;
      default:
        return <HardDrive className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'changes_requested':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Revisions
          </span>
        );
      case 'ready_for_review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" />
            Ready for Review
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="w-3 h-3" />
            Delivered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Top Search Bar */}
      <div className="w-full flex justify-center">
        <div className="relative w-full max-w-xl">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search all files, formats, cuts, projects, and clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111420] border border-[#23273c] focus:border-indigo-500 rounded-full pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Jio AI Cloud Prominent Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-purple-950/50 border border-indigo-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold tracking-wide uppercase border border-blue-500/30">
                  Active Cloud Storage
                </span>
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Synced & Connected
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Jio AI Cloud • Wedding Media Vault
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                All high-resolution video masters, client cuts, photo albums, and review assets are automatically persisted and streamed from your primary Jio AI Cloud repository.
              </p>
              <div className="mt-2 text-[11px] font-mono text-indigo-300 truncate max-w-xl bg-[#0a0c13]/70 px-3 py-1 rounded-lg border border-indigo-500/20">
                {cloudStorageUrl}
              </div>
            </div>
          </div>

          {/* Banner Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleCopyCloudUrl}
              className="px-3.5 py-2 rounded-xl bg-[#141726] hover:bg-[#1d2238] border border-indigo-500/30 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy Cloud Link</span>
                </>
              )}
            </button>

            <a
              href={cloudStorageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in Jio AI Cloud</span>
            </a>
          </div>
        </div>
      </div>

      {/* Storage Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-[#111420] border border-[#202538] rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1">Total Files</span>
          <span className="text-xl font-bold text-white">{files.length}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Across all projects</span>
        </div>

        <div className="bg-[#111420] border border-[#202538] rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1">Total Storage</span>
          <span className="text-xl font-bold text-indigo-400">{totalMb} MB</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">150 GB Quota capacity</span>
        </div>

        <div className="bg-[#111420] border border-[#202538] rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1">Active Projects</span>
          <span className="text-xl font-bold text-emerald-400">{uniqueProjects.length}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Organized workspaces</span>
        </div>

        <div className="bg-[#111420] border border-[#202538] rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
            <Link2 className="w-3 h-3 text-amber-400" />
            <span>Active Review Links</span>
          </span>
          <span className="text-xl font-bold text-amber-400">{reviewLinks.filter((l) => !l.revoked_at).length}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Shared review rooms</span>
        </div>

        <div className="bg-[#111420] border border-[#202538] rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1">Primary Cloud</span>
          <span className="text-sm font-bold text-blue-400 truncate block">Jio AI Cloud</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">High speed direct sync</span>
        </div>
      </div>

      {/* Subheader Filter & Sorting Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 border-b border-[#1b1f2e] pb-3">
        {/* Format tabs & project selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Format pills */}
          <div className="flex items-center bg-[#111420] border border-[#23283b] rounded-lg p-0.5">
            <button
              onClick={() => setFormatFilter('all')}
              className={`px-3 py-1 rounded-md transition-all text-xs font-medium cursor-pointer ${
                formatFilter === 'all' ? 'bg-[#21263c] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({files.length})
            </button>
            <button
              onClick={() => setFormatFilter('video')}
              className={`px-3 py-1 rounded-md transition-all text-xs font-medium cursor-pointer ${
                formatFilter === 'video' ? 'bg-[#21263c] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Videos ({files.filter((f) => f.asset_type === 'video').length})
            </button>
            <button
              onClick={() => setFormatFilter('image')}
              className={`px-3 py-1 rounded-md transition-all text-xs font-medium cursor-pointer ${
                formatFilter === 'image' ? 'bg-[#21263c] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Photos ({files.filter((f) => f.asset_type === 'image').length})
            </button>
            <button
              onClick={() => setFormatFilter('pdf')}
              className={`px-3 py-1 rounded-md transition-all text-xs font-medium cursor-pointer ${
                formatFilter === 'pdf' ? 'bg-[#21263c] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              PDFs ({files.filter((f) => f.asset_type === 'pdf').length})
            </button>
          </div>

          {/* Project dropdown filter */}
          <div className="flex items-center gap-1 bg-[#111420] border border-[#23283b] rounded-lg px-2 py-1">
            <FolderKanban className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 cursor-pointer focus:outline-hidden"
            >
              <option value="all" className="bg-[#111420]">All Projects</option>
              {uniqueProjects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#111420]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Sort controls & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-slate-300 cursor-pointer focus:outline-hidden"
            >
              <option value="newest" className="bg-[#111420]">Newest First</option>
              <option value="oldest" className="bg-[#111420]">Oldest First</option>
              <option value="size" className="bg-[#111420]">File Size</option>
              <option value="name" className="bg-[#111420]">File Name</option>
            </select>
          </div>

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1c2030] transition-colors cursor-pointer"
            title="Refresh Files"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Files Table / List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-16 bg-[#111420] border border-[#202538] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <HardDrive className="w-12 h-12 text-slate-600 mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-slate-300">No media files found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {search || formatFilter !== 'all' || projectFilter !== 'all'
              ? 'Try adjusting your filters or search keywords.'
              : 'Files uploaded to projects will appear here in your unified storage vault.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#111420] border border-[#202538] rounded-2xl overflow-hidden divide-y divide-[#1e2338]">
          {filteredFiles.map((file) => {
            const matchedLink = reviewLinks.find(
              (l) => l.asset_id === file.asset_id || l.raw_token_display === file.review_token
            );
            const activeToken = matchedLink?.raw_token_display || file.review_token;
            const isRevoked = Boolean(matchedLink?.revoked_at);
            const isExpired = Boolean(matchedLink?.expires_at && new Date(matchedLink.expires_at) < new Date());

            return (
              <div
                key={file.version_id}
                onClick={() => onSelectAsset(file.asset_id)}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#141828] transition-colors cursor-pointer group"
              >
                {/* Left: Icon & File Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#0c0e15] border border-[#21263c] flex items-center justify-center shrink-0 group-hover:border-indigo-500/50 transition-colors">
                    {getFormatIcon(file.asset_type)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                        {file.original_filename}
                      </h4>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-800/40 text-indigo-300">
                        V{file.version_number}
                      </span>
                      {getStatusBadge(file.asset_status)}

                      {/* Review Link Active Status Badge (PRD LINK-01, LINK-08) */}
                      {activeToken ? (
                        isRevoked ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Revoked Link
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Expired Link
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Active Review Link</span>
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/60 text-slate-500 border border-slate-700/40">
                          No Share Link
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                      <span className="text-slate-300 font-medium">{file.project_name}</span>
                      <span>•</span>
                      <span>Client: <strong className="text-slate-400 font-normal">{file.client_name}</strong></span>
                      <span>•</span>
                      <span className="font-mono text-[11px]">
                        {((file.size_bytes || 0) / (1024 * 1024)).toFixed(1)} MB
                      </span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
                  {activeToken && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/review/${activeToken}`;
                          navigator.clipboard.writeText(url);
                          setCopiedTokenId(file.version_id);
                          setTimeout(() => setCopiedTokenId(null), 2500);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#141724] hover:bg-[#1c2235] border border-[#23283b] text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                        title="Copy Client Review Link"
                      >
                        {copiedTokenId === file.version_id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold text-[11px]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[11px]">Copy Link</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`/review/${activeToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Open Client Review Room"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Preview</span>
                      </a>

                      {!isRevoked && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevokeLink(matchedLink?.id || activeToken, e);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                          title="Revoke Review Link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => onSelectAsset(file.asset_id)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Open Player</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
