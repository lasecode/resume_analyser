import { useState } from 'react';
import { AlertCircle, FileSpreadsheet, Sparkles, X } from 'lucide-react';
import ApiStatusBadge from './components/ApiStatusBadge';
import UploadZone from './components/UploadZone';
import ScoreGauge from './components/ScoreGauge';
import SkillTags from './components/SkillTags';
import ResultsPanel from './components/ResultsPanel';
import SkeletonLoader from './components/SkeletonLoader';

interface ParseData {
  skills: string[];
  skill_counts: { [skill: string]: number };
  majority_skills: string[];
  education: string[];
  experience: string[];
  job_experiences: string[];
  score: number;
}

// Configures base API url pointing to port 7860 in local dev or same-origin in production (Hugging Face Spaces)
const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:7860' : window.location.origin);

export default function App() {
  const [activeScreen, setActiveScreen] = useState<'upload' | 'results'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParseData | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const triggerError = (msg: string) => {
    setErrorToast(msg);
    // Auto dismiss after 7 seconds
    setTimeout(() => {
      setErrorToast((prev) => (prev === msg ? null : prev));
    }, 7000);
  };

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setParsedData(null);
    setErrorToast(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/parse`, {
        method: 'POST',
        body: formData,
      });

      const resJson = await response.json();

      if (response.ok && resJson.success) {
        setParsedData(resJson.data);
        setActiveScreen('results');
      } else {
        // Retrieve backend FastAPI error shape: { detail: string }
        const errMsg = resJson.detail || 'Failed to analyze resume. Please check the file formatting.';
        triggerError(errMsg);
      }
    } catch (err) {
      console.error('API Error:', err);
      triggerError('Unable to connect to the parsing service. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlSubmit = async (url: string) => {
    setIsLoading(true);
    setParsedData(null);
    setErrorToast(null);

    try {
      const response = await fetch(`${API_URL}/parse-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const resJson = await response.json();

      if (response.ok && resJson.success) {
        setParsedData(resJson.data);
        setActiveScreen('results');
      } else {
        const errMsg = resJson.detail || 'Could not parse resume from the provided link.';
        triggerError(errMsg);
      }
    } catch (err) {
      console.error('API Error:', err);
      triggerError('Unable to connect to the parsing service. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setParsedData(null);
    setActiveScreen('upload');
    setErrorToast(null);
  };

  return (
    <div className="min-h-screen relative flex flex-col font-sans">
      {/* Background glow effects */}
      <div className="bg-glow" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow shadow-indigo-500/25">
            <FileSpreadsheet size={20} />
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-base font-display font-bold tracking-tight text-white m-0 p-0 leading-none">
              Ognite Resume Parser
            </h1>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase mt-0.5">
              Intelligent Resume Analyzer
            </span>
          </div>
        </div>
        <div>
          <ApiStatusBadge apiUrl={API_URL} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 text-center flex flex-col justify-start">
        
        {/* Error Toast Notification */}
        {errorToast && (
          <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-slate-900/95 border border-rose-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-lg flex gap-3.5 items-start justify-between text-left animate-slide-in">
            <div className="flex gap-3">
              <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-bold text-white">Extraction Error</h4>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  {errorToast}
                </p>
              </div>
            </div>
            <button
              onClick={() => setErrorToast(null)}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-colors duration-200"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-8 my-auto">
            <div className="max-w-xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold animate-pulse">
                <Sparkles size={12} className="text-indigo-400" />
                Analyzing Document
              </div>
              <h2 className="text-2xl font-display font-extrabold text-white">
                Reading entities, mapping skills...
              </h2>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                Our parsing model is extracting credentials, experience milestones, and structural details. This takes about 3-5 seconds.
              </p>
            </div>
            <SkeletonLoader />
          </div>
        ) : activeScreen === 'upload' ? (
          <div className="my-auto space-y-8 max-w-2xl mx-auto">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold">
                <Sparkles size={12} className="text-indigo-400" />
                FastAPI + NER Extraction Pipeline
              </div>
              <h2 className="text-4xl font-display font-extrabold tracking-tight text-white sm:text-5xl">
                Parser, Score, and Map <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  Resumes Instantly
                </span>
              </h2>
              <p className="text-gray-400 text-base max-w-md mx-auto">
                Upload your resume (.pdf or .docx) or paste a direct public document link to run structured NER classification.
              </p>
            </div>

            <UploadZone
              onFileSelect={handleFileSelect}
              onUrlSubmit={handleUrlSubmit}
              isLoading={isLoading}
            />
          </div>
        ) : (
          /* Results View Dashboard */
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-6 gap-4">
              <div className="text-left">
                <span className="text-xs text-indigo-400 uppercase tracking-widest font-extrabold">
                  Analysis Report
                </span>
                <h2 className="text-3xl font-display font-extrabold text-white mt-1">
                  Extraction Results
                </h2>
              </div>
              <button
                onClick={handleReset}
                className="py-2.5 px-5 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-md"
              >
                Scan Another File
              </button>
            </div>

            {parsedData && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left Dashboard Column */}
                <div className="md:col-span-5 space-y-6">
                  <ScoreGauge score={parsedData.score} />
                  <SkillTags
                    majoritySkills={parsedData.majority_skills}
                    skillCounts={parsedData.skill_counts}
                  />
                </div>

                {/* Right Dashboard Column */}
                <div className="md:col-span-7">
                  <ResultsPanel
                    experience={parsedData.experience}
                    education={parsedData.education}
                    jobExperiences={parsedData.job_experiences}
                    onReset={handleReset}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-white/5 text-center text-xs text-gray-600 bg-black/10 mt-auto">
        <p>© 2026 Ognite Resume Parser. All rights reserved. Powered by hybrid NLP + NER classifier.</p>
      </footer>
    </div>
  );
}
