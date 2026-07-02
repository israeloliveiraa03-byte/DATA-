import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { entityCodeCounters } from "@/lib/db/schema";
import type { entityTypeEnum } from "@/lib/db/schema/entities";

const PREFIX: Record<(typeof entityTypeEnum.enumValues)[number], string> = {
  territorio:             "TER",
  comunidade:             "COM",
  escola:                 "ESC",
  associacao:             "ASSO",
  projeto:                "PROJ",
  documento:              "DOC",
  regiao_administrativa:  "REG",
  pessoa:                 "PES",
};

export async function generateEntityCode(type: (typeof entityTypeEnum.enumValues)[number]): Promise<string> {
  const [row] = await db
    .insert(entityCodeCounters)
    .values({ type, lastValue: 1 })
    .onConflictDoUpdate({
      target: entityCodeCounters.type,
      set: { lastValue: sql`${entityCodeCounters.lastValue} + 1`, updatedAt: sql`now()` },
    })
    .returning({ lastValue: entityCodeCounters.lastValue });

  return `${PREFIX[type]}-${String(row.lastValue).padStart(6, "0")}`;
}
