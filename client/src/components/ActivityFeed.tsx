import React from 'react';
import { ActivityEvent } from '../types';
import { Upload, MessageSquare, CheckCircle, AlertTriangle, Download, Link, RefreshCw } from 'lucide-react';

interface ActivityFeedProps {
  activities: ActivityEvent[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  if (activities.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        No recorded project activity yet.
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'upload':
      case 'version_created':
        return <Upload className="w-4 h-4 text-indigo-400" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-sky-400" />;
      case 'comment_status_change':
        return <RefreshCw className="w-4 h-4 text-amber-400" />;
      case 'approval':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'changes_requested':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'download':
        return <Download className="w-4 h-4 text-teal-400" />;
      case 'review_link_created':
      case 'review_link_revoked':
        return <Link className="w-4 h-4 text-purple-400" />;
      default:
        return <Upload className="w-4 h-4 text-slate-400" />;
    }
  };

  const getEventDescription = (event: ActivityEvent) => {
    let meta: any = {};
    try {
      if (event.metadata) meta = JSON.parse(event.metadata);
    } catch (e) {}

    switch (event.event_type) {
      case 'upload':
        return meta.action === 'project_created'
          ? `Created project with Drive folder ${meta.driveFolderId}`
          : `Uploaded asset "${meta.assetName}" (Version ${meta.version || 1})`;
      case 'version_created':
        return `Uploaded revision Cut V${meta.versionNumber} (${meta.originalFilename})`;
      case 'comment':
        return `Left feedback: "${meta.commentSnippet || ''}"${meta.timeSeconds !== null ? ` at ${meta.timeSeconds}s` : ''}`;
      case 'comment_status_change':
        return `Changed feedback status from "${meta.previousStatus}" to "${meta.newStatus}"`;
      case 'approval':
        return `Approved version with note: "${meta.message || 'No note'}"`;
      case 'changes_requested':
        return `Requested revisions: "${meta.message || 'No note'}"`;
      case 'download':
        return `Downloaded file "${meta.filename}" (${(meta.sizeBytes / 1e6).toFixed(1)} MB)`;
      case 'review_link_created':
        return `Generated client review link`;
      case 'review_link_revoked':
        return `Revoked client review link`;
      case 'asset_delivered':
        return `Marked asset "${meta.assetName}" as Delivered`;
      default:
        return event.event_type;
    }
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((event, idx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {idx !== activities.length - 1 ? (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-800" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3 items-start">
                <div className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center ring-4 ring-slate-950">
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{event.actor_name}</span>
                    <span className="text-[11px] text-slate-500">{new Date(event.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {getEventDescription(event)}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
