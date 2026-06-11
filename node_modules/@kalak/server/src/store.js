import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import {
  modeAnswerLabel,
  normalizeQuestionInput,
  normalizeStoredQuestion,
  normalizeTags,
  QUESTION_TYPE_DEFINITIONS,
  QUESTION_MODE_IDS
} from "./questionTypes.js";

const dataFile = fileURLToPath(new URL("../data/questions.json", import.meta.url));
const categoryFile = fileURLToPath(new URL("../data/categories.json", import.meta.url));

async function readAll() {
  const raw = await readFile(dataFile, "utf8");
  const parsed = JSON.parse(raw);
  const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

  return questions.map((question) => ({
    ...question,
    ...normalizeStoredQuestion(question)
  }));
}

async function writeAll(questions) {
  await mkdir(dirname(dataFile), { recursive: true });
  const tmpFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpFile, `${JSON.stringify(questions, null, 2)}\n`, "utf8");
  await rename(tmpFile, dataFile);
}

async function readCategoryRows() {
  try {
    const raw = await readFile(categoryFile, "utf8");
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : parsed.categories || [];
    return rows.map(normalizeCategoryRecord).filter(Boolean);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeCategoryRows(rows) {
  await mkdir(dirname(categoryFile), { recursive: true });
  const tmpFile = `${categoryFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpFile, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  await rename(tmpFile, categoryFile);
}

function filterQuestions(questions, filters = {}) {
  let result = [...questions];
  const categories = normalizeCategoryFilter(filters);
  const mode = normalizeModeFilter(filters.mode);

  if (mode) {
    result = result.filter((question) => (question.mode || "kalak") === mode);
  }

  if (categories.length > 0) {
    const allowedCategories = new Set(categories.map((category) => category.toLowerCase()));
    result = result.filter((question) => allowedCategories.has(question.category.toLowerCase()));
  }

  if (filters.active !== undefined) {
    const active = filters.active === true || filters.active === "true";
    result = result.filter((question) => Boolean(question.active) === active);
  }

  if (filters.search) {
    const search = String(filters.search).toLowerCase();
    result = result.filter((question) => {
      return [
        question.mode,
        question.prompt,
        question.correctAnswer,
        modeAnswerLabel(question),
        question.category,
        question.source,
        ...(question.tags || []),
        ...Object.values(question.content || {}).flatMap((value) => Array.isArray(value) ? value : [value])
      ]
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

function normalizeModeFilter(mode) {
  const value = String(mode || "").trim();
  if (!value || value === "all") {
    return "";
  }

  return QUESTION_MODE_IDS.has(value) ? value : "";
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function cleanCategoryMode(mode) {
  const value = String(mode || "kalak").trim();
  if (!QUESTION_MODE_IDS.has(value)) {
    throw badRequest("طور التصنيف غير مدعوم.");
  }
  return value;
}

function cleanCategoryName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  if (name.length < 2) {
    throw badRequest("اسم التصنيف يحتاج حرفين على الأقل.");
  }
  if (name.length > 60) {
    throw badRequest("اسم التصنيف يجب ألا يتجاوز 60 حرفًا.");
  }
  return name;
}

function categoryKey(mode, category) {
  return `${mode}::${category.toLowerCase()}`;
}

function normalizeCategoryRecord(row = {}) {
  try {
    const mode = cleanCategoryMode(row.mode);
    const name = cleanCategoryName(row.name ?? row.category);
    return {
      id: String(row.id || nanoid(8)),
      mode,
      name,
      active: row.active !== false,
      createdAt: String(row.createdAt || new Date().toISOString()),
      updatedAt: String(row.updatedAt || row.createdAt || new Date().toISOString())
    };
  } catch {
    return null;
  }
}

function createQuestion(input, now = new Date().toISOString()) {
  return {
    id: nanoid(10),
    ...normalizeQuestionInput(input),
    createdAt: now,
    updatedAt: now
  };
}

export class QuestionStore {
  async list(filters = {}) {
    const questions = await readAll();
    return filterQuestions(questions, filters);
  }

  async categories(filters = {}) {
    const mode = filters.mode === undefined ? "kalak" : filters.mode;
    const questions = await this.list({ ...filters, mode, active: true });
    return [...new Set(questions.map((question) => question.category))]
      .sort((a, b) => a.localeCompare(b, "ar"));
  }

  async categoryRecords(filters = {}) {
    const [questions, storedCategories] = await Promise.all([readAll(), readCategoryRows()]);
    const rows = new Map();

    const ensureRow = (mode, category, metadata = {}) => {
      const cleanMode = cleanCategoryMode(mode);
      const cleanName = cleanCategoryName(category);
      const key = categoryKey(cleanMode, cleanName);

      if (!rows.has(key)) {
        rows.set(key, {
          key,
          id: "",
          mode: cleanMode,
          category: cleanName,
          stored: false,
          enabled: true,
          total: 0,
          active: 0,
          hidden: 0,
          createdAt: "",
          updatedAt: "",
          ...metadata
        });
      } else {
        rows.set(key, {
          ...rows.get(key),
          ...metadata
        });
      }

      return rows.get(key);
    };

    for (const type of QUESTION_TYPE_DEFINITIONS) {
      ensureRow(type.id, type.category || "عام");
    }

    for (const category of storedCategories) {
      ensureRow(category.mode, category.name, {
        id: category.id,
        stored: true,
        enabled: category.active,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      });
    }

    for (const question of questions) {
      const mode = question.mode || "kalak";
      const row = ensureRow(mode, question.category || "عام");
      row.total += 1;
      if (question.active === false) {
        row.hidden += 1;
      } else {
        row.active += 1;
      }
    }

    const mode = normalizeModeFilter(filters.mode);
    return [...rows.values()]
      .filter((row) => !mode || row.mode === mode)
      .sort((a, b) => {
        const modeSort = a.mode.localeCompare(b.mode);
        return modeSort || a.category.localeCompare(b.category, "ar");
      });
  }

  async createCategory(input = {}) {
    const mode = cleanCategoryMode(input.mode);
    const name = cleanCategoryName(input.name ?? input.category);
    const rows = await readCategoryRows();
    const existing = rows.find((row) => row.mode === mode && row.name.toLowerCase() === name.toLowerCase());

    if (existing) {
      if (existing.active === false) {
        existing.active = true;
        existing.updatedAt = new Date().toISOString();
        await writeCategoryRows(rows);
      }
      return {
        ...existing,
        category: existing.name,
        stored: true,
        enabled: existing.active,
        total: 0,
        active: 0,
        hidden: 0
      };
    }

    const now = new Date().toISOString();
    const category = {
      id: nanoid(8),
      mode,
      name,
      active: input.active !== false,
      createdAt: now,
      updatedAt: now
    };
    await writeCategoryRows([...rows, category]);

    return {
      ...category,
      category: category.name,
      stored: true,
      enabled: category.active,
      total: 0,
      active: 0,
      hidden: 0
    };
  }

  async stats() {
    const questions = await readAll();
    const byCategory = questions.reduce((acc, question) => {
      acc[question.category] = (acc[question.category] || 0) + 1;
      return acc;
    }, {});
    const byMode = questions.reduce((acc, question) => {
      const mode = question.mode || "kalak";
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {});

    return {
      total: questions.length,
      active: questions.filter((question) => question.active).length,
      inactive: questions.filter((question) => !question.active).length,
      byCategory,
      byMode
    };
  }

  async get(id) {
    const questions = await readAll();
    return questions.find((question) => question.id === id) || null;
  }

  async create(input) {
    const question = createQuestion(input);
    const questions = await readAll();
    questions.push(question);
    await writeAll(questions);
    return question;
  }

  async createMany(input) {
    const rows = Array.isArray(input) ? input : input?.questions;
    if (!Array.isArray(rows) || rows.length === 0) {
      const error = new Error("ملف الاستيراد يجب أن يحتوي على قائمة أسئلة غير فارغة.");
      error.statusCode = 400;
      throw error;
    }

    const now = new Date().toISOString();
    const created = rows.map((row) => createQuestion(row, now));
    const questions = await readAll();
    await writeAll([...questions, ...created]);
    return created;
  }

  async update(id, input) {
    const questions = await readAll();
    const index = questions.findIndex((question) => question.id === id);

    if (index === -1) {
      return null;
    }

    const existing = questions[index];
    const parsed = normalizeQuestionInput(
      {
        ...input,
        tags: input.tags === undefined ? existing.tags : normalizeTags(input.tags)
      },
      existing
    );

    questions[index] = {
      ...existing,
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

  async random({ mode = "kalak", category = "all", categories = [], excludeIds = [] } = {}) {
    let questions = await this.list({ mode, category, categories, active: true });
    questions = questions.filter((question) => !excludeIds.includes(question.id));

    if (questions.length === 0 && excludeIds.length > 0) {
      questions = await this.list({ mode, category, categories, active: true });
    }

    if (questions.length === 0) {
      return null;
    }

    return questions[Math.floor(Math.random() * questions.length)];
  }
}
