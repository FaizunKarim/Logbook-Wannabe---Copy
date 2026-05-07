import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, MapPin, Image as ImageIcon, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
}

interface Report {
  id: string;
  title: string;
  description: string;
  log_date: string;
  file_url: string | null;
  status: string;
  created_at: string;
  user_id: string;
  profile?: Profile | null;
}


const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  reviewing: "bg-blue-500",
  in_progress: "bg-orange-500",
  resolved: "bg-green-500",
};

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  reviewing: "Ditinjau",
  in_progress: "Diproses",
  resolved: "Selesai",
};


const Beranda = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New report form
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    title: "",
    description: "",
    log_date: new Date().toISOString().split('T')[0],
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReports();

    // Subscribe to realtime updates only for current user reports
    const channel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports', filter: `user_id=eq.${user.id}` },
        () => {
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReports = async () => {
    if (!user) return;
    
    const { data: reportsData, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Gagal memuat laporan",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch profiles for all users
    const userIds = [...new Set(reportsData?.map(r => r.user_id) || [])];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
    
    const reportsWithProfiles = reportsData?.map(report => ({
      ...report,
      profile: profilesMap.get(report.user_id) || null,
    })) || [];

    setReports(reportsWithProfiles);
    setLoading(false);
  };


  const handleCreateReport = async () => {
    if (!newReport.title || !newReport.description || !user) {
      toast({
        title: "Validasi Gagal",
        description: "Mohon lengkapi semua field yang diperlukan",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    let fileUrl = null;

    // Upload attachment file if exists
    if (attachmentFile) {
      const fileExt = attachmentFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from("report-images")
        .upload(fileName, attachmentFile);

      if (uploadError) {
        toast({
          title: "Error",
          description: "Gagal mengupload file",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("report-images")
        .getPublicUrl(fileName);
      
      fileUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("reports").insert({
      user_id: user.id,
      title: newReport.title,
      description: newReport.description,
      file_url: fileUrl,
      log_date: newReport.log_date,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Gagal menambahkan Logbook",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Berhasil",
        description: "Laporan berhasil dibuat",
      });
      setNewReport({ 
        title: "", 
        description: "", 
        log_date: new Date().toISOString().split('T')[0]
      });
      setAttachmentFile(null);
      setIsDialogOpen(false);
      fetchReports();
    }
    setSubmitting(false);
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Beranda</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Buat Logbook
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border-b">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Buat Logbook Baru
                </DialogTitle>
              </DialogHeader>
            </div>
            
            <div className="overflow-y-auto max-h-[55vh] p-6 space-y-5">
              {/* Title Input */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Judul<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Contoh: Mengerjakan fitur scraping data untuk laporan"
                  value={newReport.title}
                  onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                  className="h-11"
                />
              </div>


              {/* Tanggal Logbook */}
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

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Deskripsi <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Jelaskan detail logbook Anda..."
                  rows={3}
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                  className="resize-none"
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Lampiran / File Pendukung</Label>
                {attachmentFile ? (
                  <div className="relative group rounded-xl border-2 border-primary/20 p-4 bg-primary/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">{attachmentFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(attachmentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setAttachmentFile(null)}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          Klik untuk upload file
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">Semua jenis file hingga 10MB</p>
                      </div>
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
            
            {/* Footer */}
            <div className="p-6 border-t bg-muted/30">
                <Button 
                  className="w-full h-12 text-base font-semibold gap-2" 
                  onClick={handleCreateReport}
                  disabled={submitting || !newReport.title || !newReport.description}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Menyimpan Logbook...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Simpan Logbook
                    </>
                  )}
                </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Belum ada Logbook</p>
            <p className="text-sm text-muted-foreground mt-2">Tambahkan Logbook</p>
          </CardContent>
        </Card>
      ) : (
        reports.map((report) => (
          <Card key={report.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(report.profile?.full_name || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{report.profile?.full_name || "Anonim"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(report.created_at)}</p>
                  </div>
                </div>
                <Badge className={`${statusColors[report.status]} text-white`}>
                  {statusLabels[report.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{report.title}</h3>
                <Badge variant="outline" className="mt-1">{report.category}</Badge>
              </div>
              <p className="text-muted-foreground">{report.description}</p>
              {report.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{report.location}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default Beranda;
