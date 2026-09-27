import { Router } from "express";
import { History } from "../../../models/History.js";
import { LessonActivity } from "../../../models/LessonActivity.js";
import { Payment } from "../../../models/Payment.js";
import { User } from "../../../models/User.js";
import type { AppConfig } from "../../../config.js";
import type { StaticContentRepository } from "../../content/StaticContentRepository.js";
import { ah, currentAdmin } from "../helpers.js";
import { canAccess } from "../permissions.js";
import { toPaymentRow } from "./paymentsRoutes.js";

const TZ = "Asia/Ho_Chi_Minh";
const DAY_MS = 86400000;
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export function createOverviewAdminRouter(repo: StaticContentRepository, cfg: AppConfig): Router {
  const r = Router();

  r.get(
    "/",
    ah(async (req, res) => {
      const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
      const now = Date.now();
      const since = new Date(now - days * DAY_MS);
      const prevSince = new Date(now - 2 * days * DAY_MS);
      const role = currentAdmin(res).role;

      const [totalUsers, newUsers, paidUsers, activeRows, topRows] = await Promise.all([
        User.estimatedDocumentCount(),
        User.countDocuments({ createdAt: { $gte: since } }),
        User.countDocuments({ plan: { $nin: ["free", null, ""] } }),
        LessonActivity.aggregate<{ n: number }>([
          { $match: { lastActiveAt: { $gte: since } } },
          { $group: { _id: "$userId" } },
          { $count: "n" },
        ]),
        History.aggregate<{ _id: string; sessions: number }>([
          { $match: { updatedAt: { $gte: since } } },
          { $group: { _id: "$lessonId", sessions: { $sum: 1 } } },
          { $sort: { sessions: -1 } },
          { $limit: 5 },
        ]),
      ]);

      let payments = null;
      if (canAccess(role, "payments", "read")) {
        const [daily, prev, pending, recent] = await Promise.all([
          Payment.aggregate<{ _id: string; sum: number; count: number }>([
            { $match: { status: "succeeded", paidAt: { $gte: since } } },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: TZ } },
                sum: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
          ]),
          Payment.aggregate<{ sum: number }>([
            { $match: { status: "succeeded", paidAt: { $gte: prevSince, $lt: since } } },
            { $group: { _id: null, sum: { $sum: "$amount" } } },
          ]),
          Payment.countDocuments({ status: "pending" }),
          Payment.find().sort({ createdAt: -1 }).limit(5).lean(),
        ]);
        const byDay = new Map(daily.map((d) => [d._id, d.sum]));
        const series = Array.from({ length: days }, (_, i) => {
          const date = dayKey.format(new Date(now - (days - 1 - i) * DAY_MS));
          return { date, amount: byDay.get(date) ?? 0 };
        });
        payments = {
          revenue: series.reduce((a, d) => a + d.amount, 0),
          previousRevenue: prev[0]?.sum ?? 0,
          succeeded: daily.reduce((a, d) => a + d.count, 0),
          pending,
          series,
          recent: recent.map(toPaymentRow),
        };
      }

      const published = repo.list({ statuses: [...cfg.allowStatuses] }).length;
      const hidden = repo.all().filter((m) => repo.isHidden(m.package.id)).length;

      res.json({
        days,
        users: { total: totalUsers, new: newUsers, active: activeRows[0]?.n ?? 0, paid: paidUsers },
        payments,
        content: { published, hidden, problems: repo.problems() },
        topLessons: topRows.map((t) => ({
          lessonId: t._id,
          title: repo.get(t._id)?.package.title ?? null,
          sessions: t.sessions,
        })),
      });
    }),
  );

  return r;
}
