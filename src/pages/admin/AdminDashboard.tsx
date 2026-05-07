import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, FileText, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface UserWithStats extends Profile {
  reportCount: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .order("full_name");

        if (profilesError) throw profilesError;

        // Get report count for each user
        const { data: reportsData, error: reportsError } = await supabase
          .from("reports")
          .select("user_id");

        if (reportsError) throw reportsError;

        const reportCounts = new Map<string, number>();
        reportsData?.forEach(r => {
          reportCounts.set(r.user_id, (reportCounts.get(r.user_id) || 0) + 1);
        });

        const usersWithStats: UserWithStats[] = profilesData?.map(profile => ({
          ...profile,
          reportCount: reportCounts.get(profile.user_id) || 0
        })) || [];

        setUsers(usersWithStats);

      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "Gagal memuat daftar mahasiswa",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Admin</h1>
        <p className="text-muted-foreground mt-1">Kelola dan lihat logbook semua mahasiswa</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Mahasiswa</p>
                <p className="text-3xl font-bold mt-1">{users.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Logbook Entri</p>
                <p className="text-3xl font-bold mt-1">
                  {users.reduce((sum, u) => sum + u.reportCount, 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <FileText className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Daftar Mahasiswa</h2>
        
        {users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Belum ada mahasiswa yang terdaftar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <Card key={user.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate(`/admin/student/${user.user_id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || "Mahasiswa"}</p>
                        <p className="text-sm text-muted-foreground">{user.email || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{user.reportCount}</p>
                        <p className="text-xs text-muted-foreground">Logbook</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
