import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../_lib/prisma.js";
import { verifyToken, getTokenFromHeader } from "../_lib/jwt.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = getTokenFromHeader(req.headers.authorization);
  const payload = verifyToken(token || "");

  if (!payload || payload.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin only" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = req.query.userId as string | undefined;

    if (userId) {
      // Single user with their profile and reports
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          reports: {
            orderBy: { createdAt: "desc" },
            include: { profile: { select: { fullName: true } } },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          profile: user.profile,
          reports: user.reports,
        },
      });
    }

    // All users with report counts
    const users = await prisma.user.findMany({
      where: {
        profile: { role: { not: "admin" } },
      },
      include: {
        profile: true,
        _count: { select: { reports: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = users.map((u) => ({
      id: u.id,
      user_id: u.id,
      full_name: u.profile?.fullName,
      email: u.email,
      reportCount: u._count.reports,
    }));

    return res.status(200).json({ users: result });
  } catch (error) {
    console.error("Admin fetch users error:", error);
    return res.status(500).json({ error: "Gagal memuat data" });
  }
}