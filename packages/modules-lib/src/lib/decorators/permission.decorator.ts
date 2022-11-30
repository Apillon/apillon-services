import { DefaultUserRole, PermissionLevel, PermissionType } from '@apillon/lib';
import { SetMetadata } from '@nestjs/common';

export interface PermissionPass {
  permission?: number;
  type?: PermissionType;
  level?: PermissionLevel;
  role?: DefaultUserRole | DefaultUserRole[];
}

export const PERMISSION_KEY = 'permissions';

export const Permissions = (...permissions: Array<PermissionPass>) =>
  SetMetadata(PERMISSION_KEY, permissions);
