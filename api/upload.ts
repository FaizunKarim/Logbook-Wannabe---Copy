import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { verifyToken, getTokenFromHeader } from "./_lib/jwt";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = getTokenFromHeader(req.headers.authorization);
  const payload = verifyToken(token || "");

  if (!payload) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { searchParams } = new URL(req.url || "", `http://${req.headers.host}`);
    const filename = searchParams.get("filename");

    if (!filename) {
      return res.status(400).json({ error: "filename query parameter required" });
    }

    const blob = await put(filename, req, {
      access: "public",
      addRandomSuffix: true,
    });

    return res.status(200).json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Gagal mengupload file" });
  }
}