import type { NextFunction, Request, RequestHandler, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { AuditLog } from "../../models/AuditLog.js";
import type { IAdmin } from "../../models/Admin.js";
import { AppError } from "../../shared/errors.js";

/** Express 4 does not catch rejected promises; this hands them to the error middleware. */
export function ah(fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

/** The signed-in admin, set by requireAdmin. */
export function currentAdmin(res: Response): IAdmin {
  return res.locals.admin as IAdmin;
}

export function parsePaging(req: Request): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 20)));
  return { page, limit, skip: (page - 1) * limit };
}

export function queryString(req: Request, key: string, max = 200): string {
  const v = req.query[key];
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** A user-typed search term as a safe case-insensitive regex. */
export function searchRegex(q: string): RegExp {
  return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

export const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");
export const idsBody = z.object({ ids: z.array(objectId).min(1).max(500) });

/** Parses a body with zod and turns failures into a 400 naming the first bad field. */
export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.join(".") || "body";
    throw new AppError("VALIDATION_ERROR", `${field}: ${issue?.message ?? "invalid"}`, 400);
  }
  return result.data;
}

/** The `:id` route param, 404 unless it is an ObjectId. */
export function idParam(req: Request): string {
  const id = req.params.id;
  if (typeof id !== "string" || !mongoose.isValidObjectId(id)) throw new AppError("NOT_FOUND", "Not found", 404);
  return id;
}

/** Duplicate-key errors from a unique index, as a 409. */
export function rethrowDuplicate(err: unknown, message: string): never {
  if ((err as { code?: number })?.code === 11000) throw new AppError("DUPLICATE", message, 409);
  throw err;
}

export function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim();
  return (first || req.ip || "").slice(0, 64);
}

export async function audit(
  req: Request,
  admin: Pick<IAdmin, "_id" | "username"> | null,
  action: string,
  target = "",
  detail = "",
): Promise<void> {
  try {
    await AuditLog.create({
      adminId: admin?._id ?? null,
      adminUsername: admin?.username ?? "",
      action,
      target: target.slice(0, 300),
      detail: detail.slice(0, 1000),
      ip: clientIp(req),
    });
  } catch (err) {
    // A missed log line must not undo the action it describes.
    console.error("[admin] audit write failed:", err);
  }
}
