import type { Article, World } from "../wiki/titles";

export type EntityStatus =
  | "provisional"
  | "accepted"
  | "canonical"
  | "rejected"
  | "deprecated";

export type Entity = {
  id: string;
  worldId: string;
  canonicalName: string;
  slug: string;
  type: string | null;
  summary: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type EntityAlias = {
  id: string;
  worldId: string;
  entityId: string;
  alias: string;
  normalizedAlias: string;
  locale: string | null;
  createdAt: string;
};

export type FactStatus =
  | "provisional"
  | "accepted"
  | "canonical"
  | "disputed"
  | "rejected"
  | "deprecated";

export type Fact = {
  id: string;
  worldId: string;
  subjectEntityId: string | null;
  predicate: string | null;
  objectEntityId: string | null;
  objectText: string | null;
  factText: string;
  status: FactStatus;
  certainty: number;
  sourceArticleId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RelationStatus =
  | "provisional"
  | "accepted"
  | "canonical"
  | "disputed"
  | "rejected"
  | "deprecated";

export type Relation = {
  id: string;
  worldId: string;
  sourceEntityId: string;
  relationType: string;
  targetEntityId: string;
  status: RelationStatus;
  certainty: number;
  sourceArticleId: string | null;
  createdAt: string;
};

export type ConstraintScope = "world" | "entity" | "article";
export type ConstraintType =
  | "negative"
  | "style"
  | "hard_rule"
  | "soft_preference"
  | "generation_policy";
export type ConstraintStrength = "soft" | "hard";

export type Constraint = {
  id: string;
  worldId: string;
  scopeType: ConstraintScope;
  scopeId: string | null;
  constraintType: ConstraintType;
  text: string;
  strength: ConstraintStrength;
  createdAt: string;
  updatedAt: string;
};

export type SummaryTarget = "overview" | "canon_brief";
export type SummaryStatus = "generated" | "edited";

export type Summary = {
  id: string;
  worldId: string;
  targetType: SummaryTarget;
  targetId: string | null;
  summaryMd: string | null;
  summaryJson: string | null;
  status: SummaryStatus;
  createdAt: string;
  updatedAt: string;
};

export type GenerationRunStatus = "started" | "streaming" | "completed" | "failed";

export type GenerationRun = {
  id: string;
  worldId: string;
  articleId: string | null;
  targetTitle: string;
  targetSlug: string;
  model: string | null;
  promptVersionsJson: string | null;
  retrievedContextJson: string | null;
  outputJson: string | null;
  extractionJson: string | null;
  validationJson: string | null;
  status: GenerationRunStatus;
  createdAt: string;
  updatedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  errorJson: string | null;
};

export type WikiCanonDataset = {
  worlds: World[];
  articles: Article[];
  entities: Entity[];
  aliases: EntityAlias[];
  facts: Fact[];
  relations: Relation[];
  constraints: Constraint[];
  summaries: Summary[];
  generationRuns: GenerationRun[];
};

export interface WikiCanonStorageAdapter {
  listWorlds(): Promise<World[]>;
  exportDataset(): Promise<WikiCanonDataset>;
  importDataset?(dataset: WikiCanonDataset): Promise<void>;
}
