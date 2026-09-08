import React, { useState, useRef } from 'react';
import { Upload, X, FileVideo, Image as ImageIcon, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { Asset, AssetVersion } from '../types';

interface UploadAssetModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSuccess: (asset: Asset, version: AssetVersion) => void;
}

export const UploadAssetModal: React.FC<UploadAssetModalProps> = ({
  projectId,
  projectName,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [assetName, setAssetName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!assetName) {
        // Strip extension
        const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, '');
        setAssetName(nameWithoutExt);
      }
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      setFile(dropped);
      if (!assetName) {
        const nameWithoutExt = dropped.name.replace(/\.[^/.]+$/, '');
        setAssetName(nameWithoutExt);
      }
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(15);

      const formData = new FormData();
      formData.append('file', file);
      if (assetName) formData.append('name', assetName.trim());

      setUploadProgress(40);
      const res = await api.uploadAsset(projectId, formData);
      setUploadProgress(100);

      onSuccess(res.asset, res.currentVersion);
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
              <span>Upload New Asset</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Project: <span className="text-indigo-300">{projectName}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Unknown Type'}
                </span>
                <span className="text-[10px] text-indigo-400 mt-2 hover:underline">Click to change file</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <Upload className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="text-xs font-semibold text-slate-200">Drag & drop media file, or browse</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: MP4 Video, JPG, PNG, PDF (Up to 10 GB)
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Asset Display Name</label>
            <input
              type="text"
              placeholder="e.g. Wedding Cinematic Highlight Teaser"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Uploading to Google Drive vault...</span>
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
              {isUploading ? 'Uploading...' : 'Upload & Start Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
