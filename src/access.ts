// Email-list access gating shared by Amazonia Tech products (Vine, Planta, …).
// Build the predicates once from env/config at startup:
//
//   const access = createAccess({
//     adminEmails: process.env.ADMIN_EMAILS,
//     compEmails: process.env.COMP_EMAILS,
//     defaults: ['mkswd@hotmail.com'],
//   });
//   access.isAdmin(user.email); access.isComp(user.email);

function parseList(value: string | undefined, defaults: string[]): string[] {
  return (value ?? defaults.join(','))
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export interface AccessConfig {
  adminEmails?: string;
  compEmails?: string;
  defaults?: string[];
}

export function createAccess(config: AccessConfig = {}) {
  const defaults = config.defaults ?? [];
  const admins = parseList(config.adminEmails, defaults);
  const comps = parseList(config.compEmails, defaults);
  const has = (list: string[]) => (email: string | null | undefined) =>
    list.includes((email ?? '').toLowerCase());
  return {
    isAdmin: has(admins),
    isComp: has(comps),
  };
}
