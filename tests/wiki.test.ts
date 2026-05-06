import test from "node:test";
import assert from "node:assert/strict";
import {
  slugToTitle,
  titleToSlug
} from "../src/lib/wiki/slug.ts";
import {
  enrichWikiLinks,
  extractWikiLinks,
  stripWikiSyntax
} from "../src/lib/wiki/links.ts";
import { cleanMetaNarration } from "../src/lib/wiki/clean.ts";

test("title slugs round-trip Chinese titles", () => {
  const title = "南极档案 局";
  assert.equal(slugToTitle(titleToSlug(title)), title);
});

test("titleToSlug keeps readable Chinese titles", () => {
  assert.equal(titleToSlug("日常裂隙"), "日常裂隙");
});

test("extractWikiLinks returns unique non-empty wiki links", () => {
  assert.deepEqual(
    extractWikiLinks("[[甲]] 和 [[乙]]，以及重复的 [[甲]]。"),
    ["甲", "乙"]
  );
});

test("stripWikiSyntax removes link brackets", () => {
  assert.equal(stripWikiSyntax("来自[[归档城]]的记录"), "来自归档城的记录");
});

test("enrichWikiLinks links existing titles once without touching headings or existing links", () => {
  const markdown = [
    "# 公共记忆网络",
    "公共记忆网络在断网后由归档城重新维护。",
    "已有链接 [[灰港案]] 不应重复处理，`归档城` 代码样式也不应处理。",
    "归档城后来建立了新的审计办公室。"
  ].join("\n");

  assert.equal(
    enrichWikiLinks(markdown, ["公共记忆网络", "归档城", "灰港案"], "公共记忆网络"),
    [
      "# 公共记忆网络",
      "公共记忆网络在断网后由[[归档城]]重新维护。",
      "已有链接 [[灰港案]] 不应重复处理，`归档城` 代码样式也不应处理。",
      "归档城后来建立了新的审计办公室。"
    ].join("\n")
  );
});

test("cleanMetaNarration removes leaked drafting notes", () => {
  assert.equal(
    cleanMetaNarration(
      "1960年，日本殖民当局为纪念日美亲善二百周年（虚构，照应1760年日本发现加州？——但按 canon 该为轴心国胜利后设定，此处应省略此段）设立纪念馆。"
    ),
    "1960年，日本殖民当局为纪念日美亲善二百周年设立纪念馆。"
  );
});
