import { SetMetadata } from '@nestjs/common';
import { DefaultUserRole, PermissionLevel, PermissionType } from 'at-lib';

export interface PermissionPass {
  permission?: number;
  type?: PermissionType;
  level?: PermissionLevel;
  role?: DefaultUserRole;
}

export const PERMISSION_KEY = 'permissions';

export const Permissions = (...permissions: Array<PermissionPass>) =>
  SetMetadata(PERMISSION_KEY, permissions);
