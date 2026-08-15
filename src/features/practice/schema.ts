import { relations } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "../auth/schema";
import { curriculumModule } from "../curriculum/schema";

export const questionBank = pgTable("question_bank", {
  id: text("id").primaryKey(),
  moduleId: text("module_id")
    .notNull()
    .references(() => curriculumModule.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const question = pgTable(
  "question",
  {
    id: text("id").primaryKey(),
    bankId: text("bank_id")
      .notNull()
      .references(() => questionBank.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    explanation: text("explanation"),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("question_bank_id_idx").on(table.bankId)],
);

export const questionOption = pgTable(
  "question_option",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    order: integer("order").notNull().default(0),
  },
  (table) => [index("question_option_question_id_idx").on(table.questionId)],
);

export const quizAttempt = pgTable(
  "quiz_attempt",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bankId: text("bank_id")
      .notNull()
      .references(() => questionBank.id, { onDelete: "cascade" }),
    score: integer("score").notNull().default(0),
    total: integer("total").notNull().default(0),
    status: text("status").notNull().default("in_progress"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [index("quiz_attempt_user_bank_idx").on(table.userId, table.bankId)],
);

export const quizAnswer = pgTable(
  "quiz_answer",
  {
    id: text("id").primaryKey(),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => quizAttempt.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    optionId: text("option_id")
      .notNull()
      .references(() => questionOption.id, { onDelete: "cascade" }),
    isCorrect: boolean("is_correct").notNull(),
    answeredAt: timestamp("answered_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("quiz_answer_attempt_question_idx").on(table.attemptId, table.questionId)],
);

export const questionBankRelations = relations(questionBank, ({ one, many }) => ({
  module: one(curriculumModule, {
    fields: [questionBank.moduleId],
    references: [curriculumModule.id],
  }),
  questions: many(question),
  attempts: many(quizAttempt),
}));

export const questionRelations = relations(question, ({ one, many }) => ({
  bank: one(questionBank, {
    fields: [question.bankId],
    references: [questionBank.id],
  }),
  options: many(questionOption),
}));

export const questionOptionRelations = relations(questionOption, ({ one }) => ({
  question: one(question, {
    fields: [questionOption.questionId],
    references: [question.id],
  }),
}));

export const quizAttemptRelations = relations(quizAttempt, ({ one, many }) => ({
  user: one(user, {
    fields: [quizAttempt.userId],
    references: [user.id],
  }),
  bank: one(questionBank, {
    fields: [quizAttempt.bankId],
    references: [questionBank.id],
  }),
  answers: many(quizAnswer),
}));

export const quizAnswerRelations = relations(quizAnswer, ({ one }) => ({
  attempt: one(quizAttempt, {
    fields: [quizAnswer.attemptId],
    references: [quizAttempt.id],
  }),
  question: one(question, {
    fields: [quizAnswer.questionId],
    references: [question.id],
  }),
  option: one(questionOption, {
    fields: [quizAnswer.optionId],
    references: [questionOption.id],
  }),
}));
