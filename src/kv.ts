import type { Env, RoleMenu } from "./types";

const KEY_PREFIX = "menu:";

function menuKey(messageId: string): string {
  return `${KEY_PREFIX}${messageId}`;
}

export async function getMenu(env: Env, messageId: string): Promise<RoleMenu | null> {
  return env.ROLE_MENUS.get<RoleMenu>(menuKey(messageId), "json");
}

export async function putMenu(env: Env, messageId: string, menu: RoleMenu): Promise<void> {
  await env.ROLE_MENUS.put(menuKey(messageId), JSON.stringify(menu));
}

export async function deleteMenu(env: Env, messageId: string): Promise<void> {
  await env.ROLE_MENUS.delete(menuKey(messageId));
}

export async function listMenus(env: Env): Promise<Array<{ messageId: string; menu: RoleMenu }>> {
  const results: Array<{ messageId: string; menu: RoleMenu }> = [];
  let cursor: string | undefined;
  do {
    const page = await env.ROLE_MENUS.list({ prefix: KEY_PREFIX, cursor });
    for (const key of page.keys) {
      const menu = await env.ROLE_MENUS.get<RoleMenu>(key.name, "json");
      if (menu) results.push({ messageId: key.name.slice(KEY_PREFIX.length), menu });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return results;
}
