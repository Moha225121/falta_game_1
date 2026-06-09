import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { z } from "zod";

const dataFile = fileURLToPath(new URL("../data/questions.json", import.meta.url));

const QuestionSchema = z.object({
  category: z.string().trim().min(2).max(60),
  prompt: z.string().trim().min(8).max(400),
  correctAnswer: z.string().trim().min(1).max(160),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  source: z.string().trim().max(160).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  active: z.boolean().optional().default(true)
});

const QuestionUpdateSchema = QuestionSchema.partial();

function normalizeQuestion(input) {
  const parsed = QuestionSchema.parse({
    ...input,
    tags: normalizeTags(input.tags)
  });

  return parsed;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === "string") {
    return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  return [];
}

async function readAll() {
  const raw = await readFile(dataFile, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.questions || [];
}

async function writeAll(questions) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(questions, null, 2)}\n`, "utf8");
}

function filterQuestions(questions, filters = {}) {
  let result = [...questions];
  const categories = normalizeCategoryFilter(filters);

  if (categories.length > 0) {
    const allowedCategories = new Set(categories.map((category) => category.toLowerCase()));
    result = result.filter((question) => allowedCategories.has(question.category.toLowerCase()));
  }

  if (filters.active !== undefined) {
    const active = filters.active === true || filters.active === "true";
    result = result.filter((question) => Boolean(question.active) === active);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter((question) => {
      return [question.prompt, question.correctAnswer, question.category, ...(question.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }

  return result.sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
}

function normalizeCategoryFilter(filters = {}) {
  const value = filters.categories ?? filters.category;
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return [...new Set(raw
    .map((category) => String(category).trim())
    .filter((category) => category && category !== "all"))];
}

export class QuestionStore {
  async list(filters = {}) {
    const questions = await readAll();
    return filterQuestions(questions, filters);
  }

  async categories() {
    const questions = await readAll();
    return [...new Set(questions.filter((question) => question.active).map((question) => question.category))]
      .sort((a, b) => a.localeCompare(b, "ar"));
  }

  async stats() {
    const questions = await readAll();
    const byCategory = questions.reduce((acc, question) => {
      acc[question.category] = (acc[question.category] || 0) + 1;
      return acc;
    }, {});

    return {
      total: questions.length,
      active: questions.filter((question) => question.active).length,
      inactive: questions.filter((question) => !question.active).length,
      byCategory
    };
  }

  async get(id) {
    const questions = await readAll();
    return questions.find((question) => question.id === id) || null;
  }

  async create(input) {
    const now = new Date().toISOString();
    const question = {
      id: nanoid(10),
      ...normalizeQuestion(input),
      createdAt: now,
      updatedAt: now
    };
    const questions = await readAll();
    questions.push(question);
    await writeAll(questions);
    return question;
  }

  async update(id, input) {
    const parsed = QuestionUpdateSchema.parse({
      ...input,
      tags: input.tags === undefined ? undefined : normalizeTags(input.tags)
    });
    const questions = await readAll();
    const index = questions.findIndex((question) => question.id === id);

    if (index === -1) {
      return null;
    }

    questions[index] = {
      ...questions[index],
      ...parsed,
      updatedAt: new Date().toISOString()
    };

    await writeAll(questions);
    return questions[index];
  }

  async delete(id) {
    const questions = await readAll();
    const next = questions.filter((question) => question.id !== id);

    if (next.length === questions.length) {
      return false;
    }

    await writeAll(next);
    return true;
  }

  async random({ category = "all", categories = [], excludeIds = [] } = {}) {
    let questions = await this.list({ category, categories, active: true });
    questions = questions.filter((question) => !excludeIds.includes(question.id));

    if (questions.length === 0 && excludeIds.length > 0) {
      questions = await this.list({ category, categories, active: true });
    }

    if (questions.length === 0) {
      return null;
    }

    return questions[Math.floor(Math.random() * questions.length)];
  }
}
