import { SetMetadata } from '@nestjs/common';
import {
  DefaultApiKeyRole,
  DefaultUserRole,
  PermissionLevel,
  PermissionType,
} from '@apillon/lib';

export interface PermissionPass {
  permission?: number;
  type?: PermissionType;
  level?: PermissionLevel;
  role?: DefaultUserRole | DefaultUserRole[] | DefaultApiKeyRole;
}

export const PERMISSION_KEY = 'permissions';

export const Permissions = (...permissions: Array<PermissionPass>) =>
  SetMetadata(PERMISSION_KEY, permissions);
