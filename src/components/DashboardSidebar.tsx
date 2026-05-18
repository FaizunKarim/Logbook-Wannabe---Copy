import { Home, LogOut, Menu, User, UserPen, ChevronsUpDown } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Pengaturan dihapus dari menu utama karena sudah pindah ke dropdown Profil
const menuItems = [
  { title: "Logbook", url: "/dashboard", icon: Home },
];

const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      {/* Mobile Header (Tetap Sama) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-primary text-primary-foreground flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <img
            src="/apple-touch-icon.png"
            alt="Logo"
            className="h-6 w-6"
          />
          <span className="font-bold">Logbook</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/10"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Sidebar Container (Warna Tetap Sama) */}
      <aside
        className={cn(
          "sticky top-0 z-40 bg-primary text-primary-foreground transition-transform duration-300",
          "w-64 flex flex-col h-screen",
          "lg:translate-x-0",
          isCollapsed ? "-translate-x-full" : "translate-x-0",
          "lg:pt-0 pt-16"
        )}
      >
        {/* Logo - Desktop only (Tetap Sama) */}
        <div className="hidden lg:flex items-center gap-2 p-6 border-b border-primary-foreground/20">
          <img
            src="/apple-touch-icon.png"
            alt="Logo"
            className="h-8 w-8"
          />
          <span className="text-xl font-bold">Logbook</span>
        </div>

        {/* Navigation Utama (Hanya Logbook) */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <NavLink
                key={item.title}
                to={item.url}
                onClick={() => setIsCollapsed(true)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary-foreground text-primary font-medium"
                    : "hover:bg-primary-foreground/10"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Dropdown di Paling Bawah */}
        {user && (
          <div className="p-4 border-t border-primary-foreground/20 mt-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-2 px-2 hover:bg-primary-foreground/10 text-primary-foreground hover:text-primary-foreground outline-none"
                >
                  <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
                    {/* Pakai avatar image kalau ada, kalau tidak icon User */}
                    {user.picture ? (
                       <img src={user.picture} alt="Profil" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                       <User className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium truncate text-sm">
                      {user.full_name || "Pengguna"}
                    </p>
                    <p className="text-xs opacity-70 truncate">
                      {user.email}
                    </p>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 opacity-70 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={12}
                className="w-56"
              >
                <DropdownMenuItem 
                  onClick={() => {
                    setIsCollapsed(true);
                    navigate("/dashboard/settings");
                  }}
                  className="cursor-pointer"
                >
                  <UserPen className="mr-2 h-4 w-4" />
                  <span>Edit Profile</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
};

export default DashboardSidebar;