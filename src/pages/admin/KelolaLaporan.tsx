import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Trash2, Eye, Loader2 } from "lucide-react";

interface Report {
  id: string;
  title: string;
  category: string;
  status: string;
  location: string | null;
  created_at: string;
  user_id: string;
  description: string;
  image_url: string | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

const statusOptions = [
  { value: "pending", label: "Menunggu", color: "bg-yellow-500" },
  { value: "in_progress", label: "Diproses", color: "bg-orange-500" },
  { value: "resolved", label: "Selesai", color: "bg-green-500" },
  { value: "rejected", label: "Ditolak", color: "bg-red-500" },
];

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  in_progress: "Diproses",
  resolved: "Selesai",
  rejected: "Ditolak",
};

export default function KelolaLaporan() {
  const [reports, setReports] = useState<Report[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);

      // Fetch profiles for all users
      const userIds = [...new Set(data?.map((r) => r.user_id) || [])];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        const profileMap: Record<string, string> = {};
        profileData?.forEach((p) => {
          profileMap[p.user_id] = p.full_name || "Pengguna";
        });
        setProfiles(profileMap);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const report = reports.find((r) => r.id === reportId);
      if (!report) return;

      const { error: updateError } = await supabase
        .from("reports")
        .update({ status: newStatus })
        .eq("id", reportId);

      if (updateError) throw updateError;

      // Create notification for the user
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: report.user_id,
        report_id: reportId,
        type: "status_update",
        title: "Status Laporan Diperbarui",
        message: `Laporan "${report.title}" telah diubah statusnya menjadi ${statusLabels[newStatus]}.`,
      });

      if (notifError) {
        console.error("Error creating notification:", notifError);
      }

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );

      toast.success("Status berhasil diperbarui");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Gagal memperbarui status");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedReport) return;

    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", selectedReport.id);

      if (error) throw error;

      setReports((prev) => prev.filter((r) => r.id !== selectedReport.id));
      setDeleteDialogOpen(false);
      setSelectedReport(null);
      toast.success("Laporan berhasil dihapus");
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Gagal menghapus laporan");
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find((s) => s.value === status);
    return (
      <Badge className={`${statusConfig?.color || "bg-gray-500"} text-white`}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kelola Laporan</h1>
        
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari laporan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Laporan ({filteredReports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Tidak ada laporan ditemukan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Pelapor</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {report.title}
                      </TableCell>
                      <TableCell>{report.category}</TableCell>
                      <TableCell>
                        {profiles[report.user_id] || "Pengguna"}
                      </TableCell>
                      <TableCell>{formatDate(report.created_at)}</TableCell>
                      <TableCell>
                        <Select
                          value={report.status}
                          onValueChange={(value) =>
                            handleStatusChange(report.id, value)
                          }
                          disabled={updating}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue>
                              {getStatusBadge(report.status)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedReport(report);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedReport(report);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Laporan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus laporan "{selectedReport?.title}"?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedReport?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReport?.image_url && (
              <img
                src={selectedReport.image_url}
                alt={selectedReport.title}
                className="w-full h-48 object-contain rounded-lg" // Tambahkan object-contain
              />
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Kategori:</span>
                <p className="font-medium">{selectedReport?.category}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p>{selectedReport && getStatusBadge(selectedReport.status)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Lokasi:</span>
                <p className="font-medium">
                  {selectedReport?.location || "-"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Tanggal:</span>
                <p className="font-medium">
                  {selectedReport && formatDate(selectedReport.created_at)}
                </p>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Deskripsi:</span>
              <p className="mt-1">{selectedReport?.description}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
