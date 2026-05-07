import { LayoutDashboard, FileText, LogOut, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const menuItems = [
	{ title: "Dashboard", url: "/admin", icon: LayoutDashboard },
	{ title: "Kelola Laporan", url: "/admin/laporan", icon: FileText },
];

export const AdminSidebar = () => {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const { signOut } = useAuth();
	const navigate = useNavigate();

	const handleLogout = async () => {
		await signOut();
		navigate("/"); // Mengarahkan ke halaman landing page
	};

	return (
		<>
			{/* Mobile Header */}
			<div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b z-40 flex items-center px-4">
			</div>

			{/* Sidebar */}
			<aside
				className={`sticky top-0 z-30 h-screen bg-background border-r transition-all duration-300 ${
					isCollapsed ? "md:w-20" : "w-64"
				} pt-16 md:pt-0`}
			>
				<div className="hidden md:flex items-center justify-between p-4 border-b">
					{!isCollapsed && (
						<div className="flex items-center gap-2">
							<Shield className="h-6 w-6 text-primary" />
							<span className="font-semibold text-lg">Admin Panel</span>
						</div>
					)}
					<button
						onClick={() => setIsCollapsed(!isCollapsed)}
						className="p-2 hover:bg-muted rounded-lg"
					>
						{isCollapsed ? (
							<ChevronRight className="h-5 w-5" />
						) : (
							<ChevronLeft className="h-5 w-5" />
						)}
					</button>
				</div>

				<nav className="p-4 space-y-2">
					{menuItems.map((item) => (
						<NavLink
							key={item.title}
							to={item.url}
							end={item.url === "/admin"}
							className={({ isActive }) =>
								`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
									isActive
										? "bg-primary text-primary-foreground"
										: "hover:bg-muted text-muted-foreground hover:text-foreground"
								} ${isCollapsed ? "justify-center" : ""}`
							}
						>
							<item.icon className="h-5 w-5 flex-shrink-0" />
							{!isCollapsed && <span>{item.title}</span>}
						</NavLink>
					))}
				</nav>

				<div className="absolute bottom-4 left-0 right-0 px-4">
					<Button
						variant="ghost"
						className={`w-full justify-start gap-3 text-muted-foreground hover:text-foreground ${
							isCollapsed ? "justify-center px-0" : ""
						}`}
						onClick={handleLogout}
					>
						<LogOut className="h-5 w-5" />
						{!isCollapsed && <span>Keluar</span>}
					</Button>
				</div>
			</aside>

			{/* Mobile Overlay */}
			{!isCollapsed && (
				<div
					className="md:hidden fixed inset-0 bg-black/50 z-20"
					onClick={() => setIsCollapsed(true)}
				/>
			)}
		</>
	);
};
