import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Settings,
  Shield,
  Fingerprint,
  Link2,
  Globe,
  Lock,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Key,
  Eye,
  Activity,
  Server,
  Users,
  AlertTriangle,
  MessageSquare,
  Video,
} from "lucide-react";
import { biometricService, ssoService, encryptionService, geoFencingService, webhookService, atsService, integrationService } from "../services/enterprise";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function getCurrentUserId(): string {
  return (window as any).Clerk?.user?.id || "default-user";
}

const tabs = [
  { id: "security", label: "Security", icon: Shield },
  { id: "biometric", label: "Biometric", icon: Fingerprint },
  { id: "sso", label: "SSO", icon: Link2 },
  { id: "geo", label: "Geo-Fencing", icon: Globe },
  { id: "encryption", label: "Encryption", icon: Lock },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "ats", label: "ATS", icon: Users },
  { id: "webhooks", label: "Webhooks", icon: Activity },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("security");
  const [loading, setLoading] = useState(false);

  const [biometricStatus, setBiometricStatus] = useState<any>(null);
  const [ssoConfig, setSsoConfig] = useState<any>(null);
  const [encryptionStatus, setEncryptionStatus] = useState<any>(null);
  const [geoConfig, setGeoConfig] = useState<any>(null);
  const [webhookConfig, setWebhookConfig] = useState<any>(null);

  useEffect(() => {
    const uid = (window as any).Clerk?.user?.id || getCurrentUserId();
    loadSettings(uid);
  }, []);

  const loadSettings = async (uid: string) => {
    setLoading(true);
    try {
      const [bio, sso, enc, geo, webhooks] = await Promise.all([
        biometricService.getSettings().catch(() => null),
        ssoService.getConfig().catch(() => null),
        encryptionService.getKeys(uid).catch(() => null),
        geoFencingService.getConfig().catch(() => null),
        webhookService.getEvents().catch(() => null),
      ]);
      setBiometricStatus(bio);
      setSsoConfig(sso);
      setEncryptionStatus(enc);
      setGeoConfig(geo);
      setWebhookConfig(webhooks);
    } catch (e) {
      console.error("Error loading settings:", e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400">
                Settings
              </h1>
            </div>
            <p className="text-slate-400 text-sm sm:text-base">Configure security, authentication, and enterprise features.</p>
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
                    ? "bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-sm"
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
            <Skeleton className="h-8 w-48 bg-slate-800 rounded-lg" />
            <Skeleton className="h-24 w-full bg-slate-800 rounded-xl" />
            <Skeleton className="h-24 w-full bg-slate-800 rounded-xl" />
            <Skeleton className="h-24 w-full bg-slate-800 rounded-xl" />
          </div>
        ) : (
          <div>
            {activeTab === "security" && <SecuritySettings />}
            {activeTab === "biometric" && (
              <BiometricSettings status={biometricStatus} userId={getCurrentUserId()} />
            )}
            {activeTab === "sso" && <SSOSettings config={ssoConfig} userId={getCurrentUserId()} />}
            {activeTab === "geo" && <GeoSettings config={geoConfig} />}
            {activeTab === "encryption" && (
              <EncryptionSettings status={encryptionStatus} userId={getCurrentUserId()} />
            )}
            {activeTab === "integrations" && <IntegrationSettings config={null} />}
            {activeTab === "ats" && <ATSSettings config={null} />}
            {activeTab === "webhooks" && <WebhookSettings config={webhookConfig} />}
          </div>
        )}
      </div>
    </div>
  );
}

function SecuritySettings() {
  const features = [
    {
      icon: Activity,
      title: "Rate Limiting",
      desc: "Configure API rate limits per user",
      status: "Active",
      statusColor: "text-emerald-400",
      detail: "Default: 200 req/15min",
    },
    {
      icon: Users,
      title: "RBAC (Role-Based Access Control)",
      desc: "4 roles: admin, manager, interviewer, candidate",
      status: "Enabled",
      statusColor: "text-emerald-400",
    },
    {
      icon: Server,
      title: "Circuit Breakers",
      desc: "Protect against API failures with automatic fallback",
      status: "Active",
      statusColor: "text-emerald-400",
      detail: "Groq · Gemini · Azure · Piston",
    },
    {
      icon: AlertTriangle,
      title: "Audit Trail",
      desc: "Complete audit logging for all resource access",
      status: "Active",
      statusColor: "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-400" />
        Security Configuration
      </h2>
      <div className="grid gap-4">
        {features.map((feat) => {
          const Icon = feat.icon;
          return (
            <Card key={feat.title} className="bg-gray-800/80 border-gray-700/50">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800 shrink-0">
                    <Icon className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-200">{feat.title}</h3>
                    <p className="text-sm text-slate-400 mt-0.5">{feat.desc}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={cn("text-xs font-medium", feat.statusColor)}>
                        ● {feat.status}
                      </span>
                      {feat.detail && (
                        <span className="text-xs text-slate-500">{feat.detail}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function BiometricSettings({ status, userId }: { status: any; userId: string }) {
  const [enrolling, setEnrolling] = useState(false);
  const [selectedType, setSelectedType] = useState<"face" | "voice" | "fingerprint">("face");
  const [enrollingLoading, setEnrollingLoading] = useState(false);

  const handleEnroll = async () => {
    setEnrollingLoading(true);
    try {
      const result = await biometricService.enroll(userId, selectedType, []);
      if (result.success) {
        toast.success(`Enrolled ${selectedType} successfully`);
        setEnrolling(false);
      } else {
        toast.error("Enrollment failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Enrollment failed");
    }
    setEnrollingLoading(false);
  };

  const enrolled = status?.enrolledTypes || [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
        <Fingerprint className="w-5 h-5 text-purple-400" />
        Biometric Authentication
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gray-800/80 border-gray-700/50">
          <CardContent className="p-5 text-center">
            <div
              className={cn(
                "w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center",
                status?.enabled ? "bg-emerald-500/20" : "bg-slate-800"
              )}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  status?.enabled ? "bg-emerald-500" : "bg-slate-600"
                )}
              />
            </div>
            <p className="text-sm font-medium text-slate-200">Status</p>
            <p className={cn("text-xs mt-1", status?.enabled ? "text-emerald-400" : "text-slate-500")}>
              {status?.enabled ? "Enabled" : "Disabled"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/80 border-gray-700/50">
          <CardContent className="p-5 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 bg-slate-800 flex items-center justify-center">
              <Eye className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-200">Liveness</p>
            <p className={cn("text-xs mt-1", status?.livenessDetection ? "text-emerald-400" : "text-slate-500")}>
              {status?.livenessDetection ? "Active" : "Inactive"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/80 border-gray-700/50">
          <CardContent className="p-5 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 bg-slate-800 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-200">Enrolled</p>
            <p className="text-xs mt-1 text-slate-400">{enrolled.length} type{enrolled.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800/80 border-gray-700/50">
        <CardContent className="p-5">
          <h3 className="font-medium text-slate-200 mb-3">Enrolled Types</h3>
          <div className="flex flex-wrap gap-2">
            {["face", "voice", "fingerprint"].map((type) => (
              <Badge
                key={type}
                variant={enrolled.includes(type) ? "default" : "outline"}
                className={cn(
                  "capitalize px-3 py-1",
                  enrolled.includes(type)
                    ? "bg-emerald-600/20 text-emerald-400 border-emerald-600/30"
                    : "border-slate-700 text-slate-500"
                )}
              >
                {enrolled.includes(type) ? "✓ " : ""}
                {type}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {enrolling ? (
        <Card className="bg-gray-800/80 border-gray-700/50">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-medium text-slate-200">Select biometric type to enroll</h3>
            <div className="flex flex-wrap gap-2">
              {(["face", "voice", "fingerprint"] as const).map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "capitalize",
                    selectedType === type
                      ? "bg-blue-600 text-white"
                      : "border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  {type}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleEnroll}
                disabled={enrollingLoading}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {enrollingLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Confirm Enrollment
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setEnrolling(false)} className="border-slate-700 text-slate-400">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setEnrolling(true)} className="bg-blue-600 hover:bg-blue-500">
          <Plus className="w-4 h-4 mr-2" />
          Enroll New Biometric
        </Button>
      )}
    </div>
  );
}

function SSOSettings({ config, userId }: { config: any; userId: string }) {
  const providers = ["okta", "azure-ad", "google-workspace", "custom"];

  const handleSetup = async (provider: string) => {
    try {
      const result = await ssoService.getLoginUrl(provider);
      if (result.redirectUrl) {
        toast.info(`Redirecting to ${provider}...`);
        window.location.href = result.redirectUrl;
      } else {
        toast.error("Failed to get SSO login URL");
      }
    } catch (e: any) {
      toast.error(e.message || "SSO setup failed");
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      await ssoService.configure({ provider: null, enabled: false, userId });
      toast.success(`${provider} disconnected`);
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "Disconnect failed");
    }
  };

  const providerIcons: Record<string, string> = {
    okta: "O",
    "azure-ad": "A",
    "google-workspace": "G",
    custom: "⚡",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
        <Link2 className="w-5 h-5 text-blue-400" />
        SSO Integration
      </h2>

      <div className="grid gap-3">
        {providers.map((provider) => {
          const connected = config?.provider === provider;
          return (
            <Card
              key={provider}
              className={cn(
                "bg-gray-800/80 transition-all duration-300",
                connected ? "border-emerald-500/30" : "border-gray-700/50 hover:border-slate-700"
              )}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                      connected ? "bg-emerald-600/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                    )}
                  >
                    {providerIcons[provider]}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-200 capitalize">
                      {provider.replace("-", " ")}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {connected ? "Connected and active" : "Not configured"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={connected ? "default" : "outline"}
                  size="sm"
                  onClick={() => (connected ? handleDisconnect(provider) : handleSetup(provider))}
                  className={cn(
                    connected
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                  )}
                >
                  {connected ? "Configured" : "Setup"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-gray-800/80 border-gray-700/50">
        <CardContent className="p-5">
          <h3 className="font-medium text-slate-200 mb-3">Attribute Mapping</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Email", value: config?.attributeMapping?.email || "email" },
              { label: "First Name", value: config?.attributeMapping?.firstName || "given_name" },
              { label: "Last Name", value: config?.attributeMapping?.lastName || "family_name" },
              { label: "Department", value: config?.attributeMapping?.department || "department" },
            ].map((attr) => (
              <div key={attr.label} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-500">{attr.label}</p>
                <p className="text-sm font-mono text-slate-300 mt-0.5">{attr.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GeoSettings({ config }: { config: any }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
        <Globe className="w-5 h-5 text-emerald-400" />
        Geo-Fencing Configuration
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-gray-800/80 border-gray-700/50">
          <CardContent className="p-5">
            <h3 className="font-medium text-slate-200 mb-3">Allowed Countries</h3>
            <div className="flex flex-wrap gap-2">
              {config?.allowedCountries?.length > 0 ? (
                config.allowedCountries.map((c: string) => (
                  <Badge key={c} className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
                    {c}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-slate-500">All countries allowed</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/80 border-gray-700/50">
          <CardContent className="p-5">
            <h3 className="font-medium text-slate-200 mb-3">Blocked Countries</h3>
            <div className="flex flex-wrap gap-2">
              {config?.blockedCountries?.length > 0 ? (
                config.blockedCountries.map((c: string) => (
                  <Badge key={c} className="bg-red-600/20 text-red-400 border-red-600/30">
                    {c}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-slate-500">No countries blocked</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gray-800/80 border-gray-700/50">
          <CardContent className="p-5 text-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center",
                config?.vpnDetection ? "bg-emerald-500/20" : "bg-slate-800"
              )}
            >
              {config?.vpnDetection ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-slate-600" />
              )}
            </div>
            <p className="text-sm font-medium text-slate-200">VPN Detection</p>
            <p className={cn("text-xs mt-1", config?.vpnDetection ? "text-emerald-400" : "text-slate-500")}>
              {config?.vpnDetection ? "Active" : "Inactive"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/80 border-gray-700/50">
          <CardContent className="p-5 text-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center",
                config?.proxyDetection ? "bg-emerald-500/20" : "bg-slate-800"
              )}
            >
              {config?.proxyDetection ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-slate-600" />
              )}
            </div>
            <p className="text-sm font-medium text-slate-200">Proxy Detection</p>
            <p className={cn("text-xs mt-1", config?.proxyDetection ? "text-emerald-400" : "text-slate-500")}>
              {config?.proxyDetection ? "Active" : "Inactive"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/80 border-gray-700/50">
          <CardContent className="p-5 text-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center",
                config?.datacenterIPBlock ? "bg-emerald-500/20" : "bg-slate-800"
              )}
            >
              {config?.datacenterIPBlock ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-slate-600" />
              )}
            </div>
            <p className="text-sm font-medium text-slate-200">Datacenter Block</p>
            <p className={cn("text-xs mt-1", config?.datacenterIPBlock ? "text-emerald-400" : "text-slate-500")}>
              {config?.datacenterIPBlock ? "Active" : "Inactive"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EncryptionSettings({ status, userId }: { status: any; userId: string }) {
  const handleGenerateKeys = async () => {
    const password = prompt("Enter a password for key generation:");
    if (!password) return;
    try {
      await encryptionService.createKeys(userId, password);
      toast.success("Keys generated successfully");
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "Key generation failed");
    }
  };

  const handleRotateKeys = async () => {
    const oldPassword = prompt("Enter current password:");
    if (!oldPassword) return;
    const newPassword = prompt("Enter new password:");
    if (!newPassword) return;
    try {
      await encryptionService.rotateKeys(userId, oldPassword, newPassword);
      toast.success("Keys rotated successfully");
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "Key rotation failed");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
        <Lock className="w-5 h-5 text-cyan-400" />
        End-to-End Encryption
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-gray-800/80 border-gray-700/50">
          <CardContent className="p-5">
            <h3 className="font-medium text-slate-200 mb-3">Key Pair Status</h3>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  status?.publicKey ? "bg-emerald-500/20" : "bg-amber-500/20"
                )}
              >
                <Key
                  className={cn(
                    "w-5 h-5",
                    status?.publicKey ? "text-emerald-400" : "text-amber-400"
                  )}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {status?.publicKey ? "Active" : "Not Generated"}
                </p>
                {status?.fingerprint && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    FP: {status.fingerprint.substring(0, 20)}...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/80 border-gray-700/50">
          <CardContent className="p-5">
            <h3 className="font-medium text-slate-200 mb-3">Encryption Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: "Key Type", value: "RSA 4096-bit" },
                { label: "Symmetric", value: "AES-256-GCM" },
                { label: "Key Derivation", value: "PBKDF2" },
                { label: "Iterations", value: "100,000" },
              ].map((detail) => (
                <div key={detail.label} className="bg-slate-900/50 border border-slate-800 rounded-lg p-2">
                  <p className="text-xs text-slate-500">{detail.label}</p>
                  <p className="text-sm font-mono text-slate-300">{detail.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleGenerateKeys} className="bg-blue-600 hover:bg-blue-500">
          <Key className="w-4 h-4 mr-2" />
          Generate New Keys
        </Button>
        <Button
          onClick={handleRotateKeys}
          variant="outline"
          className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Rotate Keys
        </Button>
      </div>
    </div>
  );
}

function IntegrationSettings({ config: _config }: { config: any }) {
  const [hrisStatus, setHrisStatus] = useState<string>('not_configured');
  const [slackStatus, setSlackStatus] = useState<string>('not_configured');
  const [teamsStatus, setTeamsStatus] = useState<string>('not_configured');
  const [zoomStatus, setZoomStatus] = useState<string>('not_configured');

  useEffect(() => {
    Promise.all([
      integrationService.validateHRIS?.({}).catch(() => null) ?? Promise.resolve(null),
      integrationService.sendSlackNotification?.('', {}).catch(() => null) ?? Promise.resolve(null),
      integrationService.sendTeamsMessage?.('', {}).catch(() => null) ?? Promise.resolve(null),
      integrationService.getZoomMeeting?.('').catch(() => null) ?? Promise.resolve(null),
    ]).then(([hris, slack, teams, zoom]) => {
      if (hris) setHrisStatus('connected');
      if (slack) setSlackStatus('connected');
      if (teams) setTeamsStatus('connected');
      if (zoom) setZoomStatus('connected');
    }).catch(() => {});
  }, []);

  const handleConnect = async (integration: string) => {
    try {
      const result = await (integration === 'hris'
        ? integrationService.validateHRIS?.({})
        : integration === 'slack'
        ? integrationService.sendSlackNotification?.('https://hooks.slack.com/test', { text: 'Connected!' })
        : Promise.resolve(null));
      if (result) {
        toast.success(`${integration} connected successfully`);
        window.location.reload();
      }
    } catch {
      toast.error(`Failed to connect ${integration}`);
    }
  };

  const integrations = [
    { id: 'hris', label: 'HRIS (Workday/BambooHR)', icon: Users, status: hrisStatus },
    { id: 'slack', label: 'Slack', icon: MessageSquare, status: slackStatus },
    { id: 'teams', label: 'Microsoft Teams', icon: Users, status: teamsStatus },
    { id: 'zoom', label: 'Zoom', icon: Video, status: zoomStatus },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
        <Link2 className="w-5 h-5 text-blue-400" />
        Third-Party Integrations
      </h2>
      <div className="grid gap-3">
        {integrations.map((int) => {
          const Icon = int.icon;
          const connected = int.status === 'connected';
          return (
            <Card key={int.id} className={cn("bg-gray-800/80 border", connected ? "border-emerald-500/30" : "border-gray-700/50")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", connected ? "bg-emerald-600/20" : "bg-slate-800")}>
                    <Icon className={cn("w-5 h-5", connected ? "text-emerald-400" : "text-slate-400")} />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-200">{int.label}</h3>
                    <p className="text-xs text-slate-500">{connected ? 'Connected' : 'Not configured'}</p>
                  </div>
                </div>
                <Button
                  variant={connected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleConnect(int.id)}
                  className={connected ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-slate-300"}
                >
                  {connected ? 'Configured' : 'Connect'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ATSSettings({ config }: { config: any }) {
  const [selectedATS, setSelectedATS] = useState<string>('greenhouse');
  const [syncing, setSyncing] = useState(false);

  const handleConnect = async () => {
    try {
      const result = await atsService.configure?.({ provider: selectedATS, apiKey: 'prompt', enabled: true });
      if (result?.success) {
        toast.success(`${selectedATS} configured successfully`);
      }
    } catch {
      toast.error('Failed to configure ATS');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await atsService.sync?.({});
      toast.success('ATS sync completed');
    } catch {
      toast.error('ATS sync failed');
    }
    setSyncing(false);
  };

  const providers = [
    { id: 'greenhouse', label: 'Greenhouse' },
    { id: 'lever', label: 'Lever' },
    { id: 'workday', label: 'Workday' },
    { id: 'bamboohr', label: 'BambooHR' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-400" />
        ATS Integration
      </h2>
      <div className="grid gap-3">
        {providers.map((p) => (
          <Card key={p.id} className={cn("bg-gray-800/80 border", selectedATS === p.id ? "border-blue-500/30" : "border-gray-700/50")}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-400">
                  {p.label[0]}
                </div>
                <div>
                  <h3 className="font-medium text-slate-200">{p.label}</h3>
                  <p className="text-xs text-slate-500">{config?.provider === p.id ? 'Connected' : 'Available'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedATS === p.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedATS(p.id)}
                  className={selectedATS === p.id ? 'bg-blue-600' : 'border-slate-700 text-slate-300'}
                >
                  {selectedATS === p.id ? 'Selected' : 'Select'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex gap-2">
        <Button onClick={handleConnect} className="bg-blue-600 hover:bg-blue-500">
          <Link2 className="w-4 h-4 mr-2" />
          Configure {providers.find(p => p.id === selectedATS)?.label}
        </Button>
        <Button variant="outline" onClick={handleSync} disabled={syncing} className="border-slate-700 text-slate-300">
          <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
          Sync Now
        </Button>
      </div>
    </div>
  );
}

function WebhookSettings({ config: _config }: { config: any }) {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const data = await webhookService.getEvents?.();
      setWebhooks(Array.isArray(data) ? data : data?.events || []);
    } catch {
      setWebhooks([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadWebhooks(); }, []);

  const handleRegister = async () => {
    const url = prompt('Enter webhook URL:');
    if (!url) return;
    try {
      await webhookService.register?.(url, ['interview.completed', 'candidate.created']);
      toast.success('Webhook registered');
      loadWebhooks();
    } catch {
      toast.error('Failed to register webhook');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
        <Activity className="w-5 h-5 text-cyan-400" />
        Webhooks
      </h2>
      <Button onClick={handleRegister} className="bg-blue-600 hover:bg-blue-500">
        <Plus className="w-4 h-4 mr-2" />
        Register Webhook
      </Button>
      <Card className="bg-gray-800/80 border-gray-700/50">
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full bg-slate-800 rounded" />
              <Skeleton className="h-8 w-full bg-slate-800 rounded" />
            </div>
          ) : webhooks.length > 0 ? (
            <div className="space-y-2">
              {webhooks.map((wh: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono text-slate-300 truncate">{wh.url || wh.endpoint}</p>
                    <p className="text-xs text-slate-500">{wh.events?.join(', ') || wh.event || 'all events'}</p>
                  </div>
                  <Badge className={cn("ml-2 shrink-0", wh.active !== false ? "bg-emerald-600/20 text-emerald-400" : "bg-slate-700 text-slate-400")}>
                    {wh.active !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No webhooks registered</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
