// One stat tile on the admin dashboard (e.g. "Total Enquiries: 42"). A
// small, reusable building block so the four dashboard cards all look and
// behave the same way.

import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

export default function StatCard({ icon: Icon, label, value, caption, color = "primary" }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: `${color}.main`,
            color: `${color}.contrastText`,
            opacity: 0.9,
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
          {caption && (
            <Typography variant="caption" color="text.secondary">
              {caption}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
