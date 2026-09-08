import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, X, Send } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReviewDecisionModalProps {
  type: 'approved' | 'changes_requested';
  assetName: string;
  versionNumber: number;
  initialClientName?: string;
  onClose: () => void;
  onSubmit: (decision: 'approved' | 'changes_requested', message: string, reviewerName: string) => Promise<void>;
}

export const ReviewDecisionModal: React.FC<ReviewDecisionModalProps> = ({
  type,
  assetName,
  versionNumber,
  initialClientName = '',
  onClose,
  onSubmit,
}) => {
  const [reviewerName, setReviewerName] = useState<string>(initialClientName);
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isApprove = type === 'approved';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onSubmit(type, message, reviewerName);

      if (isApprove) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      }

      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className={`p-5 border-b border-slate-800 flex items-center justify-between ${isApprove ? 'bg-emerald-950/40' : 'bg-amber-950/40'}`}>
          <div className="flex items-center gap-2.5">
            {isApprove ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                {isApprove ? 'Approve This Version' : 'Request Changes'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {assetName} (Version {versionNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-300">
            {isApprove
              ? 'By approving, you confirm that this version meets your creative vision and is ready for final delivery or export.'
              : 'Submit requested revisions for the editing team. The status will update so editors can begin work on the next cut.'}
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Your Name / Organization</label>
            <input
              type="text"
              required
              placeholder="e.g. Diya Verma"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              {isApprove ? 'Optional Approval Note' : 'Revision Summary / Notes'}
            </label>
            <textarea
              rows={3}
              placeholder={isApprove ? 'e.g. Looks stunning! Can we get high-res exports?' : 'e.g. Please check the 3 timestamped notes regarding color and music timing.'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
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
              className={`px-5 py-2 rounded-lg text-white text-xs font-semibold shadow-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : isApprove ? 'Confirm Approval' : 'Submit Change Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
