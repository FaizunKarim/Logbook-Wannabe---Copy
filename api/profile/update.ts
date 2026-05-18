import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrismaClient } from "../_lib/prisma.js";
import { verifyToken, getTokenFromHeader } from "../_lib/jwt.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = getTokenFromHeader(req.headers.authorization);
  const payload = verifyToken(token || "");

  if (!payload) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { full_name } = req.body;

    if (!full_name?.trim()) {
      return res.status(400).json({ error: "Nama lengkap harus diisi" });
    }

    const prisma = getPrismaClient();
    const profile = await prisma.profile.update({
      where: { userId: payload.id },
      data: { fullName: full_name.trim() },
    });

    return res.status(200).json({
      message: "Profil berhasil diperbarui",
      user: {
        id: payload.id,
        email: payload.email,
        full_name: profile.fullName,
        role: payload.role,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
}