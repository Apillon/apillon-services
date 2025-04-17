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
      https?: string | null;
      wss?: string | null;
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
  total_responses: number;
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

export type DwellirGetUsageV2Response = {
  rows: {
    // Example value: "2024-11-11T00:00:00Z"
    datetime: string;
    api_key: string;
    rpc_method: string;
    requests: number;
    responses: number;
    domain: string;
  }[];
};

export type DwellirGetAllUsagesResponse = Record<
  string,
  DwellirGetUsageResponse
>;

export type DwellirChangeSubscriptionResponse = {
  name: string;
  id: number;
  rate_limit: number;
  monthly_quota: number;
  api_keys_limit: number;
  daily_quota: number;
  type: string;
  version: string;
  created_at: string;
  updated_at: string;
};
