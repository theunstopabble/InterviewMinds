import { z } from 'zod';
import { logger } from './logger';
import { SSOConfigModel } from '../models/SSOConfig';

interface SSOConfig {
  provider: 'okta' | 'azure-ad' | 'google-workspace' | 'custom';
  enabled: boolean;
  samlSettings?: SAMLSettings;
  oauthSettings?: OAuthSettings;
  attributeMapping: AttributeMapping;
  _id?: string;
}

interface SAMLSettings {
  entryPoint: string;
  issuer: string;
  cert: string;
  callbackUrl: string;
  signatureAlgorithm: 'SHA1' | 'SHA256' | 'SHA512';
}

interface OAuthSettings {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

interface AttributeMapping {
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  role?: string;
  groups?: string | string[];
}

interface SSOUser {
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  role?: string;
  groups: string[];
  rawAttributes: Record<string, unknown>;
}

interface SSOLoginRequest {
  provider: 'okta' | 'azure-ad' | 'google-workspace' | 'custom';
  code?: string;
  idToken?: string;
  samlResponse?: string;
  relayState?: string;
}

interface SSOLoginResult {
  success: boolean;
  user?: SSOUser;
  sessionToken?: string;
  redirectUrl?: string;
  error?: string;
}

const samlSchema = z.object({
  entryPoint: z.string().url(),
  issuer: z.string(),
  cert: z.string(),
  callbackUrl: z.string().url()
});

const oauthSchema = z.object({
  authorizationUrl: z.string().url(),
  tokenUrl: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  redirectUri: z.string().url(),
  scope: z.array(z.string())
});

/* ------------------------------------------------------------------ */
/*  Provider-specific OAuth URLs                                       */
/* ------------------------------------------------------------------ */

const PROVIDER_OAUTH: Record<string, { authorizeUrl: string; tokenUrl: string; scope: string[]; userInfoUrl: string }> = {
  'google-workspace': {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: ['openid', 'email', 'profile'],
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  },
  'azure-ad': {
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: ['openid', 'email', 'profile', 'User.Read'],
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
  },
  'okta': {
    authorizeUrl: 'https://{tenant}.okta.com/oauth2/default/v1/authorize',
    tokenUrl: 'https://{tenant}.okta.com/oauth2/default/v1/token',
    scope: ['openid', 'email', 'profile'],
    userInfoUrl: 'https://{tenant}.okta.com/oauth2/default/v1/userinfo',
  },
};

function buildProviderUrl(template: string, tenant: string): string {
  return template.replace('{tenant}', tenant);
}

function validateSAMLConfig(config: Partial<SAMLSettings>): SAMLSettings | null {
  try {
    return samlSchema.parse(config) as SAMLSettings;
  } catch {
    return null;
  }
}

function validateOAuthConfig(config: Partial<OAuthSettings>): OAuthSettings | null {
  try {
    return oauthSchema.parse(config) as OAuthSettings;
  } catch {
    return null;
  }
}

function mapAttributes(rawAttrs: Record<string, unknown>, mapping: AttributeMapping): SSOUser {
  const getAttr = (key: string): string => {
    const value = rawAttrs[key];
    return Array.isArray(value) ? String(value[0] || '') : String(value || '');
  };

  const getGroupsAttr = (): string[] => {
    if (!mapping.groups) return [];
    const groupKey = Array.isArray(mapping.groups) ? mapping.groups[0] : mapping.groups;
    const value = rawAttrs[groupKey];
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') return value.split(',').map(g => g.trim()).filter(Boolean);
    return [];
  };

  return {
    email: getAttr(mapping.email),
    firstName: getAttr(mapping.firstName),
    lastName: getAttr(mapping.lastName),
    department: mapping.department ? getAttr(mapping.department) : undefined,
    role: mapping.role ? getAttr(mapping.role) : undefined,
    groups: getGroupsAttr(),
    rawAttributes: rawAttrs
  };
}

async function fetchUserInfo(accessToken: string, providerUrl: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(providerUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch user info from provider');
    return null;
  }
}

async function exchangeCodeForTokens(
  code: string,
  config: OAuthSettings
): Promise<{ access_token: string; id_token?: string; refresh_token?: string } | null> {
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, body }, 'Token exchange returned error');
      return null;
    }
    return await response.json();
  } catch (error) {
    logger.error({ err: error }, 'Token exchange failed');
    return null;
  }
}

async function validateIDToken(
  idToken: string,
  config: OAuthSettings
): Promise<Record<string, unknown> | null> {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    if (payload.iss && !payload.iss.includes(config.clientId) && !payload.iss.includes('accounts.google.com') && !payload.iss.includes('login.microsoftonline.com') && !payload.iss.includes('okta.com')) {
      return null;
    }

    if (payload.aud && payload.aud !== config.clientId && !(Array.isArray(payload.aud) && payload.aud.includes(config.clientId))) {
      return null;
    }

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      logger.warn('ID token has expired');
      return null;
    }

    return payload;
  } catch (error) {
    logger.error({ err: error }, 'ID token validation failed');
    return null;
  }
}

function parseSAMLAssertion(samlResponse: string): Record<string, unknown> {
  try {
    const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');
    
    const emailMatch = decoded.match(/<Attribute Name="[^"]*email[^"]*"[^>]*>.*?<AttributeValue>([^<]+)/i);
    const firstNameMatch = decoded.match(/<Attribute Name="[^"]*(firstName|givenName)[^"]*"[^>]*>.*?<AttributeValue>([^<]+)/i);
    const lastNameMatch = decoded.match(/<Attribute Name="[^"]*(lastName|sn|surname)[^"]*"[^>]*>.*?<AttributeValue>([^<]+)/i);
    
    return {
      email: emailMatch?.[1] || '',
      firstName: firstNameMatch?.[1] || '',
      lastName: lastNameMatch?.[1] || ''
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to parse SAML assertion');
    return {};
  }
}

function generateAuthorizationUrl(config: OAuthSettings, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope.join(' '),
    state
  });

  return `${config.authorizationUrl}?${params.toString()}`;
}

export async function getSSOConfig(provider: string): Promise<SSOConfig | null> {
  try {
    const doc = await SSOConfigModel.findOne({ provider }).lean();
    if (!doc) return null;

    const saml = doc.samlSettings;
    const oauth = doc.oauthSettings;
    const attr = (doc.attributeMapping || undefined) as { email?: string; firstName?: string; lastName?: string; department?: string | null; role?: string | null; groups?: string | string[] } | undefined;

    return {
      provider: doc.provider as SSOConfig['provider'],
      enabled: doc.enabled,
      samlSettings: saml ? {
        entryPoint: saml.entryPoint || '',
        issuer: saml.issuer || '',
        cert: saml.cert || '',
        callbackUrl: saml.callbackUrl || '',
        signatureAlgorithm: (saml.signatureAlgorithm || 'SHA256') as 'SHA1' | 'SHA256' | 'SHA512',
      } : undefined,
      oauthSettings: oauth ? {
        authorizationUrl: oauth.authorizationUrl || '',
        tokenUrl: oauth.tokenUrl || '',
        clientId: oauth.clientId || '',
        clientSecret: oauth.clientSecret || '',
        redirectUri: oauth.redirectUri || '',
        scope: oauth.scope || [],
      } : undefined,
      attributeMapping: {
        email: attr?.email || 'email',
        firstName: attr?.firstName || 'given_name',
        lastName: attr?.lastName || 'family_name',
        department: attr?.department || undefined,
        role: attr?.role || undefined,
        groups: attr?.groups || undefined,
      },
      _id: String(doc._id),
    };
  } catch (error) {
    logger.error({ err: error, provider }, 'Failed to get SSO config from MongoDB');
    return null;
  }
}

export async function initiateSSOLogin(
  provider: string,
  config?: SSOConfig
): Promise<{ redirectUrl: string; state: string }> {
  const resolvedConfig = config || await getSSOConfig(provider);
  if (!resolvedConfig) {
    throw new Error(`SSO not configured for provider: ${provider}`);
  }

  const state = crypto.randomUUID();
  
  if (provider === 'google-workspace' || provider === 'azure-ad' || provider === 'okta') {
    const providerInfo = PROVIDER_OAUTH[provider];
    let oauthSettings = resolvedConfig.oauthSettings;

    if (!oauthSettings) {
      const tenant = process.env[`${provider.toUpperCase().replace('-', '_')}_TENANT`] || process.env.SSO_TENANT || 'default';
      oauthSettings = {
        authorizationUrl: buildProviderUrl(providerInfo.authorizeUrl, tenant),
        tokenUrl: buildProviderUrl(providerInfo.tokenUrl, tenant),
        clientId: process.env[`${provider.toUpperCase().replace('-', '_')}_CLIENT_ID`] || '',
        clientSecret: process.env[`${provider.toUpperCase().replace('-', '_')}_CLIENT_SECRET`] || '',
        redirectUri: process.env[`${provider.toUpperCase().replace('-', '_')}_REDIRECT_URI`] || `${process.env.API_URL || 'http://localhost:3001'}/api/sso/callback`,
        scope: providerInfo.scope,
      };
    }

    if (!oauthSettings.clientId) {
      throw new Error(`OAuth not configured for provider: ${provider}`);
    }

    const redirectUrl = generateAuthorizationUrl(oauthSettings, state);
    logger.info({ provider, state: state.slice(0, 8) }, 'Initiated SSO login');
    return { redirectUrl, state };
  }

  if (provider === 'custom') {
    if (!resolvedConfig.oauthSettings && !resolvedConfig.samlSettings) {
      throw new Error('Custom SSO requires OAuth or SAML configuration');
    }

    if (resolvedConfig.oauthSettings) {
      const redirectUrl = generateAuthorizationUrl(resolvedConfig.oauthSettings, state);
      return { redirectUrl, state };
    }

    return { redirectUrl: resolvedConfig.samlSettings!.entryPoint, state };
  }

  throw new Error(`Provider ${provider} login initiation not supported`);
}

export async function handleSSOCallback(
  request: SSOLoginRequest,
  config?: SSOConfig
): Promise<SSOLoginResult> {
  const resolvedConfig = config || await getSSOConfig(request.provider);
  if (!resolvedConfig) {
    return { success: false, error: `SSO not configured for provider: ${request.provider}` };
  }

  if (!resolvedConfig.enabled) {
    return { success: false, error: 'SSO is not enabled' };
  }

  try {
    if (request.samlResponse) {
      const attrs = parseSAMLAssertion(request.samlResponse);
      const user = mapAttributes(attrs, resolvedConfig.attributeMapping);
      
      return {
        success: true,
        user,
        sessionToken: crypto.randomUUID()
      };
    }

    if (request.code && resolvedConfig.oauthSettings) {
      const tokens = await exchangeCodeForTokens(request.code, resolvedConfig.oauthSettings);
      if (!tokens) {
        return { success: false, error: 'Failed to exchange code for tokens' };
      }

      let userInfo: Record<string, unknown> | null = null;

      if (tokens.access_token) {
        const providerInfo = PROVIDER_OAUTH[request.provider];
        if (providerInfo) {
          const tenant = process.env[`${request.provider.toUpperCase().replace('-', '_')}_TENANT`] || 'default';
          const userInfoUrl = buildProviderUrl(providerInfo.userInfoUrl, tenant);
          userInfo = await fetchUserInfo(tokens.access_token, userInfoUrl);
        }
      }

      if (tokens.id_token) {
        const payload = await validateIDToken(tokens.id_token, resolvedConfig.oauthSettings);
        if (!payload) {
          return { success: false, error: 'Invalid ID token' };
        }

        const mergedAttrs = { ...payload, ...(userInfo || {}) };
        const user = mapAttributes(mergedAttrs, resolvedConfig.attributeMapping);
        return {
          success: true,
          user,
          sessionToken: crypto.randomUUID()
        };
      }

      if (userInfo) {
        const user = mapAttributes(userInfo, resolvedConfig.attributeMapping);
        return {
          success: true,
          user,
          sessionToken: crypto.randomUUID()
        };
      }

      return { success: false, error: 'No user info returned from provider' };
    }

    if (request.idToken && resolvedConfig.oauthSettings) {
      const payload = await validateIDToken(request.idToken, resolvedConfig.oauthSettings);
      if (!payload) {
        return { success: false, error: 'Invalid ID token' };
      }

      const user = mapAttributes(payload, resolvedConfig.attributeMapping);
      return {
        success: true,
        user,
        sessionToken: crypto.randomUUID()
      };
    }

    return { success: false, error: 'No valid authentication data provided' };
  } catch (error) {
    logger.error({ err: error, provider: request.provider }, 'SSO callback error');
    return { success: false, error: 'SSO authentication failed' };
  }
}

export function getDefaultSSOConfig(): SSOConfig {
  return {
    provider: 'custom',
    enabled: false,
    attributeMapping: {
      email: 'email',
      firstName: 'given_name',
      lastName: 'family_name',
      department: 'department',
      role: 'role',
      groups: ['groups']
    }
  };
}

export function validateSSOConfig(config: Partial<SSOConfig>): SSOConfig | null {
  if (!config.provider) return null;

  const baseConfig = getDefaultSSOConfig();
  
  if (config.samlSettings) {
    const validSAML = validateSAMLConfig(config.samlSettings);
    if (!validSAML) return null;
    return { ...baseConfig, ...config, samlSettings: validSAML };
  }

  if (config.oauthSettings) {
    const validOAuth = validateOAuthConfig(config.oauthSettings);
    if (!validOAuth) return null;
    return { ...baseConfig, ...config, oauthSettings: validOAuth };
  }

  return { ...baseConfig, ...config };
}

export async function saveSSOConfig(config: SSOConfig): Promise<SSOConfig> {
  try {
    const data: Record<string, unknown> = {
      provider: config.provider,
      enabled: config.enabled,
      attributeMapping: config.attributeMapping,
    };

    if (config.samlSettings) {
      data.samlSettings = config.samlSettings;
    }

    if (config.oauthSettings) {
      data.oauthSettings = config.oauthSettings;
    }

    await SSOConfigModel.findOneAndUpdate(
      { provider: config.provider },
      { $set: data },
      { upsert: true, new: true },
    );

    logger.info({ provider: config.provider }, 'SSO config saved to MongoDB');
    return config;
  } catch (error) {
    logger.error({ err: error, provider: config.provider }, 'Failed to save SSO config');
    throw error;
  }
}
