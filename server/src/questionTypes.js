import { z } from "zod";

export const DIRECT_CHOICE_MODES = new Set([
  "emoji_decode",
  "map_hunt",
  "quote_hunt",
  "odd_one",
  "order_it"
]);

export const CHOICE_POLL_MODES = new Set([
  "target_guess",
  "minority_wins",
  "mind_match"
]);

export const PROMPT_ONLY_MODES = new Set([
  "last_survivor",
  "hot_take",
  "split_steal"
]);

export const QUESTION_TYPE_DEFINITIONS = [
  {
    id: "kalak",
    name: "شن الصح؟",
    kind: "trivia",
    category: "عام",
    summary: "سؤال له إجابة صحيحة، واللاعبون يكتبون إجابات مخادعة."
  },
  {
    id: "imposter",
    name: "الدخيل",
    kind: "secret_word",
    category: "الدخيل",
    summary: "كلمة سرية تظهر لكل اللاعبين ما عدا الدخيل."
  },
  {
    id: "fake_fact",
    name: "كذبة ذكية",
    kind: "true_false",
    category: "كذبة ذكية",
    summary: "معلومة يحددها المدير كصح أو كذبة مع شرح اختياري."
  },
  {
    id: "spot_ai",
    name: "كشف الذكاء",
    kind: "ai_prompt",
    category: "كشف الذكاء",
    summary: "طلب كتابة مع إجابة جاهزة تمثل إجابة الذكاء الاصطناعي."
  },
  {
    id: "judge_pick",
    name: "الحكم",
    kind: "judge_prompt",
    category: "الحكم",
    summary: "سؤال للحكم مع إجابات جاهزة تختلط بإجابات اللاعبين."
  }
];

export const QUESTION_MODE_IDS = new Set(QUESTION_TYPE_DEFINITIONS.map((mode) => mode.id));

const questionModeEnum = z.enum(QUESTION_TYPE_DEFINITIONS.map((mode) => mode.id));
const difficultySchema = z.enum(["easy", "medium", "hard"]);
const optionalText = z.string().trim();

export function questionTypes() {
  return QUESTION_TYPE_DEFINITIONS.map((mode) => ({
    ...mode,
    fields: fieldsForKind(mode.kind)
  }));
}

export function questionTypeForMode(mode) {
  return QUESTION_TYPE_DEFINITIONS.find((item) => item.id === mode) || QUESTION_TYPE_DEFINITIONS[0];
}

export function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === "string") {
    return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  return [];
}

export function normalizeQuestionInput(input = {}, existing = null) {
  const merged = mergeQuestionInput(input, existing);
  const mode = cleanMode(merged.mode);
  const definition = questionTypeForMode(mode);
  const activeFallback = existing ? Boolean(existing.active) : true;
  const common = {
    mode,
    category: textValue(merged.category, definition.category, "category", 60, 2),
    difficulty: difficultySchema.catch("medium").parse(merged.difficulty),
    source: optionalText.max(160).catch("").parse(merged.source ?? ""),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).parse(normalizeTags(merged.tags)),
    active: normalizeActive(merged.active, activeFallback)
  };
  const modeFields = normalizeModeFields(mode, definition.kind, merged);

  return {
    ...common,
    ...modeFields
  };
}

export function normalizeStoredQuestion(question = {}) {
  try {
    return normalizeQuestionInput(question);
  } catch {
    const fallbackPrompt = String(question.prompt || "").trim();
    const fallbackAnswer = String(question.correctAnswer || "").trim();

    return {
      mode: QUESTION_MODE_IDS.has(question.mode) ? question.mode : "kalak",
      category: String(question.category || "عام").trim() || "عام",
      prompt: fallbackPrompt,
      correctAnswer: fallbackAnswer,
      difficulty: difficultySchema.catch("medium").parse(question.difficulty),
      source: String(question.source || "").trim(),
      tags: normalizeTags(question.tags),
      active: question.active !== false,
      content: {
        prompt: fallbackPrompt,
        correctAnswer: fallbackAnswer
      }
    };
  }
}

export function modeAnswerLabel(question = {}) {
  const mode = question.mode || "kalak";
  const content = question.content || {};

  if (mode === "imposter") {
    return content.secretWord || question.correctAnswer || "";
  }

  if (mode === "fake_fact") {
    return content.answer === "true" ? "true" : "fake";
  }

  if (mode === "spot_ai") {
    return content.aiAnswer || question.correctAnswer || "";
  }

  if (mode === "judge_pick") {
    return (content.gameAnswers || []).join(", ");
  }

  if (DIRECT_CHOICE_MODES.has(mode)) {
    return content.correct || question.correctAnswer || "";
  }

  if (mode === "reverse_trap") {
    return content.trap || question.correctAnswer || "";
  }

  if (mode === "closest_number") {
    const unit = content.unit ? ` ${content.unit}` : "";
    return content.answer === undefined ? "" : `${content.answer}${unit}`;
  }

  return question.correctAnswer || "";
}

function mergeQuestionInput(input, existing) {
  const existingContent = existing?.content && typeof existing.content === "object" ? existing.content : {};
  const inputContent = input?.content && typeof input.content === "object" ? input.content : {};
  const merged = {
    ...(existing || {}),
    ...(input || {}),
    content: {
      ...existingContent,
      ...inputContent
    }
  };

  if (input?.tags === undefined && existing) {
    merged.tags = existing.tags;
  }

  if (input?.active === undefined && existing) {
    merged.active = existing.active;
  }

  return merged;
}

function cleanMode(mode) {
  const value = String(mode || "kalak").trim();
  return questionModeEnum.parse(value || "kalak");
}

function normalizeModeFields(mode, kind, input) {
  if (mode === "kalak") {
    const prompt = textFrom(input, ["prompt"], "prompt", 400, 8);
    const correctAnswer = textFrom(input, ["correctAnswer", "answer"], "correctAnswer", 160, 1);
    return {
      prompt,
      correctAnswer,
      content: { prompt, correctAnswer }
    };
  }

  if (mode === "imposter") {
    const secretWord = textFrom(input, ["secretWord", "correctAnswer", "answer"], "secretWord", 80, 1);
    const prompt = optionalText
      .max(400)
      .catch("")
      .parse(valueFrom(input, ["prompt", "cluePrompt"]) || "اكتب وصفًا من كلمة واحدة للكلمة السرية.");
    return {
      prompt,
      correctAnswer: secretWord,
      content: { secretWord, cluePrompt: prompt }
    };
  }

  if (mode === "fake_fact") {
    const statement = textFrom(input, ["statement", "prompt"], "statement", 400, 8);
    const answer = normalizeTruthAnswer(valueFrom(input, ["truthAnswer", "answer", "correctAnswer"]));
    const explanation = optionalText.max(400).catch("").parse(valueFrom(input, ["explanation"]) || "");
    return {
      prompt: statement,
      correctAnswer: answer,
      content: { statement, answer, explanation }
    };
  }

  if (mode === "spot_ai") {
    const prompt = textFrom(input, ["prompt"], "prompt", 400, 8);
    const aiAnswer = textFrom(input, ["aiAnswer", "correctAnswer", "answer"], "aiAnswer", 220, 1);
    return {
      prompt,
      correctAnswer: aiAnswer,
      content: { prompt, aiAnswer }
    };
  }

  if (mode === "judge_pick") {
    const prompt = textFrom(input, ["prompt"], "prompt", 400, 8);
    const gameAnswers = lineListFrom(input, ["gameAnswers", "answers", "options"], "gameAnswers", 1, 8, 220);
    return {
      prompt,
      correctAnswer: gameAnswers[0] || "",
      content: { prompt, gameAnswers }
    };
  }

  if (PROMPT_ONLY_MODES.has(mode)) {
    const prompt = textFrom(input, ["prompt", "scenario", "challenge"], "prompt", 400, 8);
    return {
      prompt,
      correctAnswer: "",
      content: { prompt }
    };
  }

  if (mode === "closest_number") {
    const prompt = textFrom(input, ["prompt"], "prompt", 400, 8);
    const answer = numberFrom(input, ["numericAnswer", "answer", "correctAnswer"]);
    const unit = optionalText.max(40).catch("").parse(valueFrom(input, ["unit"]) || "");
    const explanation = optionalText.max(400).catch("").parse(valueFrom(input, ["explanation"]) || "");
    return {
      prompt,
      correctAnswer: `${answer}`,
      content: { prompt, answer, unit, explanation }
    };
  }

  if (CHOICE_POLL_MODES.has(mode)) {
    const prompt = textFrom(input, ["prompt"], "prompt", 400, 8);
    const options = lineListFrom(input, ["options"], "options", 2, 8, 120);
    return {
      prompt,
      correctAnswer: "",
      content: { prompt, options }
    };
  }

  if (mode === "reverse_trap") {
    const prompt = textFrom(input, ["prompt"], "prompt", 400, 8);
    const options = lineListFrom(input, ["options"], "options", 2, 8, 120);
    const trap = textFrom(input, ["trap", "trapAnswer", "correctAnswer", "answer"], "trap", 120, 1);
    ensureInOptions(trap, options, "trap");
    const explanation = optionalText.max(400).catch("").parse(valueFrom(input, ["explanation"]) || "");
    return {
      prompt,
      correctAnswer: trap,
      content: { prompt, trap, options, explanation }
    };
  }

  if (DIRECT_CHOICE_MODES.has(mode) || kind === "direct_choice") {
    const prompt = textFrom(input, ["prompt"], "prompt", 400, 1);
    const options = lineListFrom(input, ["options"], "options", 2, 8, 120);
    const correct = textFrom(input, ["correct", "correctAnswer", "answer"], "correctAnswer", 120, 1);
    ensureInOptions(correct, options, "correctAnswer");
    const explanation = optionalText.max(400).catch("").parse(valueFrom(input, ["explanation"]) || "");
    return {
      prompt,
      correctAnswer: correct,
      content: { prompt, correct, options, explanation }
    };
  }

  throw new z.ZodError([{
    code: z.ZodIssueCode.custom,
    path: ["mode"],
    message: `طور السؤال غير مدعوم: ${mode}`
  }]);
}

function fieldsForKind(kind) {
  const common = ["mode", "category", "difficulty", "source", "tags", "active"];

  return {
    trivia: [...common, "prompt", "correctAnswer"],
    secret_word: [...common, "secretWord", "prompt"],
    true_false: [...common, "statement", "answer", "explanation"],
    ai_prompt: [...common, "prompt", "aiAnswer"],
    judge_prompt: [...common, "prompt", "gameAnswers"],
    prompt_only: [...common, "prompt"],
    number: [...common, "prompt", "answer", "unit", "explanation"],
    choice_poll: [...common, "prompt", "options"],
    trap_choice: [...common, "prompt", "options", "trap", "explanation"],
    direct_choice: [...common, "prompt", "options", "correctAnswer", "explanation"]
  }[kind] || common;
}

function normalizeActive(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === "string") {
    return !["false", "0", "no", "off"].includes(value.trim().toLowerCase());
  }

  return Boolean(value);
}

function textValue(value, fallback, path, max, min = 1) {
  const raw = value === undefined || value === null || String(value).trim() === "" ? fallback : value;
  return z.string().trim().min(min, `${path} مطلوب`).max(max).parse(String(raw));
}

function textFrom(input, keys, path, max, min = 1) {
  const value = valueFrom(input, keys);
  return z.string().trim().min(min, `${path} مطلوب`).max(max).parse(String(value ?? ""));
}

function valueFrom(input, keys) {
  for (const key of keys) {
    if (input[key] !== undefined) {
      return input[key];
    }

    if (input.content && typeof input.content === "object" && input.content[key] !== undefined) {
      return input.content[key];
    }
  }

  return undefined;
}

function lineListFrom(input, keys, path, min, max, itemMax) {
  const raw = valueFrom(input, keys);
  let values = [];

  if (Array.isArray(raw)) {
    values = raw;
  } else if (typeof raw === "string") {
    values = raw.split(/\r?\n|,/);
  }

  const cleaned = [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
  return z.array(z.string().min(1).max(itemMax)).min(min, `${path} يحتاج ${min} عناصر على الأقل`).max(max).parse(cleaned);
}

function numberFrom(input, keys) {
  const raw = valueFrom(input, keys);
  const number = Number(raw);

  if (!Number.isFinite(number)) {
    throw new z.ZodError([{
      code: z.ZodIssueCode.custom,
      path: keys[0] ? [keys[0]] : ["answer"],
      message: "الإجابة الرقمية مطلوبة"
    }]);
  }

  return number;
}

function normalizeTruthAnswer(value) {
  const raw = String(value ?? "").trim().toLowerCase();

  if (["true", "1", "yes", "correct"].includes(raw)) {
    return "true";
  }

  if (["fake", "false", "0", "no", "wrong"].includes(raw)) {
    return "fake";
  }

  return z.enum(["true", "fake"]).parse(raw);
}

function ensureInOptions(answer, options, path) {
  if (options.includes(answer)) {
    return;
  }

  throw new z.ZodError([{
    code: z.ZodIssueCode.custom,
    path: [path],
    message: `${path} يجب أن يطابق أحد الخيارات`
  }]);
}
