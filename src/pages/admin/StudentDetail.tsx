import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  fullName: string | null;
  nim: string | null;
  role?: string; // Menambahkan pengecekan role
}

interface Report {
  id: string;
  title: string;
  description: string;
  attachment: string | null;
  status: string;
  createdAt: string;
  userId: string;
}

interface UserData {
  id: string;
  email: string;
  profile: Profile | null;
  reports: Report[];
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-400",
  approved: "bg-green-500",
  rejected: "bg-red-500",
};

const StudentDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const headers = { Authorization: `Bearer ${token}` };

  const fetchStudentData = async () => {
    if (!userId || !token) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { headers });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setUserData(data.user);
    } catch (error) {
      console.error("Error fetching student data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data mahasiswa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- FUNGSI BARU: JADIKAN ADMIN ---
  const handlePromoteToAdmin = async () => {
    if (!confirm(`Yakin ingin menjadikan ${userData?.profile?.fullName || "pengguna ini"} sebagai Admin?`)) {
      return;
    }

    setIsPromoting(true);
    try {
      const res = await fetch("/api/admin/update-role", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: userId,
          newRole: "admin",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Promosi Berhasil!",
        description: "Pengguna ini sekarang memiliki akses Admin.",
      });

      // Kembali ke halaman daftar admin/user karena dia sudah bukan mahasiswa biasa
      navigate("/admin");
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menjadikan pengguna sebagai Admin",
        variant: "destructive",
      });
    } finally {
      setIsPromoting(false);
    }
  };

  const handleApprove = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports?id=${reportId}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      if (!res.ok) throw new Error("Gagal");
      toast({ title: "Berhasil", description: "Logbook disetujui" });
      fetchStudentData();
    } catch (error) {
      toast({ title: "Error", description: "Gagal menyetujui", variant: "destructive" });
    }
  };

  const handleReject = async (reportId: string) => {
    if (!confirm("Tolak dan hapus logbook ini secara permanen?")) return;
    try {
      const res = await fetch(`/api/reports?id=${reportId}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error("Gagal");
      toast({ title: "Berhasil", description: "Logbook dihapus" });
      fetchStudentData();
    } catch (error) {
      toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [userId, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Detail Logbook Mahasiswa</h1>
          <p className="text-muted-foreground">Lihat semua catatan logbook mahasiswa</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {getInitials(userData?.profile?.fullName || null)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">{userData?.profile?.fullName || "Mahasiswa"}</h2>
                <p className="text-muted-foreground">{userData?.email || "-"}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Logbook: {userData?.reports.length || 0} entri</p>
              </div>
            </div>

            {/* TOMBOL JADIKAN ADMIN (Hanya muncul jika dia bukan admin) */}
            {userData?.profile?.role !== "admin" && (
              <Button 
                variant="outline" 
                className="border-primary text-primary hover:bg-primary/10 gap-2"
                onClick={handlePromoteToAdmin}
                disabled={isPromoting}
              >
                {isPromoting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Jadikan Admin
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Timeline Logbook</h3>

        {!userData?.reports || userData.reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Mahasiswa ini belum membuat logbook apapun</p>
            </CardContent>
          </Card>
        ) : (
          userData.reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{report.title}</h4>
                      <div 
                        className={`w-3 h-3 rounded-full ${statusColors[report.status] || "bg-gray-400"}`} 
                        title={report.status}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(report.createdAt)}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.description}</p>
                    
                    {report.attachment && (
                      <a
                        href={report.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline inline-flex items-center gap-1 mt-3 block w-max"
                      >
                        📎 Lihat File Lampiran Mahasiswa
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                      onClick={() => handleApprove(report.id)}
                      disabled={report.status === 'approved'}
                    >
                      Acc
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleReject(report.id)}
                    >
                      Tolak
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentDetail;