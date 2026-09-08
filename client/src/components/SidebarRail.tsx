import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Search,
  Bell,
  Cloud,
  Volume2,
  HelpCircle,
  Lightbulb,
  LogOut,
} from 'lucide-react';

interface SidebarRailProps {
  currentView: string;
  onNavigate: (view: 'dashboard' | 'project' | 'asset' | 'storage' | 'notifications') => void;
  onSearchClick?: () => void;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({ currentView, onNavigate, onSearchClick }) => {
  const { user, logout } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'SA';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside className="w-14 bg-[#0a0c13] border-r border-[#1a1e2e] flex flex-col items-center justify-between py-3 shrink-0 select-none z-30">
      {/* Top Icons: Home, Search, Bell, Cloud */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Home */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            currentView === 'dashboard'
              ? 'bg-[#1e2338] text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-[#141726]'
          }`}
          title="Home / Projects"
        >
          <Home className="w-5 h-5" />
        </button>

        {/* Search */}
        <button
          onClick={onSearchClick}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#141726] transition-all cursor-pointer"
          title="Search All Projects & Files"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => onNavigate('notifications')}
          className={`p-2 rounded-xl transition-all cursor-pointer relative ${
            currentView === 'notifications'
              ? 'bg-[#1e2338] text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-[#141726]'
          }`}
          title="Notifications & Activity Feed"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        </button>

        {/* Cloud / Jio AI Cloud Vault */}
        <button
          onClick={() => onNavigate('storage')}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            currentView === 'storage'
              ? 'bg-[#1e2338] text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-[#141726]'
          }`}
          title="Jio AI Cloud & All Files Vault"
        >
          <Cloud className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Icons: Volume, Help, User Avatar with Green Indicator */}
      <div className="flex flex-col items-center gap-3 w-full">
        <button
          className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
          title="Sound"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        <button
          className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
          title="Help & Support"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
          title="Feedback"
        >
          <Lightbulb className="w-4 h-4" />
        </button>

        {/* User Avatar with Green Active Dot */}
        <div className="relative group/user mt-1">
          <button
            onClick={logout}
            className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-md cursor-pointer hover:bg-rose-600 transition-colors"
            title={`${user?.fullName} (${user?.role}) - Click to sign out`}
          >
            {getInitials(user?.fullName)}
          </button>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0c13]" />
        </div>
      </div>
    </aside>
  );
};
