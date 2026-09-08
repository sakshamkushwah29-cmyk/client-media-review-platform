import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  Search,
  X,
  Clapperboard,
  Image as ImageIcon,
  FileText,
  FolderKanban,
  ChevronRight,
} from 'lucide-react';

interface SearchModalProps {
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  onSelectAsset: (assetId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  onClose,
  onSelectProject,
  onSelectAsset,
}) => {
  const [query, setQuery] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const loadData = async () => {
      try {
        setLoading(true);
        const [projRes, filesRes] = await Promise.all([
          api.getProjects(),
          api.getStorageFiles().catch(() => ({ files: [] })),
        ]);
        setProjects(projRes.projects || []);
        setFiles(filesRes.files || []);
      } catch (e) {
        console.error('Search data load failed', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const cleanQuery = query.toLowerCase().trim();

  const matchedProjects = cleanQuery
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(cleanQuery) ||
          p.client_name.toLowerCase().includes(cleanQuery)
      )
    : projects.slice(0, 4);

  const matchedFiles = cleanQuery
    ? files.filter(
        (f) =>
          f.original_filename.toLowerCase().includes(cleanQuery) ||
          f.asset_name.toLowerCase().includes(cleanQuery) ||
          f.project_name.toLowerCase().includes(cleanQuery)
      )
    : files.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#111420] border border-[#23283b] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Input Header */}
        <div className="p-4 border-b border-[#202538] flex items-center gap-3 bg-[#0d0f17]">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, video cuts, photos, clients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
          {/* Projects Section */}
          {matchedProjects.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Projects ({matchedProjects.length})
              </h4>
              <div className="space-y-1.5">
                {matchedProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                      onClose();
                    }}
                    className="p-3 rounded-xl hover:bg-[#181d2f] border border-transparent hover:border-[#28304a] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-semibold text-xs text-white truncate">{p.name}</h5>
                        <p className="text-[11px] text-slate-400 truncate">Client: {p.client_name}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Files Section */}
          {matchedFiles.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Media Files & Cuts ({matchedFiles.length})
              </h4>
              <div className="space-y-1.5">
                {matchedFiles.map((f) => (
                  <div
                    key={f.version_id}
                    onClick={() => {
                      onSelectAsset(f.asset_id);
                      onClose();
                    }}
                    className="p-3 rounded-xl hover:bg-[#181d2f] border border-transparent hover:border-[#28304a] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        {f.asset_type === 'video' ? (
                          <Clapperboard className="w-4 h-4" />
                        ) : f.asset_type === 'image' ? (
                          <ImageIcon className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <FileText className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-xs text-white truncate">{f.original_filename}</h5>
                          <span className="text-[10px] font-mono px-1 rounded bg-indigo-950 text-indigo-300">
                            V{f.version_number}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          in {f.project_name} • {((f.size_bytes || 0) / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && matchedProjects.length === 0 && matchedFiles.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              No results matching "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
