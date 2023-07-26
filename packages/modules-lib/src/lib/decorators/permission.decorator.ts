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
  SetMetadata<string, PermissionPass[]>(PERMISSION_KEY, permissions);

export const ProjectPermissions = () =>
  SetMetadata<string, PermissionPass[]>(PERMISSION_KEY, [
    {
      role: [
        DefaultUserRole.PROJECT_OWNER,
        DefaultUserRole.PROJECT_ADMIN,
        DefaultUserRole.PROJECT_USER,
        DefaultUserRole.ADMIN,
      ],
    },
  ]);

export const UserAdminPermissions = () =>
  SetMetadata<string, PermissionPass[]>(PERMISSION_KEY, [
    {
      role: [DefaultUserRole.USER, DefaultUserRole.ADMIN],
    },
  ]);
