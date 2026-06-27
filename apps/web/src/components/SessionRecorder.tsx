import { useState, useRef, useEffect } from 'react';
import { proctoringService } from '../services/enterprise';
import { logger } from "@/lib/logger";

interface RecordingSession {
  id: string;
  interviewId: string;
  startTime: number;
  endTime?: number;
  duration: number;
  segments: RecordingSegment[];
}

interface RecordingSegment {
  id: string;
  start: number;
  end: number;
  type: 'video' | 'audio' | 'screen' | 'code';
  blobUrl?: string;
  duration: number;
}

interface Props {
  interviewId: string;
  isRecording: boolean;
  onRecordingComplete?: (session: RecordingSession) => void;
}

export default function SessionRecorder({ interviewId, isRecording, onRecordingComplete }: Props) {
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null);
  const [playingSegment, setPlayingSegment] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadSessions();
  }, [interviewId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setCurrentSession(prev => prev ? { ...prev, duration: Date.now() - prev.startTime } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const loadSessions = async () => {
    try {
      const data = await proctoringService.getRecordingSessions(interviewId);
      setSessions(data.sessions || []);
    } catch (e) {
      logger.error('Error loading sessions:', e);
    }
  };

  const startRecording = async () => {
    const session: RecordingSession = {
      id: `session_${Date.now()}`,
      interviewId,
      startTime: Date.now(),
      duration: 0,
      segments: [],
    };
    setCurrentSession(session);
  };

  const stopRecording = async () => {
    if (!currentSession) return;

    const finalSession = {
      ...currentSession,
      endTime: Date.now(),
      duration: Date.now() - currentSession.startTime,
    };

    try {
      await proctoringService.saveRecordingSession(interviewId, finalSession);
      setSessions(prev => [finalSession, ...prev]);
      onRecordingComplete?.(finalSession);
    } catch (e) {
      logger.error('Error saving session:', e);
    }

    setCurrentSession(null);
  };

  const playSegment = async (segment: RecordingSegment) => {
    if (segment.blobUrl) {
      setPlayingSegment(segment.id);
      setIsPaused(false);
      videoRef.current?.play();
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isRecording && currentSession) {
    return (
      <div className="fixed top-20 right-4 bg-red-600/90 backdrop-blur rounded-lg p-4 shadow-xl z-50 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-white rounded-full"></div>
          <div>
            <div className="font-semibold text-white">Recording</div>
            <div className="text-sm text-red-200">{formatDuration(currentSession.duration)}</div>
          </div>
          <button
            onClick={stopRecording}
            className="ml-4 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
          >
            Stop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded-lg font-medium ${
            isRecording
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          {isRecording ? '⏹ Stop Recording' : '⏺ Start Recording'}
        </button>
        <span className="text-gray-400 text-sm">
          {sessions.length} session(s) recorded
        </span>
      </div>

      {/* Sessions List */}
      {sessions.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Past Sessions</h3>
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{formatDate(session.startTime)}</span>
                  <span className="text-gray-400 text-sm">
                    Duration: {formatDuration(session.duration)}
                  </span>
                </div>
                <div className="flex gap-2">
                  {session.segments.map((segment) => (
                    <button
                      key={segment.id}
                      onClick={() => playSegment(segment)}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm flex items-center gap-1"
                    >
                      {segment.type === 'video' && '🎥'}
                      {segment.type === 'audio' && '🎤'}
                      {segment.type === 'screen' && '🖥️'}
                      {segment.type === 'code' && '💻'}
                      {segment.type} ({formatDuration(segment.duration)})
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Player */}
      {playingSegment && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="relative max-w-4xl w-full">
            <video
              ref={videoRef}
              className="w-full rounded-lg"
              onEnded={() => setPlayingSegment(null)}
            />
            <div className="absolute top-4 right-4">
              <button
                onClick={() => {
                  setPlayingSegment(null);
                  videoRef.current?.pause();
                }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg"
              >
                ✕ Close
              </button>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (isPaused) {
                      videoRef.current.play();
                    } else {
                      videoRef.current.pause();
                    }
                    setIsPaused(!isPaused);
                  }
                }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg"
              >
                {isPaused ? '▶ Play' : '⏸ Pause'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}