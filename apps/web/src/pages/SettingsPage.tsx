import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { biometricService, ssoService, encryptionService, geoFencingService } from '../services/enterprise';

function getCurrentUserId(): string {
  return (window as any).Clerk?.user?.id || 'default-user';
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('security');
  const [loading, setLoading] = useState(false);

  const [biometricStatus, setBiometricStatus] = useState<any>(null);
  const [ssoConfig, setSsoConfig] = useState<any>(null);
  const [encryptionStatus, setEncryptionStatus] = useState<any>(null);
  const [geoConfig, setGeoConfig] = useState<any>(null);

  useEffect(() => {
    const uid = (window as any).Clerk?.user?.id || getCurrentUserId();
    loadSettings(uid);
  }, []);

  const loadSettings = async (uid: string) => {
    setLoading(true);
    try {
      const [bio, sso, enc, geo] = await Promise.all([
        biometricService.getSettings().catch(() => null),
        ssoService.getConfig().catch(() => null),
        encryptionService.getKeys(uid).catch(() => null),
        geoFencingService.getConfig().catch(() => null),
      ]);
      setBiometricStatus(bio);
      setSsoConfig(sso);
      setEncryptionStatus(enc);
      setGeoConfig(geo);
    } catch (e) {
      console.error('Error loading settings:', e);
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'biometric', label: 'Biometric Auth', icon: '👤' },
    { id: 'sso', label: 'SSO Integration', icon: '🔗' },
    { id: 'geo', label: 'Geo-Fencing', icon: '🌍' },
    { id: 'encryption', label: 'E2E Encryption', icon: '🔐' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Enterprise Settings</h1>
            <p className="text-gray-400 mt-1">Configure security and enterprise features</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-700 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-6">
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'biometric' && <BiometricSettings status={biometricStatus} />}
            {activeTab === 'sso' && <SSOSettings config={ssoConfig} />}
            {activeTab === 'geo' && <GeoSettings config={geoConfig} />}
            {activeTab === 'encryption' && <EncryptionSettings status={encryptionStatus} />}
          </div>
        )}
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Security Configuration</h2>
      <div className="grid gap-4">
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Rate Limiting</h3>
          <p className="text-gray-400 text-sm">Configure API rate limits per user</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-green-500">● Active</span>
            <span className="text-gray-400">Default: 200 req/15min</span>
          </div>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium mb-2">RBAC (Role-Based Access Control)</h3>
          <p className="text-gray-400 text-sm">4 roles: admin, manager, interviewer, candidate</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-green-500">● Enabled</span>
          </div>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Circuit Breakers</h3>
          <p className="text-gray-400 text-sm">Protect against API failures</p>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="text-green-500">● Groq</span>
            <span className="text-green-500">● Gemini</span>
            <span className="text-green-500">● Azure</span>
            <span className="text-green-500">● Piston</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BiometricSettings({ status }: { status: any }) {
  const [enrolling, setEnrolling] = useState(false);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Biometric Authentication</h2>
      <div className="grid gap-4">
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Status</h3>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${status?.enabled ? 'bg-green-500' : 'bg-gray-500'}`}></span>
            <span>{status?.enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Enrolled Types</h3>
          <div className="flex gap-3">
            {['face', 'voice', 'fingerprint'].map((type) => (
              <span
                key={type}
                className={`px-3 py-1 rounded-full text-sm ${
                  status?.enrolledTypes?.includes(type)
                    ? 'bg-green-600'
                    : 'bg-gray-600'
                }`}
              >
                {type}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Liveness Detection</h3>
          <p className="text-gray-400 text-sm">Prevent spoofing attacks</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-green-500">● {status?.livenessDetection ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        {enrolling ? (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-400">Enrollment flow started. Follow the on-screen instructions.</p>
            <button onClick={() => setEnrolling(false)} className="mt-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          </div>
        ) : (
        <button
          onClick={() => setEnrolling(true)}
          className="mt-4 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
        >
          + Enroll New Biometric
        </button>
        )}
      </div>
    </div>
  );
}

function SSOSettings({ config }: { config: any }) {
  const providers = ['okta', 'azure-ad', 'google-workspace', 'custom'];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">SSO Integration</h2>
      <div className="grid gap-4">
        {providers.map((provider) => (
          <div key={provider} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">
            <div>
              <h3 className="font-medium capitalize">{provider.replace('-', ' ')}</h3>
              <p className="text-gray-400 text-sm">
                {config?.provider === provider ? 'Connected' : 'Not configured'}
              </p>
            </div>
            <button
              className={`px-4 py-2 rounded-lg ${
                config?.provider === provider
                  ? 'bg-green-600'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
            >
              {config?.provider === provider ? 'Configured' : 'Setup'}
            </button>
          </div>
        ))}
        <div className="bg-gray-700 p-4 rounded-lg mt-4">
          <h3 className="font-medium mb-2">Attribute Mapping</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span>Email: {config?.attributeMapping?.email || 'email'}</span>
            <span>First Name: {config?.attributeMapping?.firstName || 'given_name'}</span>
            <span>Last Name: {config?.attributeMapping?.lastName || 'family_name'}</span>
            <span>Department: {config?.attributeMapping?.department || 'department'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GeoSettings({ config }: { config: any }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Geo-Fencing Configuration</h2>
      <div className="grid gap-4">
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Allowed Countries</h3>
          <div className="flex flex-wrap gap-2">
            {config?.allowedCountries?.length > 0
              ? config.allowedCountries.map((c: string) => (
                  <span key={c} className="px-2 py-1 bg-blue-600 rounded text-sm">{c}</span>
                ))
              : <span className="text-gray-400">All countries allowed</span>
            }
          </div>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Blocked Countries</h3>
          <div className="flex flex-wrap gap-2">
            {config?.blockedCountries?.length > 0
              ? config.blockedCountries.map((c: string) => (
                  <span key={c} className="px-2 py-1 bg-red-600 rounded text-sm">{c}</span>
                ))
              : <span className="text-gray-400">No countries blocked</span>
            }
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className={`text-2xl font-bold ${config?.vpnDetection ? 'text-green-500' : 'text-gray-500'}`}>
              {config?.vpnDetection ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-400">VPN Detection</div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className={`text-2xl font-bold ${config?.proxyDetection ? 'text-green-500' : 'text-gray-500'}`}>
              {config?.proxyDetection ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-400">Proxy Detection</div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className={`text-2xl font-bold ${config?.datacenterIPBlock ? 'text-green-500' : 'text-gray-500'}`}>
              {config?.datacenterIPBlock ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-400">Datacenter Block</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EncryptionSettings({ status }: { status: any }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">End-to-End Encryption</h2>
      <div className="grid gap-4">
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Key Pair Status</h3>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${status?.publicKey ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            <span>{status?.publicKey ? 'Active' : 'Not Generated'}</span>
          </div>
          {status?.fingerprint && (
            <p className="text-gray-400 text-sm mt-2">Fingerprint: {status.fingerprint}</p>
          )}
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Encryption Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span>Key Type: RSA 4096-bit</span>
            <span>Symmetric: AES-256-GCM</span>
            <span>Key Derivation: PBKDF2</span>
            <span>Iterations: 100,000</span>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <button className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition">
            Generate New Keys
          </button>
          <button className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500 transition">
            Rotate Keys
          </button>
        </div>
      </div>
    </div>
  );
}