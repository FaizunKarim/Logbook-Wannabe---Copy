import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../_lib/prisma.js";
import { verifyToken, getTokenFromHeader } from "../_lib/jwt.js";
import bcrypt from "bcryptjs";

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
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password minimal 6 karakter" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: payload.id },
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      message: "Password berhasil diubah",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
}