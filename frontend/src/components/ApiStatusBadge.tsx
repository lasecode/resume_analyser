import { useEffect, useState } from 'react';

interface HealthResponse {
  status: 'ok' | 'error';
  model_loaded: boolean;
  version: string;
}

interface ApiStatusBadgeProps {
  apiUrl: string;
}

export default function ApiStatusBadge({ apiUrl }: ApiStatusBadgeProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (!res.ok) throw new Error('Unhealthy');
      const data: HealthResponse = await res.json();
      setHealth(data);
      setError(false);
    } catch (err) {
      console.error('Health check failed:', err);
      setHealth(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Poll every 15 seconds
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  let statusColor = 'bg-gray-500';
  let pulseClass = '';
  let statusText = 'Checking API...';

  if (loading && !health) {
    statusText = 'Connecting...';
    statusColor = 'bg-amber-500';
    pulseClass = 'animate-pulse';
  } else if (error || !health) {
    statusText = 'API Offline';
    statusColor = 'bg-red-500';
    pulseClass = 'pulse-red';
  } else if (health.status === 'ok') {
    if (health.model_loaded) {
      statusText = 'API Online';
      statusColor = 'bg-emerald-500';
      pulseClass = 'pulse-green';
    } else {
      statusText = 'Model Loading';
      statusColor = 'bg-amber-500 animate-bounce';
    }
  } else {
    statusText = 'API Error';
    statusColor = 'bg-red-500';
    pulseClass = 'pulse-red';
  }

  return (
    <div 
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/5 backdrop-blur-md text-xs font-medium text-gray-300 shadow-sm transition-all duration-300"
      title={health ? `Version: ${health.version} | Model Loaded: ${health.model_loaded}` : 'No connection details'}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor === 'bg-emerald-500' ? 'bg-emerald-400' : statusColor === 'bg-red-500' ? 'bg-red-400' : 'bg-amber-400'}`}></span>
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColor} ${pulseClass}`}></span>
      </span>
      <span>{statusText}</span>
      {health && (
        <span className="text-[10px] text-gray-500 border-l border-white/10 pl-1.5">
          v{health.version}
        </span>
      )}
    </div>
  );
}
