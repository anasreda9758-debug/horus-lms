import { relations } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "../auth/schema";

export const curriculumModule = pgTable("module", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  isFree: boolean("is_free").notNull().default(false),
  term: integer("term").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const lecture = pgTable(
  "lecture",
  {
    id: text("id").primaryKey(),
    moduleId: text("module_id")
      .notNull()
      .references(() => curriculumModule.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary"),
    subject: text("subject"),
    kind: text("kind"),
    content: text("content"),
    pdfFile: text("pdf_file"),
    order: integer("order").notNull().default(0),
    durationMin: integer("duration_min"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("lecture_module_id_idx").on(table.moduleId),
    uniqueIndex("lecture_slug_idx").on(table.slug),
  ],
);

export const lectureProgress = pgTable(
  "lecture_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lectureId: text("lecture_id")
      .notNull()
      .references(() => lecture.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("lecture_progress_user_lecture_idx").on(table.userId, table.lectureId),
    uniqueIndex("lecture_progress_user_lecture_unique").on(table.userId, table.lectureId),
  ],
);

export const curriculumModuleRelations = relations(curriculumModule, ({ many }) => ({
  lectures: many(lecture),
}));

export const lectureRelations = relations(lecture, ({ one, many }) => ({
  module: one(curriculumModule, {
    fields: [lecture.moduleId],
    references: [curriculumModule.id],
  }),
  progress: many(lectureProgress),
}));

export const lectureProgressRelations = relations(lectureProgress, ({ one }) => ({
  lecture: one(lecture, {
    fields: [lectureProgress.lectureId],
    references: [lecture.id],
  }),
  user: one(user, {
    fields: [lectureProgress.userId],
    references: [user.id],
  }),
}));
