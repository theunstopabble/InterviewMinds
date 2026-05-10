import { Router } from 'express';
import { initiateSSOLogin, handleSSOCallback, getDefaultSSOConfig, validateSSOConfig } from '../lib/ssoIntegration';

interface SSOConfig {
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
}

const router = Router();

interface SSOLoginRequest {
  provider: 'okta' | 'azure-ad' | 'google-workspace' | 'custom';
  code?: string;
  idToken?: string;
  samlResponse?: string;
  relayState?: string;
}

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

router.get('/config', async (req, res) => {
  try {
    const config = getDefaultSSOConfig();
    res.json({
      provider: config.provider,
      enabled: config.enabled,
      attributeMapping: config.attributeMapping
    });
  } catch (error) {
    console.error('Error fetching SSO config:', error);
    res.status(500).json({ error: 'Failed to fetch SSO configuration' });
  }
});

router.post('/config', async (req, res) => {
  try {
    const body = req.body as SSOConfigRequest;

    const configToValidate: Partial<SSOConfig> = {
      provider: body.provider,
      enabled: body.enabled,
      samlSettings: body.samlSettings ? {
        ...body.samlSettings,
        signatureAlgorithm: 'SHA256'
      } : undefined,
      oauthSettings: body.oauthSettings,
      attributeMapping: body.attributeMapping
    };

    const validatedConfig = validateSSOConfig(configToValidate);
    if (!validatedConfig) {
      res.status(400).json({ error: 'Invalid SSO configuration' });
      return;
    }

    res.json({
      success: true,
      message: 'SSO configuration updated',
      config: {
        provider: validatedConfig.provider,
        enabled: validatedConfig.enabled
      }
    });
  } catch (error) {
    console.error('Error updating SSO config:', error);
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

    const defaultConfig = getDefaultSSOConfig();
    const { redirectUrl, state } = await initiateSSOLogin(provider, defaultConfig);

    res.json({ redirectUrl, state });
  } catch (error) {
    console.error('Error initiating SSO login:', error);
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

    const defaultConfig = getDefaultSSOConfig();
    const result = await handleSSOCallback(body, defaultConfig);

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
    console.error('Error handling SSO callback:', error);
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

    const defaultConfig = getDefaultSSOConfig();
    const result = await handleSSOCallback(
      { provider: 'okta', samlResponse, relayState },
      defaultConfig
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
    console.error('Error processing SAML assertion:', error);
    res.status(500).json({ error: 'SAML authentication failed' });
  }
});

export default router;