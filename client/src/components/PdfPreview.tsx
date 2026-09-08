import React from 'react';
import { FileText, Download } from 'lucide-react';

interface PdfPreviewProps {
  src: string;
  downloadUrl?: string;
  filename?: string;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({ src, downloadUrl, filename = 'document.pdf' }) => {
  return (
    <div className="w-full h-[70vh] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex flex-col">
      <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span className="font-medium">{filename}</span>
        </div>
        {downloadUrl && (
          <a
            href={downloadUrl}
            download={filename}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </a>
        )}
      </div>
      <iframe
        src={`${src}#toolbar=0`}
        title="PDF Preview"
        className="w-full flex-1 bg-slate-900"
      />
    </div>
  );
};
