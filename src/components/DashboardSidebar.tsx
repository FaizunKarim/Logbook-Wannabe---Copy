import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth"; // Pastikan path hook auth kamu benar
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarGroup, SidebarGroupLabel, SidebarGroupContent,} from "@/components/ui/sidebar";
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LayoutDashboard, FileText, UserPen, LogOut, ChevronsUpDown } from "lucide-react";

export function DashboardSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Menu utama yang tetap ada di tengah/atas
  const mainNavItems = [
    {
      title: "Beranda",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Laporan Saya",
      url: "/dashboard/laporan", // Sesuaikan dengan route laporan kamu
      icon: FileText,
    },
  ];

  return (
    <sidebar.Sidebar>
      {/* 1. HEADER SIDEBAR */}
      <sidebar.SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
            L
          </div>
          <span className="font-bold text-lg">Lapor Pak</span>
        </div>
      </sidebar.SidebarHeader>

      {/* 2. KONTEN TENGAH (Hapus menu Profil & Pengaturan lama dari sini) */}
      <sidebar.SidebarContent>
        <sidebar.SidebarGroup>
          <sidebar.SidebarGroupLabel>Menu Utama</sidebar.SidebarGroupLabel>
          <sidebar.SidebarGroupContent>
            <sidebar.SidebarMenu>
              {mainNavItems.map((item) => (
                <sidebar.SidebarMenuItem key={item.title}>
                  <sidebar.SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </sidebar.SidebarMenuButton>
                </sidebar.SidebarMenuItem>
              ))}
            </sidebar.SidebarMenu>
          </sidebar.SidebarGroupContent>
        </sidebar.SidebarGroup>
      </sidebar.SidebarContent>

      {/* 3. FOOTER SIDEBAR (Profil Baru + Dropdown Opsi) */}
      <sidebar.SidebarFooter>
        <sidebar.SidebarMenu>
          <sidebar.SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <sidebar.SidebarMenuButton
                  size="lg"
                  className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.picture || ""} alt={user?.full_name || ""} />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      {user?.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.full_name || "Nama User"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email || "user@email.com"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </sidebar.SidebarMenuButton>
              </DropdownMenuTrigger>
              
              {/* Isi Dropdown menu ketika Profil diklik */}
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top" // Muncul ke atas karena letaknya di paling bawah
                align="end"
                sideOffset={4}
              >
                {/* Opsi 1: Edit Profile */}
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                  <UserPen className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Edit Profile</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Opsi 2: Keluar */}
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </sidebar.SidebarMenuItem>
        </sidebar.SidebarMenu>
      </sidebar.SidebarFooter>
    </sidebar.Sidebar>
  );
}