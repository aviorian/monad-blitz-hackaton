const NEYNAR_BULK_USER_ENDPOINT = "https://api.neynar.com/v2/farcaster/user/bulk";
const DEFAULT_API_KEY = "NEYNAR_API_DOCS";

const envApiKey = import.meta.env.VITE_NEYNAR_API_KEY?.trim();
const resolvedApiKey = envApiKey && envApiKey.length > 0 ? envApiKey : DEFAULT_API_KEY;

if (!envApiKey) {
  console.warn("VITE_NEYNAR_API_KEY is not set. Falling back to the public Neynar docs key.");
}

export interface NeynarUserProfileBio {
  text?: string;
}

export interface NeynarUserProfile {
  bio?: NeynarUserProfileBio;
}

export interface NeynarUser {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
  profile?: NeynarUserProfile;
  follower_count: number;
  following_count: number;
  power_badge: boolean;
  custody_address?: string;
  score?: number;
  verified_addresses?: {
    eth_addresses?: string[];
    sol_addresses?: string[];
  };
}

interface NeynarBulkUserResponse {
  users?: NeynarUser[];
}

export interface FetchNeynarUsersOptions {
  signal?: AbortSignal;
  apiKey?: string;
  experimental?: boolean;
}

const buildHeaders = (apiKey: string, experimental: boolean) => ({
  "x-api-key": apiKey,
  "x-neynar-experimental": experimental ? "true" : "false",
});

const toUrlSearchParams = (fids: number[]) => {
  const params = new URLSearchParams();
  params.set("fids", Array.from(new Set(fids)).join(","));
  return params.toString();
};

export async function fetchNeynarUsers(
  fids: number[],
  { signal, apiKey = resolvedApiKey, experimental = false }: FetchNeynarUsersOptions = {},
): Promise<NeynarUser[]> {
  if (fids.length === 0) {
    return [];
  }

  const query = toUrlSearchParams(fids);
  const response = await fetch(`${NEYNAR_BULK_USER_ENDPOINT}?${query}`, {
    method: "GET",
    headers: buildHeaders(apiKey, experimental),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Neynar request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as NeynarBulkUserResponse;
  return payload.users ?? [];
}

export const getResolvedNeynarApiKey = () => resolvedApiKey;
