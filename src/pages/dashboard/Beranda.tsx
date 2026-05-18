import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Plus, Send, FileText, MoreVertical, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Report {
  id: string;
  title: string;
  description: string;
  logDate: string;
  attachment: string | null;
  status: string; // Memanggil kembali status dari database
  createdAt: string;
  userId: string;
  profile?: { fullName: string | null } | null;
}

const Beranda = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [newReport, setNewReport] = useState({
    title: "",
    description: "",
    log_date: new Date().toISOString().split('T')[0],
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    if (token) fetchReports();
  }, [token]);

  const fetchReports = async () => {
    if (!user || !token) return;
    try {
      const res = await fetch("/api/reports", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReports(data.reports || []);
    } catch (error) {
      toast({ title: "Error", description: "Gagal memuat laporan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setNewReport({
      title: "",
      description: "",
      log_date: new Date().toISOString().split('T')[0],
    });
    setAttachmentFile(null);
    setExistingAttachment(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (report: Report) => {
    setEditingId(report.id);
    setNewReport({
      title: report.title,
      description: report.description,
      log_date: new Date(report.logDate).toISOString().split('T')[0],
    });
    setAttachmentFile(null);
    setExistingAttachment(report.attachment);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus logbook ini?")) return;
    
    try {
      const res = await fetch(`/api/reports?id=${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      
      toast({ title: "Berhasil", description: "Logbook telah dihapus." });
      fetchReports();
    } catch (error) {
      toast({ title: "Error", description: "Gagal menghapus logbook", variant: "destructive" });
    }
  };

  const handleSaveReport = async () => {
    if (!newReport.title || !newReport.description || !user || !token) {
      toast({ title: "Validasi Gagal", description: "Lengkapi field wajib", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    let attachmentUrl = existingAttachment;

    if (attachmentFile) {
      try {
        const uploadRes = await fetch(`/api/upload?filename=${encodeURIComponent(attachmentFile.name)}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: attachmentFile,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error);
        attachmentUrl = uploadData.url;
      } catch (error) {
        toast({ title: "Error", description: "Gagal mengupload file", variant: "destructive" });
        setSubmitting(false);
        return;
      }
    }

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/reports?id=${editingId}` : "/api/reports";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          title: newReport.title,
          description: newReport.description,
          log_date: newReport.log_date,
          attachment: attachmentUrl,
        }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan");

      toast({ title: "Berhasil", description: `Logbook berhasil ${editingId ? "diperbarui" : "dibuat"}` });
      setIsDialogOpen(false);
      fetchReports();
    } catch (error) {
      toast({ title: "Error", description: "Gagal menyimpan Logbook", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRangkum = () => {
    if (reports.length === 0) {
      toast({ title: "Info", description: "Belum ada logbook untuk dirangkum." });
      return;
    }

    const summaryText = reports.map((r, index) => {
      const date = new Date(r.logDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      return `${index + 1}. [${date}] ${r.title}\n   ${r.description}`;
    }).join("\n\n");

    navigator.clipboard.writeText(`Rangkuman Logbook:\n\n${summaryText}`);
    toast({ 
      title: "Berhasil Dirangkum!", 
      description: "Teks rangkuman telah disalin ke clipboard." 
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Helper untuk mendapatkan warna indikator berdasarkan status
  const getStatusIndicator = (status: string) => {
    if (status === "approved" || status === "resolved") {
      return { color: "bg-green-500", label: "Disetujui" };
    }
    return { color: "bg-gray-400", label: "Menunggu" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Logbook Saya</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRangkum} className="gap-2">
            <FileText className="h-4 w-4" />
            Rangkum
          </Button>

          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Buat Logbook
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {editingId ? "Edit Logbook" : "Buat Logbook Baru"}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="overflow-y-auto max-h-[55vh] p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Judul<span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Contoh: Mengerjakan fitur scraping data..."
                value={newReport.title}
                onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="log_date" className="text-sm font-medium">
                Tanggal Logbook
              </Label>
              <Input
                id="log_date"
                type="date"
                value={newReport.log_date}
                onChange={(e) => setNewReport({ ...newReport, log_date: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Deskripsi <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Jelaskan detail aktivitas Anda..."
                rows={4}
                value={newReport.description}
                onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Lampiran (Opsional)</Label>
              {attachmentFile || existingAttachment ? (
                <div className="relative group rounded-xl border-2 border-primary/20 p-4 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-primary" />
                      <p className="font-medium text-sm truncate max-w-[200px]">
                        {attachmentFile ? attachmentFile.name : "Lampiran Tersimpan"}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setAttachmentFile(null);
                        setExistingAttachment(null);
                      }}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <div className="text-center">
                    <span className="text-sm font-medium text-muted-foreground">Klik untuk upload file</span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setAttachmentFile(file);
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="p-6 border-t bg-muted/30">
            <Button
              className="w-full h-12 text-base font-semibold gap-2"
              onClick={handleSaveReport}
              disabled={submitting || !newReport.title || !newReport.description}
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              {submitting ? "Menyimpan..." : "Simpan Logbook"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Belum ada Logbook</p>
            <p className="text-sm mt-2">Mulai dokumentasikan progresmu!</p>
          </CardContent>
        </Card>
      ) : (
        reports.map((report) => {
          const statusInfo = getStatusIndicator(report.status);
          
          return (
            <Card key={report.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(report.profile?.fullName || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg leading-tight">{report.title}</h3>
                      {/* Indikator Bulatan Berwarna */}
                      <div 
                        className={`h-2.5 w-2.5 rounded-full ${statusInfo.color}`} 
                        title={statusInfo.label}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(report.logDate)}</p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(report)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit Logbook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(report.id)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground whitespace-pre-wrap">{report.description}</p>
                {report.attachment && (
                  <a
                    href={report.attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline inline-flex items-center gap-1 mt-2"
                  >
                    📎 Lihat Lampiran
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default Beranda;