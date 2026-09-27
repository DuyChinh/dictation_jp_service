import { Router } from "express";
import type { AppConfig } from "../../config.js";
import type { StaticContentRepository } from "../content/StaticContentRepository.js";
import { requireAdmin } from "./adminAuth.js";
import { createAdminsAdminRouter, createAuditAdminRouter } from "./routes/adminsRoutes.js";
import { createAdminAuthRouter } from "./routes/authRoutes.js";
import { createCatalogAdminRouter } from "./routes/catalogRoutes.js";
import { createContentAdminRouter } from "./routes/contentRoutes.js";
import { createOverviewAdminRouter } from "./routes/overviewRoutes.js";
import { createPaymentsAdminRouter } from "./routes/paymentsRoutes.js";
import { createUsersAdminRouter } from "./routes/usersRoutes.js";

/** Everything under /api/admin. Only /auth/login is reachable without an admin token. */
export function createAdminRouter(repo: StaticContentRepository, cfg: AppConfig): Router {
  const r = Router();
  r.use("/auth", createAdminAuthRouter());

  r.use(requireAdmin);
  r.use("/overview", createOverviewAdminRouter(repo, cfg));
  r.use("/users", createUsersAdminRouter(repo));
  r.use("/payments", createPaymentsAdminRouter());
  r.use("/catalog", createCatalogAdminRouter());
  r.use("/content", createContentAdminRouter(repo));
  r.use("/admins", createAdminsAdminRouter());
  r.use("/audit", createAuditAdminRouter());
  return r;
}
