import React from 'react';
import { useAuth } from '../context/AuthContext';
import { HardDrive, AlertTriangle, ShieldAlert } from 'lucide-react';

export const StorageMeter: React.FC = () => {
  const { usage } = useAuth();

  if (!usage) return null;

  const { storage, organization } = usage;
  const isWarning = storage.isWarning;
  const isBlocking = storage.isBlocking;

  // Determine bar color
  let barColor = 'bg-indigo-500';
  if (isBlocking) {
    barColor = 'bg-rose-500';
  } else if (isWarning) {
    barColor = 'bg-amber-500';
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Google Drive Vault ({storage.quotaGb} GB Limit)
          </span>
        </div>
        <span className="text-xs font-mono text-slate-400">
          <strong className="text-slate-100">{storage.usedGb} GB</strong> / {storage.quotaGb} GB ({storage.usedPercentage}%)
        </span>
      </div>

      {/* Progress track */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
        <div
          className={`h-full ${barColor} transition-all duration-500 rounded-full`}
          style={{ width: `${Math.min(100, storage.usedPercentage)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>Vault Folder: <code className="text-slate-300 bg-slate-800/80 px-1 py-0.5 rounded text-[10px]">{organization.driveRootFolderId}</code></span>
        <span>Remaining: <strong className="text-slate-200">{storage.remainingGb} GB</strong></span>
      </div>

      {/* Warning at 80% */}
      {isWarning && !isBlocking && (
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            Storage quota warning: Organization is at <strong>{storage.usedPercentage}%</strong> capacity. Consider archiving completed projects.
          </span>
        </div>
      )}

      {/* Blocking Warning at 95% */}
      {isBlocking && (
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
          <span>
            Critical quota alert: Storage is at <strong>{storage.usedPercentage}%</strong>. New uploads will be blocked when reaching 150 GB limit.
          </span>
        </div>
      )}
    </div>
  );
};
