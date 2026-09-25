import { describe, it, expect } from "vitest";
import { categoriseEnquiry } from "./classify";

describe("categoriseEnquiry", () => {
  it("matches an admissions question", () => {
    expect(categoriseEnquiry("What are the admission requirements?")).toBe("admissions");
    expect(categoriseEnquiry("How do I apply for the programme?")).toBe("admissions");
  });

  it("matches a fees question", () => {
    expect(categoriseEnquiry("How much is the tuition fee?")).toBe("fees");
    expect(categoriseEnquiry("Is there a scholarship available?")).toBe("fees");
  });

  it("matches a deadlines question", () => {
    expect(categoriseEnquiry("What is the deadline for course submission?")).toBe("deadlines");
    expect(categoriseEnquiry("When does registration close?")).toBe("deadlines");
  });

  it("matches a registration question", () => {
    expect(categoriseEnquiry("How do I register for courses?")).toBe("registration");
    expect(categoriseEnquiry("I need to enrol this semester")).toBe("registration");
  });

  it("matches a results/exams question", () => {
    expect(categoriseEnquiry("How do I view my exam result?")).toBe("results_and_exams");
    expect(categoriseEnquiry("How do I check my GPA?")).toBe("results_and_exams");
  });

  it("falls back to 'general' when nothing matches", () => {
    expect(categoriseEnquiry("What time does the library open?")).toBe("general");
    expect(categoriseEnquiry("Hello!")).toBe("general");
  });

  it("is case-insensitive", () => {
    expect(categoriseEnquiry("ADMISSION REQUIREMENTS")).toBe("admissions");
    expect(categoriseEnquiry("AdMiSsIoN")).toBe("admissions");
  });

  it("matches the first category found when a message spans multiple topics", () => {
    // "admissions" keywords are checked before "fees" keywords (object
    // insertion order), so an enquiry mentioning both lands on admissions.
    // This documents the actual (order-dependent) behaviour rather than an
    // idealised one, since categoriseEnquiry only ever returns one label.
    expect(categoriseEnquiry("What are the admission fees?")).toBe("admissions");
  });

  it("does not crash on an empty string", () => {
    expect(categoriseEnquiry("")).toBe("general");
  });
});
