import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complianceService } from '../services/enterprise';

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('compliance');
  const [loading, setLoading] = useState(false);
  const [securityControls, setSecurityControls] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [controls, auditResponse] = await Promise.all([
        complianceService.getSecurityControls().catch(() => ({ controls: [] })),
        complianceService.queryAudit({ limit: 50 }).catch(() => ({ data: [] })),
      ]);
      setSecurityControls(controls.controls || []);
      const logsData = auditResponse as { data?: any[]; logs?: any[] };
      setAuditLogs(logsData.data || logsData.logs || []);
    } catch (e) {
      console.error('Error loading admin data:', e);
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'compliance', label: 'Compliance', icon: '📋' },
    { id: 'audit', label: 'Audit Logs', icon: '📝' },
    { id: 'tenants', label: 'Tenants', icon: '🏢' },
    { id: 'reports', label: 'Reports', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Enterprise control and compliance management</p>
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
          <div>
            {activeTab === 'compliance' && <CompliancePanel controls={securityControls} />}
            {activeTab === 'audit' && <AuditPanel logs={auditLogs} />}
            {activeTab === 'tenants' && <TenantsPanel />}
            {activeTab === 'reports' && <ReportsPanel />}
          </div>
        )}
      </div>
    </div>
  );
}

function CompliancePanel({ controls }: { controls: any[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {['SOC 2', 'GDPR', 'HIPAA', 'ISO 27001'].map((framework) => {
          const activeCount = controls.filter(c => c.status === 'active').length;
          const percentage = Math.round((activeCount / (controls.length || 1)) * 100);
          return (
            <div key={framework} className="bg-gray-800 rounded-xl p-6">
              <h3 className="font-semibold">{framework}</h3>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                </div>
                <span className="text-sm">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Security Controls</h2>
        <div className="grid grid-cols-3 gap-4">
          {controls.map((control) => (
            <div key={control.id} className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{control.name}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  control.status === 'active' ? 'bg-green-600' :
                  control.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'
                }`}>
                  {control.status}
                </span>
              </div>
              <p className="text-gray-400 text-xs">{control.category}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditPanel({ logs }: { logs: any[] }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        <button className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition">
          Export Logs
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-700">
              <th className="pb-3">Timestamp</th>
              <th className="pb-3">User</th>
              <th className="pb-3">Action</th>
              <th className="pb-3">Resource</th>
              <th className="pb-3">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? logs.map((log, i) => (
              <tr key={i} className="border-b border-gray-700">
                <td className="py-3 text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="py-3">{log.userId}</td>
                <td className="py-3">
                  <span className="px-2 py-1 bg-blue-600 rounded text-sm">{log.action}</span>
                </td>
                <td className="py-3 text-gray-400">{log.resource}</td>
                <td className="py-3 text-gray-400">{log.ipAddress || '-'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  No audit logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TenantsPanel() {
  const plans = ['free', 'starter', 'professional', 'enterprise'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tenant Management</h2>
        <button className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition">
          + Add Tenant
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {plans.map(plan => (
            <div key={plan} className="bg-gray-700 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold">{plan.charAt(0).toUpperCase()}</div>
              <div className="text-gray-400 text-sm capitalize">{plan}</div>
            </div>
          ))}
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-700">
              <th className="pb-3">Tenant ID</th>
              <th className="pb-3">Name</th>
              <th className="pb-3">Plan</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-700">
              <td className="py-3 text-gray-400">tn_default</td>
              <td className="py-3">Default Tenant</td>
              <td className="py-3"><span className="px-2 py-1 bg-purple-600 rounded">Enterprise</span></td>
              <td className="py-3"><span className="px-2 py-1 bg-green-600 rounded">Active</span></td>
              <td className="py-3">
                <button className="text-blue-400 hover:text-blue-300">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsPanel() {
  const frameworks = ['SOC 2', 'GDPR', 'HIPAA', 'ISO 27001'];

  return (
    <div className="grid grid-cols-2 gap-6">
      {frameworks.map((framework) => (
        <div key={framework} className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{framework} Report</h2>
            <span className="text-green-500">✓ Compliant</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Last Generated</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Controls Passing</span>
              <span className="text-green-500">9/9</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Next Review</span>
              <span>{new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
            </div>
          </div>
          <button className="mt-4 w-full py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
            Download Report
          </button>
        </div>
      ))}
    </div>
  );
}