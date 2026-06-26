import { Router } from 'express';
import { logger } from '../lib/logger';
import { initiateSSOLogin, handleSSOCallback, getDefaultSSOConfig, validateSSOConfig, getSSOConfig, saveSSOConfig } from '../lib/ssoIntegration';

const router = Router();

interface SSOConfigRequest {
  provider: 'okta' | 'azure-ad' | 'google-workspace' | 'custom';
  enabled: boolean;
  samlSettings?: {
    entryPoint: string;
    issuer: string;
    cert: string;
    callbackUrl: string;
  };
  oauthSettings?: {
    authorizationUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scope: string[];
  };
  attributeMapping?: {
    email: string;
    firstName: string;
    lastName: string;
    department?: string;
    role?: string;
    groups?: string[];
  };
}

interface SSOLoginRequest {
  provider: 'okta' | 'azure-ad' | 'google-workspace' | 'custom';
  code?: string;
  idToken?: string;
  samlResponse?: string;
  relayState?: string;
}

router.get('/config', async (req, res) => {
  try {
    const provider = (req.query.provider as string) || 'custom';
    const config = await getSSOConfig(provider);

    if (!config) {
      const defaultConfig = getDefaultSSOConfig();
      res.json({
        provider: defaultConfig.provider,
        enabled: defaultConfig.enabled,
        attributeMapping: defaultConfig.attributeMapping
      });
      return;
    }

    res.json({
      provider: config.provider,
      enabled: config.enabled,
      attributeMapping: config.attributeMapping,
      samlSettings: config.samlSettings ? {
        entryPoint: config.samlSettings.entryPoint,
        issuer: config.samlSettings.issuer,
        callbackUrl: config.samlSettings.callbackUrl,
        signatureAlgorithm: config.samlSettings.signatureAlgorithm,
      } : undefined,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching SSO config');
    res.status(500).json({ error: 'Failed to fetch SSO configuration' });
  }
});

router.post('/config', async (req, res) => {
  try {
    const body = req.body as SSOConfigRequest;

    const configToValidate: Partial<{
      provider: 'okta' | 'azure-ad' | 'google-workspace' | 'custom';
      enabled: boolean;
      samlSettings?: {
        entryPoint: string;
        issuer: string;
        cert: string;
        callbackUrl: string;
        signatureAlgorithm: 'SHA1' | 'SHA256' | 'SHA512';
      };
      oauthSettings?: {
        authorizationUrl: string;
        tokenUrl: string;
        clientId: string;
        clientSecret: string;
        redirectUri: string;
        scope: string[];
      };
      attributeMapping: {
        email: string;
        firstName: string;
        lastName: string;
        department?: string;
        role?: string;
        groups?: string | string[];
      };
    }> = {
      provider: body.provider,
      enabled: body.enabled,
      samlSettings: body.samlSettings ? {
        ...body.samlSettings,
        signatureAlgorithm: 'SHA256'
      } : undefined,
      oauthSettings: body.oauthSettings,
      attributeMapping: body.attributeMapping || getDefaultSSOConfig().attributeMapping,
    };

    const validatedConfig = validateSSOConfig(configToValidate);
    if (!validatedConfig) {
      res.status(400).json({ error: 'Invalid SSO configuration' });
      return;
    }

    await saveSSOConfig(validatedConfig);

    res.json({
      success: true,
      message: 'SSO configuration updated',
      config: {
        provider: validatedConfig.provider,
        enabled: validatedConfig.enabled
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating SSO config');
    res.status(500).json({ error: 'Failed to update SSO configuration' });
  }
});

router.get('/login/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const validProviders = ['okta', 'azure-ad', 'google-workspace', 'custom'];
    
    if (!validProviders.includes(provider)) {
      res.status(400).json({ error: 'Invalid SSO provider' });
      return;
    }

    const config = await getSSOConfig(provider);
    const { redirectUrl, state } = await initiateSSOLogin(provider, config || undefined);

    res.json({ redirectUrl, state });
  } catch (error) {
    logger.error({ err: error, provider: req.params.provider }, 'Error initiating SSO login');
    res.status(500).json({ error: 'Failed to initiate SSO login' });
  }
});

router.post('/callback', async (req, res) => {
  try {
    const body = req.body as SSOLoginRequest;

    if (!body.provider) {
      res.status(400).json({ error: 'Provider is required' });
      return;
    }

    const config = await getSSOConfig(body.provider);
    const result = await handleSSOCallback(body, config || undefined);

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.json({
      success: true,
      user: result.user,
      sessionToken: result.sessionToken
    });
  } catch (error) {
    logger.error({ err: error }, 'Error handling SSO callback');
    res.status(500).json({ error: 'SSO authentication failed' });
  }
});

router.post('/saml/assertion', async (req, res) => {
  try {
    const { samlResponse, relayState } = req.body;

    if (!samlResponse) {
      res.status(400).json({ error: 'SAML response is required' });
      return;
    }

    const config = await getSSOConfig('okta');
    const result = await handleSSOCallback(
      { provider: 'okta', samlResponse, relayState },
      config || undefined
    );

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.json({
      success: true,
      user: result.user,
      sessionToken: result.sessionToken
    });
  } catch (error) {
    logger.error({ err: error }, 'Error processing SAML assertion');
    res.status(500).json({ error: 'SAML authentication failed' });
  }
});

export default router;
