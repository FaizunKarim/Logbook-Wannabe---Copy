import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../_lib/prisma.js";
import { verifyToken, getTokenFromHeader } from "../_lib/jwt.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1. Verifikasi Token
  const token = getTokenFromHeader(req.headers.authorization);
  const payload = verifyToken(token || "");

  // 2. Pastikan yang melakukan request ini BENAR-BENAR seorang Admin
  if (!payload || payload.role !== "admin") {
    return res.status(403).json({ error: "Akses ditolak. Hanya admin yang bisa melakukan ini." });
  }

  const { targetUserId, newRole } = req.body;

  if (!targetUserId || !newRole) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  try {
    // 3. Update role di tabel Profile
    await prisma.profile.update({
      where: { userId: targetUserId },
      data: { role: newRole },
    });

    return res.status(200).json({ message: "Berhasil mengubah role pengguna" });
  } catch (error) {
    console.error("Update role error:", error);
    return res.status(500).json({ error: "Gagal memperbarui role pengguna" });
  }
}