import { DefaultApiKeyRole } from '@apillon/lib';
import { SetMetadata } from '@nestjs/common';

export interface ApiKeyPermissionPass {
  role: DefaultApiKeyRole;
  serviceType: number;
}

export const API_KEY_PERMISSION_KEY = 'apiKeyPermissions';

export const ApiKeyPermissions = (
  ...permissions: Array<ApiKeyPermissionPass>
) => SetMetadata(API_KEY_PERMISSION_KEY, permissions);
