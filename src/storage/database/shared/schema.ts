import { sql } from "drizzle-orm";
import { pgTable, serial, timestamp, text, jsonb, index } from "drizzle-orm/pg-core";

// System table - DO NOT DELETE
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// Exam reports table
export const examReports = pgTable(
  "exam_reports",
  {
    id: serial().primaryKey(),
    candidate_name: text("candidate_name").notNull(),
    candidate_department: text("candidate_department"),
    exam_code: text("exam_code").notNull(),
    questions: jsonb("questions").notNull(),
    answers: jsonb("answers").notNull(),
    report: jsonb("report").notNull(),
    source: text("source").notNull().default("local_rule"),
    review_status: text("review_status").notNull().default("pending"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("exam_reports_exam_code_idx").on(table.exam_code),
    index("exam_reports_created_at_idx").on(table.created_at),
    index("exam_reports_review_status_idx").on(table.review_status),
  ]
);

export type ExamReport = typeof examReports.$inferSelect;
export type NewExamReport = typeof examReports.$inferInsert;
