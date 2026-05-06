import { z } from "zod";

export const articlePatchRequestSchema = z.object({
  markdown: z.string().min(1, "缺少 markdown。")
});

export const generateArticleRequestSchema = z.object({
  title: z.string().trim().min(1, "缺少词条标题。"),
  sourceSlug: z.string().trim().min(1).optional()
});

export const constraintCreateRequestSchema = z.object({
  scopeType: z.enum(["world", "entity", "article"]),
  scopeId: z.string().trim().min(1).optional(),
  constraintType: z.enum([
    "negative",
    "style",
    "hard_rule",
    "soft_preference",
    "generation_policy"
  ]),
  text: z.string().trim().min(1, "缺少约束参数。"),
  strength: z.enum(["soft", "hard"]).optional()
});
