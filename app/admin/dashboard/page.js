// The admin analytics dashboard. This is a server component -- it fetches
// the analytics data on the server (using the service-role client, so it
// can read across all conversations) and passes the numbers down to the
// client-side chart component to draw.
//
// Access to this page is already restricted to admins by proxy.js, so we
// don't need to check auth again here.

import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import ForumIcon from "@mui/icons-material/Forum";
import GroupIcon from "@mui/icons-material/Group";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ThumbsUpDownIcon from "@mui/icons-material/ThumbsUpDown";
import { createAdminClient } from "@/lib/supabase/admin";
import StatCard from "@/components/StatCard";
import AnalyticsCharts from "@/components/AnalyticsCharts";

const DAYS_OF_HISTORY = 14;
const ACTIVE_USER_WINDOW_DAYS = 30;

// This page shows live analytics and reads a secret key at request time, so
// it must never be statically pre-rendered at build time (Next would try
// to render it once during `next build`, before real env vars/data exist).
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  const [
    { data: categoryCounts, error: categoryError },
    { data: dailyCounts, error: dailyError },
    { count: knowledgeDocumentCount, error: faqCountError },
    { data: activeStudentCount, error: activeError },
    { data: feedbackCounts, error: feedbackError },
  ] = await Promise.all([
    supabase.rpc("get_category_counts"),
    supabase.rpc("get_daily_enquiry_counts", { days_back: DAYS_OF_HISTORY }),
    supabase.from("faqs").select("*", { count: "exact", head: true }),
    supabase.rpc("get_active_student_count", { days_back: ACTIVE_USER_WINDOW_DAYS }),
    supabase.rpc("get_feedback_counts"),
  ]);

  const firstError =
    categoryError || dailyError || faqCountError || activeError || feedbackError;
  if (firstError) throw new Error(firstError.message || "Failed to load analytics.");

  const totalEnquiries = categoryCounts.reduce((sum, row) => sum + Number(row.total), 0);
  const feedbackUp = feedbackCounts.find((row) => row.rating === "up")?.total ?? 0;
  const feedbackDown = feedbackCounts.find((row) => row.rating === "down")?.total ?? 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Analytics Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Monitor student enquiries and system activity.
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={ForumIcon} label="Total Enquiries" value={totalEnquiries} caption="All time" color="primary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={GroupIcon}
            label="Active Users"
            value={activeStudentCount}
            caption={`Last ${ACTIVE_USER_WINDOW_DAYS} days`}
            color="secondary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={MenuBookIcon}
            label="Knowledge Documents"
            value={knowledgeDocumentCount ?? 0}
            caption="In knowledge base"
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={ThumbsUpDownIcon}
            label="Feedback"
            value={feedbackUp + feedbackDown}
            caption={`${feedbackUp} up · ${feedbackDown} down`}
            color="warning"
          />
        </Grid>
      </Grid>

      <AnalyticsCharts categoryCounts={categoryCounts} dailyCounts={dailyCounts} />
    </Container>
  );
}
