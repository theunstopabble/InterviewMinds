import { Router } from 'express';
import { logger } from '../lib/logger';
import {
  createTenant,
  getTenantByTenantId,
  getAllTenants,
  updateTenantSettings,
  validateTenantSettings,
  checkFeatureAccess,
  validateTenantStatus,
  getPlanInfo,
} from '../lib/multiTenancy';

const router = Router();

interface CreateTenantRequest {
  name: string;
  domain?: string;
  plan?: 'free' | 'starter' | 'professional' | 'enterprise';
}

// GET all tenants
router.get('/', async (_req, res) => {
  try {
    const allTenants = await getAllTenants();
    res.json({ tenants: allTenants, count: allTenants.length });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tenants:');
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body as CreateTenantRequest;

    if (!body.name) {
      res.status(400).json({ error: 'Tenant name is required' });
      return;
    }

    const tenant = await createTenant(body);
    if (!tenant) {
      res.status(400).json({ error: 'Invalid tenant data' });
      return;
    }

    res.status(201).json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        plan: tenant.plan,
        status: tenant.status,
        createdAt: tenant.createdAt
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating tenant:');
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getTenantByTenantId(tenantId);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json({
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      plan: tenant.plan,
      status: tenant.status,
      settings: tenant.settings,
      createdAt: tenant.createdAt
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tenant:');
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

router.put('/:tenantId/settings', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getTenantByTenantId(tenantId);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const settings = validateTenantSettings(req.body);
    if (!settings) {
      res.status(400).json({ error: 'Invalid settings' });
      return;
    }

    const updatedSettings = await updateTenantSettings(tenantId, settings);
    if (!updatedSettings) {
      res.status(500).json({ error: 'Failed to update settings' });
      return;
    }

    res.json({
      success: true,
      settings: {
        isolationLevel: updatedSettings.isolationLevel,
        storageLimit: updatedSettings.storageLimit,
        apiRateLimit: updatedSettings.apiRateLimit,
        features: updatedSettings.features,
        customBranding: updatedSettings.customBranding,
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating tenant settings:');
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.post('/:tenantId/check-feature', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { feature } = req.body as { feature: string };
    const tenant = await getTenantByTenantId(tenantId);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const hasAccess = checkFeatureAccess(tenant, feature);

    res.json({ feature, hasAccess });
  } catch (error) {
    logger.error({ err: error }, 'Error checking feature access:');
    res.status(500).json({ error: 'Failed to check feature access' });
  }
});

router.get('/:tenantId/plan', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await getTenantByTenantId(tenantId);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const planInfo = await getPlanInfo(tenant.plan);

    res.json({
      plan: tenant.plan,
      name: planInfo.name,
      limits: planInfo.limits
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching plan info:');
    res.status(500).json({ error: 'Failed to fetch plan info' });
  }
});

router.post('/validate-status', async (req, res) => {
  try {
    const { tenantId } = req.body as { tenantId: string };
    const tenant = await getTenantByTenantId(tenantId);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const isValid = validateTenantStatus(tenant);

    res.json({ tenantId, valid: isValid, status: tenant.status });
  } catch (error) {
    logger.error({ err: error }, 'Error validating tenant status:');
    res.status(500).json({ error: 'Failed to validate status' });
  }
});

export default router;
