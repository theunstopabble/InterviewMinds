import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complianceService } from '../services/enterprise';

export default function CandidatePortal() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>('');
  const [consents, setConsents] = useState<any[]>([]);
  const [dataRequests, setDataRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user ID from Clerk
    const id = (window as any).Clerk?.user?.id || 'default-user';
    setUserId(id);
    loadUserData(id);
  }, []);

  const loadUserData = async (id: string) => {
    try {
      const [consentsData, requestsData] = await Promise.all([
        complianceService.getConsents(id).catch(() => ({ consents: [] })),
        complianceService.getDataRequests(id).catch(() => ({ requests: [] })),
      ]);
      setConsents(consentsData.consents || []);
      setDataRequests(requestsData.requests || []);
    } catch (e) {
      console.error('Error loading user data:', e);
    }
    setLoading(false);
  };

  const handleConsent = async (consentType: string, granted: boolean) => {
    try {
      await complianceService.recordConsent(userId, consentType, granted, '1.0');
      loadUserData(userId);
    } catch (e) {
      console.error('Error updating consent:', e);
    }
  };

  const requestDataAccess = async (type: 'access' | 'deletion' | 'portability') => {
    try {
      await complianceService.createDataRequest(userId, type);
      loadUserData(userId);
    } catch (e) {
      console.error('Error creating request:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Candidate Portal</h1>
            <p className="text-gray-400 mt-1">Manage your data and privacy</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Consent Management */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Consent Management</h2>
              <div className="space-y-4">
                {[
                  { key: 'gdpr_marketing', label: 'Marketing Communications', description: 'Receive updates about new features and promotions' },
                  { key: 'gdpr_analytics', label: 'Analytics & Improvements', description: 'Help us improve by sharing usage data' },
                  { key: 'gdpr_personalization', label: 'Personalized Experience', description: 'Get personalized interview recommendations' },
                ].map((consent) => {
                  const userConsent = consents.find(c => c.consentType === consent.key);
                  const isGranted = userConsent?.granted ?? false;
                  
                  return (
                    <div key={consent.key} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <h3 className="font-medium">{consent.label}</h3>
                        <p className="text-gray-400 text-sm">{consent.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConsent(consent.key, true)}
                          className={`px-4 py-2 rounded-lg transition ${
                            isGranted ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                        >
                          Allow
                        </button>
                        <button
                          onClick={() => handleConsent(consent.key, false)}
                          className={`px-4 py-2 rounded-lg transition ${
                            !isGranted && userConsent ? 'bg-red-600' : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data Requests */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Your Data Rights (GDPR)</h2>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => requestDataAccess('access')}
                  className="p-4 bg-blue-600 rounded-lg hover:bg-blue-500 transition text-left"
                >
                  <h3 className="font-semibold">📄 Access My Data</h3>
                  <p className="text-sm text-gray-300 mt-1">View all your data</p>
                </button>
                <button
                  onClick={() => requestDataAccess('portability')}
                  className="p-4 bg-purple-600 rounded-lg hover:bg-purple-500 transition text-left"
                >
                  <h3 className="font-semibold">📦 Export Data</h3>
                  <p className="text-sm text-gray-300 mt-1">Download your data</p>
                </button>
                <button
                  onClick={() => requestDataAccess('deletion')}
                  className="p-4 bg-red-600 rounded-lg hover:bg-red-500 transition text-left"
                >
                  <h3 className="font-semibold">🗑️ Delete Data</h3>
                  <p className="text-sm text-gray-300 mt-1">Request data deletion</p>
                </button>
              </div>

              {/* Request Status */}
              {dataRequests.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Your Requests</h3>
                  <div className="space-y-2">
                    {dataRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <div>
                          <span className="capitalize font-medium">{request.type}</span>
                          <span className="text-gray-400 text-sm ml-2">
                            ({new Date(request.createdAt).toLocaleDateString()})
                          </span>
                        </div>
                        <span className={`px-3 py-1 rounded text-sm ${
                          request.status === 'completed' ? 'bg-green-600' :
                          request.status === 'processing' ? 'bg-yellow-600' :
                          'bg-gray-600'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-700 rounded">
                  <div className="text-gray-400">User ID</div>
                  <div className="font-mono">{userId || 'Loading...'}</div>
                </div>
                <div className="p-3 bg-gray-700 rounded">
                  <div className="text-gray-400">Account Status</div>
                  <div className="text-green-500">Active</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}