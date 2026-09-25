// Shared layout for every admin page (Dashboard, Enquiries, Knowledge Base,
// Users, Settings). Access is already restricted to accounts with
// role "admin" by proxy.js, so we don't need to check auth again here.

import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }) {
  return (
    <Box sx={{ display: "flex" }}>
      <AdminSidebar />
      <Box component="main" sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "background.default" }}>
        {/* Invisible spacer matching the sidebar's own Toolbar height. */}
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
