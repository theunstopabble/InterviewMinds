import { z } from 'zod';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  createdAt: Date;
  settings: TenantSettings;
}

interface TenantSettings {
  isolationLevel: 'database' | 'schema' | 'row' | 'application';
  storageLimit: number;
  apiRateLimit: number;
  features: string[];
  customBranding?: BrandingConfig;
}

interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  companyName: string;
}

interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
  permissions: string[];
}

const tenantSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().optional(),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']).default('free')
});

const tenantSettingsSchema = z.object({
  isolationLevel: z.enum(['database', 'schema', 'row', 'application']).default('row'),
  storageLimit: z.number().min(0).default(1073741824),
  apiRateLimit: z.number().min(1).default(1000),
  features: z.array(z.string()).default([])
});

const planLimits: Record<string, { storage: number; rateLimit: number; features: string[] }> = {
  free: { storage: 1073741824, rateLimit: 100, features: ['basic'] },
  starter: { storage: 10737418240, rateLimit: 1000, features: ['basic', 'proctoring'] },
  professional: { storage: 53687091200, rateLimit: 5000, features: ['basic', 'proctoring', 'analytics'] },
  enterprise: { storage: -1, rateLimit: -1, features: ['basic', 'proctoring', 'analytics', 'custom'] }
};

function generateTenantId(): string {
  return `tn_${crypto.randomUUID().slice(0, 12)}`;
}

function getTenantConnectionString(tenant: Tenant): string {
  const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  
  switch (tenant.settings.isolationLevel) {
    case 'database':
      return `${baseUri.split('/')[0]}//${tenant.id}`;
    case 'schema':
      return `${baseUri}/${tenant.id}`;
    case 'row':
    case 'application':
    default:
      return baseUri;
  }
}

interface TenantInput {
  name: string;
  domain?: string;
  plan?: 'free' | 'starter' | 'professional' | 'enterprise';
}

export function createTenant(data: unknown): Tenant | null {
  try {
    const parsed = tenantSchema.parse(data) as TenantInput;
    const plan = parsed.plan || 'free';
    const limits = planLimits[plan];

    const tenant: Tenant = {
      id: generateTenantId(),
      name: parsed.name,
      domain: parsed.domain || `${parsed.name.toLowerCase().replace(/\s+/g, '')}.interviewminds.com`,
      plan,
      status: 'trial',
      createdAt: new Date(),
      settings: {
        isolationLevel: 'row',
        storageLimit: limits.storage,
        apiRateLimit: limits.rateLimit,
        features: limits.features
      }
    };

    return tenant;
  } catch {
    return null;
  }
}

export function validateTenantSettings(settings: unknown): TenantSettings | null {
  try {
    const validated = tenantSettingsSchema.parse(settings);
    return validated;
  } catch {
    return null;
  }
}

export function checkFeatureAccess(tenant: Tenant, feature: string): boolean {
  return tenant.settings.features.includes(feature) || tenant.plan === 'enterprise';
}

export function checkRateLimit(tenant: Tenant, currentUsage: number): boolean {
  if (tenant.settings.apiRateLimit === -1) return true;
  return currentUsage < tenant.settings.apiRateLimit;
}

export function checkStorageLimit(tenant: Tenant, currentUsage: number): boolean {
  if (tenant.settings.storageLimit === -1) return true;
  return currentUsage < tenant.settings.storageLimit;
}

export function getTenantContext(tenantId: string, userId: string, role: string): TenantContext {
  const basePermissions: Record<string, string[]> = {
    admin: ['read', 'write', 'delete', 'manage_users', 'manage_billing', 'manage_settings'],
    manager: ['read', 'write', 'manage_users', 'view_analytics'],
    interviewer: ['read', 'conduct_interview', 'view_results'],
    candidate: ['take_interview', 'view_own_results']
  };

  return {
    tenantId,
    userId,
    role,
    permissions: basePermissions[role] || []
  };
}

export function hasPermission(context: TenantContext, permission: string): boolean {
  return context.permissions.includes(permission) || context.role === 'admin';
}

export function applyTenantFilter<T extends Record<string, unknown>>(
  context: TenantContext,
  query: T,
  isolationLevel: string
): T {
  if (isolationLevel === 'row' || isolationLevel === 'application') {
    return { ...query, tenantId: context.tenantId };
  }
  return query;
}

export function validateTenantStatus(tenant: Tenant): boolean {
  if (tenant.status === 'active') return true;
  if (tenant.status === 'trial') {
    const trialDays = 14;
    const daysSinceCreation = Math.floor((Date.now() - tenant.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCreation < trialDays;
  }
  return false;
}

export function getPlanInfo(plan: string): { name: string; limits: typeof planLimits[string] } {
  return {
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    limits: planLimits[plan] || planLimits.free
  };
}