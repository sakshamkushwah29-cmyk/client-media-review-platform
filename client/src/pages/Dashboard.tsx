import React, { useState, useEffect, useRef } from 'react';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react';
import { Project } from '../types';
import { api } from '../services/api';
import { StorageMeter } from '../components/StorageMeter';
import { useAuth } from '../context/AuthContext';
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  LayoutGrid,
  List,
  ChevronDown,
  Filter,
  ArrowUpDown,
  Clapperboard,
  HardDrive,
  Calendar,
  X,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface DashboardProps {
  onSelectProject: (projectId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectProject }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('active');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // New project form
  const [projectName, setProjectName] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data.projects);
    } catch (err: any) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !clientName.trim()) return;

    try {
      setIsCreating(true);
      const res = await api.createProject({
        name: projectName.trim(),
        clientName: clientName.trim(),
        description: description.trim() || undefined,
      });

      setShowCreateModal(false);
      setProjectName('');
      setClientName('');
      setDescription('');
      await fetchProjects();
      onSelectProject(res.project.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getInitials = (name?: string) => {
    if (!name) return 'SA';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Frame.io Centered Search Bar (Screenshots 4 & 5) */}
      <div className="w-full flex justify-center">
        <div className="relative w-full max-w-xl">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search for status, assignee, keywords, and more"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111420] border border-[#23273c] focus:border-indigo-500 rounded-full pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Frame.io Account Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
            {getInitials(user?.fullName)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {user?.fullName ? `${user.fullName}'s Account` : "Saksham's Account"}
            </h1>
            <p className="text-xs text-slate-400">
              Google Drive Vault • Up to 150 GB Available Capacity
            </p>
          </div>
        </div>

        {/* Right Actions: Members, Clerk User Controls, & + New Project Button */}
        <div className="flex items-center gap-2">
          {/* Clerk Auth Controls */}
          <Show when="signed-in">
            <div className="flex items-center bg-[#141724] border border-[#23283b] rounded-xl px-2 py-1">
              <UserButton showName />
            </div>
          </Show>

          <Show when="signed-out">
            <div className="flex items-center gap-1.5">
              <SignInButton mode="modal">
                <button className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-all cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          </Show>

          <button
            className="p-2 rounded-xl bg-[#141724] border border-[#23283b] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Manage Team"
          >
            <Users className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* 150 GB Google Drive Quota Meter */}
      <StorageMeter />

      {/* Frame.io Subheader Filter & Sorting Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#1b1f2e] pb-3">
        {/* Left: View Mode Toggle & Filter Status */}
        <div className="flex items-center gap-3">
          {/* Grid / List Toggles */}
          <div className="flex items-center bg-[#111420] border border-[#23283b] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-[#21263c] text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-[#21263c] text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filter Status Selector */}
          <div className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs text-slate-300 cursor-pointer focus:outline-hidden"
            >
              <option value="active" className="bg-[#111420]">Filtered by Active Projects</option>
              <option value="completed" className="bg-[#111420]">Filtered by Completed Projects</option>
              <option value="archived" className="bg-[#111420]">Filtered by Archived Projects</option>
              <option value="all" className="bg-[#111420]">Filtered by All Projects</option>
            </select>
          </div>
        </div>

        {/* Right: Sorted by Name */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
          <span>Sorted by Name</span>
        </div>
      </div>

      {/* Projects Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 bg-[#111420] border border-[#202538] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        /* Frame.io Exact Empty State (Screenshot 4) */
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 grid grid-cols-2 gap-1.5 opacity-30 mb-4">
            <div className="bg-slate-600 rounded-md" />
            <div className="bg-slate-600 rounded-md" />
            <div className="bg-slate-600 rounded-md" />
            <div className="bg-slate-600 rounded-md" />
          </div>
          <h3 className="text-sm font-semibold text-slate-300">
            Looks like you don't have any Workspaces or Projects in {user?.fullName || 'Saksham'}'s Account
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Workspaces are where you create and organize your client media projects.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
          >
            Create New Project
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="group bg-[#111420] hover:bg-[#141826] border border-[#202538] hover:border-indigo-500/50 rounded-2xl p-5 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c2133] text-slate-400">
                    Drive: {project.drive_folder_id.slice(0, 16)}...
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                    {project.status}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {project.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Client: <strong className="text-slate-300">{project.client_name}</strong></span>
                </div>

                {project.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                    {project.description}
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-[#1d2235] flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clapperboard className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{project.asset_count || 0} Assets</span>
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[11px]">
                    {((project.total_bytes || 0) / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-[#111420] border border-[#202538] rounded-2xl overflow-hidden divide-y divide-[#1e2338]">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="p-4 flex items-center justify-between hover:bg-[#151928] transition-colors cursor-pointer text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 hover:text-indigo-300">{project.name}</h4>
                  <span className="text-[11px] text-slate-400">Client: {project.client_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 text-slate-400">
                <span className="font-mono text-[11px]">Drive: {project.drive_folder_id.slice(0, 16)}...</span>
                <span className="capitalize px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 text-[11px]">
                  {project.status}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#121522] border border-[#23283b] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#202538] flex items-center justify-between bg-[#0e1019]">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <FolderKanban className="w-4 h-4 text-indigo-400" />
                <span>Create New Project</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scaler After movie - short version"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-[#0a0c13] border border-[#23283b] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Client Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Das"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-[#0a0c13] border border-[#23283b] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Project notes and review guidelines"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0a0c13] border border-[#23283b] rounded-lg p-2.5 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-2">
                <HardDrive className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>Automatically provisions dedicated Google Drive storage folder.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#202538]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Creating Drive Folder...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
