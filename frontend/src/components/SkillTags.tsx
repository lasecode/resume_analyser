import { useState, useMemo } from 'react';
import { Award, BarChart3, SortAsc, TrendingDown } from 'lucide-react';

interface SkillTagsProps {
  majoritySkills: string[];
  skillCounts: { [skill: string]: number };
}

export default function SkillTags({ majoritySkills, skillCounts }: SkillTagsProps) {
  const [sortBy, setSortBy] = useState<'frequency' | 'alphabetical'>('frequency');

  // Convert skillCounts to array
  const skillsList = useMemo(() => {
    const list = Object.entries(skillCounts).map(([name, count]) => ({
      name,
      count
    }));
    return list;
  }, [skillCounts]);

  const maxCount = useMemo(() => {
    if (skillsList.length === 0) return 1;
    return Math.max(...skillsList.map(s => s.count));
  }, [skillsList]);

  const sortedSkills = useMemo(() => {
    const list = [...skillsList];
    if (sortBy === 'frequency') {
      return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    } else {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [skillsList, sortBy]);

  if (skillsList.length === 0) {
    return (
      <div className="glass-panel p-6 rounded-2xl text-center border border-white/5">
        <p className="text-gray-400 text-sm">No skills detected in this resume.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Skills Section */}
      {majoritySkills && majoritySkills.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl text-left border border-white/5 space-y-4">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold">
            <Award size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Primary Competencies (Top {majoritySkills.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {majoritySkills.map((skill, index) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/25 text-indigo-200 shadow-sm"
              >
                <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                <span className="capitalize">{skill}</span>
                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md ml-1">
                  #{index + 1}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skills Frequency Map */}
      <div className="glass-panel p-6 rounded-2xl text-left border border-white/5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-indigo-300">
            <BarChart3 size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Extracted Skills & Frequency
            </h3>
          </div>
          
          {/* Sorting Buttons */}
          <div className="flex p-0.5 rounded-lg bg-white/5 border border-white/10 self-start sm:self-auto">
            <button
              onClick={() => setSortBy('frequency')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all duration-300 ${
                sortBy === 'frequency'
                  ? 'bg-indigo-500/25 text-indigo-300 font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <TrendingDown size={12} />
              Frequency
            </button>
            <button
              onClick={() => setSortBy('alphabetical')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all duration-300 ${
                sortBy === 'alphabetical'
                  ? 'bg-indigo-500/25 text-indigo-300 font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <SortAsc size={12} />
              Alphabetical
            </button>
          </div>
        </div>

        {/* Skills Chart */}
        <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
          {sortedSkills.map((skill) => {
            const percentage = (skill.count / maxCount) * 100;
            return (
              <div key={skill.name} className="space-y-1.5 group">
                <div className="flex justify-between text-xs font-medium">
                  <span className="capitalize text-gray-300 group-hover:text-white transition-colors duration-200">
                    {skill.name}
                  </span>
                  <span className="text-indigo-400 font-semibold bg-indigo-500/5 px-2 py-0.5 rounded">
                    {skill.count} {skill.count === 1 ? 'mention' : 'mentions'}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
