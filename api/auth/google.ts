import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";
import { getPrismaClient } from "../_lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    console.error("Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!GOOGLE_CLIENT_ID) {
    console.error("GOOGLE_CLIENT_ID not configured");
    return res.status(500).json({ error: "GOOGLE_CLIENT_ID belum dikonfigurasi di Vercel" });
  }

  try {
    const { id_token } = req.body;

    if (!id_token) {
      console.error("id_token missing in request body");
      return res.status(400).json({ error: "id_token required" });
    }

    // Verify Google token
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`
    );

    if (!verifyRes.ok) {
      const errText = await verifyRes.text();
      console.error("Google token verification failed:", verifyRes.status, errText);
      return res.status(401).json({ error: "Google token tidak valid" });
    }

    const googlePayload: any = await verifyRes.json();
    console.log("Google Payload:", googlePayload);

    // Verify audience
    if (googlePayload.aud !== GOOGLE_CLIENT_ID) {
      if (googlePayload.azp !== GOOGLE_CLIENT_ID) { // Also check for aliases
        console.error("Token audience mismatch:", googlePayload.aud, googlePayload.azp, GOOGLE_CLIENT_ID);
        return res.status(401).json({ error: "Token tidak sesuai dengan aplikasi ini" });
      }
    }

    const email = googlePayload.email;
    const fullName = googlePayload.name || googlePayload.email?.split("@")[0];
    const googleId = googlePayload.sub;
    const picture = googlePayload.picture;

    if (!email) {
      console.error("Email missing from Google payload");
      return res.status(400).json({ error: "Email tidak tersedia dari akun Google" });
    }

    const prisma = getPrismaClient();
    let user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (user) {
      console.log("Existing user found:", user.id);
      if (!user.googleId) {
        console.log("Updating googleId for existing user:", user.id);
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
          include: { profile: true },
        });
      }
    } else {
      console.log("Creating new user with Google:", email);
      user = await prisma.$transaction(async (tx) => {
        return tx.user.create({
          data: {
            email,
            googleId,
            emailVerified: new Date(),
            profile: {
              create: { fullName },
            },
          },
          include: { profile: true },
        });
      });
      console.log("New user created:", user.id);
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.profile?.role || "user",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.profile?.fullName || fullName,
        role: user.profile?.role || "user",
        picture: picture || null,
      },
    });
  } catch (error: any) {
    console.error("Google auth handler caught error:", error?.message || error, error?.stack);
    return res.status(500).json({
      error: "Gagal autentikasi Google: " + (error?.message || "Unknown error"),
    });
  }
}
