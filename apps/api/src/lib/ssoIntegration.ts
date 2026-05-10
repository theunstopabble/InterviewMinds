import { z } from 'zod';

interface SSOConfig {
  provider: 'okta' | 'azure-ad' | 'google-workspace' | 'custom';
  enabled: boolean;
  samlSettings?: SAMLSettings;
  oauthSettings?: OAuthSettings;
  attributeMapping: AttributeMapping;
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

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Token exchange failed:', error);
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
    
    if (payload.iss !== config.authorizationUrl && !payload.iss.includes(config.clientId)) {
      return null;
    }

    if (payload.aud !== config.clientId) return null;

    return payload;
  } catch {
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
  } catch {
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

export async function initiateSSOLogin(
  provider: string,
  config: SSOConfig
): Promise<{ redirectUrl: string; state: string }> {
  const state = crypto.randomUUID();
  
  if (provider === 'google-workspace' || provider === 'custom') {
    if (!config.oauthSettings) throw new Error('OAuth not configured');
    
    const redirectUrl = generateAuthorizationUrl(config.oauthSettings, state);
    return { redirectUrl, state };
  }

  throw new Error(`Provider ${provider} login initiation not supported`);
}

export async function handleSSOCallback(
  request: SSOLoginRequest,
  config: SSOConfig
): Promise<SSOLoginResult> {
  if (!config.enabled) {
    return { success: false, error: 'SSO is not enabled' };
  }

  try {
    if (request.samlResponse) {
      const attrs = parseSAMLAssertion(request.samlResponse);
      const user = mapAttributes(attrs, config.attributeMapping);
      
      return {
        success: true,
        user,
        sessionToken: crypto.randomUUID()
      };
    }

    if (request.code && config.oauthSettings) {
      const tokens = await exchangeCodeForTokens(request.code, config.oauthSettings);
      if (!tokens) {
        return { success: false, error: 'Failed to exchange code for tokens' };
      }

      if (tokens.id_token) {
        const payload = await validateIDToken(tokens.id_token, config.oauthSettings);
        if (!payload) {
          return { success: false, error: 'Invalid ID token' };
        }

        const user = mapAttributes(payload, config.attributeMapping);
        return {
          success: true,
          user,
          sessionToken: crypto.randomUUID()
        };
      }
    }

    if (request.idToken && config.oauthSettings) {
      const payload = await validateIDToken(request.idToken, config.oauthSettings);
      if (!payload) {
        return { success: false, error: 'Invalid ID token' };
      }

      const user = mapAttributes(payload, config.attributeMapping);
      return {
        success: true,
        user,
        sessionToken: crypto.randomUUID()
      };
    }

    return { success: false, error: 'No valid authentication data provided' };
  } catch (error) {
    console.error('SSO callback error:', error);
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