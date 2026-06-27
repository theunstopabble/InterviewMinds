import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { schedulingService } from '../services/enterprise';
import { toast } from 'sonner';
import { logger } from "@/lib/logger";

interface Interview {
  id: string;
  scheduledTime: string;
  endTime: string;
  status: string;
  interviewType: string;
  role: string;
  interviewer?: string;
}

function getCurrentTenantId(): string {
  // @ts-expect-error - Clerk organization hook
  return window.Clerk?.organization?.id || 'default';
}

export default function SchedulingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'schedule' | 'upcoming' | 'calendar'>('upcoming');
  const [upcomingInterviews, setUpcomingInterviews] = useState<Interview[]>([]);
  const [rescheduleTarget, setRescheduleTarget] = useState<string | null>(null);
  const [newSlotId, setNewSlotId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [timezones, setTimezones] = useState<any[]>([]);
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string>('default');
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    const orgId = (window as any).Clerk?.organization?.id || getCurrentTenantId();
    setTenantId(orgId);
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar') {
      loadSlots(selectedDate);
    }
  }, [activeTab, selectedDate]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [tzData, userTzData, upcomingData] = await Promise.all([
        schedulingService.getTimezones().catch(() => ({ timezones: [] })),
        schedulingService.getUserTimezone().catch(() => null),
        schedulingService.getUpcoming().catch(() => ({ interviews: [] })),
      ]);
      const tzArray = Array.isArray(tzData) ? tzData : (tzData?.timezones || []);
      setTimezones(tzArray);
      setUpcomingInterviews(upcomingData?.interviews || []);
      const detectedTz = userTzData?.timezone;
      if (detectedTz && tzArray.includes(detectedTz)) {
        setSelectedTimezone(detectedTz);
      } else if (tzArray.length > 0) {
        setSelectedTimezone(tzArray[0] as string);
      }
    } catch (e) {
      logger.error('Error loading data:', e);
    }
    setLoading(false);
  };

  const loadSlots = async (date: Date) => {
    try {
      setLoading(true);
      const dateStr = date.toISOString().split('T')[0];
      const slotsData = await schedulingService.getAvailableSlots(tenantId, dateStr, selectedTimezone);
      setAvailableSlots(slotsData?.slots || []);
    } catch (e) {
      logger.error('Error loading slots:', e);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUpcoming = async () => {
    try {
      const data = await schedulingService.getUpcoming();
      setUpcomingInterviews(data?.interviews || []);
    } catch { /* silently fail - UI shows empty state */ }
  };

  const bookSlot = async (slotId: string, type: 'live' | 'async' | 'take-home') => {
    try {
      const result = await schedulingService.bookSlot(tenantId, slotId, type);
      if (result?.success || result?.interview) {
        toast.success('Interview booked successfully!');
        loadSlots(selectedDate);
        loadUpcoming();
      } else {
        toast.error('Failed to book slot. Please try again.');
      }
    } catch (e: any) {
      logger.error('Error booking slot:', e);
      toast.error(e?.message || 'Failed to book slot');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-400';
      case 'in-progress':
        return 'bg-green-500/20 text-green-400';
      case 'completed':
        return 'bg-gray-500/20 text-gray-400';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'live':
        return '🎥';
      case 'async':
        return '📹';
      case 'take-home':
        return '📝';
      default:
        return '📅';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">📅 Interview Scheduling</h1>
            <p className="text-gray-400 mt-1">Manage your interview schedule</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          {[
            { key: 'upcoming', label: 'Upcoming', icon: '📆' },
            { key: 'schedule', label: 'Book Slot', icon: '🗓️' },
            { key: 'calendar', label: 'Calendar', icon: '📅' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 font-medium transition ${
                activeTab === tab.key
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Upcoming Interviews */}
            {activeTab === 'upcoming' && (
              <div className="space-y-4">
                {upcomingInterviews.length === 0 ? (
                  <div className="bg-gray-800 rounded-xl p-8 text-center">
                    <div className="text-4xl mb-4">📭</div>
                    <h3 className="text-xl font-semibold mb-2">No Upcoming Interviews</h3>
                    <p className="text-gray-400 mb-4">Schedule a new interview to get started</p>
                    <button
                      onClick={() => setActiveTab('schedule')}
                      className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
                    >
                      Book Interview
                    </button>
                  </div>
                ) : (
                  upcomingInterviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="bg-gray-800 rounded-xl p-4 flex items-center justify-between hover:bg-gray-700 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">{getTypeIcon(interview.interviewType)}</div>
                        <div>
                          <h3 className="font-semibold">{interview.role}</h3>
                          <p className="text-gray-400 text-sm">
                            {new Date(interview.scheduledTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(interview.status)}`}>
                          {interview.status}
                        </span>
                        {interview.status === 'scheduled' && (
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => navigate(`/interview?id=${interview.id}`)}
                              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition text-sm"
                            >
                              Join
                            </button>
                            {rescheduleTarget === interview.id ? (
                              <div className="flex gap-2 items-center">
                                <input value={newSlotId} onChange={e => setNewSlotId(e.target.value)} placeholder="New slot ID" className="w-32 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                                <button onClick={async () => {
                                  if (!newSlotId) return;
                                  try {
                                    await schedulingService.reschedule(interview.id, newSlotId);
                                    toast.success('Rescheduled successfully');
                                    setRescheduleTarget(null);
                                    setNewSlotId('');
                                    loadUpcoming();
                                  } catch { toast.error('Reschedule failed'); }
                                }} className="px-2 py-1 bg-emerald-600 rounded text-xs hover:bg-emerald-500">Confirm</button>
                                <button onClick={() => { setRescheduleTarget(null); setNewSlotId(''); }} className="px-2 py-1 bg-slate-700 rounded text-xs hover:bg-slate-600">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setRescheduleTarget(interview.id)} className="px-3 py-2 bg-amber-600/80 rounded-lg hover:bg-amber-600 transition text-sm">
                                Reschedule
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (!confirm('Cancel this interview?')) return;
                                try {
                                  await schedulingService.cancel(interview.id);
                                  toast.success('Cancelled');
                                  loadUpcoming();
                                } catch { toast.error('Cancel failed'); }
                              }}
                              className="px-3 py-2 bg-red-600/80 rounded-lg hover:bg-red-600 transition text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Book Slot */}
            {activeTab === 'schedule' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Select Date & Time</h2>

                  {/* Timezone */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Timezone</label>
                    <select
                      value={selectedTimezone}
                      onChange={(e) => setSelectedTimezone(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    >
                      {timezones.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Picker (Simple) */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Date</label>
                    <input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    />
                  </div>

                  <button
                    onClick={() => loadSlots(selectedDate)}
                    className="w-full px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
                  >
                    Check Available Slots
                  </button>
                </div>

                {/* Available Slots */}
                <div className="bg-gray-800 rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-4">Available Slots</h2>

                  {availableSlots.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No slots available for this date</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => bookSlot(slot.id, (selectedType || 'live') as 'live' | 'async' | 'take-home')}
                          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interview Type Selection */}
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <h3 className="font-medium mb-3">Interview Types</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { type: 'live', label: '🎥 Live', desc: 'Real-time video' },
                        { type: 'async', label: '📹 Async', desc: 'Pre-recorded' },
                        { type: 'take-home', label: '📝 Challenge', desc: 'Take-home test' },
                      ].map((item) => (
                        <button
                          key={item.type}
                          onClick={() => setSelectedType(item.type)}
                          className={`p-3 rounded-lg text-center transition ${
                            selectedType === item.type ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                        >
                          <div className="text-lg mb-1">{item.label}</div>
                          <div className="text-xs text-gray-400">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar View */}
            {activeTab === 'calendar' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{formatDate(selectedDate)}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
                      className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setSelectedDate(new Date())}
                      className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
                      className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
                    >
                      Next →
                    </button>
                  </div>
                </div>

                {availableSlots.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No slots loaded. Check available slots for this date first.</p>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableSlots.map((slot: any, i: number) => (
                    <div
                      key={slot.id || i}
                      onClick={() => slot.available && bookSlot(slot.id, (selectedType || 'live') as 'live' | 'async' | 'take-home')}
                      className={`p-4 rounded-lg border transition cursor-pointer ${
                        slot.available ? 'bg-gray-700 border-gray-600 hover:border-blue-500' : 'bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="font-semibold">
                        {slot.time || new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-sm text-gray-400">{slot.available ? 'Available' : 'Booked'}</div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}