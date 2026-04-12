import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import conlinkLogoLight from '@/assets/conlink-logo-light.png';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationBell from '@/components/layout/NotificationBell';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Target,
  Settings,
  LogOut,
  Map,
  BarChart3,
  UserPlus,
  FileBarChart,
  Trophy,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'manager', 'rep'] },
  { title: 'Leads', icon: ClipboardList, path: '/leads', roles: ['admin', 'manager', 'rep'] },
  { title: 'Pipeline', icon: BarChart3, path: '/pipeline', roles: ['admin', 'manager', 'rep'] },
  { title: 'Map View', icon: Map, path: '/map', roles: ['admin', 'manager', 'rep'] },
  { title: 'Targets', icon: Target, path: '/targets', roles: ['admin', 'manager'] },
  { title: 'Reports', icon: FileBarChart, path: '/reports', roles: ['admin', 'manager', 'rep'] },
  { title: 'Leaderboard', icon: Trophy, path: '/leaderboard', roles: ['admin', 'manager', 'rep'] },
  { title: 'Team', icon: Users, path: '/team', roles: ['admin', 'manager'] },
  { title: 'User Management', icon: UserPlus, path: '/users', roles: ['admin'] },
  { title: 'Settings', icon: Settings, path: '/settings', roles: ['admin'] },
  { title: 'User Manual', icon: BookOpen, path: '/manual', roles: ['admin', 'manager', 'rep'] },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();

  const filteredNav = navItems.filter(item => role && item.roles.includes(role));

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <img src={conlinkLogoLight} alt="Conlink" className="h-8 object-contain" />
        </SidebarHeader>
        <Separator className="bg-sidebar-border" />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredNav.map(item => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
                      tooltip={item.title}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70 mb-2 truncate">
            <span className="truncate">{user?.email}</span>
          </div>
          <div className="inline-flex items-center rounded-md bg-sidebar-accent px-2 py-0.5 text-xs font-medium text-sidebar-accent-foreground capitalize mb-2">
            {role}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-6">
          <SidebarTrigger />
          <div className="flex-1" />
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={markAllRead}
            onMarkRead={markRead}
          />
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;
