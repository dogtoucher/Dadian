import Dexie, { type Table } from "dexie";
import type { Article, World } from "../wiki/titles";
import type {
  Constraint,
  Entity,
  EntityAlias,
  Fact,
  GenerationRun,
  Relation,
  Summary,
  WikiCanonDataset,
  WikiCanonStorageAdapter
} from "./types";

export class DadianIndexedDb extends Dexie {
  worlds!: Table<World, string>;
  articles!: Table<Article, string>;
  entities!: Table<Entity, string>;
  aliases!: Table<EntityAlias, string>;
  facts!: Table<Fact, string>;
  relations!: Table<Relation, string>;
  constraints!: Table<Constraint, string>;
  summaries!: Table<Summary, string>;
  generationRuns!: Table<GenerationRun, string>;

  constructor(name = "dadian") {
    super(name);

    this.version(1).stores({
      worlds: "id, updatedAt, defaultLocale",
      articles: "id, [worldId+slug], worldId, slug, locale, status, updatedAt, entityId",
      entities: "id, [worldId+slug], worldId, canonicalName, status, type",
      aliases: "id, [worldId+normalizedAlias], worldId, entityId, normalizedAlias, locale",
      facts: "id, worldId, status, subjectEntityId, objectEntityId, sourceArticleId, updatedAt",
      relations: "id, worldId, sourceEntityId, targetEntityId, status, sourceArticleId",
      constraints: "id, worldId, scopeType, scopeId, constraintType, strength",
      summaries: "id, [worldId+targetType+targetId], worldId, targetType, targetId",
      generationRuns: "id, worldId, articleId, targetSlug, status, createdAt, updatedAt"
    });
  }
}

export class DexieWikiCanonStorageAdapter implements WikiCanonStorageAdapter {
  constructor(private readonly database: DadianIndexedDb = new DadianIndexedDb()) {}

  async listWorlds() {
    return this.database.worlds.orderBy("updatedAt").reverse().toArray();
  }

  async exportDataset(): Promise<WikiCanonDataset> {
    const [
      worlds,
      articles,
      entities,
      aliases,
      facts,
      relations,
      constraints,
      summaries,
      generationRuns
    ] = await Promise.all([
      this.database.worlds.toArray(),
      this.database.articles.toArray(),
      this.database.entities.toArray(),
      this.database.aliases.toArray(),
      this.database.facts.toArray(),
      this.database.relations.toArray(),
      this.database.constraints.toArray(),
      this.database.summaries.toArray(),
      this.database.generationRuns.toArray()
    ]);

    return {
      worlds,
      articles,
      entities,
      aliases,
      facts,
      relations,
      constraints,
      summaries,
      generationRuns
    };
  }

  async importDataset(dataset: WikiCanonDataset) {
    await this.database.transaction(
      "rw",
      [
        this.database.worlds,
        this.database.articles,
        this.database.entities,
        this.database.aliases,
        this.database.facts,
        this.database.relations,
        this.database.constraints,
        this.database.summaries,
        this.database.generationRuns
      ],
      async () => {
        await Promise.all([
          this.database.worlds.bulkPut(dataset.worlds),
          this.database.articles.bulkPut(dataset.articles),
          this.database.entities.bulkPut(dataset.entities),
          this.database.aliases.bulkPut(dataset.aliases),
          this.database.facts.bulkPut(dataset.facts),
          this.database.relations.bulkPut(dataset.relations),
          this.database.constraints.bulkPut(dataset.constraints),
          this.database.summaries.bulkPut(dataset.summaries),
          this.database.generationRuns.bulkPut(dataset.generationRuns)
        ]);
      }
    );
  }
}
