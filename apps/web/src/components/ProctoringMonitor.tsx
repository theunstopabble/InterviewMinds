import { useState, useEffect } from 'react';
import { proctoringService } from '../services/enterprise';
import { logger } from "@/lib/logger";

interface Violation {
  type: string;
  severity: string;
  timestamp: number;
  description: string;
}

interface Props {
  interviewId: string;
  isActive: boolean;
}

export default function ProctoringMonitor({ interviewId, isActive }: Props) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [monitoring, setMonitoring] = useState(false);

  useEffect(() => {
    if (isActive && !monitoring) {
      startMonitoring();
    } else if (!isActive && monitoring) {
      stopMonitoring();
    }

    return () => {
      if (monitoring) stopMonitoring();
    };
  }, [isActive]);

  const startMonitoring = async () => {
    setMonitoring(true);
    await checkScreenState();
    
    // Poll for results
    const pollInterval = setInterval(async () => {
      try {
        const results = await proctoringService.getResults(interviewId);
        if (results) {
          setMetrics(results.metricsSummary);
          setViolations(prev => [...prev, ...results.violations]);
        }
      } catch (e) {
        logger.error('Proctoring poll error:', e);
      }
    }, 10000);

    window.proctoringInterval = pollInterval;
  };

  const stopMonitoring = () => {
    setMonitoring(false);
    if (window.proctoringInterval) {
      clearInterval(window.proctoringInterval);
    }
  };

  const checkScreenState = async () => {
    try {
      const state = await proctoringService.checkScreen();
      if (state?.screen?.tabSwitches > 0) {
        addViolation({
          type: 'tab_switch',
          severity: 'medium',
          timestamp: Date.now(),
          description: `Tab switch detected (${state.screen.tabSwitches} times)`,
        });
      }
      if (state?.screen?.focusLoss > 0) {
        addViolation({
          type: 'focus_loss',
          severity: 'low',
          timestamp: Date.now(),
          description: 'Window focus lost',
        });
      }
    } catch (e) {
      logger.error('Screen check error:', e);
    }
  };

  const addViolation = (violation: Violation) => {
    setViolations(prev => [violation, ...prev].slice(0, 50));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'text-red-500 bg-red-500/10';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10';
      default:
        return 'text-gray-400 bg-gray-500/10';
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl p-4 shadow-xl z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">🛡️ Proctoring Monitor</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${monitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
          <span className="text-xs text-gray-400">{monitoring ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400">Face Time</div>
            <div className="font-medium">{Math.round(metrics.totalFacePresentTime / 60000)}min</div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400">Eye Contact</div>
            <div className="font-medium">{Math.round(metrics.averageEyeContact)}%</div>
          </div>
        </div>
      )}

      {/* Violations */}
      <div className="max-h-40 overflow-y-auto">
        {violations.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-2">
            No violations detected
          </div>
        ) : (
          <div className="space-y-2">
            {violations.slice(0, 5).map((v, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 p-2 rounded text-xs ${getSeverityColor(v.severity)}`}
              >
                <span>{v.type === 'tab_switch' ? '🔄' : v.type === 'focus_loss' ? '👁️' : '⚠️'}</span>
                <span className="flex-1 truncate">{v.description}</span>
              </div>
            ))}
            {violations.length > 5 && (
              <div className="text-xs text-gray-500 text-center">
                +{violations.length - 5} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Risk Score */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Risk Score</span>
          <span className={`font-bold ${
            violations.filter(v => v.severity === 'critical' || v.severity === 'high').length > 0
              ? 'text-red-500'
              : violations.filter(v => v.severity === 'medium').length > 0
              ? 'text-yellow-500'
              : 'text-green-500'
          }`}>
            {violations.length === 0 ? 'Low' : violations.filter(v => v.severity === 'medium').length > 0 ? 'Medium' : 'High'}
          </span>
        </div>
      </div>
    </div>
  );
}