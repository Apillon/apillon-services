export interface IEmbeddedWallet {
  integration_uuid: string;
  project_uuid: string;
}

export enum ResourceType {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
}
