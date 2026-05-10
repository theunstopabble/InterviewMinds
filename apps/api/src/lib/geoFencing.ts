import axios from 'axios';

interface SecurityConfig {
  allowedIPs: string[];
  blockedIPs: string[];
  allowedCountries: string[];
  blockedCountries: string[];
  vpnDetection: boolean;
  proxyDetection: boolean;
  datacenterIPBlock: boolean;
}

interface GeoLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  isp: string;
  org: string;
  as: string;
  isProxy: boolean;
  isVPN: boolean;
  isDatacenter: boolean;
}

interface IPValidationResult {
  isAllowed: boolean;
  reason?: string;
  geoLocation?: GeoLocation;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const defaultConfig: SecurityConfig = {
  allowedIPs: [],
  blockedIPs: ['0.0.0.0', '127.0.0.1'],
  allowedCountries: [],
  blockedCountries: ['XX', 'KP', 'IR', 'SY'],
  vpnDetection: true,
  proxyDetection: true,
  datacenterIPBlock: false
};

const datacenterIPRanges = [
  { range: '3.0.0.0/8', provider: 'Amazon AWS' },
  { range: '4.0.0.0/8', provider: 'Google Cloud' },
  { range: '13.0.0.0/8', provider: 'AWS' },
  { range: '17.0.0.0/8', provider: 'Apple' },
  { range: '23.0.0.0/8', provider: 'Akamai' },
  { range: '34.0.0.0/8', provider: 'Google' },
  { range: '40.0.0.0/8', provider: 'Azure' },
  { range: '52.0.0.0/8', provider: 'AWS' },
  { range: '54.0.0.0/8', provider: 'AWS' },
  { range: '104.0.0.0/8', provider: 'Cloudflare' },
  { range: '157.0.0.0/8', provider: 'Rackspace' },
  { range: '167.0.0.0/8', provider: 'AWS' },
  { range: '172.0.0.0/8', provider: 'Various' },
  { range: '198.0.0.0/8', provider: 'Various' }
];

const vpnASNPatterns = [
  'NORDVPN', 'EXPRESSVPN', 'CYBERGHOST', 'SURFSHARK', 'PUREVPN',
  'IPVANISH', 'HIDEMYASS', 'PROTONVPN', 'TUNNELBEAR', 'WINDSCRIBE',
  'MULLVAD', 'AIRVPN', 'VYPRVPN', 'PRIVATEVPN', 'STRONGVPN'
];

function ipToLong(ip: string): number {
  const parts = ip.split('.');
  return ((parseInt(parts[0]) << 24) | (parseInt(parts[1]) << 16) | (parseInt(parts[2]) << 8) | parseInt(parts[3])) >>> 0;
}

function isIPInRange(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  return (ipToLong(ip) & mask) === (ipToLong(range) & mask);
}

async function getGeoLocation(ip: string): Promise<GeoLocation | null> {
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,city,lat,lon,isp,org,as`, {
      timeout: 3000
    });
    
    if (response.data.status === 'success') {
      return {
        country: response.data.country || 'Unknown',
        countryCode: response.data.countryCode || 'XX',
        region: response.data.region || '',
        city: response.data.city || '',
        lat: response.data.lat || 0,
        lon: response.data.lon || 0,
        isp: response.data.isp || 'Unknown',
        org: response.data.org || 'Unknown',
        as: response.data.as || '',
        isProxy: false,
        isVPN: false,
        isDatacenter: false
      };
    }
  } catch (error) {
    console.error('GeoIP lookup failed:', error);
  }
  
  return null;
}

function checkDatacenterIP(ip: string): boolean {
  return datacenterIPRanges.some(dc => isIPInRange(ip, dc.range));
}

function checkVPNASN(asn: string): boolean {
  const asnUpper = asn.toUpperCase();
  return vpnASNPatterns.some(vpn => asnUpper.includes(vpn));
}

function checkProxy(isp: string, org: string): boolean {
  const proxyKeywords = ['proxy', 'vpn', 'hosting', 'datacenter', 'cloud', 'server'];
  const combined = `${isp} ${org}`.toLowerCase();
  return proxyKeywords.some(kw => combined.includes(kw));
}

export async function validateIP(
  ip: string,
  config: Partial<SecurityConfig> = {}
): Promise<IPValidationResult> {
  const settings = { ...defaultConfig, ...config };

  if (settings.blockedIPs.includes(ip)) {
    return {
      isAllowed: false,
      reason: 'IP is explicitly blocked',
      riskLevel: 'critical'
    };
  }

  if (settings.allowedIPs.length > 0) {
    const isExplicitlyAllowed = settings.allowedIPs.some(cidr => {
      if (!cidr.includes('/')) return cidr === ip;
      return isIPInRange(ip, cidr);
    });
    
    if (!isExplicitlyAllowed) {
      return {
        isAllowed: false,
        reason: 'IP not in allowed list',
        riskLevel: 'high'
      };
    }
  }

  const geoLocation = await getGeoLocation(ip);

  if (geoLocation) {
    if (settings.blockedCountries.includes(geoLocation.countryCode)) {
      return {
        isAllowed: false,
        reason: `Country ${geoLocation.countryCode} is blocked`,
        geoLocation,
        riskLevel: 'high'
      };
    }

    if (settings.allowedCountries.length > 0 && !settings.allowedCountries.includes(geoLocation.countryCode)) {
      return {
        isAllowed: false,
        reason: `Country ${geoLocation.countryCode} not in allowed list`,
        geoLocation,
        riskLevel: 'medium'
      };
    }

    if (settings.vpnDetection && checkVPNASN(geoLocation.as)) {
      return {
        isAllowed: false,
        reason: 'VPN detected',
        geoLocation: { ...geoLocation, isVPN: true },
        riskLevel: 'high'
      };
    }

    if (settings.proxyDetection && checkProxy(geoLocation.isp, geoLocation.org)) {
      return {
        isAllowed: false,
        reason: 'Proxy detected',
        geoLocation: { ...geoLocation, isProxy: true },
        riskLevel: 'medium'
      };
    }

    if (settings.datacenterIPBlock && checkDatacenterIP(ip)) {
      return {
        isAllowed: false,
        reason: 'Datacenter IP not allowed',
        geoLocation: { ...geoLocation, isDatacenter: true },
        riskLevel: 'medium'
      };
    }
  }

  return {
    isAllowed: true,
    geoLocation: geoLocation || undefined,
    riskLevel: geoLocation?.isVPN || geoLocation?.isProxy ? 'medium' : 'low'
  };
}

export function isAllowedCountry(countryCode: string, allowed: string[], blocked: string[]): boolean {
  if (blocked.includes(countryCode)) return false;
  if (allowed.length > 0 && !allowed.includes(countryCode)) return false;
  return true;
}

export function getSecurityConfig(): SecurityConfig {
  return defaultConfig;
}