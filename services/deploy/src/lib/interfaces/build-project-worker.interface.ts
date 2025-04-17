export interface BuildProjectWorkerInterface {
  deploymentBuildId: number;
  websiteUuid: string;
  buildCommand?: string;
  installCommand?: string;
  buildDirectory: string;
  apiKey: string;
  apiSecret: string;
  url: string;
  variables: {
    key: string;
    value: string;
  }[];
  isTriggeredByWebhook?: boolean;
  isRedeploy?: boolean;
}
