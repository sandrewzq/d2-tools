export type BungieOAuthToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  membership_id?: string;
  created_at?: string;
};

export type AuthLoginResult = {
  ok: true;
  message: string;
};

const authorizeUrl = "https://www.bungie.net/en/oauth/authorize";

export function buildBungieAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(authorizeUrl);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  url.searchParams.set("redirect_uri", input.redirectUri);
  return url.toString();
}
