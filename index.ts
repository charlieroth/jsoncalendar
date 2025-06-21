import * as z from "zod/v4";

// Atomic scalar schemas
const DateTimeSchema = z
  .iso
  .datetime()
  .describe("ISO-8601 date-time string");

const DateSchema = z
  .string()
  .regex(/^[\d]{4}-[\d]{2}-[\d]{2}$/, "Invalid date format (YYYY-MM-DD)")
  .describe("Date in YYYY-MM-DD format");

// Alarm primitive (identical to DateTime)
const AlarmSchema = DateTimeSchema.describe("Alarm timestamp");

// Recurrence rule (RFC 5545 subset)
const RRuleSchema = z
  .object({
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
    interval: z.number().int().min(1).default(1),
    byDay: z
      .array(z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]))
      .optional()
      .refine(
        (arr) => !arr || new Set(arr).size === arr.length,
        {
          message: "byDay values must be unique",
        }
      ),
    byMonthDay: z
      .array(
        z
          .number()
          .int()
          .min(-31)
          .max(31)
          .refine((n) => n !== 0, { message: "0 is not allowed" })
      )
      .optional()
      .refine(
        (arr) => !arr || new Set(arr).size === arr.length,
        {
          message: "byMonthDay values must be unique",
        }
      ),
    byMonth: z
      .array(z.number().int().min(1).max(12))
      .optional()
      .refine(
        (arr) => !arr || new Set(arr).size === arr.length,
        {
          message: "byMonth values must be unique",
        }
      ),
    count: z.number().int().min(1).optional(),
    until: z.union([DateTimeSchema, DateSchema]).optional(),
  })
  .strict()
  .describe("Recurrence rule object");

// Override for individual recurrence instances
const OverrideEventSchema = z
  .object({
    cancelled: z.boolean().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    start: z.union([DateTimeSchema, DateSchema]).optional(),
    end: z.union([DateTimeSchema, DateSchema]).optional(),
    private: z.boolean().optional(),
    alarms: z.array(AlarmSchema).optional(),
    extensions: z.record(z.string(), z.any()).optional(),
  })
  .strict()
  .describe("Per-instance overrides for recurring events");

// Core event object
const EventSchema = z
  .object({
    id: z.uuid().describe("Event UUID"),
    title: z.string().min(1).describe("Human-readable event title"),
    description: z.string().optional().describe("Event description"),
    start: z.union([DateTimeSchema, DateSchema]).describe("Event start"),
    end: z.union([DateTimeSchema, DateSchema]).describe("Event end (exclusive)"),
    private: z.boolean().default(false).optional(),
    recurrence: RRuleSchema.optional(),
    overrides: z.record(z.string(), OverrideEventSchema).optional(),
    alarms: z.array(AlarmSchema).optional(),
    extensions: z.record(z.string(), z.any()).optional(),
  })
  .strict()
  .describe("Event object");

// Top-level calendar document
const CalendarSchema = z
  .object({
    id: z.uuid().optional().describe("Calendar UUID"),
    name: z.string().min(1).optional().describe("Calendar name"),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color (#RRGGBB)")
      .optional()
      .describe("Hex color #RRGGBB"),
    private: z.boolean().default(false).optional(),
    events: z.array(EventSchema).min(1).describe("Array of events"),
    extensions: z.record(z.string(), z.any()).optional(),
  })
  .strict()
  .describe("JSON Calendar v0.1 root object");

type Calendar = z.infer<typeof CalendarSchema>;
type Event = z.infer<typeof EventSchema>;

function main(): void {
  const jsonSchema = z.toJSONSchema(CalendarSchema);
  console.log(JSON.stringify(jsonSchema, null, 2));
}

// Execute when run directly (e.g., `bun run index.ts`)
if (import.meta.main) {
  main();
}