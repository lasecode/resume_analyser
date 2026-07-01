import { useEffect, useState } from 'react';

interface ScoreGaugeProps {
  score: number;
}

export default function ScoreGauge({ score }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    // Animate score from 0 to actual value on mount
    const duration = 1200; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(ease * score));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  // Determine colors based on score
  let strokeColor = 'stroke-rose-500';
  let textColor = 'text-rose-400';
  let bgColor = 'bg-rose-500/5';
  let borderColor = 'border-rose-500/10';
  let scoreLabel = 'Needs Improvement';

  if (score >= 70) {
    strokeColor = 'stroke-emerald-500';
    textColor = 'text-emerald-400';
    bgColor = 'bg-emerald-500/5';
    borderColor = 'border-emerald-500/10';
    scoreLabel = 'Excellent Candidate';
  } else if (score >= 40) {
    strokeColor = 'stroke-amber-500';
    textColor = 'text-amber-400';
    bgColor = 'bg-amber-500/5';
    borderColor = 'border-amber-500/10';
    scoreLabel = 'Solid Match';
  }

  // Circular gauge math
  const radius = 70;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // Calculate dashoffset (circumference = 439.82)
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border ${borderColor} ${bgColor} backdrop-blur-md transition-all duration-500`}>
      <div className="relative flex items-center justify-center w-48 h-48">
        
        {/* Glow behind the circle */}
        <div className={`absolute w-36 h-36 rounded-full blur-xl opacity-20 transition-all duration-500 ${
          score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
        }`} />

        <svg className="w-full h-full transform -rotate-90">
          {/* Track Circle */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            className="stroke-white/5"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Value Circle */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            className={`gauge-circle transition-all duration-300 ${strokeColor}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Score Labels */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="font-display text-5xl font-extrabold tracking-tight text-white flex items-baseline">
            {animatedScore}
            <span className="text-xl text-gray-500 font-semibold">%</span>
          </span>
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-1">
            Overall Score
          </span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <span className={`text-sm font-semibold px-3 py-1 rounded-full border border-white/5 bg-white/5 ${textColor}`}>
          {scoreLabel}
        </span>
      </div>
    </div>
  );
}
