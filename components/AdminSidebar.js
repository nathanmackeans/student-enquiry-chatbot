"use client"; // needs the browser Supabase client to sign out, reads the
// current path to highlight the active nav item, and tracks whether the
// mobile drawer is open.

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Drawer from "@mui/material/Drawer";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ForumIcon from "@mui/icons-material/Forum";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import GroupIcon from "@mui/icons-material/Group";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import DelsuMonogram from "@/components/DelsuMonogram";
import { createClient } from "@/lib/supabase/client";

export const SIDEBAR_WIDTH = 240;

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: DashboardIcon },
  { label: "Enquiries", href: "/admin/enquiries", icon: ForumIcon },
  { label: "Knowledge Base", href: "/admin/knowledge-base", icon: MenuBookIcon },
  { label: "Users", href: "/admin/users", icon: GroupIcon },
  { label: "Settings", href: "/admin/settings", icon: SettingsIcon },
];

// The actual nav list, shared between the always-visible desktop drawer and
// the slide-out mobile one -- only the surrounding chrome differs.
function SidebarNav({ pathname, onLogout, onNavigate }) {
  return (
    <>
      <Toolbar sx={{ gap: 1 }}>
        <DelsuMonogram size={30} />
        <div>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            DELSU
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Admin
          </Typography>
        </div>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={isActive}
              onClick={onNavigate}
            >
              <ListItemIcon>
                <Icon color={isActive ? "primary" : "inherit"} />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <List>
        <ListItemButton onClick={onLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (isMobile) {
    return (
      <>
        <AppBar position="fixed" color="inherit">
          <Toolbar>
            <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open menu" sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
            <DelsuMonogram size={26} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ ml: 1 }}>
              DELSU Admin
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }} // faster reopen on mobile
          sx={{ [`& .MuiDrawer-paper`]: { width: SIDEBAR_WIDTH, boxSizing: "border-box" } }}
        >
          <SidebarNav pathname={pathname} onLogout={handleLogout} onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      </>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: SIDEBAR_WIDTH, boxSizing: "border-box" },
      }}
    >
      <SidebarNav pathname={pathname} onLogout={handleLogout} />
    </Drawer>
  );
}
