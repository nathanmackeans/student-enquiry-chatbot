"use client"; // Chart.js draws onto a <canvas>, which needs the browser.

import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

// Chart.js needs each piece it uses registered once, up front.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const commonOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
};

export default function AnalyticsCharts({ categoryCounts, dailyCounts }) {
  // Reuse the Material theme's primary colour so the charts match the
  // rest of the UI instead of using hard-coded colours.
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;

  const categoryData = {
    labels: categoryCounts.map((row) => row.category),
    datasets: [
      {
        label: "Enquiries",
        data: categoryCounts.map((row) => row.total),
        backgroundColor: primaryColor,
        borderRadius: 4,
      },
    ],
  };

  const dailyData = {
    labels: dailyCounts.map((row) => row.day),
    datasets: [
      {
        label: "Enquiries per day",
        data: dailyCounts.map((row) => row.total),
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        tension: 0.3,
      },
    ],
  };

  return (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      <Grid size={12}>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Enquiries by category
          </Typography>
          {categoryCounts.length === 0 ? (
            <Typography color="text.secondary">No enquiries yet.</Typography>
          ) : (
            <Bar data={categoryData} options={commonOptions} />
          )}
        </Paper>
      </Grid>

      <Grid size={12}>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Enquiry volume (last 14 days)
          </Typography>
          {dailyCounts.length === 0 ? (
            <Typography color="text.secondary">No enquiries yet.</Typography>
          ) : (
            <Line data={dailyData} options={commonOptions} />
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
