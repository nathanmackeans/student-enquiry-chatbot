// One-off (but re-runnable) script that seeds the knowledge base (the
// "faqs" table) with real Q&A content, computing a proper embedding for
// each entry -- the same two steps app/api/faqs/route.js does on every
// POST, just run directly against Supabase instead of through the admin
// UI. Handy for bulk-loading a starter knowledge base before an admin
// account even exists.
//
// Run with:
//   node --env-file=.env.local scripts/seed-faqs.mjs
//
// Safe to run more than once -- it just adds more rows (it does not
// dedupe), so if you re-run it, delete the previous batch from the
// Knowledge Base admin page first if you don't want duplicates.

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Sourced from https://www.delsu.edu.ng/ (homepage, history, vision/mission
// and news pages) in September 2026. Facts only -- written in our own
// words, not copied verbatim from the site.
const FAQS = [
  {
    category: "general",
    question: "What is Delta State University (DELSU)?",
    answer:
      "Delta State University (DELSU) is a Nigerian state university headquartered in Abraka, Delta State. It was established on 30 April 1992 and is accredited by Nigeria's National Universities Commission (NUC).",
  },
  {
    category: "general",
    question: "What is the history of DELSU?",
    answer:
      "DELSU traces its roots to a Government Teachers' Training College, which became a College of Education (1971-1985) affiliated with the University of Benin, and later the Faculty of Education of Bendel State University. Following the creation of Delta State in 1991, it became an independent university on 30 April 1992.",
  },
  {
    category: "general",
    question: "Where are DELSU's campuses located?",
    answer:
      "DELSU operates a multi-campus system: the main campus in Abraka, a campus in Asaba (which includes the DELSU Business School), and a campus in Oleh -- roughly 200km apart in total. The main postal address is P.M.B. 1, Abraka, Delta State, Nigeria.",
  },
  {
    category: "general",
    question: "What are DELSU's vision and mission?",
    answer:
      "DELSU's vision is 'to become a centre of excellence through Teaching, Scholarship, Research, Innovation, Community Service and Dissemination of knowledge.' Its mission is to advance quality education and cultural development by addressing contemporary challenges through rigorous scholarship and professional excellence. Its core values are Integrity, Hard work and industry, Institutional Loyalty, Innovation, and a Green, Safe and Healthy Environment.",
  },
  {
    category: "admissions",
    question: "How do I apply for admission to DELSU?",
    answer:
      "Admission applications are processed through DELSU's official Admission Portal at portal.delsuces.online. DELSU offers several admission routes: UTME (Undergraduate Regular), Direct Entry, Part-Time/Weekend, Postgraduate, JUPEB, Pre-Degree, and Diploma/Continuing Education -- check the portal for the requirements of your chosen route.",
  },
  {
    category: "admissions",
    question: "What are DELSU's UTME cut-off marks?",
    answer:
      "DELSU publishes its Undergraduate Regular UTME cut-off marks for each admission cycle (e.g. the 2025/2026 cut-off marks list) on the university website's Admission section. Cut-off marks vary by department, so check the current document on delsu.edu.ng for your specific programme.",
  },
  {
    category: "admissions",
    question: "How do I accept my DELSU admission offer?",
    answer:
      "Once offered admission, candidates are required to accept it through the official JAMB portal, in addition to completing any acceptance steps on the DELSU admission portal (portal.delsuces.online) itself.",
  },
  {
    category: "admissions",
    question: "How do I transfer to DELSU from another university?",
    answer:
      "DELSU accepts inter-university transfers through a dedicated portal at transfer.delsu.edu.ng. Prospective transfer students should create a login on that portal to begin the process.",
  },
  {
    category: "results_and_exams",
    question: "How do I check my DELSU Post-UTME result?",
    answer:
      "Post-UTME screening results can be checked via the results-checking link on the DELSU admissions page, using your registration/JAMB details.",
  },
  {
    category: "fees",
    question: "How much are DELSU's school fees?",
    answer:
      "Specific fee amounts aren't published on the main DELSU website -- they're confirmed after admission via the student/admission portal. Check portal.delsuces.online or contact the Bursary/Finance office for the current fee schedule for your programme and level.",
  },
  {
    category: "registration",
    question: "How do I register my courses at DELSU?",
    answer:
      "Course registration is handled through DELSU's Student Portal at studentportal.delsu.edu.ng. Newly admitted and returning students log in with their portal credentials each session to register courses.",
  },
  {
    category: "deadlines",
    question: "When is the deadline to accept admission or register at DELSU?",
    answer:
      "Specific deadlines for accepting admission or completing registration are announced on the DELSU homepage under News/Announcements as each admission cycle progresses -- check delsu.edu.ng/news.aspx or your admission portal for current dates, since they change every session.",
  },
  {
    category: "general",
    question: "What faculties and programmes does DELSU offer?",
    answer:
      "DELSU has multiple faculties -- including Agriculture, Engineering, Computing, Sciences, Medicine, and Law -- spread across its Abraka, Asaba, and Oleh campuses. Programmes range from Undergraduate and Postgraduate degrees to Diploma, Pre-Degree, and JUPEB options. A full list of faculties and departments is published on the university's Programmes page.",
  },
  {
    category: "general",
    question: "How do I access the DELSU library?",
    answer: "DELSU's library is available online at library.delsu.edu.ng.",
  },
  {
    category: "general",
    question: "Where can I find the latest DELSU news and announcements?",
    answer:
      "Official news and announcements -- including admission updates, convocation notices, and fraud-alert disclaimers -- are published on the DELSU News page at delsu.edu.ng/news.aspx.",
  },
];

const EMBEDDING_MODEL = "text-embedding-3-small";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

for (const faq of FAQS) {
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: `${faq.question}\n${faq.answer}`,
  });

  const { error } = await supabase.from("faqs").insert({
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    embedding: embeddingResponse.data[0].embedding,
  });

  console.log(error ? `FAILED: ${faq.question} -- ${error.message}` : `Seeded: ${faq.question}`);
}
