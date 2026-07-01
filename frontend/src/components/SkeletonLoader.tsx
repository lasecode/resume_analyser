export default function SkeletonLoader() {
  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 animate-pulse text-left">
      
      {/* Left Column (4/12 width on desktop) */}
      <div className="md:col-span-5 space-y-6">
        
        {/* Score Gauge Skeleton */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center space-y-4">
          <div className="w-36 h-36 rounded-full bg-white/5 flex items-center justify-center">
            <div className="w-28 h-28 rounded-full bg-white/5" />
          </div>
          <div className="h-6 w-32 bg-white/10 rounded-full" />
        </div>

        {/* Skills Chart Skeleton */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-4 w-40 bg-white/10 rounded" />
            <div className="h-6 w-24 bg-white/5 rounded-md" />
          </div>
          <div className="space-y-4 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-white/10 rounded" />
                  <div className="h-3 w-10 bg-white/10 rounded" />
                </div>
                <div className="h-2.5 w-full bg-white/5 rounded-full" style={{ width: `${100 - i * 15}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column (7/12 width on desktop) */}
      <div className="md:col-span-7 space-y-6">
        
        {/* Job History Timeline Skeleton */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="h-4 w-48 bg-white/10 rounded" />
          <div className="pl-6 border-l border-white/5 space-y-6 ml-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 relative">
                <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-white/10" />
                <div className="h-4 w-44 bg-white/10 rounded" />
                <div className="h-3.5 w-32 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Experience Mentions Skeleton */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="h-4 w-48 bg-white/10 rounded" />
          <div className="flex flex-wrap gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-24 bg-white/5 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Education Skeleton */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="h-4 w-32 bg-white/10 rounded" />
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 w-full bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}
