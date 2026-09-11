import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { Asset, AssetVersion } from '../types';

interface UploadVersionModalProps {
  assetId: string;
  assetName: string;
  nextVersionNumber: number;
  onClose: () => void;
  onSuccess: (asset: Asset, version: AssetVersion) => void;
}

export const UploadVersionModal: React.FC<UploadVersionModalProps> = ({
  assetId,
  assetName,
  nextVersionNumber,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a revised file');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(20);

      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress(50);
      const res = await api.uploadNewVersion(assetId, formData);
      setUploadProgress(100);

      onSuccess(res.asset, res.version);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Upload Revision (Version {nextVersionNumber})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Asset: <span className="text-indigo-300">{assetName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-300">
            Uploading this revision will create immutable <strong>Version {nextVersionNumber}</strong>. Prior cuts remain accessible in version history.
          </p>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              file
                ? 'border-indigo-500/80 bg-indigo-500/5'
                : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,video/mp4,.jpg,.jpeg,.png,.webp,image/*,.pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center">
                <CheckCircle className="w-10 h-10 text-emerald-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">{file.name}</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Version {nextVersionNumber}
                </span>
                <span className="text-[10px] text-indigo-400 mt-2 hover:underline">Click to change file</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <Upload className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="text-xs font-semibold text-slate-200">Select revised video or media file</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Will be saved into the project's Google Drive folder
                </p>
              </div>
            )}
          </div>

          {/* Progress */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Uploading revision to video infrastructure...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

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
              disabled={isUploading || !file}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : `Upload V${nextVersionNumber}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
