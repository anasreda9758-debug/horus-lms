import { relations } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/schema";

export const plan = pgTable(
  "plan",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    priceEg: integer("price_eg").notNull(),
    durationDays: integer("duration_days").notNull(),
    // scope: "module" | "term" | "year"
    scope: text("scope").notNull().default("year"),
    // module scope → module slug; term scope → "1" | "2"; year scope → null
    scopeRef: text("scope_ref"),
    // hidden from purchase UI / admin but kept so old subscriptions still resolve
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("plan_scope_idx").on(table.scope, table.scopeRef)],
);

export const subscription = pgTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("active"), // active | expired | grace | cancelled
    startsAt: timestamp("starts_at").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    graceExpiresAt: timestamp("grace_expires_at"), // 3-day grace period after expiry
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("subscription_user_idx").on(table.userId, table.status),
    index("subscription_user_plan_active_idx").on(table.userId, table.planId, table.status),
  ],
);

export const payment = pgTable(
  "payment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "restrict" }),
    amountEg: integer("amount_eg").notNull(),
    // Paymob fields
    paymobOrderId: text("paymob_order_id"),
    paymobPaymentKey: text("paymob_payment_key"),
    paymobTransactionId: text("paymob_transaction_id"),
    status: text("status").notNull().default("pending"), // pending | paid | failed | refunded
    paymentMethod: text("payment_method"), // card | wallet | fawry
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("payment_user_idx").on(table.userId),
    index("payment_status_idx").on(table.status),
  ],
);

export const planRelations = relations(plan, ({ many }) => ({
  subscriptions: many(subscription),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, {
    fields: [subscription.userId],
    references: [user.id],
  }),
  plan: one(plan, {
    fields: [subscription.planId],
    references: [plan.id],
  }),
}));
