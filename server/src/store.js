import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { BUILT_IN_MODE_COUNTS } from "./gameModes.js";
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
const defaultUserBackupFile = fileURLToPath(new URL("../data/questions.user.json", import.meta.url));
const retiredSeedQuestionIds = new Set([
  "q_limu_001",
  "q_limu_002",
  "q_limu_003",
  "q_limu_004",
  "q_limu_005",
  "q_limu_006",
  "q_limu_007",
  "q_limu_008",
  "q_limu_009",
  "q_limu_010",
  "q_limu_011",
  "q_limu_012",
  "q_limu_013",
  "q_limu_014",
  "q_limu_015",
  "q_limu_016",
  "q_limu_017"
]);
const retiredQuestionModes = new Set(["prizes", "science_day"]);

function isRetiredQuestionMode(mode) {
  return retiredQuestionModes.has(String(mode || "").trim());
}

function databasePath() {
  const configured = process.env.QUESTION_DB_PATH || process.env.QUESTIONS_DB_PATH;
  return configured ? resolve(process.cwd(), configured) : defaultDatabaseFile;
}

function userBackupPath() {
  const configured = process.env.QUESTION_BACKUP_PATH || process.env.QUESTIONS_BACKUP_PATH;
  return configured ? resolve(process.cwd(), configured) : defaultUserBackupFile;
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
  constructor({ dbPath = databasePath(), backupPath = userBackupPath() } = {}) {
    this.dbPath = dbPath;
    this.backupPath = backupPath;
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

      CREATE TABLE IF NOT EXISTS game_counters (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS room_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        room_code TEXT NOT NULL DEFAULT '',
        mode TEXT NOT NULL DEFAULT '',
        player_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_room_events_created_at ON room_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_room_events_type ON room_events(type);
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
    this.deleteQuestionsByMode = this.db.prepare("DELETE FROM questions WHERE mode = ?");
    this.deleteCategoriesByMode = this.db.prepare("DELETE FROM categories WHERE mode = ?");

    this.insertQuestionsTransaction = this.db.transaction((questions) => {
      for (const question of questions) {
        this.insertQuestion.run(rowFromQuestion(question));
      }
    });
    this.upsertQuestionsTransaction = this.db.transaction((questions) => {
      for (const question of questions) {
        const row = rowFromQuestion(question);
        const existing = this.selectQuestionById.get(question.id);
        if (!existing) {
          this.insertQuestion.run(row);
          continue;
        }

        const incomingTime = Date.parse(question.updatedAt || question.createdAt || "");
        const existingTime = Date.parse(existing.updated_at || existing.created_at || "");
        if (Number.isFinite(incomingTime) && (!Number.isFinite(existingTime) || incomingTime > existingTime)) {
          this.updateQuestion.run(row);
        }
      }
    });
    this.deleteRetiredQuestion = this.db.prepare("DELETE FROM questions WHERE id = ?");
    this.selectCounters = this.db.prepare("SELECT key, value FROM game_counters");
    this.upsertCounter = this.db.prepare(`
      INSERT INTO game_counters (key, value, updated_at)
      VALUES (@key, @value, @updatedAt)
      ON CONFLICT(key) DO UPDATE SET
        value = value + excluded.value,
        updated_at = excluded.updated_at
    `);
    this.insertRoomEvent = this.db.prepare(`
      INSERT INTO room_events (type, room_code, mode, player_count, created_at)
      VALUES (@type, @roomCode, @mode, @playerCount, @createdAt)
    `);
    this.selectRoomEvents = this.db.prepare("SELECT type, room_code, mode, player_count, created_at FROM room_events ORDER BY created_at DESC");
  }

  seedFromJsonIfNeeded() {
    const seedQuestions = readSeedRows(seedQuestionFile)
      .filter((question) => !isRetiredQuestionMode(question.mode))
      .map((question) => ({
        ...question,
        ...normalizeStoredQuestion(question)
      }))
      .filter((question) => !retiredSeedQuestionIds.has(question.id));
    const missingQuestions = seedQuestions.filter((question) => !this.selectQuestionById.get(question.id));

    if (missingQuestions.length > 0) {
      this.insertQuestionsTransaction(missingQuestions);
    }

    this.removeRetiredSeedQuestions();
    this.removeRetiredQuestionModes();
    this.restoreUserBackup();

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

    this.writeUserBackup();
  }

  removeRetiredSeedQuestions() {
    for (const id of retiredSeedQuestionIds) {
      const row = this.selectQuestionById.get(id);
      if (!row) {
        continue;
      }

      const category = String(row.category || "");
      const source = String(row.source || "");
      if (category === "الجامعة الليبية الدولية" || source.toLowerCase().includes("limu")) {
        this.deleteRetiredQuestion.run(id);
      }
    }
  }

  removeRetiredQuestionModes() {
    for (const mode of retiredQuestionModes) {
      this.deleteQuestionsByMode.run(mode);
      this.deleteCategoriesByMode.run(mode);
    }
  }

  restoreUserBackup() {
    const backupQuestions = readSeedRows(this.backupPath)
      .filter((question) => !isRetiredQuestionMode(question.mode))
      .filter((question) => !retiredSeedQuestionIds.has(question.id))
      .map((question) => ({
        ...question,
        ...normalizeStoredQuestion(question)
      }));

    if (backupQuestions.length > 0) {
      this.upsertQuestionsTransaction(backupQuestions);
    }
  }

  writeUserBackup() {
    const questions = this.allQuestions()
      .filter((question) => !retiredSeedQuestionIds.has(question.id))
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

    mkdirSync(dirname(this.backupPath), { recursive: true });
    writeFileSync(this.backupPath, `${JSON.stringify(questions, null, 2)}\n`, "utf8");
  }

  allQuestions() {
    return this.selectQuestions.all()
      .filter((row) => !isRetiredQuestionMode(row.mode))
      .map(questionFromRow);
  }

  allCategoryRows() {
    return this.selectCategories.all()
      .filter((row) => !isRetiredQuestionMode(row.mode))
      .map(categoryFromRow);
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
    const activeByMode = questions.reduce((acc, question) => {
      const mode = question.mode || "kalak";
      acc[mode] = (acc[mode] || 0) + (question.active === false ? 0 : 1);
      return acc;
    }, {});
    const inactiveByMode = questions.reduce((acc, question) => {
      const mode = question.mode || "kalak";
      acc[mode] = (acc[mode] || 0) + (question.active === false ? 1 : 0);
      return acc;
    }, {});
    const byModeDetailed = QUESTION_TYPE_DEFINITIONS.map((type) => {
      const databaseTotal = byMode[type.id] || 0;
      const databaseActive = activeByMode[type.id] || 0;
      const builtIn = BUILT_IN_MODE_COUNTS[type.id] || 0;

      return {
        mode: type.id,
        total: databaseTotal + builtIn,
        active: databaseActive + builtIn,
        inactive: inactiveByMode[type.id] || 0,
        database: databaseTotal,
        builtIn
      };
    });

    return {
      total: questions.length,
      active: questions.filter((question) => question.active).length,
      inactive: questions.filter((question) => !question.active).length,
      byCategory,
      byMode,
      byModeDetailed
    };
  }

  getGameCounters(defaults = {}) {
    const values = { ...defaults };
    for (const row of this.selectCounters.all()) {
      values[row.key] = Number(row.value || 0);
    }
    return values;
  }

  incrementGameCounter(key, amount = 1) {
    const cleanKey = String(key || "").trim();
    const value = Number(amount || 0);
    if (!cleanKey || !Number.isFinite(value) || value === 0) {
      return;
    }

    this.upsertCounter.run({
      key: cleanKey,
      value,
      updatedAt: new Date().toISOString()
    });
  }

  recordRoomEvent(type, room = {}) {
    this.insertRoomEvent.run({
      type: String(type || "event").trim() || "event",
      roomCode: String(room.code || ""),
      mode: String(room.activeMode || room.settings?.mode || ""),
      playerCount: Number(room.players?.size || room.playerCount || 0),
      createdAt: new Date().toISOString()
    });
  }

  roomEventStats() {
    const events = this.selectRoomEvents.all();
    const buckets = new Map();

    for (const event of events) {
      const date = new Date(event.created_at);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      date.setMinutes(0, 0, 0);
      const key = date.toISOString();
      const current = buckets.get(key) || { hour: key, created: 0, closed: 0 };
      if (event.type === "created") {
        current.created += 1;
      }
      if (event.type === "closed") {
        current.closed += 1;
      }
      buckets.set(key, current);
    }

    const timeline = [...buckets.values()]
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .slice(-24);
    const createdTotal = events.filter((event) => event.type === "created").length;
    const closedTotal = events.filter((event) => event.type === "closed").length;

    return {
      createdTotal,
      closedTotal,
      timeline,
      recent: events.slice(0, 10).map((event) => ({
        type: event.type,
        roomCode: event.room_code,
        mode: event.mode,
        playerCount: event.player_count,
        createdAt: event.created_at
      }))
    };
  }

  async get(id) {
    const row = this.selectQuestionById.get(id);
    return row && !isRetiredQuestionMode(row.mode) ? questionFromRow(row) : null;
  }

  async create(input) {
    const question = createQuestion(input);
    this.insertQuestion.run(rowFromQuestion(question));
    this.writeUserBackup();
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
    this.writeUserBackup();
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
    this.writeUserBackup();
    return question;
  }

  async delete(id) {
    const result = this.deleteQuestion.run(id);
    if (result.changes > 0) {
      this.writeUserBackup();
    }
    return result.changes > 0;
  }

  async random({ mode = "kalak", category = "all", categories = [], excludeIds = [], filter = null } = {}) {
    let questions = await this.list({ mode, category, categories, active: true });
    if (typeof filter === "function") {
      questions = questions.filter(filter);
    }
    questions = questions.filter((question) => !excludeIds.includes(question.id));

    if (questions.length === 0 && excludeIds.length > 0) {
      questions = await this.list({ mode, category, categories, active: true });
      if (typeof filter === "function") {
        questions = questions.filter(filter);
      }
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
