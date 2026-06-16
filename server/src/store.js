import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

const seedQuestionFile = fileURLToPath(new URL("../data/questions.json", import.meta.url));
const seedCategoryFile = fileURLToPath(new URL("../data/categories.json", import.meta.url));
const defaultDatabaseFile = fileURLToPath(new URL("../data/questions.sqlite", import.meta.url));

function databasePath() {
  const configured = process.env.QUESTION_DB_PATH || process.env.QUESTIONS_DB_PATH;
  return configured ? resolve(process.cwd(), configured) : defaultDatabaseFile;
}

function parseJson(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readSeedRows(file) {
  if (!existsSync(file)) {
    return [];
  }

  const raw = readFileSync(file, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.questions || parsed.categories || [];
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

function rowFromQuestion(question) {
  return {
    id: question.id,
    mode: question.mode || "kalak",
    category: question.category || "عام",
    prompt: question.prompt || "",
    correctAnswer: question.correctAnswer || "",
    difficulty: question.difficulty || "medium",
    source: question.source || "",
    tags: JSON.stringify(question.tags || []),
    active: question.active === false ? 0 : 1,
    content: JSON.stringify(question.content || {}),
    createdAt: question.createdAt || new Date().toISOString(),
    updatedAt: question.updatedAt || question.createdAt || new Date().toISOString()
  };
}

function questionFromRow(row) {
  const question = {
    id: row.id,
    mode: row.mode,
    category: row.category,
    prompt: row.prompt,
    correctAnswer: row.correct_answer,
    difficulty: row.difficulty,
    source: row.source,
    tags: parseJson(row.tags, []),
    active: Boolean(row.active),
    content: parseJson(row.content, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  return {
    ...question,
    ...normalizeStoredQuestion(question)
  };
}

function categoryFromRow(row) {
  return {
    id: row.id,
    mode: row.mode,
    name: row.name,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class QuestionStore {
  constructor({ dbPath = databasePath() } = {}) {
    this.dbPath = dbPath;
    mkdirSync(dirname(this.dbPath), { recursive: true });
    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    this.prepareSchema();
    this.prepareStatements();
    this.seedFromJsonIfNeeded();
  }

  prepareSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        category TEXT NOT NULL,
        prompt TEXT NOT NULL DEFAULT '',
        correct_answer TEXT NOT NULL DEFAULT '',
        difficulty TEXT NOT NULL DEFAULT 'medium',
        source TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        active INTEGER NOT NULL DEFAULT 1,
        content TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_questions_mode_active ON questions(mode, active);
      CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
      CREATE INDEX IF NOT EXISTS idx_questions_updated_at ON questions(updated_at);

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_mode_name ON categories(mode, name COLLATE NOCASE);
    `);
  }

  prepareStatements() {
    this.selectQuestions = this.db.prepare("SELECT * FROM questions");
    this.selectQuestionById = this.db.prepare("SELECT * FROM questions WHERE id = ?");
    this.countQuestions = this.db.prepare("SELECT COUNT(*) AS count FROM questions");
    this.insertQuestion = this.db.prepare(`
      INSERT INTO questions (
        id, mode, category, prompt, correct_answer, difficulty, source, tags, active, content, created_at, updated_at
      ) VALUES (
        @id, @mode, @category, @prompt, @correctAnswer, @difficulty, @source, @tags, @active, @content, @createdAt, @updatedAt
      )
    `);
    this.updateQuestion = this.db.prepare(`
      UPDATE questions SET
        mode = @mode,
        category = @category,
        prompt = @prompt,
        correct_answer = @correctAnswer,
        difficulty = @difficulty,
        source = @source,
        tags = @tags,
        active = @active,
        content = @content,
        updated_at = @updatedAt
      WHERE id = @id
    `);
    this.deleteQuestion = this.db.prepare("DELETE FROM questions WHERE id = ?");

    this.selectCategories = this.db.prepare("SELECT * FROM categories");
    this.countCategories = this.db.prepare("SELECT COUNT(*) AS count FROM categories");
    this.findCategory = this.db.prepare("SELECT * FROM categories WHERE mode = ? AND lower(name) = lower(?)");
    this.insertCategory = this.db.prepare(`
      INSERT INTO categories (id, mode, name, active, created_at, updated_at)
      VALUES (@id, @mode, @name, @active, @createdAt, @updatedAt)
    `);
    this.updateCategory = this.db.prepare(`
      UPDATE categories SET active = @active, updated_at = @updatedAt WHERE id = @id
    `);

    this.insertQuestionsTransaction = this.db.transaction((questions) => {
      for (const question of questions) {
        this.insertQuestion.run(rowFromQuestion(question));
      }
    });
  }

  seedFromJsonIfNeeded() {
    const questions = readSeedRows(seedQuestionFile)
      .map((question) => ({
        ...question,
        ...normalizeStoredQuestion(question)
      }));
    const missingQuestions = questions.filter((question) => !this.selectQuestionById.get(question.id));

    if (missingQuestions.length > 0) {
      this.insertQuestionsTransaction(missingQuestions);
    }

    if (this.countCategories.get().count === 0) {
      const categories = readSeedRows(seedCategoryFile).map(normalizeCategoryRecord).filter(Boolean);
      const insert = this.db.transaction((rows) => {
        for (const category of rows) {
          this.insertCategory.run({
            ...category,
            active: category.active ? 1 : 0
          });
        }
      });
      insert(categories);
    }
  }

  allQuestions() {
    return this.selectQuestions.all().map(questionFromRow);
  }

  allCategoryRows() {
    return this.selectCategories.all().map(categoryFromRow);
  }

  async list(filters = {}) {
    return filterQuestions(this.allQuestions(), filters);
  }

  async categories(filters = {}) {
    const mode = filters.mode === undefined ? "kalak" : filters.mode;
    const questions = await this.list({ ...filters, mode, active: true });
    return [...new Set(questions.map((question) => question.category))]
      .sort((a, b) => a.localeCompare(b, "ar"));
  }

  async categoryRecords(filters = {}) {
    const questions = this.allQuestions();
    const storedCategories = this.allCategoryRows();
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
    const existing = this.findCategory.get(mode, name);

    if (existing) {
      const category = categoryFromRow(existing);
      if (category.active === false) {
        category.active = true;
        category.updatedAt = new Date().toISOString();
        this.updateCategory.run({
          id: category.id,
          active: 1,
          updatedAt: category.updatedAt
        });
      }
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

    const now = new Date().toISOString();
    const category = {
      id: nanoid(8),
      mode,
      name,
      active: input.active !== false,
      createdAt: now,
      updatedAt: now
    };
    this.insertCategory.run({
      ...category,
      active: category.active ? 1 : 0
    });

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
    const questions = this.allQuestions();
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
    const row = this.selectQuestionById.get(id);
    return row ? questionFromRow(row) : null;
  }

  async create(input) {
    const question = createQuestion(input);
    this.insertQuestion.run(rowFromQuestion(question));
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
    this.insertQuestionsTransaction(created);
    return created;
  }

  async update(id, input) {
    const existing = await this.get(id);

    if (!existing) {
      return null;
    }

    const parsed = normalizeQuestionInput(
      {
        ...input,
        tags: input.tags === undefined ? existing.tags : normalizeTags(input.tags)
      },
      existing
    );
    const question = {
      ...existing,
      ...parsed,
      updatedAt: new Date().toISOString()
    };

    this.updateQuestion.run(rowFromQuestion(question));
    return question;
  }

  async delete(id) {
    const result = this.deleteQuestion.run(id);
    return result.changes > 0;
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

  close() {
    this.db.close();
  }
}
