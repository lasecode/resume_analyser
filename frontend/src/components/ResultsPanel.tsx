import { Briefcase, GraduationCap, Clock, RefreshCw, ChevronRight } from 'lucide-react';

interface ResultsPanelProps {
  experience: string[];
  education: string[];
  jobExperiences: string[];
  onReset: () => void;
}

export default function ResultsPanel({ experience, education, jobExperiences, onReset }: ResultsPanelProps) {
  
  return (
    <div className="space-y-6">
      
      {/* Job History Timeline */}
      <div className="glass-panel p-6 rounded-2xl text-left border border-white/5 space-y-5">
        <div className="flex items-center gap-2 text-indigo-300">
          <Briefcase size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Work Experience Timeline
          </h3>
        </div>

        {jobExperiences && jobExperiences.length > 0 ? (
          <div className="relative pl-6 border-l border-white/10 space-y-6 py-2 ml-3">
            {jobExperiences.map((job, index) => {
              // Parse job title vs company if available "Title at Company"
              const parts = job.split(/\s+at\s+/i);
              const title = parts[0] || job;
              const company = parts[1] || null;

              return (
                <div key={index} className="relative group">
                  {/* Timeline Dot */}
                  <span className="absolute -left-[31px] top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-indigo-500/50 bg-[#090a0f] text-[9px] text-indigo-300 font-bold group-hover:border-purple-500 transition-all duration-300 shadow shadow-indigo-500/20">
                    {index + 1}
                  </span>
                  
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors duration-200">
                      {title}
                    </h4>
                    {company && (
                      <p className="text-xs text-indigo-400 font-medium">
                        {company}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-white/[0.01] border border-white/5 text-center text-gray-400 text-sm">
            No job experiences or positions detected.
          </div>
        )}
      </div>

      {/* Experience Summary */}
      <div className="glass-panel p-6 rounded-2xl text-left border border-white/5 space-y-4">
        <div className="flex items-center gap-2 text-indigo-300">
          <Clock size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Tenure & Experience Mentions
          </h3>
        </div>

        {experience && experience.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {experience.map((exp, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-gray-300"
              >
                {exp}
              </span>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-white/[0.01] border border-white/5 text-center text-gray-400 text-sm">
            No specific tenure or experience length phrases matched (e.g. "5 years").
          </div>
        )}
      </div>

      {/* Education */}
      <div className="glass-panel p-6 rounded-2xl text-left border border-white/5 space-y-4">
        <div className="flex items-center gap-2 text-indigo-300">
          <GraduationCap size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Education History
          </h3>
        </div>

        {education && education.length > 0 ? (
          <div className="space-y-3">
            {education.map((edu, index) => (
              <div 
                key={index} 
                className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-gray-300 text-sm"
              >
                <ChevronRight size={14} className="text-indigo-400 shrink-0 mt-1" />
                <span>{edu}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-white/[0.01] border border-white/5 text-center text-gray-400 text-sm">
            No academic degrees or education mentions matched.
          </div>
        )}
      </div>

      {/* Reset Action */}
      <div className="pt-4 flex justify-center">
        <button
          onClick={onReset}
          className="flex items-center gap-2 py-3.5 px-6 rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 active:scale-[0.98] transition-all duration-200 text-sm font-semibold shadow-md cursor-pointer"
        >
          <RefreshCw size={16} />
          Analyze Another Resume
        </button>
      </div>
    </div>
  );
}
