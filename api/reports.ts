import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "./_lib/prisma.js";
import { verifyToken, getTokenFromHeader } from "./_lib/jwt.js.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = getTokenFromHeader(req.headers.authorization);
  const payload = verifyToken(token || "");

  if (!payload) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const reportId = req.query.id as string | undefined;

  // ---- DELETE ----
  if (req.method === "DELETE") {
    if (!reportId) return res.status(400).json({ error: "Report ID required" });
    try {
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) return res.status(404).json({ error: "Laporan tidak ditemukan" });
      
      if (payload.role !== "admin" && report.userId !== payload.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await prisma.notification.deleteMany({ where: { reportId } });
      await prisma.report.delete({ where: { id: reportId } });
      return res.status(200).json({ message: "Laporan berhasil dihapus" });
    } catch (error) {
      return res.status(500).json({ error: "Gagal menghapus laporan" });
    }
  }

  // ---- PUT (EDIT & ACC) ----
  if (req.method === "PUT") {
    if (!reportId) return res.status(400).json({ error: "Report ID required" });
    try {
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) return res.status(404).json({ error: "Laporan tidak ditemukan" });

      const { title, description, log_date, attachment, status } = req.body;
      const updateData: Record<string, unknown> = {};

      if (status !== undefined) {
        if (payload.role !== "admin") return res.status(403).json({ error: "Hanya admin" });
        updateData.status = status;
      }

      if (title !== undefined || description !== undefined) {
        if (payload.role !== "admin" && report.userId !== payload.id) return res.status(403).json({ error: "Forbidden" });
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (log_date !== undefined) updateData.logDate = new Date(log_date);
        if (attachment !== undefined) updateData.attachment = attachment;
      }

      const updated = await prisma.report.update({
        where: { id: reportId },
        data: updateData,
        include: { profile: true },
      });
      return res.status(200).json({ message: "Laporan diperbarui", report: updated });
    } catch (error) {
      return res.status(500).json({ error: "Gagal memperbarui laporan" });
    }
  }

  // ---- POST ----
  if (req.method === "POST") {
    try {
      const { title, description, log_date, attachment } = req.body;
      if (!title || !description) return res.status(400).json({ error: "Wajib diisi" });

      const report = await prisma.report.create({
        data: {
          userId: payload.id,
          title,
          description,
          logDate: log_date ? new Date(log_date) : new Date(),
          attachment: attachment || null,
        },
        include: { profile: true },
      });
      return res.status(201).json({ message: "Laporan dibuat", report });
    } catch (error) {
      return res.status(500).json({ error: "Gagal membuat laporan" });
    }
  }

  // ---- GET ----
  if (req.method === "GET") {
    try {
      const where: Record<string, unknown> = {};
      if (payload.role !== "admin") where.userId = payload.id;

      const reports = await prisma.report.findMany({
        where,
        orderBy: { logDate: "desc" },
        include: { profile: { select: { fullName: true } } },
      });
      return res.status(200).json({ reports });
    } catch (error) {
      return res.status(500).json({ error: "Gagal memuat laporan" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}