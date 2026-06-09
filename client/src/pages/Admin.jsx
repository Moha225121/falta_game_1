import { useEffect, useMemo, useState } from "react";
import { Check, Edit3, Plus, RefreshCw, Save, Search, Shield, Trash2, X } from "lucide-react";
import { adminHeaders, api } from "../lib/api.js";

const blankQuestion = {
  category: "ليبيا",
  prompt: "",
  correctAnswer: "",
  difficulty: "medium",
  source: "",
  tags: "",
  active: true
};

export default function Admin() {
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState({ adminAuthRequired: true, adminConfigured: null });
  const [token, setToken] = useState(localStorage.getItem("kalak:adminToken") || "");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [form, setForm] = useState(blankQuestion);
  const [editingId, setEditingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const categories = useMemo(() => {
    return [...new Set(questions.map((question) => question.category))].sort((a, b) => a.localeCompare(b, "ar"));
  }, [questions]);
  const canUseAdmin = Boolean(config.adminConfigured && token.trim());

  function difficultyLabel(value) {
    return {
      easy: "سهل",
      medium: "متوسط",
      hard: "صعب"
    }[value] || value;
  }

  useEffect(() => {
    api("/config").then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (config.adminConfigured === null) {
      return;
    }
    if (!canUseAdmin) {
      setQuestions([]);
      setStats(null);
      return;
    }
    loadQuestions();
  }, [category, canUseAdmin, config.adminConfigured]);

  function saveToken(value) {
    setToken(value);
    localStorage.setItem("kalak:adminToken", value);
  }

  async function loadQuestions() {
    if (config.adminConfigured === false) {
      setError("رمز الإدارة غير مضبوط على الخادم. أضف ADMIN_TOKEN ثم أعد تشغيل السيرفر.");
      return;
    }
    if (!token.trim()) {
      setError("اكتب رمز الإدارة أولًا.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (category !== "all") {
        query.set("category", category);
      }
      if (search.trim()) {
        query.set("search", search.trim());
      }
      const [questionPayload, statsPayload] = await Promise.all([
        api(`/questions?${query.toString()}`, { headers: adminHeaders(token) }),
        api("/stats", { headers: adminHeaders(token) })
      ]);
      setQuestions(questionPayload);
      setStats(statsPayload);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  function edit(question) {
    setEditingId(question.id);
    setForm({
      category: question.category,
      prompt: question.prompt,
      correctAnswer: question.correctAnswer,
      difficulty: question.difficulty,
      source: question.source || "",
      tags: (question.tags || []).join(", "),
      active: question.active
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId("");
    setForm(blankQuestion);
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    const body = {
      ...form,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    };

    try {
      if (editingId) {
        await api(`/questions/${editingId}`, {
          method: "PUT",
          headers: adminHeaders(token),
          body: JSON.stringify(body)
        });
        setNotice("تم تحديث السؤال.");
      } else {
        await api("/questions", {
          method: "POST",
          headers: adminHeaders(token),
          body: JSON.stringify(body)
        });
        setNotice("تمت إضافة السؤال.");
      }
      resetForm();
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

  return (
    <main className="admin-screen">
      <section className="admin-header">
        <div>
          <div className="hero-kicker">
            <Shield size={18} />
            <span>إدارة الأسئلة</span>
          </div>
          <h1>الإدارة</h1>
        </div>
        {stats ? (
          <div className="stats-strip">
            <span><strong>{stats.total}</strong> سؤال</span>
            <span><strong>{stats.active}</strong> نشط</span>
            <span><strong>{stats.inactive}</strong> مخفي</span>
          </div>
        ) : null}
      </section>

      {config.adminAuthRequired ? (
        <section className="panel token-panel">
          <label>
            رمز الإدارة
            <input
              value={token}
              onChange={(event) => saveToken(event.target.value)}
              type="password"
              placeholder="رمز الدخول"
              dir="ltr"
            />
          </label>
        </section>
      ) : null}

      {config.adminConfigured === false ? (
        <section className="panel token-panel">
          <strong>لوحة الإدارة مقفلة</strong>
          <p>اضبط ADMIN_TOKEN في إعدادات السيرفر ثم أعد تشغيله.</p>
        </section>
      ) : null}

      {config.adminConfigured && !token.trim() ? (
        <section className="panel token-panel">
          <strong>أدخل رمز الإدارة</strong>
          <p>هذه الصفحة مستقلة عن واجهة اللاعبين ولا تعرض البيانات بدون الرمز.</p>
        </section>
      ) : null}

      {canUseAdmin ? <section className="admin-layout">
        <form className="panel admin-form" onSubmit={submit}>
          <div className="panel-heading">
            {editingId ? <Edit3 size={20} /> : <Plus size={20} />}
            <h2>{editingId ? "تعديل سؤال" : "إضافة سؤال"}</h2>
          </div>

          <div className="form-grid">
            <label>
              التصنيف
              <input
                value={form.category}
                list="category-list"
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                required
              />
            </label>
            <label>
              الصعوبة
              <select
                value={form.difficulty}
                onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}
              >
                <option value="easy">سهل</option>
                <option value="medium">متوسط</option>
                <option value="hard">صعب</option>
              </select>
            </label>
          </div>

          <label>
            السؤال
            <textarea
              value={form.prompt}
              onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
              required
              maxLength={400}
              rows={4}
            />
          </label>

          <label>
            الإجابة الصحيحة
            <input
              value={form.correctAnswer}
              onChange={(event) => setForm((current) => ({ ...current, correctAnswer: event.target.value }))}
              required
              maxLength={160}
            />
          </label>

          <div className="form-grid">
            <label>
              المصدر
              <input
                value={form.source}
                onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
                maxLength={160}
              />
            </label>
            <label>
              الوسوم
              <input
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder="ليبيا, تاريخ"
              />
            </label>
          </div>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
            />
            <span>نشط في اللعبة</span>
          </label>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={busy}>
              <Save size={18} />
              <span>{editingId ? "حفظ" : "إضافة"}</span>
            </button>
            {editingId ? (
              <button className="ghost-button" type="button" onClick={resetForm}>
                <X size={18} />
                <span>إلغاء</span>
              </button>
            ) : null}
          </div>
        </form>

        <section className="panel question-manager">
          <div className="manager-toolbar">
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
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">كل التصنيفات</option>
              {categories.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
            <button className="icon-button" type="button" onClick={loadQuestions} disabled={busy} aria-label="تحديث">
              <RefreshCw size={18} className={busy ? "spin" : ""} />
            </button>
          </div>

          <div className="question-list">
            {questions.map((question) => (
              <article className="question-row" key={question.id}>
                <div>
                  <div className="row-meta">
                    <span>{question.category}</span>
                    <span>{difficultyLabel(question.difficulty)}</span>
                    <span className={question.active ? "active-state" : "inactive-state"}>
                      {question.active ? "نشط" : "مخفي"}
                    </span>
                  </div>
                  <h3>{question.prompt}</h3>
                  <p>{question.correctAnswer}</p>
                </div>
                <div className="row-actions">
                  <button className="icon-button" type="button" onClick={() => edit(question)} aria-label="تعديل">
                    <Edit3 size={17} />
                  </button>
                  <button className="icon-button danger" type="button" onClick={() => remove(question.id)} aria-label="حذف">
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section> : null}

      <datalist id="category-list">
        {categories.map((item) => <option value={item} key={item} />)}
      </datalist>

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
