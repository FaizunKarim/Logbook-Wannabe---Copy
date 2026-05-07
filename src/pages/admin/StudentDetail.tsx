import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface Report {
  id: string;
  title: string;
  description: string;
  file_url: string | null;
  status: string;
  created_at: string;
  user_id: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-400",
  approved: "bg-green-500",
  rejected: "bg-red-500",
};

const StudentDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);

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

  const fetchStudentData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData || []);

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

  const handleApprove = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: "approved" })
        .eq("id", reportId);

      if (error) throw error;
      
      toast({
        title: "Berhasil",
        description: "Logbook telah disetujui",
      });

      fetchStudentData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyetujui logbook",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;
      
      toast({
        title: "Berhasil",
        description: "Logbook telah ditolak dan dihapus",
      });

      fetchStudentData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menolak logbook",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [userId, toast]);

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
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials(profile?.full_name || null)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{profile?.full_name || "Mahasiswa"}</h2>
              <p className="text-muted-foreground">{profile?.email || "-"}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Logbook: {reports.length} entri</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Timeline Logbook</h3>
        
        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Mahasiswa ini belum membuat logbook apapun</p>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{report.title}</h4>
                      <div className={`w-3 h-3 rounded-full ${statusColors[report.status]}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(report.created_at)}</p>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(report.id)}
                      disabled={report.status === 'approved'}
                    >
                      Acc
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
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