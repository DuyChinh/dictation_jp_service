import type { AdminRole } from "../../models/Admin.js";

export const ADMIN_AREAS = ["users", "payments", "catalog", "content", "admins"] as const;
export type AdminArea = (typeof ADMIN_AREAS)[number];
export type AccessLevel = "none" | "read" | "write";

/** What each role may do in each area; `catalog` is plans and coupons. */
export const ROLE_ACCESS: Record<AdminRole, Record<AdminArea, AccessLevel>> = {
  super_admin: { users: "write", payments: "write", catalog: "write", content: "write", admins: "write" },
  content: { users: "none", payments: "none", catalog: "none", content: "write", admins: "none" },
  support: { users: "write", payments: "read", catalog: "none", content: "read", admins: "none" },
  accountant: { users: "read", payments: "write", catalog: "write", content: "none", admins: "none" },
};

export function canAccess(role: AdminRole, area: AdminArea, need: "read" | "write"): boolean {
  const level = ROLE_ACCESS[role]?.[area] ?? "none";
  return need === "read" ? level !== "none" : level === "write";
}
