import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  score: number;
  stage: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  avatar?: string;
  tags: string[];
  lastActivity: string;
}

const initialCandidates: Candidate[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Frontend Dev', score: 85, stage: 'interview', tags: ['React', 'TypeScript'], lastActivity: '2 hours ago' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Backend Dev', score: 78, stage: 'screening', tags: ['Node', 'Python'], lastActivity: '1 day ago' },
  { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'Full Stack', score: 92, stage: 'offer', tags: ['React', 'Node'], lastActivity: '3 hours ago' },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'Data Scientist', score: 65, stage: 'new', tags: ['Python', 'ML'], lastActivity: 'Just now' },
  { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', role: 'DevOps', score: 45, stage: 'rejected', tags: ['AWS', 'Docker'], lastActivity: '5 days ago' },
];

const stages = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const;

const stageLabels: Record<string, { label: string; color: string }> = {
  new: { label: '📥 New', color: 'bg-blue-500/20' },
  screening: { label: '🔍 Screening', color: 'bg-yellow-500/20' },
  interview: { label: '🎤 Interview', color: 'bg-purple-500/20' },
  offer: { label: '📋 Offer', color: 'bg-orange-500/20' },
  hired: { label: '✅ Hired', color: 'bg-green-500/20' },
  rejected: { label: '❌ Rejected', color: 'bg-red-500/20' },
};

export default function PipelinePage() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [dragCandidate, setDragCandidate] = useState<Candidate | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [filterRole, setFilterRole] = useState<string>('');

  const handleDragStart = (candidate: Candidate) => {
    setDragCandidate(candidate);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stage: string) => {
    if (dragCandidate) {
      setCandidates(prev => prev.map(c => 
        c.id === dragCandidate.id ? { ...c, stage: stage as Candidate['stage'] } : c
      ));
      setDragCandidate(null);
    }
  };

  const filteredCandidates = filterRole 
    ? candidates.filter(c => c.role.includes(filterRole))
    : candidates;

  const getCandidatesByStage = (stage: string) => 
    filteredCandidates.filter(c => c.stage === stage);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">📊 Candidate Pipeline</h1>
            <p className="text-gray-400 mt-1">Track and manage candidates through the hiring process</p>
          </div>
          <div className="flex gap-3">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
            >
              <option value="">All Roles</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Full Stack">Full Stack</option>
              <option value="Data Scientist">Data Scientist</option>
              <option value="DevOps">DevOps</option>
            </select>
            <button
              onClick={() => setViewMode(viewMode === 'board' ? 'list' : 'board')}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              {viewMode === 'board' ? '📋 List View' : '📊 Board View'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          {stages.map(stage => {
            const count = candidates.filter(c => c.stage === stage).length;
            return (
              <div key={stage} className={`p-4 rounded-xl ${stageLabels[stage].color}`}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-gray-400">{stageLabels[stage].label.split(' ')[1]}</div>
              </div>
            );
          })}
        </div>

        {viewMode === 'board' ? (
          /* Kanban Board */
          <div className="grid grid-cols-6 gap-4">
            {stages.map(stage => (
              <div
                key={stage}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage)}
                className="bg-gray-800 rounded-xl p-4 min-h-[500px]"
              >
                <h3 className="font-semibold mb-4 text-sm text-gray-400 uppercase">
                  {stageLabels[stage].label}
                  <span className="ml-2 text-gray-500">({getCandidatesByStage(stage).length})</span>
                </h3>
                <div className="space-y-3">
                  {getCandidatesByStage(stage).map(candidate => (
                    <div
                      key={candidate.id}
                      draggable
                      onDragStart={() => handleDragStart(candidate)}
                      className="bg-gray-700 rounded-lg p-4 cursor-grab hover:bg-gray-600 transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{candidate.name}</span>
                        <span className={`text-lg font-bold ${getScoreColor(candidate.score)}`}>
                          {candidate.score}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mb-2">{candidate.role}</div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {candidate.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">{candidate.lastActivity}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Score</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Stage</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Tags</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map(candidate => (
                  <tr key={candidate.id} className="border-t border-gray-700 hover:bg-gray-750">
                    <td className="px-4 py-3 font-medium">{candidate.name}</td>
                    <td className="px-4 py-3 text-gray-400">{candidate.role}</td>
                    <td className={`px-4 py-3 font-bold ${getScoreColor(candidate.score)}`}>
                      {candidate.score}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-sm ${stageLabels[candidate.stage].color}`}>
                        {stageLabels[candidate.stage].label.split(' ')[1]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {candidate.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{candidate.lastActivity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Candidate Tags Modal (Quick Add) */}
        <div className="mt-8 p-4 bg-gray-800 rounded-xl">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500">
              + Add Candidate
            </button>
            <button className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
              Send Bulk Email
            </button>
            <button className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
              Export to CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}