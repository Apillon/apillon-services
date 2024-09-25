export type DwellirGetAccessTokenResponse = {
  access_token: string;
  token_type: string;
};

export type DwellirCreateUserResponse = {
  id: string;
  email: string;
  name: string;
};

export type DwellirCreateApiKeyResponse = {
  id: number;
  api_key: string;
};

export type DwellirGetApiKeyResponse = DwellirCreateApiKeyResponse;

export type DwellirGetEndpointsResponse = {
  id: number;
  name: string;
  networks: {
    id: number;
    name: string;
    nodes: {
      id: number;
      https: string;
      wss: string;
      node_type: string;
      type: string;
      version: string;
    }[];
    type: string;
    version: string;
  }[];
}[];

export type DwellirGetUsageResponse = {
  total_requests: number;
  total_response: number;
  by_key: Record<
    string,
    Record<
      string,
      {
        responses: number;
        requests: number;
        by_method: Record<string, { requests: number; responses: number }>;
      }
    >
  >;
};
