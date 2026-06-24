import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Check,
  ChartBar,
  Clock,
  Copy,
  Database,
  DoorOpen,
  Edit3,
  Eye,
  EyeOff,
  FileJson,
  Gamepad2,
  LayoutDashboard,
  ListFilter,
  Loader2,
  MessageCircle,
  MousePointerClick,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Shield,
  Signal,
  Tags,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Wifi,
  X
} from "lucide-react";
import { adminHeaders, api } from "../lib/api.js";

const fallbackQuestionTypes = [
  { id: "kalak", name: "شن الصح؟", kind: "trivia", category: "عام" },
  { id: "imposter", name: "الدخيل", kind: "secret_word", category: "الدخيل" },
  { id: "fake_fact", name: "كذبة ذكية", kind: "true_false", category: "كذبة ذكية" },
  { id: "minority_wins", name: "الأقلية تكسب", kind: "choice_poll", category: "الأقلية تكسب" },
  { id: "judge_pick", name: "الحكم", kind: "judge_prompt", category: "الحكم" },
  { id: "last_survivor", name: "آخر واحد", kind: "prompt_only", category: "آخر واحد" },
  { id: "target_guess", name: "خمن الهدف", kind: "choice_poll", category: "خمن الهدف" },
  { id: "split_steal", name: "قسمة أو سرقة", kind: "prompt_only", category: "قسمة أو سرقة" },
  { id: "mind_match", name: "تطابق العقول", kind: "choice_poll", category: "تطابق العقول" },
  { id: "closest_number", name: "أقرب رقم", kind: "number", category: "أقرب رقم" },
  { id: "hot_take", name: "رد سريع", kind: "prompt_only", category: "رد سريع" },
  { id: "reverse_trap", name: "الفخ العكسي", kind: "trap_choice", category: "الفخ العكسي" },
  { id: "emoji_decode", name: "فك الإيموجي", kind: "direct_choice", category: "فك الإيموجي" },
  { id: "map_hunt", name: "خريطة السر", kind: "direct_choice", category: "خريطة السر" },
  { id: "quote_hunt", name: "من قالها؟", kind: "direct_choice", category: "من قالها؟" },
  { id: "odd_one", name: "المختلف", kind: "direct_choice", category: "المختلف" },
  { id: "order_it", name: "رتبها", kind: "direct_choice", category: "رتبها" }
];

const tabs = [
  { id: "dashboard", label: "الإحصائيات", icon: LayoutDashboard },
  { id: "content", label: "المحتوى", icon: Database },
  { id: "categories", label: "التصنيفات", icon: Tags },
  { id: "import", label: "استيراد", icon: FileJson }
];

const difficultyNames = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب"
};

const modeNameFallback = {
  kalak: "شن الصح؟",
  imposter: "الدخيل",
  fake_fact: "كذبة ذكية",
  minority_wins: "الأقلية تكسب",
  judge_pick: "الحكم",
  last_survivor: "آخر واحد",
  target_guess: "خمن الهدف",
  split_steal: "قسمة أو سرقة",
  mind_match: "تطابق العقول",
  closest_number: "أقرب رقم",
  hot_take: "رد سريع",
  reverse_trap: "الفخ العكسي",
  emoji_decode: "فك الإيموجي",
  map_hunt: "خريطة السر",
  quote_hunt: "من قالها؟",
  odd_one: "المختلف",
  order_it: "رتبها",
};

const phaseNames = {
  lobby: "الانتظار",
  answering: "الإجابة",
  voting: "التصويت",
  results: "النتائج",
  finished: "منتهية"
};

const numberFormatter = new Intl.NumberFormat("ar-LY");

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

function formatDuration(seconds = 0) {
  const total = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = Math.floor(total % 60);

  if (hours > 0) {
    return `${formatNumber(hours)} ساعة ${formatNumber(minutes)} دقيقة`;
  }

  if (minutes > 0) {
    return `${formatNumber(minutes)} دقيقة ${formatNumber(remainder)} ثانية`;
  }

  return `${formatNumber(remainder)} ثانية`;
}

function phaseName(value) {
  return phaseNames[value] || value || "غير معروف";
}

function progressValue(value, max) {
  return max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
}

function makeBlankQuestion(types = fallbackQuestionTypes, mode = "kalak", categoryOverride = "") {
  const type = typeForMode(types, mode);
  return {
    mode: type.id,
    category: categoryOverride || type.category || "عام",
    prompt: "",
    correctAnswer: "",
    secretWord: "",
    statement: "",
    truthAnswer: "true",
    explanation: "",
    aiAnswer: "",
    gameAnswers: "",
    options: "",
    trapAnswer: "",
    numericAnswer: "",
    unit: "",
    difficulty: "medium",
    source: "",
    tags: "",
    active: true
  };
}

function typeForMode(types, mode) {
  return types.find((type) => type.id === mode) || types[0] || fallbackQuestionTypes[0];
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
}

function answerPreview(question) {
  const content = question.content || {};

  if (question.mode === "imposter") {
    return content.secretWord || question.correctAnswer || "";
  }

  if (question.mode === "fake_fact") {
    return content.answer === "true" ? "صح" : "كذبة";
  }

  if (question.mode === "judge_pick") {
    return joinLines(content.gameAnswers).replace(/\n/g, " / ");
  }

  if (question.mode === "closest_number") {
    return content.answer === undefined ? "" : `${content.answer}${content.unit ? ` ${content.unit}` : ""}`;
  }

  if (question.mode === "reverse_trap") {
    return `الفخ: ${content.trap || question.correctAnswer || ""}`;
  }

  if (content.correct) {
    return content.correct;
  }

  return question.correctAnswer || "";
}

function formFromQuestion(question, types) {
  const content = question.content || {};

  return {
    ...makeBlankQuestion(types, question.mode || "kalak"),
    mode: question.mode || "kalak",
    category: question.category,
    prompt: content.prompt || question.prompt || "",
    correctAnswer: content.correct || content.correctAnswer || question.correctAnswer || "",
    secretWord: content.secretWord || question.correctAnswer || "",
    statement: content.statement || question.prompt || "",
    truthAnswer: content.answer || question.correctAnswer || "true",
    explanation: content.explanation || "",
    aiAnswer: content.aiAnswer || question.correctAnswer || "",
    gameAnswers: joinLines(content.gameAnswers),
    options: joinLines(content.options),
    trapAnswer: content.trap || question.correctAnswer || "",
    numericAnswer: content.answer ?? question.correctAnswer ?? "",
    unit: content.unit || "",
    difficulty: question.difficulty || "medium",
    source: question.source || "",
    tags: (question.tags || []).join(", "),
    active: question.active !== false
  };
}

function questionTemplate(type, category) {
  const base = {
    mode: type.id,
    category: category || type.category || "عام",
    difficulty: "medium",
    tags: ["جديد"],
    active: true
  };

  if (type.kind === "trivia") {
    return { ...base, prompt: "اكتب السؤال هنا", correctAnswer: "الإجابة الصحيحة" };
  }

  if (type.kind === "secret_word") {
    return { ...base, secretWord: "الكلمة السرية", prompt: "اكتب وصفًا من كلمة واحدة للكلمة السرية." };
  }

  if (type.kind === "true_false") {
    return { ...base, statement: "اكتب المعلومة التي سيصوت عليها اللاعبون", answer: "true", explanation: "شرح اختياري" };
  }

  if (type.kind === "ai_prompt") {
    return { ...base, prompt: "اكتب الطلب الذي سيجيب عليه اللاعبون", aiAnswer: "إجابة جاهزة تبدو كإجابة ذكاء اصطناعي" };
  }

  if (type.kind === "judge_prompt") {
    return { ...base, prompt: "اكتب طلبًا للحكم", gameAnswers: ["إجابة جاهزة أولى", "إجابة جاهزة ثانية"] };
  }

  return { ...base, prompt: "اكتب النص هنا" };
}

export default function Admin() {
  const [questions, setQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [categoryRows, setCategoryRows] = useState([]);
  const [questionTypes, setQuestionTypes] = useState(fallbackQuestionTypes);
  const [stats, setStats] = useState(null);
  const [statsBusy, setStatsBusy] = useState(false);
  const [config, setConfig] = useState({ adminAuthRequired: true, adminConfigured: null });
  const [token, setToken] = useState(localStorage.getItem("kalak:adminToken") || "");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [form, setForm] = useState(makeBlankQuestion());
  const [newCategory, setNewCategory] = useState("");
  const [importText, setImportText] = useState("");
  const [editingId, setEditingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const canUseAdmin = Boolean(config.adminConfigured && token.trim());
  const activeType = typeForMode(questionTypes, form.mode);
  const questionStats = stats?.questions || stats;
  const liveStats = stats?.live || null;

  const categoryStats = useMemo(() => {
    if (categoryRows.length > 0) {
      return categoryRows.map((row) => ({
        key: row.key || `${row.mode}::${row.category || row.name}`,
        id: row.id || "",
        mode: row.mode || "kalak",
        category: row.category || row.name || "عام",
        total: row.total || 0,
        active: row.active || 0,
        hidden: row.hidden || 0,
        stored: Boolean(row.stored),
        enabled: row.enabled !== false
      })).sort((a, b) => {
        const modeSort = modeName(a.mode).localeCompare(modeName(b.mode), "ar");
        return modeSort || a.category.localeCompare(b.category, "ar");
      });
    }

    const rows = new Map();

    for (const question of allQuestions) {
      const mode = question.mode || "kalak";
      const name = question.category || typeForMode(questionTypes, mode).category || "عام";
      const key = `${mode}::${name}`;

      if (!rows.has(key)) {
        rows.set(key, {
          key,
          mode,
          category: name,
          total: 0,
          active: 0,
          hidden: 0
        });
      }

      const row = rows.get(key);
      row.total += 1;
      if (question.active === false) {
        row.hidden += 1;
      } else {
        row.active += 1;
      }
    }

    for (const type of questionTypes) {
      const key = `${type.id}::${type.category || "عام"}`;
      if (!rows.has(key)) {
        rows.set(key, {
          key,
          mode: type.id,
          category: type.category || "عام",
          total: 0,
          active: 0,
          hidden: 0
        });
      }
    }

    return [...rows.values()].sort((a, b) => {
      const modeSort = modeName(a.mode).localeCompare(modeName(b.mode), "ar");
      return modeSort || a.category.localeCompare(b.category, "ar");
    });
  }, [allQuestions, categoryRows, questionTypes]);

  const formCategories = useMemo(() => {
    const defaults = questionTypes
      .filter((type) => type.id === form.mode)
      .map((type) => type.category || "عام");
    const matching = categoryStats
      .filter((row) => row.mode === form.mode)
      .map((row) => row.category);
    return uniqueSorted([...defaults, ...matching, form.category]);
  }, [categoryStats, form.category, form.mode, questionTypes]);

  const filterCategories = useMemo(() => {
    const rows = modeFilter === "all"
      ? categoryStats
      : categoryStats.filter((row) => row.mode === modeFilter);

    return uniqueSorted([...rows.map((row) => row.category), category]);
  }, [category, categoryStats, modeFilter]);

  const modeStats = useMemo(() => {
    const detailedStats = new Map((questionStats?.byModeDetailed || []).map((item) => [item.mode, item]));

    return questionTypes.map((type) => {
      const rows = allQuestions.filter((question) => (question.mode || "kalak") === type.id);
      const detailed = detailedStats.get(type.id);
      return {
        ...type,
        total: detailed?.total ?? rows.length,
        active: detailed?.active ?? rows.filter((question) => question.active !== false).length,
        hidden: detailed?.inactive ?? rows.filter((question) => question.active === false).length,
        database: detailed?.database ?? rows.length,
        builtIn: detailed?.builtIn ?? 0,
        categories: uniqueSorted(categoryStats
          .filter((row) => row.mode === type.id)
          .map((row) => row.category)).length
      };
    });
  }, [allQuestions, categoryStats, questionStats, questionTypes]);

  function difficultyLabel(value) {
    return difficultyNames[value] || value;
  }

  function modeName(mode) {
    return modeNameFallback[mode] || typeForMode(questionTypes, mode).name || mode;
  }

  function defaultCategoryForMode(mode) {
    const type = typeForMode(questionTypes, mode);
    const existing = categoryStats.find((row) => row.mode === type.id && row.total > 0);
    return existing?.category || type.category || "عام";
  }

  useEffect(() => {
    api("/config").then(setConfig).catch(() => {});
    api("/question-types").then((payload) => {
      if (Array.isArray(payload) && payload.length > 0) {
        setQuestionTypes(payload);
        setForm((current) => ({ ...makeBlankQuestion(payload, current.mode), ...current }));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (config.adminConfigured === null) {
      return;
    }
    if (!canUseAdmin) {
      setQuestions([]);
      setAllQuestions([]);
      setCategoryRows([]);
      setStats(null);
      return;
    }
    loadQuestions();
  }, [category, modeFilter, activeFilter, canUseAdmin, config.adminConfigured]);

  useEffect(() => {
    if (!canUseAdmin) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      loadStatsOnly();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [canUseAdmin, token]);

  function saveToken(value) {
    setToken(value);
    localStorage.setItem("kalak:adminToken", value);
  }

  async function loadStatsOnly() {
    setStatsBusy(true);
    try {
      const statsPayload = await api("/stats", { headers: adminHeaders(token) });
      setStats(statsPayload);
    } catch {
      // The full loader shows auth/network errors; the silent poll should stay quiet.
    } finally {
      setStatsBusy(false);
    }
  }

  async function loadQuestions() {
    if (config.adminConfigured === false) {
      setError("رمز الإدارة ADMIN_TOKEN غير مضبوط على الخادم.");
      return;
    }
    if (!token.trim()) {
      setError("أدخل رمز الإدارة أولًا.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (category !== "all") {
        query.set("category", category);
      }
      if (modeFilter !== "all") {
        query.set("mode", modeFilter);
      }
      if (activeFilter !== "all") {
        query.set("active", activeFilter);
      }
      if (search.trim()) {
        query.set("search", search.trim());
      }

      const [questionPayload, allQuestionPayload, categoryPayload, statsPayload] = await Promise.all([
        api(`/questions?${query.toString()}`, { headers: adminHeaders(token) }),
        api("/questions", { headers: adminHeaders(token) }),
        api("/category-records", { headers: adminHeaders(token) }),
        api("/stats", { headers: adminHeaders(token) })
      ]);
      setQuestions(questionPayload);
      setAllQuestions(allQuestionPayload);
      setCategoryRows(categoryPayload);
      setStats(statsPayload);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateMode(mode) {
    setForm((current) => ({
      ...makeBlankQuestion(questionTypes, mode, defaultCategoryForMode(mode)),
      source: current.source,
      tags: current.tags,
      active: current.active,
      difficulty: current.difficulty
    }));
  }

  function edit(question) {
    setActiveTab("content");
    setEditingId(question.id);
    setForm(formFromQuestion(question, questionTypes));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm(mode = "kalak") {
    setEditingId("");
    setForm(makeBlankQuestion(questionTypes, mode, defaultCategoryForMode(mode)));
  }

  function buildBody(targetForm = form) {
    const type = typeForMode(questionTypes, targetForm.mode);
    const body = {
      mode: targetForm.mode,
      category: targetForm.category,
      difficulty: targetForm.difficulty,
      source: targetForm.source,
      tags: splitLines(targetForm.tags),
      active: targetForm.active
    };

    if (type.kind === "trivia") {
      return { ...body, prompt: targetForm.prompt, correctAnswer: targetForm.correctAnswer };
    }

    if (type.kind === "secret_word") {
      return { ...body, secretWord: targetForm.secretWord, prompt: targetForm.prompt };
    }

    if (type.kind === "true_false") {
      return { ...body, statement: targetForm.statement, answer: targetForm.truthAnswer, explanation: targetForm.explanation };
    }

    if (type.kind === "ai_prompt") {
      return { ...body, prompt: targetForm.prompt, aiAnswer: targetForm.aiAnswer };
    }

    if (type.kind === "judge_prompt") {
      return { ...body, prompt: targetForm.prompt, gameAnswers: splitLines(targetForm.gameAnswers) };
    }

    if (type.kind === "number") {
      return { ...body, prompt: targetForm.prompt, answer: targetForm.numericAnswer, unit: targetForm.unit, explanation: targetForm.explanation };
    }

    if (type.kind === "choice_poll") {
      return { ...body, prompt: targetForm.prompt, options: splitLines(targetForm.options) };
    }

    if (type.kind === "trap_choice") {
      return { ...body, prompt: targetForm.prompt, options: splitLines(targetForm.options), trap: targetForm.trapAnswer, explanation: targetForm.explanation };
    }

    if (type.kind === "direct_choice") {
      return { ...body, prompt: targetForm.prompt, options: splitLines(targetForm.options), correctAnswer: targetForm.correctAnswer, explanation: targetForm.explanation };
    }

    return { ...body, prompt: targetForm.prompt };
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (editingId) {
        await api(`/questions/${editingId}`, {
          method: "PUT",
          headers: adminHeaders(token),
          body: JSON.stringify(buildBody())
        });
        setNotice("تم تحديث السؤال.");
      } else {
        await api("/questions", {
          method: "POST",
          headers: adminHeaders(token),
          body: JSON.stringify(buildBody())
        });
        setNotice("تمت إضافة السؤال.");
      }
      resetForm(form.mode);
      await loadQuestions();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(question) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/questions/${question.id}`, {
        method: "PUT",
        headers: adminHeaders(token),
        body: JSON.stringify({ active: question.active === false })
      });
      setNotice(question.active === false ? "تم تفعيل السؤال." : "تم إخفاء السؤال.");
      await loadQuestions();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(question) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const copyForm = {
        ...formFromQuestion(question, questionTypes),
        active: true
      };
      await api("/questions", {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify(buildBody(copyForm))
      });
      setNotice("تم تكرار السؤال.");
      await loadQuestions();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("هل تريد حذف هذا السؤال؟")) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/questions/${id}`, {
        method: "DELETE",
        headers: adminHeaders(token)
      });
      setNotice("تم حذف السؤال.");
      await loadQuestions();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  async function createCategory() {
    const value = newCategory.trim();
    if (!value) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const row = await api("/category-records", {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify({ mode: form.mode, category: value, active: true })
      });
      updateField("category", row.category || value);
      setCategory(row.category || value);
      setModeFilter(row.mode || form.mode);
      setNewCategory("");
      setActiveTab("content");
      setNotice("تم حفظ التصنيف.");
      await loadQuestions();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  function useCategory(row) {
    setActiveTab("content");
    setModeFilter(row.mode);
    setCategory(row.category);
    setForm((current) => ({
      ...makeBlankQuestion(questionTypes, row.mode, row.category),
      source: current.source,
      tags: current.tags,
      difficulty: current.difficulty,
      active: current.active
    }));
    setEditingId("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function filterByCategory(row) {
    setModeFilter(row.mode);
    setCategory(row.category);
    setActiveTab("content");
  }

  function setTemplate() {
    setImportText(JSON.stringify([questionTemplate(activeType, form.category)], null, 2));
  }

  async function importQuestions(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const payload = JSON.parse(importText);
      const result = await api("/questions/import", {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify(payload)
      });
      setImportText("");
      setNotice(`تم استيراد ${result.inserted} عنصر.`);
      await loadQuestions();
      setActiveTab("content");
    } catch (caught) {
      setError(caught instanceof SyntaxError ? "صيغة JSON غير صحيحة." : caught.message);
    } finally {
      setBusy(false);
    }
  }

  function renderModeFields() {
    if (activeType.kind === "trivia") {
      return (
        <>
          <TextArea id="admin-question-prompt" label="السؤال" value={form.prompt} onChange={(value) => updateField("prompt", value)} required />
          <TextInput label="الإجابة الصحيحة" value={form.correctAnswer} onChange={(value) => updateField("correctAnswer", value)} required />
        </>
      );
    }

    if (activeType.kind === "secret_word") {
      return (
        <>
          <TextInput label="الكلمة السرية" value={form.secretWord} onChange={(value) => updateField("secretWord", value)} required />
          <TextArea id="admin-question-prompt" label="توجيه اللاعب" value={form.prompt} onChange={(value) => updateField("prompt", value)} />
        </>
      );
    }

    if (activeType.kind === "true_false") {
      return (
        <>
          <TextArea id="admin-question-prompt" label="المعلومة" value={form.statement} onChange={(value) => updateField("statement", value)} required />
          <label>
            الإجابة
            <select value={form.truthAnswer} onChange={(event) => updateField("truthAnswer", event.target.value)}>
              <option value="true">صح</option>
              <option value="fake">كذبة</option>
            </select>
          </label>
          <TextArea label="الشرح" value={form.explanation} onChange={(value) => updateField("explanation", value)} rows={3} />
        </>
      );
    }

    if (activeType.kind === "ai_prompt") {
      return (
        <>
          <TextArea id="admin-question-prompt" label="الطلب" value={form.prompt} onChange={(value) => updateField("prompt", value)} required />
          <TextArea label="إجابة الذكاء" value={form.aiAnswer} onChange={(value) => updateField("aiAnswer", value)} required rows={3} />
        </>
      );
    }

    if (activeType.kind === "judge_prompt") {
      return (
        <>
          <TextArea id="admin-question-prompt" label="طلب الحكم" value={form.prompt} onChange={(value) => updateField("prompt", value)} required />
          <TextArea label="إجابات اللعبة" value={form.gameAnswers} onChange={(value) => updateField("gameAnswers", value)} required rows={5} />
        </>
      );
    }

    if (activeType.kind === "number") {
      return (
        <>
          <TextArea id="admin-question-prompt" label="السؤال" value={form.prompt} onChange={(value) => updateField("prompt", value)} required />
          <div className="form-grid">
            <TextInput label="الإجابة الرقمية" value={form.numericAnswer} onChange={(value) => updateField("numericAnswer", value)} required inputMode="decimal" />
            <TextInput label="الوحدة" value={form.unit} onChange={(value) => updateField("unit", value)} />
          </div>
          <TextArea label="الشرح" value={form.explanation} onChange={(value) => updateField("explanation", value)} rows={3} />
        </>
      );
    }

    if (activeType.kind === "choice_poll") {
      return (
        <>
          <TextArea id="admin-question-prompt" label="الطلب" value={form.prompt} onChange={(value) => updateField("prompt", value)} required />
          <TextArea label="الخيارات" value={form.options} onChange={(value) => updateField("options", value)} required rows={5} />
        </>
      );
    }

    if (activeType.kind === "trap_choice") {
      return (
        <>
          <TextArea id="admin-question-prompt" label="الطلب" value={form.prompt} onChange={(value) => updateField("prompt", value)} required />
          <TextArea label="الخيارات" value={form.options} onChange={(value) => updateField("options", value)} required rows={5} />
          <TextInput label="إجابة الفخ" value={form.trapAnswer} onChange={(value) => updateField("trapAnswer", value)} required />
          <TextArea label="الشرح" value={form.explanation} onChange={(value) => updateField("explanation", value)} rows={3} />
        </>
      );
    }

    if (activeType.kind === "direct_choice") {
      return (
        <>
          <TextArea id="admin-question-prompt" label="الطلب" value={form.prompt} onChange={(value) => updateField("prompt", value)} required />
          <TextArea label="الخيارات" value={form.options} onChange={(value) => updateField("options", value)} required rows={5} />
          <TextInput label="الإجابة الصحيحة" value={form.correctAnswer} onChange={(value) => updateField("correctAnswer", value)} required />
          <TextArea label="الشرح" value={form.explanation} onChange={(value) => updateField("explanation", value)} rows={3} />
        </>
      );
    }

    return <TextArea id="admin-question-prompt" label="الطلب" value={form.prompt} onChange={(value) => updateField("prompt", value)} required />;
  }

  function renderDashboard() {
    const live = liveStats || {};
    const rooms = live.rooms || {};
    const players = live.players || {};
    const cumulative = live.cumulative || {};
    const activity = live.activity || {};
    const historical = live.historical || {};
    const roomTimeline = historical.timeline || [];
    const phases = live.phases || [];
    const modes = live.modes || [];
    const recentRooms = live.recentRooms || [];

    if (!liveStats) {
      return (
        <section className="panel dashboard-empty">
          <Loader2 className="spin" size={24} />
          <strong>جاري تحميل الإحصائيات</strong>
        </section>
      );
    }

    return (
      <section className="admin-live-dashboard">
        <div className="dashboard-toolbar">
          <div className="panel-heading">
            <Activity size={20} />
            <h2>الإحصائيات المباشرة</h2>
          </div>
          <button className="secondary-button" type="button" onClick={loadStatsOnly} disabled={statsBusy}>
            {statsBusy ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
            <span>{statsBusy ? "جاري التحديث" : "تحديث"}</span>
          </button>
        </div>

        <section className="dashboard-stat-grid" aria-label="Live admin statistics">
          <DashboardStat icon={Wifi} label="المستخدمون المتصلون" value={players.onlineHumans} detail={`${formatNumber(players.offlineHumans)} بانتظار الرجوع`} tone="teal" />
          <DashboardStat icon={Users} label="اللاعبون داخل الغرف" value={players.total} detail={`${formatNumber(players.humans)} حقيقي / ${formatNumber(players.bots)} آلي`} tone="gold" />
          <DashboardStat icon={DoorOpen} label="الغرف المفتوحة" value={rooms.total} detail={`${formatNumber(rooms.lobby)} انتظار / ${formatNumber(rooms.inGame)} قيد اللعب`} tone="green" />
          <DashboardStat icon={Gamepad2} label="الألعاب المباشرة" value={rooms.inGame} detail={`${formatNumber(rooms.finished)} غرف منتهية`} tone="magenta" />
          <DashboardStat icon={Signal} label="اتصالات المتصفح" value={live.socketConnections} detail="متصفحات متصلة" tone="teal" />
          <DashboardStat icon={Clock} label="مدة تشغيل الخادم" value={formatDuration(live.uptimeSeconds)} detail={live.startedAt ? `بدأ ${new Date(live.startedAt).toLocaleTimeString("ar-LY")}` : "منذ إعادة التشغيل"} tone="gold" />
          <DashboardStat icon={UserCheck} label="لاعبون دخلوا" value={cumulative.humanPlayersJoined} detail="دخول اللاعبين الحقيقيين منذ التشغيل" tone="green" />
          <DashboardStat icon={DoorOpen} label="الغرف المنشأة" value={cumulative.roomsCreated} detail={`${formatNumber(cumulative.roomsClosed)} مغلقة`} tone="magenta" />
          <DashboardStat icon={Gamepad2} label="الألعاب التي بدأت" value={cumulative.gamesStarted} detail={`${formatNumber(cumulative.gamesFinished)} مكتملة`} tone="teal" />
          <DashboardStat icon={Send} label="الإجابات" value={activity.totalAnswerSubmissions} detail={`${formatNumber(activity.humanAnswerSubmissions)} لاعب / ${formatNumber(activity.botAnswerSubmissions)} آلي`} tone="gold" />
          <DashboardStat icon={MousePointerClick} label="الأصوات" value={activity.totalVoteSubmissions} detail={`${formatNumber(activity.humanVoteSubmissions)} لاعب / ${formatNumber(activity.botVoteSubmissions)} آلي`} tone="green" />
          <DashboardStat icon={MessageCircle} label="رسائل الدردشة" value={activity.chatMessages} detail={`${formatNumber(activity.totalActions)} حركة إجمالية`} tone="magenta" />
        </section>

        <section className="dashboard-panels">
          <article className="panel dashboard-panel">
            <div className="panel-heading">
              <ChartBar size={20} />
              <h2>حالات الغرف</h2>
            </div>
            <div className="dashboard-bars">
              {phases.map((item) => (
                <DashboardBar key={item.phase} label={phaseName(item.phase)} value={item.count} max={rooms.total || 1} />
              ))}
            </div>
          </article>

          <article className="panel dashboard-panel">
            <div className="panel-heading">
              <DoorOpen size={20} />
              <h2>الغرف عبر الوقت</h2>
            </div>
            <div className="dashboard-bars">
              {roomTimeline.length ? roomTimeline.map((item) => (
                <DashboardBar
                  key={item.hour}
                  label={new Date(item.hour).toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" })}
                  value={item.created}
                  max={Math.max(1, ...roomTimeline.map((row) => row.created))}
                  detail={`${formatNumber(item.closed)} مغلقة`}
                />
              )) : <span className="dashboard-muted">لا توجد بيانات تاريخية للغرف بعد</span>}
            </div>
          </article>

          <article className="panel dashboard-panel">
            <div className="panel-heading">
              <Gamepad2 size={20} />
              <h2>الأطوار المباشرة</h2>
            </div>
            <div className="dashboard-bars">
              {modes.length ? modes.map((item) => (
                <DashboardBar key={item.mode} label={modeName(item.mode)} value={item.rooms} max={rooms.total || 1} detail={`${formatNumber(item.players)} لاعب`} />
              )) : <span className="dashboard-muted">لا توجد غرف نشطة</span>}
            </div>
          </article>

          <article className="panel dashboard-panel">
            <div className="panel-heading">
              <Bot size={20} />
              <h2>تفاصيل الحركة</h2>
            </div>
            <div className="dashboard-metric-list">
              <DashboardMetric label="اللاعبون الآليون المضافون" value={cumulative.botsAdded} />
              <DashboardMetric label="إجمالي الغرف المحفوظ" value={historical.createdTotal ?? cumulative.roomsCreated} />
              <DashboardMetric label="الغرف المغلقة المحفوظة" value={historical.closedTotal ?? cumulative.roomsClosed} />
              <DashboardMetric label="إنهاء المضيف للعبة" value={cumulative.gamesEndedByHost} />
              <DashboardMetric label="انقطاعات الاتصال" value={cumulative.disconnections} />
              <DashboardMetric label="الرجوع بعد الانقطاع" value={cumulative.reconnections} />
              <DashboardMetric label="اللاعبون المغادرون" value={cumulative.playersLeft} />
              <DashboardMetric label="الإخراج بالتصويت" value={cumulative.kickRemovals} />
              <DashboardMetric label="المقاعد الفارغة" value={rooms.openSlots} />
              <DashboardMetric label="متوسط اللاعبين" value={rooms.averagePlayers} />
            </div>
          </article>
        </section>

        <section className="panel dashboard-room-panel">
          <div className="panel-heading">
            <DoorOpen size={20} />
            <h2>آخر الغرف</h2>
          </div>
          <div className="dashboard-room-list">
            {recentRooms.length ? recentRooms.map((room) => (
              <article className="dashboard-room-row" key={room.code}>
                <div className="dashboard-room-main">
                  <strong dir="ltr">{room.code}</strong>
                  <span>{phaseName(room.phase)} / {modeName(room.activeMode)}</span>
                </div>
                <div className="dashboard-room-meta">
                  <span>{formatNumber(room.players?.onlineHumans)} متصل</span>
                  <span>{formatNumber(room.players?.total)} لاعب</span>
                  <span>{formatNumber(room.players?.bots)} آلي</span>
                  <span>الجولة {formatNumber(room.round)}/{formatNumber(room.settings?.rounds)}</span>
                  <span>خمول {formatDuration(room.idleSeconds)}</span>
                </div>
                <div className="dashboard-room-progress">
                  <MiniProgress label="الإجابات" value={room.progress?.submissions || 0} max={room.progress?.answerers || 0} />
                  <MiniProgress label="الأصوات" value={room.progress?.votes || 0} max={room.progress?.voters || 0} />
                </div>
                {room.topPlayer ? (
                  <div className="dashboard-room-leader">
                    <span>الأعلى</span>
                    <strong>{room.topPlayer.name}</strong>
                    <b>{formatNumber(room.topPlayer.score)}</b>
                  </div>
                ) : null}
              </article>
            )) : (
              <div className="empty-state">
                <DoorOpen size={22} />
                <span>لا توجد غرف مفتوحة الآن.</span>
              </div>
            )}
          </div>
        </section>
      </section>
    );
  }

  return (
    <main className="admin-screen" dir="rtl">
      <section className="admin-header">
        <div>
          <div className="hero-kicker">
            <Shield size={18} />
            <span>لوحة إدارة المحتوى</span>
          </div>
          <h1>التحكم الإداري</h1>
        </div>
        {questionStats ? (
          <div className="stats-strip">
            <span><strong>{formatNumber(questionStats.total)}</strong> عنصر</span>
            <span><strong>{formatNumber(questionStats.active)}</strong> مفعل</span>
            <span><strong>{formatNumber(questionStats.inactive)}</strong> مخفي</span>
            {liveStats ? <span><strong>{formatNumber(liveStats.players?.onlineHumans)}</strong> متصل</span> : null}
            {liveStats ? <span><strong>{formatNumber(liveStats.rooms?.total)}</strong> غرف</span> : null}
          </div>
        ) : null}
      </section>

      {config.adminAuthRequired ? (
        <section className="panel token-panel admin-token-panel">
          <label>
            رمز الإدارة
            <input
              value={token}
              onChange={(event) => saveToken(event.target.value)}
              type="password"
              placeholder="أدخل الرمز"
              dir="ltr"
            />
          </label>
          <button className="secondary-button" type="button" onClick={loadQuestions} disabled={!token.trim() || busy}>
            <Shield size={18} />
            <span>دخول</span>
          </button>
        </section>
      ) : null}

      {config.adminConfigured === false ? (
        <section className="panel token-panel">
          <strong>لوحة الإدارة مقفلة</strong>
          <p>اضبط <span dir="ltr">ADMIN_TOKEN</span> على الخادم ثم أعد تشغيله.</p>
        </section>
      ) : null}

      {config.adminConfigured && !token.trim() ? (
        <section className="panel token-panel">
          <strong>أدخل رمز الإدارة</strong>
          <p>قاعدة الأسئلة والتصنيفات لا تظهر قبل التحقق من الرمز.</p>
        </section>
      ) : null}

      {canUseAdmin ? (
        <>
          <section className="admin-mode-dashboard" aria-label="تغطية الأطوار">
            {modeStats.map((mode) => (
              <article className="mode-stat-tile" key={mode.id}>
                <strong>{modeName(mode.id)}</strong>
                <span>{mode.total} عنصر</span>
                <small>
                  {mode.categories} تصنيف / {mode.active} متاح / {mode.hidden} مخفي
                  {mode.builtIn ? ` / ${mode.builtIn} مدمج` : ""}
                </small>
              </article>
            ))}
          </section>

          <nav className="admin-tabs" aria-label="أقسام الإدارة">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  className={`admin-tab${activeTab === tab.id ? " active" : ""}`}
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {activeTab === "dashboard" ? renderDashboard() : null}

          {activeTab === "content" ? (
            <section className="admin-layout pro-admin-layout">
              <form className="panel admin-form" onSubmit={submit}>
                <div className="panel-heading">
                  {editingId ? <Edit3 size={20} /> : <Plus size={20} />}
                  <h2>{editingId ? "تعديل المحتوى" : "إضافة محتوى"}</h2>
                </div>

                <div className="form-grid">
                  <label>
                    طور اللعبة
                    <select value={form.mode} onChange={(event) => updateMode(event.target.value)}>
                      {questionTypes.map((type) => <option value={type.id} key={type.id}>{modeName(type.id)}</option>)}
                    </select>
                  </label>
                  <label>
                    الصعوبة
                    <select value={form.difficulty} onChange={(event) => updateField("difficulty", event.target.value)}>
                      <option value="easy">سهل</option>
                      <option value="medium">متوسط</option>
                      <option value="hard">صعب</option>
                    </select>
                  </label>
                </div>

                <div className="category-control">
                  <label>
                    التصنيف
                    <select value={form.category} onChange={(event) => updateField("category", event.target.value)} required>
                      {formCategories.map((item) => <option value={item} key={item}>{item}</option>)}
                    </select>
                  </label>
                  <div className="category-create-line">
                    <input
                      value={newCategory}
                      onChange={(event) => setNewCategory(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          createCategory();
                        }
                      }}
                      placeholder="تصنيف جديد"
                      dir="auto"
                    />
                    <button className="icon-button" type="button" onClick={createCategory} aria-label="إضافة تصنيف">
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {renderModeFields()}

                <div className="form-grid">
                  <TextInput label="المصدر" value={form.source} onChange={(value) => updateField("source", value)} />
                  <TextInput label="الوسوم" value={form.tags} onChange={(value) => updateField("tags", value)} />
                </div>

                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) => updateField("active", event.target.checked)}
                  />
                  <span>مفعل في اللعبة</span>
                </label>

                <div className="form-actions">
                  <button className="primary-button" type="submit" disabled={busy}>
                    <Save size={18} />
                    <span>{editingId ? "حفظ" : "إضافة"}</span>
                  </button>
                  {editingId ? (
                    <button className="ghost-button" type="button" onClick={() => resetForm(form.mode)}>
                      <X size={18} />
                      <span>إلغاء</span>
                    </button>
                  ) : null}
                </div>
              </form>

              <section className="panel question-manager">
                <div className="manager-toolbar admin-filter-toolbar">
                  <div className="search-box">
                    <Search size={18} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          loadQuestions();
                        }
                      }}
                      placeholder="بحث"
                    />
                  </div>
                  <select value={modeFilter} onChange={(event) => {
                    setModeFilter(event.target.value);
                    setCategory("all");
                  }}>
                    <option value="all">كل الأطوار</option>
                    {questionTypes.map((type) => <option value={type.id} key={type.id}>{modeName(type.id)}</option>)}
                  </select>
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    <option value="all">كل التصنيفات</option>
                    {filterCategories.map((item) => <option value={item} key={item}>{item}</option>)}
                  </select>
                  <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>
                    <option value="all">كل الحالات</option>
                    <option value="true">مفعل</option>
                    <option value="false">مخفي</option>
                  </select>
                  <button className="icon-button" type="button" onClick={loadQuestions} disabled={busy} aria-label="تحديث">
                    <RefreshCw size={18} className={busy ? "spin" : ""} />
                  </button>
                </div>

                <div className="question-list">
                  {questions.length === 0 ? (
                    <div className="empty-state">
                      <ListFilter size={22} />
                      <span>لا توجد أسئلة مطابقة للفلاتر الحالية.</span>
                    </div>
                  ) : questions.map((question) => (
                    <article className="question-row admin-question-row" key={question.id}>
                      <div>
                        <div className="row-meta">
                          <span>{modeName(question.mode || "kalak")}</span>
                          <span>{question.category}</span>
                          <span>{difficultyLabel(question.difficulty)}</span>
                          <span className={question.active ? "active-state" : "inactive-state"}>
                            {question.active ? "مفعل" : "مخفي"}
                          </span>
                        </div>
                        <h3>{question.prompt}</h3>
                        {answerPreview(question) ? <p>{answerPreview(question)}</p> : null}
                      </div>
                      <div className="row-actions">
                        <button className="icon-button" type="button" onClick={() => edit(question)} aria-label="تعديل">
                          <Edit3 size={17} />
                        </button>
                        <button className="icon-button" type="button" onClick={() => toggleActive(question)} aria-label={question.active === false ? "إظهار" : "إخفاء"}>
                          {question.active === false ? <Eye size={17} /> : <EyeOff size={17} />}
                        </button>
                        <button className="icon-button" type="button" onClick={() => duplicate(question)} aria-label="تكرار">
                          <Copy size={17} />
                        </button>
                        <button className="icon-button danger" type="button" onClick={() => remove(question.id)} aria-label="حذف">
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          ) : null}

          {activeTab === "categories" ? (
            <section className="panel admin-section-panel">
              <div className="panel-heading">
                <Tags size={20} />
                <h2>إدارة التصنيفات</h2>
              </div>

              <div className="category-admin-create">
                <label>
                  الطور
                  <select value={form.mode} onChange={(event) => updateMode(event.target.value)}>
                    {questionTypes.map((type) => <option value={type.id} key={type.id}>{modeName(type.id)}</option>)}
                  </select>
                </label>
                <div className="category-create-line">
                  <input
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        createCategory();
                      }
                    }}
                    placeholder="تصنيف جديد"
                    dir="auto"
                  />
                  <button className="secondary-button" type="button" onClick={createCategory}>
                    <Plus size={18} />
                    <span>إضافة</span>
                  </button>
                </div>
              </div>

              <div className="category-admin-list">
                {categoryStats.map((row) => (
                  <article className="category-admin-row" key={row.key}>
                    <div>
                      <div className="row-meta">
                        <span>{modeName(row.mode)}</span>
                        <span>{row.total} عنصر</span>
                        <span className="active-state">{row.active} مفعل</span>
                        <span className="inactive-state">{row.hidden} مخفي</span>
                        <span>{row.stored ? "محفوظ" : "من المحتوى"}</span>
                      </div>
                      <h3>{row.category}</h3>
                    </div>
                    <div className="row-actions">
                      <button className="icon-text-button" type="button" onClick={() => useCategory(row)}>
                        <Plus size={17} />
                        <span>إضافة عنصر</span>
                      </button>
                      <button className="icon-button" type="button" onClick={() => filterByCategory(row)} aria-label="فلترة">
                        <ListFilter size={17} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === "import" ? (
            <form className="panel admin-section-panel import-panel" onSubmit={importQuestions}>
              <div className="panel-heading">
                <Upload size={20} />
                <h2>استيراد جماعي</h2>
              </div>

              <div className="form-grid">
                <label>
                  طور القالب
                  <select value={form.mode} onChange={(event) => updateMode(event.target.value)}>
                    {questionTypes.map((type) => <option value={type.id} key={type.id}>{modeName(type.id)}</option>)}
                  </select>
                </label>
                <label>
                  تصنيف القالب
                  <select value={form.category} onChange={(event) => updateField("category", event.target.value)} required>
                    {formCategories.map((item) => <option value={item} key={item}>{item}</option>)}
                  </select>
                </label>
              </div>

              <div className="form-actions import-actions">
                <button className="ghost-button" type="button" onClick={setTemplate}>
                  <Copy size={18} />
                  <span>قالب</span>
                </button>
                <button className="primary-button" type="submit" disabled={busy || !importText.trim()}>
                  <Upload size={18} />
                  <span>استيراد</span>
                </button>
              </div>

              <label>
                صيغة JSON
                <textarea
                  className="json-textarea"
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  rows={16}
                  spellCheck="false"
                  dir="ltr"
                  placeholder='[{"mode":"kalak","category":"عام","prompt":"...","correctAnswer":"..."}]'
                />
              </label>
            </form>
          ) : null}
        </>
      ) : null}

      {notice ? (
        <div className="toast success">
          <Check size={16} />
          <span>{notice}</span>
        </div>
      ) : null}
      {error ? (
        <div className="toast error">
          <X size={16} />
          <span>{error}</span>
        </div>
      ) : null}
    </main>
  );
}

function TextInput({ label, value, onChange, required = false, inputMode }) {
  return (
    <label>
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        maxLength={160}
        inputMode={inputMode}
        dir="auto"
      />
    </label>
  );
}

function TextArea({ id, label, value, onChange, required = false, rows = 4 }) {
  return (
    <label>
      {label}
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        maxLength={1200}
        rows={rows}
        dir="auto"
      />
    </label>
  );
}

function DashboardStat({ icon: Icon, label, value, detail, tone = "teal" }) {
  return (
    <article className={`dashboard-stat-card ${tone}`}>
      <span className="dashboard-stat-icon">
        <Icon size={20} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{typeof value === "number" ? formatNumber(value) : value}</strong>
        {detail ? <em>{detail}</em> : null}
      </div>
    </article>
  );
}

function DashboardBar({ label, value, max, detail }) {
  const width = progressValue(Number(value || 0), Number(max || 0));

  return (
    <div className="dashboard-bar-row">
      <div className="dashboard-bar-label">
        <span>{label}</span>
        <strong>{formatNumber(value)}</strong>
      </div>
      <div className="dashboard-bar-track">
        <i style={{ width: `${width}%` }} />
      </div>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function DashboardMetric({ label, value }) {
  return (
    <div className="dashboard-metric-row">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}

function MiniProgress({ label, value, max }) {
  const width = progressValue(Number(value || 0), Number(max || 0));

  return (
    <div className="mini-progress">
      <span>{label}</span>
      <div className="mini-progress-track">
        <i style={{ width: `${width}%` }} />
      </div>
      <strong>{formatNumber(value)}/{formatNumber(max)}</strong>
    </div>
  );
}
