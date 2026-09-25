"use client"; // needs the browser Supabase client to sign out, reads the
// current path to highlight the active nav item, and tracks whether the
// mobile drawer is open.

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import ChatIcon from "@mui/icons-material/Chat";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import DelsuMonogram from "@/components/DelsuMonogram";
import { createClient } from "@/lib/supabase/client";

export const SIDEBAR_WIDTH = 240;

const NAV_ITEMS = [
  { label: "Chat", href: "/chat", icon: ChatIcon },
  { label: "History", href: "/history", icon: HistoryIcon },
  { label: "Profile", href: "/profile", icon: PersonIcon },
];

// The actual nav list, shared between the always-visible desktop drawer and
// the slide-out mobile one -- only the surrounding chrome differs.
//
// A prospective student (not logged in) can only reach /chat -- History and
// Profile need a real account to mean anything, so for them those two links
// are replaced by a single "Login to save history" prompt instead of
// silently bouncing to /login when clicked.
function SidebarNav({ pathname, isAuthenticated, onLogout, onNavigate }) {
  const items = isAuthenticated ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.href === "/chat");

  return (
    <>
      <Toolbar sx={{ gap: 1 }}>
        <DelsuMonogram size={30} />
        <Typography variant="h6" fontWeight={700}>
          DELSU
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {items.map((item) => {
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

        {!isAuthenticated && (
          <Box sx={{ px: 2, pt: 2 }}>
            <Button
              component={Link}
              href="/login"
              onClick={onNavigate}
              variant="outlined"
              size="small"
              fullWidth
              startIcon={<LoginIcon />}
            >
              Login to save history
            </Button>
          </Box>
        )}
      </List>
      <Divider />
      {isAuthenticated && (
        <List>
          <ListItemButton onClick={onLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </List>
      )}
    </>
  );
}

export default function StudentSidebar({ isAuthenticated }) {
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
              DELSU
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
          <SidebarNav
            pathname={pathname}
            isAuthenticated={isAuthenticated}
            onLogout={handleLogout}
            onNavigate={() => setMobileOpen(false)}
          />
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
      <SidebarNav pathname={pathname} isAuthenticated={isAuthenticated} onLogout={handleLogout} />
    </Drawer>
  );
}
