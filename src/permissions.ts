/**
 * Discord role hierarchy: a member (including a bot) can only grant/revoke
 * roles positioned strictly below their own highest role. Equal or higher
 * position is rejected by Discord's API with a 403.
 */
export function canManageRole(botTopRolePosition: number, targetRolePosition: number): boolean {
  return targetRolePosition < botTopRolePosition;
}

const MANAGE_ROLES = 1n << 28n;

export function hasManageRoles(permissions: string): boolean {
  return (BigInt(permissions) & MANAGE_ROLES) === MANAGE_ROLES;
}
