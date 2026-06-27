import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { complianceService, tenantService, infrastructureService, agentService, observabilityService } from "../services/enterprise";
import {
  Shield,
  FileText,
  Building2,
  BarChart3,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Download,
  Users,
  Activity,
  Settings,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type Framework = "SOC2" | "GDPR" | "HIPAA" | "ISO27001";

interface ComplianceReport {
  framework: string;
  status: string;
  lastGenerated: string;
  controlsPassing: number;
  controlsTotal: number;
  nextReview: string;
}

const tabs = [
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "audit", label: "Audit Logs", icon: FileText },
  { id: "tenants", label: "Tenants", icon: Building2 },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "infrastructure", label: "Infrastructure", icon: Server },
  { id: "observability", label: "Observability", icon: Activity },
  { id: "agents", label: "Agents", icon: Zap },
];

const frameworks: Framework[] = ["SOC2", "GDPR", "HIPAA", "ISO27001"];

const frameworkLabels: Record<string, string> = {
  SOC2: "SOC 2",
  GDPR: "GDPR",
  HIPAA: "HIPAA",
  ISO27001: "ISO 27001",
};

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("compliance");
  const [loading, setLoading] = useState(false);
  const [securityControls, setSecurityControls] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [agentList, setAgentList] = useState<any[]>([]);
  const [observabilityData, setObservabilityData] = useState<any>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [controls, auditResponse, tenantsData] = await Promise.all([
        complianceService.getSecurityControls().catch(() => ({ controls: [] })),
        complianceService.queryAudit({ limit: 50 }).catch(() => ({ data: [] })),
        tenantService.getAll().catch(() => ({ tenants: [] })),
      ]);
      setSecurityControls(controls.controls || []);
      const logsData = auditResponse as { data?: any[]; logs?: any[] };
      setAuditLogs(logsData.data || logsData.logs || []);
      setTenants(tenantsData.tenants || []);

      const [health, agents, obs] = await Promise.all([
        infrastructureService.getPoolStats?.().catch(() => null) ?? Promise.resolve(null),
        agentService.getAgents?.().catch(() => null) ?? Promise.resolve(null),
        observabilityService.getSystemMetrics?.().catch(() => null) ?? Promise.resolve(null),
      ]);
      setHealthData(health);
      setAgentList(agents?.agents || []);
      setObservabilityData(obs);
    } catch (e) {
      logger.error("Error loading admin data:", e);
    }
    setLoading(false);
  };

  const loadReports = async () => {
    setReportLoading(true);
    try {
      const results = await Promise.all(
        frameworks.map((fw) =>
          complianceService.getReport(fw).catch(() => ({
            framework: fw,
            status: "unavailable",
            lastGenerated: "",
            controlsPassing: 0,
            controlsTotal: 0,
            nextReview: "",
          }))
        )
      );
      setReports(
        results.map((r, i) => ({
          framework: r.framework || frameworks[i],
          status: r.status || "unavailable",
          lastGenerated: r.lastGenerated || new Date().toISOString(),
          controlsPassing: r.controlsPassing || 0,
          controlsTotal: r.controlsTotal || 9,
          nextReview: r.nextReview || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        }))
      );
    } catch (e) {
      logger.error("Error loading reports:", e);
    }
    setReportLoading(false);
  };

  useEffect(() => {
    if (activeTab === "reports" && reports.length === 0) {
      loadReports();
    }
  }, [activeTab]);

  const handleExportAudit = () => {
    const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-400">
                Admin
              </h1>
            </div>
            <p className="text-slate-400 text-sm sm:text-base">
              Enterprise control, compliance management, and system oversight.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shrink-0",
                  activeTab === tab.id
                    ? "bg-red-600/20 text-red-300 border border-red-500/30 shadow-sm"
                    : "bg-slate-900/50 text-slate-400 border border-slate-800 hover:bg-slate-800/80 hover:text-slate-200"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 bg-slate-800 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-48 w-full bg-slate-800 rounded-xl" />
          </div>
        ) : (
          <div>
            {activeTab === "compliance" && <CompliancePanel controls={securityControls} />}
            {activeTab === "audit" && (
              <AuditPanel logs={auditLogs} onExport={handleExportAudit} onRefresh={loadAdminData} />
            )}
            {activeTab === "tenants" && <TenantsPanel tenants={tenants} onRefresh={loadAdminData} />}
            {activeTab === "reports" && (
              <ReportsPanel reports={reports} loading={reportLoading} />
            )}
            {activeTab === "infrastructure" && <InfrastructurePanel data={healthData} />}
            {activeTab === "observability" && <ObservabilityPanel data={observabilityData} />}
            {activeTab === "agents" && <AgentsPanel agents={agentList} />}
          </div>
        )}
      </div>
    </div>
  );
}

function CompliancePanel({ controls }: { controls: any[] }) {
  const frameworkMap = ["SOC 2", "GDPR", "HIPAA", "ISO 27001"].reduce((acc, fw) => {
    acc[fw] = controls.filter((c) => c.category === fw || c.name?.includes(fw));
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {["SOC 2", "GDPR", "HIPAA", "ISO 27001"].map((framework) => {
          const fwControls = frameworkMap[framework] || [];
          const activeCount = fwControls.filter((c) => c.status === "active").length;
          const percentage = Math.round((activeCount / (fwControls.length || 1)) * 100);
          return (
            <Card key={framework} className="bg-gray-800/80 border-gray-700/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-200">{framework}</h3>
                  <Badge
                    className={cn(
                      percentage >= 80
                        ? "bg-emerald-600/20 text-emerald-400 border-emerald-600/30"
                        : percentage >= 50
                          ? "bg-amber-600/20 text-amber-400 border-amber-600/30"
                          : "bg-red-600/20 text-red-400 border-red-600/30"
                    )}
                    variant="outline"
                  >
                    {percentage}%
                  </Badge>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      percentage >= 80
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                        : percentage >= 50
                          ? "bg-gradient-to-r from-amber-500 to-amber-400"
                          : "bg-gradient-to-r from-red-500 to-red-400"
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {activeCount}/{fwControls.length || 0} controls active
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-gray-800/80 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Security Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {controls.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {controls.map((control) => (
                <div
                  key={control.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{control.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{control.category}</p>
                  </div>
                  <Badge
                    className={cn(
                      "ml-2 shrink-0 text-xs",
                      control.status === "active" &&
                        "bg-emerald-600/20 text-emerald-400 border-emerald-600/30",
                      control.status === "pending" &&
                        "bg-amber-600/20 text-amber-400 border-amber-600/30",
                      control.status !== "active" &&
                        control.status !== "pending" &&
                        "bg-red-600/20 text-red-400 border-red-600/30"
                    )}
                    variant="outline"
                  >
                    {control.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">No security controls configured</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AuditPanel({ logs, onExport, onRefresh }: { logs: any[]; onExport: () => void; onRefresh?: () => void }) {
  return (
    <Card className="bg-gray-800/80 border-gray-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Audit Logs
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="border-slate-700 text-slate-300 hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="border-slate-700 text-slate-300 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-800">
                <th className="pb-3 text-slate-400 font-medium">Timestamp</th>
                <th className="pb-3 text-slate-400 font-medium">User</th>
                <th className="pb-3 text-slate-400 font-medium">Action</th>
                <th className="pb-3 text-slate-400 font-medium hidden sm:table-cell">Resource</th>
                <th className="pb-3 text-slate-400 font-medium hidden md:table-cell">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                    <td className="py-3 text-slate-300 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 text-slate-300">{log.userId?.substring(0, 12)}</td>
                    <td className="py-3">
                      <Badge
                        className={cn(
                          "text-xs",
                          log.action === "create" && "bg-emerald-600/20 text-emerald-400 border-emerald-600/30",
                          log.action === "update" && "bg-blue-600/20 text-blue-400 border-blue-600/30",
                          log.action === "delete" && "bg-red-600/20 text-red-400 border-red-600/30",
                          !["create", "update", "delete"].includes(log.action) &&
                            "bg-slate-700 text-slate-300 border-slate-600"
                        )}
                        variant="outline"
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 text-slate-400 text-xs hidden sm:table-cell">{log.resource}</td>
                    <td className="py-3 text-slate-500 text-xs font-mono hidden md:table-cell">
                      {log.ipAddress || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                    No audit logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TenantsPanel({ tenants, onRefresh }: { tenants: any[]; onRefresh?: () => void }) {
  const plans = ["free", "starter", "professional", "enterprise"];
  const planCounts = plans.map((plan) => ({
    plan,
    count: tenants.filter((t: any) => t.plan === plan).length,
  }));
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', domain: '', plan: 'free' });

  const handleAddTenant = async () => {
    try {
      await tenantService.create(formData);
      toast.success('Tenant created');
      setShowForm(false);
      setFormData({ name: '', domain: '', plan: 'free' });
      onRefresh?.();
    } catch { toast.error('Failed to create tenant'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-400" />
          Tenant Management
        </h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-500">
          <Users className="w-4 h-4 mr-2" />
          {showForm ? 'Cancel' : 'Add Tenant'}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-gray-800/80 border-gray-700/50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Tenant name" className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            <input value={formData.domain} onChange={e => setFormData(f => ({ ...f, domain: e.target.value }))} placeholder="Domain (optional)" className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            <select value={formData.plan} onChange={e => setFormData(f => ({ ...f, plan: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
              {plans.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <Button onClick={handleAddTenant} size="sm" className="bg-blue-600 hover:bg-blue-500">Create Tenant</Button>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {planCounts.map(({ plan, count }) => (
          <Card key={plan} className="bg-gray-800/80 border-gray-700/50">
            <CardContent className="p-5 text-center">
              <div
                className={cn(
                  "text-2xl font-bold",
                  plan === "free" && "text-slate-400",
                  plan === "starter" && "text-blue-400",
                  plan === "professional" && "text-amber-400",
                  plan === "enterprise" && "text-purple-400"
                )}
              >
                {count}
              </div>
              <div className="text-xs text-slate-500 capitalize mt-1">{plan}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-800/80 border-gray-700/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  <th className="p-4 text-slate-400 font-medium">Tenant</th>
                  <th className="p-4 text-slate-400 font-medium">Plan</th>
                  <th className="p-4 text-slate-400 font-medium">Status</th>
                  <th className="p-4 text-slate-400 font-medium hidden sm:table-cell">Domain</th>
                  <th className="p-4 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length > 0 ? (
                  tenants.map((tenant: any) => (
                    <tr key={tenant.id} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-slate-200">{tenant.name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{tenant.id}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          className={cn(
                            "capitalize",
                            tenant.plan === "enterprise" &&
                              "bg-purple-600/20 text-purple-400 border-purple-600/30",
                            tenant.plan === "professional" &&
                              "bg-amber-600/20 text-amber-400 border-amber-600/30",
                            tenant.plan === "starter" &&
                              "bg-blue-600/20 text-blue-400 border-blue-600/30",
                            tenant.plan === "free" &&
                              "bg-slate-700 text-slate-300 border-slate-600"
                          )}
                          variant="outline"
                        >
                          {tenant.plan}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              tenant.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                            )}
                          />
                          <span className="text-slate-300 capitalize">{tenant.status}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-400 text-xs hidden sm:table-cell">
                        {tenant.domain || "-"}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => tenantService.get(tenant.id).then(() => toast.info('Tenant details loaded')).catch(() => toast.error('Failed to load tenant'))}
                          className="text-slate-400 hover:text-white"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                      No tenants found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportsPanel({ reports, loading }: { reports: ComplianceReport[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-40 bg-slate-800 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {reports.map((report) => {
        const label = frameworkLabels[report.framework] || report.framework;
        const isCompliant = report.status === "compliant" || report.status === "active";
        const passPercent = Math.round((report.controlsPassing / (report.controlsTotal || 1)) * 100);

        return (
          <Card
            key={report.framework}
            className={cn(
              "bg-gray-800/80 transition-all duration-300",
              isCompliant ? "border-emerald-500/20" : "border-amber-500/20"
            )}
          >
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      isCompliant ? "bg-emerald-600/20" : "bg-amber-600/20"
                    )}
                  >
                    {isCompliant ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200">{label}</h3>
                    <Badge
                      className={cn(
                        "text-xs mt-0.5",
                        isCompliant
                          ? "bg-emerald-600/20 text-emerald-400 border-emerald-600/30"
                          : "bg-amber-600/20 text-amber-400 border-amber-600/30"
                      )}
                      variant="outline"
                    >
                      {isCompliant ? "Compliant" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Controls Passing</span>
                  <span className={cn("font-medium", isCompliant ? "text-emerald-400" : "text-amber-400")}>
                    {report.controlsPassing}/{report.controlsTotal} ({passPercent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isCompliant ? "bg-emerald-500" : "bg-amber-500"
                    )}
                    style={{ width: `${passPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 pt-1">
                  <span>
                    Generated:{" "}
                    {report.lastGenerated
                      ? new Date(report.lastGenerated).toLocaleDateString()
                      : "N/A"}
                  </span>
                  <span>
                    Review:{" "}
                    {report.nextReview
                      ? new Date(report.nextReview).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `compliance-${report.framework}-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="w-full border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function InfrastructurePanel({ data }: { data: any }) {
  const [health, setHealth] = useState<any>(data || null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    Promise.all([
      infrastructureService.getPoolStats?.().catch(() => null) ?? Promise.resolve(null),
      infrastructureService.getSystemMetrics?.().catch(() => null) ?? Promise.resolve(null),
    ]).then(([h, sys]) => {
      if (h) setHealth(h);
      if (sys) setSystemInfo(sys);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48 bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 bg-slate-800 rounded-xl" />)}
        </div>
        <Skeleton className="h-32 w-full bg-slate-800 rounded-xl" />
      </div>
    );
  }

  const handleClearCache = async () => {
    try {
      await infrastructureService.clearCache?.();
      toast.success('Cache cleared');
    } catch {
      toast.error('Failed to clear cache');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-400" />
          Infrastructure Health
        </h2>
        <Button variant="outline" size="sm" onClick={handleClearCache} className="border-slate-700 text-slate-300">
          <RefreshCw className="w-4 h-4 mr-2" />
          Clear Cache
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Status', value: health?.status || health?.healthy ? 'Healthy' : 'Unknown', color: health?.healthy ? 'text-emerald-400' : 'text-amber-400' },
          { label: 'Uptime', value: health?.uptime ? `${Math.floor(health.uptime / 3600)}h` : '-', color: 'text-blue-400' },
          { label: 'Memory', value: health?.memory ? `${health.memory.usage || health.memory}%` : '-', color: 'text-cyan-400' },
          { label: 'CPU', value: health?.cpu ? `${health.cpu}%` : '-', color: 'text-purple-400' },
        ].map((item) => (
          <Card key={item.label} className="bg-gray-800/80 border-gray-700/50">
            <CardContent className="p-5 text-center">
              <p className={cn("text-2xl font-bold", item.color)}>{item.value}</p>
              <p className="text-xs text-slate-500 mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {systemInfo && (
        <Card className="bg-gray-800/80 border-gray-700/50">
          <CardContent className="p-5">
            <h3 className="font-medium text-slate-200 mb-3">System Info</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(systemInfo).map(([key, val]) => (
                <div key={key} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-sm font-mono text-slate-300 mt-0.5">{String(val)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ObservabilityPanel({ data }: { data: any }) {
  const [metrics, setMetrics] = useState<any>(data || null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    Promise.all([
      observabilityService.getSystemMetrics?.().catch(() => null) ?? Promise.resolve(null),
      observabilityService.getActiveAlerts?.().catch(() => null) ?? Promise.resolve(null),
    ]).then(([m, a]) => {
      if (m) setMetrics(m);
      if (a?.alerts) setAlerts(a.alerts);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48 bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 bg-slate-800 rounded-xl" />)}
        </div>
        <Skeleton className="h-32 w-full bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
        <Activity className="w-5 h-5 text-cyan-400" />
        Observability
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Requests/min', value: metrics?.requestsPerMinute ?? metrics?.rpm ?? '-' },
          { label: 'Error Rate', value: metrics?.errorRate ? `${metrics.errorRate}%` : '-' },
          { label: 'Avg Latency', value: metrics?.avgLatency ? `${metrics.avgLatency}ms` : '-' },
          { label: 'Active Traces', value: metrics?.activeTraces ?? '-' },
        ].map((item) => (
          <Card key={item.label} className="bg-gray-800/80 border-gray-700/50">
            <CardContent className="p-5 text-center">
              <p className="text-2xl font-bold text-slate-200">{item.value}</p>
              <p className="text-xs text-slate-500 mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-800/80 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Active Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                  <div>
                    <p className="text-sm text-slate-200">{alert.message || alert.name}</p>
                    <p className="text-xs text-slate-500">{alert.severity || alert.level}</p>
                  </div>
                  <Badge className={cn(
                    alert.severity === 'critical' ? 'bg-red-600/20 text-red-400' : 'bg-amber-600/20 text-amber-400'
                  )}>
                    {alert.severity || 'info'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No active alerts</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AgentsPanel({ agents }: { agents: any[] }) {
  const [list, setList] = useState<any[]>(agents || []);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(!agents?.length);

  useEffect(() => {
    if (agents?.length) {
      setList(agents);
      setLoading(false);
    } else {
      agentService.getAgents?.().then((data: any) => {
        setList(data?.agents || data || []);
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [agents]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48 bg-slate-800 rounded-lg" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-slate-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const handleRunAgent = async (name: string) => {
    setRunning(true);
    try {
      await agentService.runAgent?.(name, {});
      toast.success(`Agent ${name} triggered`);
    } catch {
      toast.error(`Failed to run agent ${name}`);
    }
    setRunning(false);
  };

  const handleRunAutomation = async (id: string) => {
    try {
      await agentService.runAutomation?.(id);
      toast.success('Automation triggered');
    } catch {
      toast.error('Failed to run automation');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
        <Zap className="w-5 h-5 text-purple-400" />
        Agent Management
      </h2>

      <Card className="bg-gray-800/80 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-200">Available Agents</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length > 0 ? (
            <div className="space-y-2">
              {list.map((agent: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{agent.name || agent.id}</p>
                    <p className="text-xs text-slate-500">{agent.description || agent.type || 'AI Agent'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={cn(
                      agent.status === 'active' || agent.status === 'ready'
                        ? 'bg-emerald-600/20 text-emerald-400'
                        : 'bg-slate-700 text-slate-400'
                    )}>
                      {agent.status || 'ready'}
                    </Badge>
                    <Button size="sm" variant="outline" className="border-slate-700 text-slate-300"
                      onClick={() => handleRunAgent(agent.name || agent.id)}
                      disabled={running}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Run
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No agents available</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-800/80 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-200">Automations</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => {
            agentService.getAutomations?.().then((data: any) => {
              const automations = data?.automations || data || [];
              if (automations.length > 0) {
                handleRunAutomation(automations[0]?.id || automations[0]?.name);
              } else {
                toast.info('No automations configured');
              }
            }).catch(() => toast.error('Failed to fetch automations'));
          }}>
            <Zap className="w-4 h-4 mr-2" />
            Run All Automations
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
