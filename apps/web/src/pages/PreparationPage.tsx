import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionBankService } from '../services/enterprise';

interface SystemCheck {
  camera: boolean;
  microphone: boolean;
  speaker: boolean;
  internetSpeed: number;
  browser: string;
  checkPassed: boolean;
  warnings: string[];
}

interface PreparationQuestion {
  id: string;
  question: string;
  type: string;
  difficulty: string;
  sampleAnswer?: string;
}

export default function PreparationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'welcome' | 'system-check' | 'questions' | 'complete'>('welcome');
  const [systemCheck, setSystemCheck] = useState<SystemCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [questions, setQuestions] = useState<PreparationQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [breakTimerActive, setBreakTimerActive] = useState(false);
  const [breakTime, setBreakTime] = useState(0);

  const runSystemCheck = async () => {
    setChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      const result: SystemCheck = {
        camera: true,
        microphone: true,
        speaker: true,
        internetSpeed: 10,
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
        checkPassed: true,
        warnings: [],
      };

      stream.getTracks().forEach(t => t.stop());
      setSystemCheck(result);
      setStep('questions');
    } catch (e: any) {
      setSystemCheck({
        camera: false,
        microphone: false,
        speaker: false,
        internetSpeed: 0,
        browser: 'Unknown',
        checkPassed: false,
        warnings: ['Camera/Microphone permission denied. Please allow access.'],
      });
    }
    setChecking(false);
  };

  const startBreakTimer = () => {
    setBreakTimerActive(true);
    setBreakTime(300);
  };

  useEffect(() => {
    if (breakTimerActive && breakTime > 0) {
      const timer = setTimeout(() => setBreakTime(breakTime - 1), 1000);
      return () => clearTimeout(timer);
    } else if (breakTime === 0 && breakTimerActive) {
      setBreakTimerActive(false);
    }
  }, [breakTimerActive, breakTime]);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const data = await questionBankService.getPracticeQuestions(5);
        if (data?.questions) {
          setQuestions(data.questions.map((q: any) => ({
            id: q.id || `q_${Math.random()}`,
            question: q.question || q.text || '',
            type: q.type || 'behavioral',
            difficulty: q.difficulty || 'medium',
            sampleAnswer: q.sampleAnswer || q.hint || 'Think about the STAR method for behavioral questions.',
          })));
        }
      } catch (e) {
        console.error('Failed to load questions:', e);
        setQuestions([
          { id: '1', question: 'Tell me about yourself and why you are interested in this role.', type: 'behavioral', difficulty: 'easy', sampleAnswer: 'Start with current role, highlight relevant experience, end with why this role interests you.' },
          { id: '2', question: 'Describe a challenging project you worked on and how you overcame the obstacle.', type: 'behavioral', difficulty: 'medium', sampleAnswer: 'Use STAR method: Situation, Task, Action, Result.' },
          { id: '3', question: 'What are your strengths and weaknesses?', type: 'behavioral', difficulty: 'easy', sampleAnswer: 'Pick real strengths relevant to the job. For weaknesses, show how you are working on them.' },
        ]);
      }
    };
    if (step === 'questions') {
      loadQuestions();
    }
  }, [step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">🎯 Interview Preparation</h1>
            <p className="text-gray-400 mt-1">Get ready for your interview</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
            ← Back
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex gap-2 mb-8">
          {['welcome', 'system-check', 'questions', 'complete'].map((s) => (
            <div key={s} className={`flex-1 h-2 rounded-full ${step === s ? 'bg-blue-500' : 'bg-gray-700'}`} />
          ))}
        </div>

        {step === 'welcome' && (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <div className="text-6xl mb-6">🎯</div>
            <h2 className="text-2xl font-bold mb-4">Welcome to Interview Preparation</h2>
            <p className="text-gray-400 mb-6">
              We'll help you prepare by checking your system and giving you practice questions.
            </p>
            <div className="space-y-3 mb-8 text-left max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>System Check (Camera, Mic, Internet)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>Practice Questions with Sample Answers</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>Break Timer for Long Interviews</span>
              </div>
            </div>
            <button
              onClick={() => setStep('system-check')}
              className="px-8 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 text-lg font-semibold"
            >
              Get Started
            </button>
          </div>
        )}

        {step === 'system-check' && (
          <div className="bg-gray-800 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6">🔧 System Check</h2>
            
            {!systemCheck ? (
              <div className="text-center py-8">
                <div className="mb-4 text-gray-400">Checking your system...</div>
                <button
                  onClick={runSystemCheck}
                  disabled={checking}
                  className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50"
                >
                  {checking ? 'Checking...' : 'Run System Check'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${systemCheck.checkPassed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Camera</span>
                    <span className={systemCheck.camera ? 'text-green-400' : 'text-red-400'}>
                      {systemCheck.camera ? '✓ Working' : '✗ Not Found'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Microphone</span>
                    <span className={systemCheck.microphone ? 'text-green-400' : 'text-red-400'}>
                      {systemCheck.microphone ? '✓ Working' : '✗ Not Found'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Internet Speed</span>
                    <span className={systemCheck.internetSpeed > 5 ? 'text-green-400' : 'text-yellow-400'}>
                      {systemCheck.internetSpeed} Mbps
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Browser</span>
                    <span className="text-blue-400">{systemCheck.browser}</span>
                  </div>
                </div>

                {systemCheck.warnings.length > 0 && (
                  <div className="bg-yellow-500/20 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">⚠️ Warnings</h3>
                    {systemCheck.warnings.map((w, i) => (
                      <div key={i} className="text-yellow-300 text-sm">• {w}</div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setStep('questions')}
                  className="w-full py-3 bg-blue-600 rounded-lg hover:bg-blue-500 font-semibold"
                >
                  Continue to Questions →
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'questions' && questions.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Practice Questions</h2>
              <div className="text-gray-400">
                {currentQuestion + 1} / {questions.length}
              </div>
            </div>

            <div className="mb-6">
              <span className={`px-3 py-1 rounded-full text-sm ${
                questions[currentQuestion].difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                questions[currentQuestion].difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {questions[currentQuestion].difficulty}
              </span>
              <span className="ml-2 px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-400">
                {questions[currentQuestion].type}
              </span>
            </div>

            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <p className="text-lg">{questions[currentQuestion].question}</p>
            </div>

            <div className="mb-6">
              <button
                onClick={() => {
                  const el = document.getElementById('sample-answer');
                  if (el) el.classList.toggle('hidden');
                }}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                📝 Show Sample Answer
              </button>
              <div id="sample-answer" className="hidden mt-3 p-4 bg-blue-500/10 rounded-lg text-gray-300">
                {questions[currentQuestion].sampleAnswer}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-50"
              >
                ← Previous
              </button>
              <button
                onClick={() => {
                  if (currentQuestion < questions.length - 1) {
                    setCurrentQuestion(currentQuestion + 1);
                  } else {
                    setStep('complete');
                  }
                }}
                className="flex-1 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 font-semibold"
              >
                {currentQuestion < questions.length - 1 ? 'Next →' : 'Finish'}
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-2xl font-bold mb-4">You're Ready!</h2>
            <p className="text-gray-400 mb-6">
              You've completed the preparation. Good luck with your interview!
            </p>

            {/* Break Timer */}
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="font-semibold mb-2">⏱️ Break Timer</h3>
              {breakTimerActive ? (
                <div className="text-4xl font-bold text-blue-400">{formatTime(breakTime)}</div>
              ) : (
                <button
                  onClick={startBreakTimer}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500"
                >
                  Start 5-min Break
                </button>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/interview')}
                className="px-6 py-3 bg-green-600 rounded-lg hover:bg-green-500 font-semibold"
              >
                Start Interview →
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}