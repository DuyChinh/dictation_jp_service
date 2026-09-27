import { Router } from "express";
import type { FilterQuery } from "mongoose";
import { z } from "zod";
import { Admin, ADMIN_ROLES, type IAdmin } from "../../../models/Admin.js";
import { AuditLog, type IAuditLog } from "../../../models/AuditLog.js";
import { AppError } from "../../../shared/errors.js";
import { hashPassword, requirePerm, toAdminView } from "../adminAuth.js";
import {
  ah,
  idParam,
  audit,
  currentAdmin,
  idsBody,
  parseBody,
  parsePaging,
  queryString,
  rethrowDuplicate,
  searchRegex,
} from "../helpers.js";

const createBody = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/, "use 3–40 of a-z, 0-9, . _ -"),
  displayName: z.string().trim().max(100).default(""),
  password: z.string().min(8).max(200),
  role: z.enum(ADMIN_ROLES),
});

const updateBody = z
  .object({
    displayName: z.string().trim().max(100),
    password: z.string().min(8).max(200),
    role: z.enum(ADMIN_ROLES),
    status: z.enum(["active", "disabled"]),
  })
  .partial();

/** Throws unless at least one active super admin is left once `leaving` are gone or demoted. */
async function assertSuperAdminRemains(leaving: string[]) {
  const remaining = await Admin.countDocuments({
    role: "super_admin",
    status: "active",
    _id: { $nin: leaving },
  });
  if (remaining === 0) throw new AppError("LAST_SUPER_ADMIN", "At least one active super admin must remain", 409);
}

export function createAdminsAdminRouter(): Router {
  const r = Router();
  const read = requirePerm("admins", "read");
  const write = requirePerm("admins", "write");

  r.get(
    "/",
    read,
    ah(async (_req, res) => {
      const admins = await Admin.find().sort({ createdAt: 1 });
      res.json({ items: admins.map(toAdminView) });
    }),
  );

  r.post(
    "/",
    write,
    ah(async (req, res) => {
      const body = parseBody(createBody, req.body);
      try {
        const admin = await Admin.create({
          username: body.username,
          displayName: body.displayName || body.username,
          role: body.role,
          passwordHash: await hashPassword(body.password),
        });
        await audit(req, currentAdmin(res), "admin_create", admin.username, admin.role);
        res.status(201).json({ admin: toAdminView(admin) });
      } catch (err) {
        rethrowDuplicate(err, "This username is taken");
      }
    }),
  );

  r.patch(
    "/:id",
    write,
    ah(async (req, res) => {
      const id = idParam(req);
      const body = parseBody(updateBody, req.body);
      const me = currentAdmin(res);
      const admin = await Admin.findById(id);
      if (!admin) throw new AppError("NOT_FOUND", "Admin not found", 404);

      const isSelf = String(admin._id) === String(me._id);
      if (isSelf && ((body.role && body.role !== admin.role) || body.status === "disabled")) {
        throw new AppError("SELF_LOCKOUT", "You can't change your own role or disable yourself", 409);
      }
      const losesSuper =
        admin.role === "super_admin" &&
        ((body.role !== undefined && body.role !== "super_admin") || body.status === "disabled");
      if (losesSuper) await assertSuperAdminRemains([String(admin._id)]);

      if (body.displayName !== undefined) admin.displayName = body.displayName;
      if (body.role) admin.role = body.role;
      if (body.status) admin.status = body.status;
      // A new password or a disabled account ends that admin's sessions.
      if (body.password) admin.passwordHash = await hashPassword(body.password);
      if (body.password || body.status === "disabled") admin.tokenVersion += 1;
      await admin.save();

      const changed = Object.keys(body).map((k) => (k === "password" ? "password (reset)" : k));
      await audit(req, me, "admin_update", admin.username, changed.join(", "));
      res.json({ admin: toAdminView(admin) });
    }),
  );

  async function removeAdmins(ids: string[], me: IAdmin): Promise<string[]> {
    if (ids.includes(String(me._id))) {
      throw new AppError("SELF_DELETE", "You can't delete your own account", 409);
    }
    await assertSuperAdminRemains(ids);
    const names = (await Admin.find({ _id: { $in: ids } }, { username: 1 }).lean()).map((a) => a.username);
    await Admin.deleteMany({ _id: { $in: ids } });
    return names;
  }

  r.delete(
    "/:id",
    write,
    ah(async (req, res) => {
      const id = idParam(req);
      const me = currentAdmin(res);
      const names = await removeAdmins([id], me);
      if (!names.length) throw new AppError("NOT_FOUND", "Admin not found", 404);
      await audit(req, me, "admin_delete", names[0]);
      res.json({ deleted: 1 });
    }),
  );

  r.post(
    "/bulk-delete",
    write,
    ah(async (req, res) => {
      const { ids } = parseBody(idsBody, req.body);
      const me = currentAdmin(res);
      const names = await removeAdmins(ids, me);
      await audit(req, me, "admin_bulk_delete", `${names.length} admins`, names.join(", "));
      res.json({ deleted: names.length });
    }),
  );

  return r;
}

export function createAuditAdminRouter(): Router {
  const r = Router();

  r.get(
    "/",
    requirePerm("admins", "read"),
    ah(async (req, res) => {
      const { page, limit, skip } = parsePaging(req);
      const q = queryString(req, "q");
      const filter: FilterQuery<IAuditLog> = {};
      if (q) {
        const rx = searchRegex(q);
        filter.$or = [{ action: rx }, { target: rx }, { adminUsername: rx }, { detail: rx }];
      }
      const [items, total] = await Promise.all([
        AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        AuditLog.countDocuments(filter),
      ]);
      res.json({
        items: items.map((e) => ({
          id: String(e._id),
          adminUsername: e.adminUsername,
          action: e.action,
          target: e.target,
          detail: e.detail,
          ip: e.ip,
          createdAt: e.createdAt,
        })),
        total,
        page,
        limit,
      });
    }),
  );

  return r;
}
