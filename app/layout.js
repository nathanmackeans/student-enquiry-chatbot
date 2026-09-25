// The root layout wraps every page. ThemeRegistry (see lib/theme) applies
// the Material Design theme and baseline styles to everything inside it.
import ThemeRegistry from "@/lib/theme/ThemeRegistry";

export const metadata = {
  title: "DELSU Student Enquiry System",
  description: "A context-aware student enquiry chatbot with an analytics dashboard.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
