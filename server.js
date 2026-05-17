import { createServer } from "http";
import { parse } from "url";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { put } from "@vercel/blob";

const prisma = new PrismaClient({
  accelerateUrl: process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

function getBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function handler(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;
  const authHeader = req.headers.authorization;
  const payload = verifyToken(authHeader);

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (method === "OPTIONS") return res.end();

  // GET /api/auth/config
  if (pathname === "/api/auth/config" && method === "GET") {
    return json(res, 200, { googleClientId: GOOGLE_CLIENT_ID || null });
  }

  // POST /api/auth/register
  if (pathname === "/api/auth/register" && method === "POST") {
    const { email, password, full_name } = await getBody(req);
    if (!email || !password || !full_name) return json(res, 400, { error: "Semua field wajib diisi" });
    if (password.length < 6) return json(res, 400, { error: "Password minimal 6 karakter" });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return json(res, 409, { error: "Email sudah terdaftar" });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, password: hashed, profile: { create: { fullName: full_name } } },
        include: { profile: true },
      });
      return newUser;
    });

    return json(res, 201, { message: "Akun berhasil dibuat", user: { id: user.id, email: user.email, full_name: user.profile?.fullName } });
  }

  // POST /api/auth/login
  if (pathname === "/api/auth/login" && method === "POST") {
    const { email, password } = await getBody(req);
    if (!email || !password) return json(res, 400, { error: "Email dan password wajib diisi" });

    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    if (!user) return json(res, 401, { error: "Email atau password salah" });
    if (!user.password) return json(res, 401, { error: "Akun ini terdaftar dengan Google. Silakan login menggunakan Google." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return json(res, 401, { error: "Email atau password salah" });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.profile?.role || "user" }, JWT_SECRET, { expiresIn: "7d" });
    return json(res, 200, { message: "Login berhasil", token, user: { id: user.id, email: user.email, full_name: user.profile?.fullName, role: user.profile?.role || "user" } });
  }

  // POST /api/auth/google
  if (pathname === "/api/auth/google" && method === "POST") {
    const { id_token } = await getBody(req);
    if (!id_token) return json(res, 400, { error: "id_token required" });

    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`);
    if (!verifyRes.ok) return json(res, 401, { error: "Google token tidak valid" });

    const googlePayload = await verifyRes.json();
    if (googlePayload.aud !== GOOGLE_CLIENT_ID) return json(res, 401, { error: "Token tidak sesuai" });

    const { email, name, sub, picture } = googlePayload;
    if (!email) return json(res, 400, { error: "Email tidak tersedia" });

    let user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    if (user) {
      if (!user.googleId) await prisma.user.update({ where: { id: user.id }, data: { googleId: sub } });
    } else {
      user = await prisma.$transaction(async (tx) => {
        return tx.user.create({
          data: { email, googleId: sub, emailVerified: new Date(), profile: { create: { fullName: name || email.split("@")[0] } } },
          include: { profile: true },
        });
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.profile?.role || "user" }, JWT_SECRET, { expiresIn: "7d" });
    return json(res, 200, { message: "Login berhasil", token, user: { id: user.id, email: user.email, full_name: user.profile?.fullName || name, role: user.profile?.role || "user", picture: picture || null } });
  }

  // GET /api/reports
  if (pathname === "/api/reports" && method === "GET") {
    if (!payload) return json(res, 401, { error: "Unauthorized" });
    const where = payload.role !== "admin" ? { userId: payload.id } : {};
    const reports = await prisma.report.findMany({ where, orderBy: { createdAt: "desc" }, include: { profile: { select: { fullName: true } }, user: { select: { email: true } } } });
    return json(res, 200, { reports });
  }

  // POST /api/reports
  if (pathname === "/api/reports" && method === "POST") {
    if (!payload) return json(res, 401, { error: "Unauthorized" });
    const { title, description, log_date, attachment } = await getBody(req);
    if (!title || !description) return json(res, 400, { error: "Judul dan deskripsi wajib diisi" });

    const report = await prisma.report.create({
      data: { userId: payload.id, title, description, logDate: log_date ? new Date(log_date) : new Date(), attachment: attachment || null },
      include: { profile: true },
    });
    return json(res, 201, { message: "Laporan berhasil dibuat", report });
  }

  // PUT /api/reports
  if (pathname === "/api/reports" && method === "PUT") {
    if (!payload) return json(res, 401, { error: "Unauthorized" });
    const id = new URL(req.url, "http://localhost").searchParams.get("id");
    if (!id) return json(res, 400, { error: "Report ID required" });

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return json(res, 404, { error: "Laporan tidak ditemukan" });

    const { status, title, description } = await getBody(req);
    const updateData = {};
    if (status !== undefined) {
      if (payload.role !== "admin") return json(res, 403, { error: "Only admin" });
      updateData.status = status;
      await prisma.notification.create({ data: { userId: report.userId, reportId: id, type: "status_update", title: "Status Laporan Diperbarui", message: `Laporan "${report.title}" telah diubah statusnya menjadi ${status}.` } });
    }
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    const updated = await prisma.report.update({ where: { id }, data: updateData, include: { profile: true } });
    return json(res, 200, { message: "Laporan berhasil diperbarui", report: updated });
  }

  // DELETE /api/reports
  if (pathname === "/api/reports" && method === "DELETE") {
    if (!payload) return json(res, 401, { error: "Unauthorized" });
    const id = new URL(req.url, "http://localhost").searchParams.get("id");
    if (!id) return json(res, 400, { error: "Report ID required" });

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return json(res, 404, { error: "Laporan tidak ditemukan" });
    if (payload.role !== "admin" && report.userId !== payload.id) return json(res, 403, { error: "Forbidden" });

    await prisma.notification.deleteMany({ where: { reportId: id } });
    await prisma.report.delete({ where: { id } });
    return json(res, 200, { message: "Laporan berhasil dihapus" });
  }

  // GET /api/admin/users
  if (pathname === "/api/admin/users" && method === "GET") {
    if (!payload || payload.role !== "admin") return json(res, 403, { error: "Forbidden" });
    const userId = new URL(req.url, "http://localhost").searchParams.get("userId");

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true, reports: { orderBy: { createdAt: "desc" }, include: { profile: { select: { fullName: true } } } } } });
      if (!user) return json(res, 404, { error: "User not found" });
      return json(res, 200, { user: { id: user.id, email: user.email, profile: user.profile, reports: user.reports } });
    }

    const users = await prisma.user.findMany({ where: { profile: { role: { not: "admin" } } }, include: { profile: true, _count: { select: { reports: true } } }, orderBy: { createdAt: "desc" } });
    const result = users.map((u) => ({ id: u.id, user_id: u.id, full_name: u.profile?.fullName, email: u.email, reportCount: u._count.reports }));
    return json(res, 200, { users: result });
  }

  // PUT /api/profile/update
  if (pathname === "/api/profile/update" && method === "PUT") {
    if (!payload) return json(res, 401, { error: "Unauthorized" });
    const { full_name } = await getBody(req);
    if (!full_name?.trim()) return json(res, 400, { error: "Nama lengkap harus diisi" });

    const profile = await prisma.profile.update({ where: { userId: payload.id }, data: { fullName: full_name.trim() } });
    return json(res, 200, { message: "Profil berhasil diperbarui", user: { id: payload.id, email: payload.email, full_name: profile.fullName, role: payload.role } });
  }

  // PUT /api/auth/change-password
  if (pathname === "/api/auth/change-password" && method === "PUT") {
    if (!payload) return json(res, 401, { error: "Unauthorized" });
    const { password } = await getBody(req);
    if (!password || password.length < 6) return json(res, 400, { error: "Password minimal 6 karakter" });

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: payload.id }, data: { password: hashed } });
    return json(res, 200, { message: "Password berhasil diubah" });
  }

  // POST /api/upload
  if (pathname === "/api/upload" && method === "POST") {
    if (!payload) return json(res, 401, { error: "Unauthorized" });
    const filename = new URL(req.url, "http://localhost").searchParams.get("filename");
    if (!filename) return json(res, 400, { error: "filename required" });

    const blob = await put(filename, req, { access: "public", addRandomSuffix: true });
    return json(res, 200, { url: blob.url });
  }

  json(res, 404, { error: "Not found" });
}

const server = createServer(handler);
const PORT = process.env.API_PORT || 3001;
server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});