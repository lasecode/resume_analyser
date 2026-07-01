import React, { useState, useRef } from 'react';
import { Upload, Link, FileText, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  onUrlSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function UploadZone({ onFileSelect, onUrlSubmit, isLoading }: UploadZoneProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File type checker (FastAPI accepts only .pdf and .docx)
  const validateFile = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setErrorMsg('Invalid file format. Only PDF and DOCX files are supported.');
      return false;
    }
    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File is too large. Maximum size allowed is 10MB.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    setSelectedFile(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputUrl(value);
    
    // Simple validation
    if (value && !/^https?:\/\/.+/i.test(value)) {
      setErrorMsg('Please enter a valid HTTP/HTTPS URL.');
    } else {
      setErrorMsg(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (activeTab === 'file' && selectedFile) {
      onFileSelect(selectedFile);
    } else if (activeTab === 'url' && inputUrl) {
      // Basic check
      if (!/^https?:\/\/.+/i.test(inputUrl)) {
        setErrorMsg('Please enter a valid HTTP/HTTPS URL.');
        return;
      }
      onUrlSubmit(inputUrl);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isSubmitDisabled = 
    isLoading || 
    (activeTab === 'file' && !selectedFile) || 
    (activeTab === 'url' && (!inputUrl || !!errorMsg));

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Tab Selectors */}
      <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
        <button
          type="button"
          onClick={() => { setActiveTab('file'); setErrorMsg(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
            activeTab === 'file' 
              ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 shadow-md' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Upload size={16} />
          Upload Document
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('url'); setErrorMsg(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
            activeTab === 'url' 
              ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 shadow-md' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Link size={16} />
          Import URL
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === 'file' ? (
          /* Drag and Drop Zone */
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={!selectedFile ? triggerFileInput : undefined}
            className={`relative flex flex-col items-center justify-center w-full min-h-[260px] p-6 rounded-2xl border-2 border-dashed transition-all duration-300 glass-panel cursor-pointer ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' 
                : selectedFile 
                  ? 'border-emerald-500/40 bg-emerald-500/5 cursor-default' 
                  : 'border-white/15 hover:border-indigo-500/40 hover:bg-white/[0.02]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              className="hidden"
            />

            {!selectedFile ? (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-white/5 border border-white/10 text-indigo-400 transition-transform duration-300 group-hover:scale-110">
                  <Upload size={32} className="animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-200">
                    Drag & drop your resume
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    or <span className="text-indigo-400 font-medium hover:underline">browse file</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-white/5 w-full justify-center">
                  <span className="px-2 py-0.5 rounded bg-white/5">PDF</span>
                  <span className="px-2 py-0.5 rounded bg-white/5">DOCX</span>
                  <span>Max size: 10MB</span>
                </div>
              </div>
            ) : (
              /* Selected File Details */
              <div className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <FileText size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-200 truncate pr-4">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatFileSize(selectedFile.size)} • Verified Format
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all duration-200"
                  title="Remove file"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* URL Input Zone */
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4 text-left">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-2">
              <Link size={18} />
              <label htmlFor="resume-url" className="text-sm uppercase tracking-wider text-gray-400">
                Paste Resume Direct URL
              </label>
            </div>
            <div className="relative">
              <input
                id="resume-url"
                type="url"
                placeholder="https://example.com/resumes/john-doe.pdf"
                value={inputUrl}
                onChange={handleUrlChange}
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 text-sm"
              />
            </div>
            <div className="flex items-start gap-2.5 text-xs text-gray-500 bg-white/[0.02] p-3 rounded-lg border border-white/5">
              <ShieldCheck size={14} className="text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Make sure the URL is public and leads directly to a PDF or DOCX file. Private links (e.g. standard Google Drive folders) are not readable by the API.
              </span>
            </div>
          </div>
        )}

        {/* Local Validation Error Banner */}
        {errorMsg && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 text-rose-300 text-sm text-left animate-fade-in">
            <AlertTriangle size={18} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Action */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10 ${
            isSubmitDisabled 
              ? 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed shadow-none' 
              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:brightness-110 active:scale-[0.99] border-t border-white/20'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Parsing Resume...
            </>
          ) : (
            'Analyze Resume'
          )}
        </button>
      </form>
    </div>
  );
}
