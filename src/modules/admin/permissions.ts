import type { AdminRole } from "../../models/Admin.js";

export const ADMIN_AREAS = ["users", "payments", "catalog", "content", "feedback", "admins"] as const;
export type AdminArea = (typeof ADMIN_AREAS)[number];
export type AccessLevel = "none" | "read" | "write";

/** What each role may do in each area; `catalog` is plans and coupons, `feedback` the public board. */
export const ROLE_ACCESS: Record<AdminRole, Record<AdminArea, AccessLevel>> = {
  super_admin: { users: "write", payments: "write", catalog: "write", content: "write", feedback: "write", admins: "write" },
  content: { users: "none", payments: "none", catalog: "none", content: "write", feedback: "read", admins: "none" },
  support: { users: "write", payments: "read", catalog: "none", content: "read", feedback: "write", admins: "none" },
  accountant: { users: "read", payments: "write", catalog: "write", content: "none", feedback: "none", admins: "none" },
};

export function canAccess(role: AdminRole, area: AdminArea, need: "read" | "write"): boolean {
  const level = ROLE_ACCESS[role]?.[area] ?? "none";
  return need === "read" ? level !== "none" : level === "write";
}
