import { z } from 'zod';
import { TenantModel } from '../models/Tenant';
import { PlanLimitsModel } from '../models/PlanLimits';
import { logger } from '../lib/logger';

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
  features: z.array(z.string()).default([]),
  customBranding: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    logoUrl: z.string(),
    companyName: z.string(),
  }).optional(),
});

const DEFAULT_PLAN_LIMITS: Array<{
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  storage: number;
  rateLimit: number;
  features: string[];
}> = [
  { plan: 'free', storage: 1073741824, rateLimit: 100, features: ['basic'] },
  { plan: 'starter', storage: 10737418240, rateLimit: 1000, features: ['basic', 'proctoring'] },
  { plan: 'professional', storage: 53687091200, rateLimit: 5000, features: ['basic', 'proctoring', 'analytics'] },
  { plan: 'enterprise', storage: -1, rateLimit: -1, features: ['basic', 'proctoring', 'analytics', 'custom'] }
];

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

export async function initializeDefaultPlanLimits(): Promise<void> {
  try {
    for (const limits of DEFAULT_PLAN_LIMITS) {
      const existing = await PlanLimitsModel.findOne({ plan: limits.plan });
      if (!existing) {
        await PlanLimitsModel.create(limits);
        logger.info({ plan: limits.plan }, 'Created default plan limits');
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize default plan limits');
  }
}

export async function createTenant(data: unknown): Promise<Tenant | null> {
  try {
    const parsed = tenantSchema.parse(data) as { name: string; domain?: string; plan?: 'free' | 'starter' | 'professional' | 'enterprise' };
    const plan = parsed.plan || 'free';

    const planLimits = await PlanLimitsModel.findOne({ plan });
    const limits = planLimits || DEFAULT_PLAN_LIMITS.find(p => p.plan === plan) || DEFAULT_PLAN_LIMITS[0];

    const tenantId = generateTenantId();
    const tenantDoc = await TenantModel.create({
      tenantId,
      name: parsed.name,
      domain: parsed.domain || `${parsed.name.toLowerCase().replace(/\s+/g, '')}.interviewminds.com`,
      plan,
      status: 'trial',
      createdAt: new Date(),
      settings: {
        isolationLevel: 'row',
        storageLimit: limits.storage,
        apiRateLimit: limits.rateLimit,
        features: limits.features,
      }
    });

    return {
      id: tenantDoc.tenantId,
      name: tenantDoc.name,
      domain: tenantDoc.domain,
      plan: tenantDoc.plan,
      status: tenantDoc.status,
      createdAt: tenantDoc.createdAt,
      settings: {
        isolationLevel: tenantDoc.settings.isolationLevel,
        storageLimit: tenantDoc.settings.storageLimit,
        apiRateLimit: tenantDoc.settings.apiRateLimit,
        features: tenantDoc.settings.features,
        customBranding: tenantDoc.settings.customBranding,
      }
    };
  } catch (error) {
    logger.error({ err: error }, 'Error creating tenant');
    return null;
  }
}

export async function getTenantByTenantId(tenantId: string): Promise<Tenant | null> {
  try {
    const tenantDoc = await TenantModel.findOne({ tenantId });
    if (!tenantDoc) return null;
    return {
      id: tenantDoc.tenantId,
      name: tenantDoc.name,
      domain: tenantDoc.domain,
      plan: tenantDoc.plan,
      status: tenantDoc.status,
      createdAt: tenantDoc.createdAt,
      settings: {
        isolationLevel: tenantDoc.settings.isolationLevel,
        storageLimit: tenantDoc.settings.storageLimit,
        apiRateLimit: tenantDoc.settings.apiRateLimit,
        features: tenantDoc.settings.features,
        customBranding: tenantDoc.settings.customBranding,
      }
    };
  } catch (error) {
    logger.error({ err: error, tenantId }, 'Error fetching tenant');
    return null;
  }
}

export async function getAllTenants(): Promise<Tenant[]> {
  try {
    const tenantDocs = await TenantModel.find().sort({ createdAt: -1 }).lean();
    return tenantDocs.map((t) => ({
      id: t.tenantId,
      name: t.name,
      domain: t.domain,
      plan: t.plan,
      status: t.status,
      createdAt: t.createdAt,
      settings: {
        isolationLevel: t.settings.isolationLevel,
        storageLimit: t.settings.storageLimit,
        apiRateLimit: t.settings.apiRateLimit,
        features: t.settings.features,
        customBranding: t.settings.customBranding,
      }
    }));
  } catch (error) {
    logger.error({ err: error }, 'Error fetching all tenants');
    return [];
  }
}

export async function updateTenantSettings(tenantId: string, settings: unknown): Promise<TenantSettings | null> {
  try {
    const validated = tenantSettingsSchema.parse(settings);
    const tenantDoc = await TenantModel.findOne({ tenantId });
    if (!tenantDoc) return null;

    const merged = {
      ...(tenantDoc.settings as object),
      ...validated,
    };
    tenantDoc.settings = merged;
    await tenantDoc.save();

    return {
      isolationLevel: tenantDoc.settings.isolationLevel,
      storageLimit: tenantDoc.settings.storageLimit,
      apiRateLimit: tenantDoc.settings.apiRateLimit,
      features: tenantDoc.settings.features,
      customBranding: tenantDoc.settings.customBranding,
    };
  } catch (error) {
    logger.error({ err: error, tenantId }, 'Error updating tenant settings');
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

export async function getPlanInfo(plan: string): Promise<{ name: string; limits: { storage: number; rateLimit: number; features: string[] } }> {
  const planLimits = await PlanLimitsModel.findOne({ plan });
  const limits = planLimits || DEFAULT_PLAN_LIMITS.find(p => p.plan === plan) || DEFAULT_PLAN_LIMITS[0];
  return {
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    limits: {
      storage: limits.storage,
      rateLimit: limits.rateLimit,
      features: limits.features,
    }
  };
}
