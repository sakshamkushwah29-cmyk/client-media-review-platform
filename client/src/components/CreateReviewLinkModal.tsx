import React, { useState } from 'react';
import { X, Copy, Check, Shield, Download, MessageSquare, CheckCircle, Clock, Eye, Link } from 'lucide-react';
import { api } from '../services/api';
import { ReviewLink } from '../types';

interface CreateReviewLinkModalProps {
  assetId: string;
  assetName: string;
  projectId?: string;
  projectName?: string;
  clientName?: string;
  onClose: () => void;
  onCreated: (newLink: ReviewLink) => void;
}

export const CreateReviewLinkModal: React.FC<CreateReviewLinkModalProps> = ({
  assetId,
  assetName,
  projectId,
  projectName,
  clientName,
  onClose,
  onCreated,
}) => {
  const [canComment, setCanComment] = useState<boolean>(true);
  const [canDownload, setCanDownload] = useState<boolean>(true);
  const [canApprove, setCanApprove] = useState<boolean>(true);
  const [showPreviousVersions, setShowPreviousVersions] = useState<boolean>(true);
  const [passphrase, setPassphrase] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [generatedLink, setGeneratedLink] = useState<{ rawToken: string; shareUrl: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await api.createReviewLink(assetId, {
        projectId,
        assetName,
        projectName,
        clientName,
        canComment,
        canDownload,
        canApprove,
        showPreviousVersions,
        passphrase: passphrase.trim() || undefined,
        expiresAt: expiresAt || undefined,
      });

      const rawToken = res.reviewLink.raw_token_display || (res.reviewLink as any).rawToken || '';
      const rawShare = res.reviewLink.shareUrl || `/review/${rawToken}`;
      const fullUrl = rawShare.startsWith('http')
        ? rawShare
        : `${window.location.origin}${rawShare.startsWith('/') ? '' : '/'}${rawShare}`;

      setGeneratedLink({
        rawToken,
        shareUrl: fullUrl,
      });
      onCreated({
        ...res.reviewLink,
        raw_token_display: rawToken,
        shareUrl: fullUrl,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to create review link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <Link className="w-4 h-4 text-indigo-400" />
              <span>Create Client Review Link</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">For asset: <span className="text-indigo-300 font-medium">{assetName}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {generatedLink ? (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold">Review Link Created Securely!</p>
                <p className="text-[11px] text-emerald-400/80 mt-1">
                  Only the hashed token is stored in the database. Share this one-time link with your client.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 block">Client Review URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink.shareUrl}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-indigo-300 select-all"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Permission Toggles */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Client Permissions
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canComment}
                    onChange={(e) => setCanComment(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200 block">Allow Comments</span>
                    <span className="text-[11px] text-slate-400">Timestamped feedback</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canDownload}
                    onChange={(e) => setCanDownload(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200 block">Allow Download</span>
                    <span className="text-[11px] text-slate-400">Authorized proxy delivery</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canApprove}
                    onChange={(e) => setCanApprove(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200 block">Allow Decisions</span>
                    <span className="text-[11px] text-slate-400">Approve / Request changes</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPreviousVersions}
                    onChange={(e) => setShowPreviousVersions(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200 block">Version History</span>
                    <span className="text-[11px] text-slate-400">Allow viewing past cuts</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Optional Passphrase */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Optional Passphrase</span>
              </label>
              <input
                type="password"
                placeholder="Leave blank for public token access"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Optional Expiration */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Optional Expiration Date</span>
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Generating...' : 'Create Review Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
