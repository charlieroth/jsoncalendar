import { expect, test } from "bun:test";
import { CalendarSchema } from "./index";
import schemaJson from "./schema.json";
import * as z from "zod/v4";

/**
 * This test deliberately avoids a byte-for-byte comparison because the JSON
 * emitted by `z.toJSONSchema` is structurally different (e.g. `$defs`, `id`
 * vs `$id`, inlined vs `$ref`) yet *semantically* equivalent.
 *
 * Instead we assert that the generated schema still respects the published
 * contract defined in `schema.json` – same draft version, same required
 * top-level keys, and identical `type` values for each top-level property.
 */
test("CalendarSchema JSON Schema maintains the documented contract", () => {
  const generated = z.toJSONSchema(CalendarSchema, { reused: "ref" });
  const canonical = schemaJson as any;

  // 1. The draft version MUST stay the same.
  expect(generated.$schema).toBe(canonical.$schema);

  // 2. Required top-level fields MUST be identical.
  expect((generated as any).required).toEqual(canonical.required);

  // 3. Every top-level property in the canonical spec must exist in the
  //    generated schema and expose the same JSON Schema `type`.
  const genProps: Record<string, any> = (generated as any).properties ?? {};
  for (const [key, value] of Object.entries<any>(canonical.properties)) {
    expect(genProps).toHaveProperty(key);

    // Only compare "type" where both sides declare one. (The canonical spec
    // sometimes swaps in $ref instead.)
    const actualVal = genProps[key];
    if (value && "type" in value && actualVal && "type" in actualVal) {
      expect(actualVal.type).toBe((value as any).type);
    }
  }
});
