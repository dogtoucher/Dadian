import { z } from "zod";

export const canonExtractionSchema = z.object({
  entities: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        type: z.string().max(60).optional(),
        aliases: z.array(z.string().max(120)).max(20).optional(),
        summary: z.string().max(500).optional()
      })
    )
    .max(30),
  facts: z
    .array(
      z.object({
        subject: z.string().min(1).max(120),
        predicate: z.string().max(120).optional(),
        object: z.string().max(120).optional(),
        factText: z.string().min(1).max(500),
        certainty: z.number().min(0).max(1).optional(),
        statusHint: z
          .enum(["asserted", "disputed", "legendary", "attributed"])
          .optional()
      })
    )
    .max(50),
  relations: z
    .array(
      z.object({
        source: z.string().min(1).max(120),
        relationType: z.string().min(1).max(80),
        target: z.string().min(1).max(120),
        certainty: z.number().min(0).max(1).optional()
      })
    )
    .max(30),
  openQuestions: z.array(z.string().max(300)).max(20).optional()
});

export type CanonExtraction = z.infer<typeof canonExtractionSchema>;

export const factConflictSchema = z.object({
  safeToCommit: z.boolean(),
  conflicts: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high"]),
      newClaim: z.string(),
      existingClaim: z.string().optional(),
      recommendation: z.enum([
        "accept",
        "reject",
        "mark_disputed",
        "requires_user_review"
      ])
    })
  )
});

export type ValidationResult = z.infer<typeof factConflictSchema>;
