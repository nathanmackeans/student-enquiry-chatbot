// A very simple, transparent way to categorise a student enquiry, used for
// the analytics dashboard ("what are students asking about most?").
//
// We deliberately DON'T ask the language model to classify every message --
// that would cost an extra API call per message. Instead we match keywords
// against a small set of categories. This is easy to read, easy to extend,
// and good enough for grouping enquiries on a dashboard. A more advanced
// version could ask the LLM to classify instead, or use a trained model.

const CATEGORY_KEYWORDS = {
  admissions: ["admission", "apply", "application", "requirement", "entry", "eligib"],
  fees: ["fee", "fees", "tuition", "pay", "payment", "cost", "scholarship"],
  deadlines: ["deadline", "when", "date", "close", "closing", "due"],
  registration: ["register", "registration", "enrol", "enroll", "course form"],
  results_and_exams: ["result", "exam", "grade", "gpa", "transcript"],
};

export function categoriseEnquiry(text) {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      return category;
    }
  }

  // Nothing matched -- still tag it so it shows up on the dashboard instead
  // of silently being left out of the analytics.
  return "general";
}
