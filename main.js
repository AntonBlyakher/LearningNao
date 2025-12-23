// SCORM fallback (so GitHub Pages works without SCORM file / Moodle)
if (typeof window.SCORM === "undefined") {
    window.SCORM = {
        init: () => false,
        commit: () => false,
        finish: () => false,
        getValue: () => "",
        setValue: () => false,
        isConnected: () => false,
        setStatus: () => false,
        setScore: () => false,
        getSuspendData: () => "",
        setSuspendData: () => false,
    };
}




// =======================
// DATA (7 units)
// =======================
const units = [
    { id: 1, title: "Welcome & Onboarding", desc: "היכרות ראשונית עם NAO ואופן העבודה איתו.", img: "assets/WelcomeOnboarding.png" },
    { id: 2, title: "Empathy Warm-Up", desc: "תרגיל פתיחה קצר לפיתוח אמפתיה ותקשורת.", img: "assets/EmpathyWarmUp.png" },
    { id: 3, title: "Digital Literacy Coach", desc: "כלים לבדיקת מידע, אמינות ותוכן דיגיטלי.", img: "assets/DigitalLiteracyCoach.png" },
    { id: 4, title: "Team Communication", desc: "תרגול שיח קבוצתי, תפקידים והקשבה פעילה.", img: "assets/TeamCommunication.png" },
    { id: 5, title: "Stress Check-In", desc: "זיהוי לחץ ורגשות לפני משימה או דיון.", img: "assets/StressCheckIn.png" },
    { id: 6, title: "Reflection Quiz", desc: "שאלון קצר לרפלקציה והסקת מסקנות.", img: "assets/ReflectionQuiz.png" },
    { id: 7, title: "Campus Guide", desc: "סיור/הכוונה חכמה והיכרות עם סביבת הקמפוס.", img: "assets/CampusGuide.png" },
];

// =======================
// GLOBAL STATE
// =======================
let completedSet = new Set();
let currentUnitId = null;
let unitModalInstance = null;
let currentFilter = "";

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {
    const ok = SCORM.init();
    updateScormBadge(ok);

    loadProgressFromStorage();

    renderCards(getFilteredUnits());
    wireUnitsModal();
    wireSearch();

    wireInteraction();
    wireContactForm();

    updateProgressUI();

    window.addEventListener("beforeunload", () => {
        if (SCORM.isConnected()) {
            SCORM.commit();
            SCORM.finish();
        }
    });
});

// =======================
// SCORM UI
// =======================
function updateScormBadge(isOk) {
    const badge = document.getElementById("scormStatus");
    if (!badge) return;

    if (isOk) {
        badge.textContent = "SCORM: מחובר";
        badge.className = "badge text-bg-success ms-2";
    } else {
        badge.textContent = "SCORM: demo mode";
        badge.className = "badge text-bg-secondary ms-2";
    }
}

// =======================
// SEARCH (input only)
// =======================
function getFilteredUnits() {
    const q = (currentFilter || "").trim().toLowerCase();
    if (!q) return units;

    return units.filter(u => {
        const title = String(u.title).toLowerCase();
        const desc = String(u.desc).toLowerCase();
        return title.includes(q) || desc.includes(q);
    });
}

function wireSearch() {
    const box = document.getElementById("searchBox");
    const clearBtn = document.getElementById("clearSearchBtn");
    if (!box || !clearBtn) return;

    function apply() {
        currentFilter = box.value;
        renderCards(getFilteredUnits());
    }

    box.addEventListener("input", () => {
        apply();
    });

    clearBtn.addEventListener("click", () => {
        box.value = "";
        currentFilter = "";
        renderCards(units);
        box.focus();
    });
}

// =======================
// CARDS
// =======================
function createUnitCard(unit) {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";

    const doneClass = completedSet.has(unit.id) ? "unit-done" : "";

    col.innerHTML = `
    <article class="card unit-card h-100 shadow w-100 ${doneClass}">
      <img src="${unit.img}" class="card-img-top" alt="${escapeHtml(unit.title)}">
      <div class="card-body">
        <h3 class="h5 fw-bold mb-2 text-end">${escapeHtml(unit.title)}</h3>
        <p class="text-secondary mb-3 text-end">${escapeHtml(unit.desc)}</p>
        <button class="btn btn-primary w-100 open-unit-btn" type="button" data-unit-id="${unit.id}">
          הצג
        </button>
      </div>
    </article>
  `;
    return col;
}

function renderCards(list) {
    const row = document.getElementById("cardsRow");
    if (!row) return;

    row.innerHTML = "";
    list.forEach((unit) => row.appendChild(createUnitCard(unit)));

    // keep progress visible always
    updateProgressUI();
}

// =======================
// UNITS MODAL + PROGRESS
// =======================
function wireUnitsModal() {
    const modalEl = document.getElementById("unitModal");
    if (!modalEl) return;

    unitModalInstance = new bootstrap.Modal(modalEl);

    const row = document.getElementById("cardsRow");
    if (row) {
        row.addEventListener("click", (e) => {
            const btn = e.target.closest(".open-unit-btn");
            if (!btn) return;

            const id = Number(btn.getAttribute("data-unit-id"));
            const unit = units.find(u => u.id === id);
            if (!unit) return;

            currentUnitId = id;

            const t = document.getElementById("unitModalTitle");
            const d = document.getElementById("unitModalDesc");
            if (t) t.textContent = unit.title;
            if (d) d.textContent = unit.desc;

            const markBtn = document.getElementById("markCompleteBtn");
            if (markBtn) {
                const isDone = completedSet.has(id);
                markBtn.textContent = isDone ? "כבר הושלם ✅" : "סמן כהושלם";
                markBtn.disabled = isDone;
            }

            unitModalInstance.show();
        });
    }

    const markBtn = document.getElementById("markCompleteBtn");
    if (markBtn) {
        markBtn.addEventListener("click", () => {
            if (!currentUnitId) return;
            if (completedSet.has(currentUnitId)) return;

            completedSet.add(currentUnitId);
            persistProgressToStorage();

            renderCards(getFilteredUnits());

            if (SCORM.isConnected()) {
                SCORM.setValue("cmi.core.lesson_location", `unit_${currentUnitId}_completed`);
                SCORM.commit();
            } else {
                localStorage.setItem("nao_location", `unit_${currentUnitId}_completed`);
            }

            if (completedSet.size === units.length) {
                if (SCORM.isConnected()) {
                    SCORM.setStatus("completed");
                    SCORM.commit();
                } else {
                    localStorage.setItem("nao_status", "completed");
                }
            }

            unitModalInstance.hide();
        });
    }
}

function updateProgressUI() {
    const progress = document.getElementById("progressText");
    if (progress) progress.textContent = `${completedSet.size}/${units.length}`;
}

function persistProgressToStorage() {
    const payload = {
        completedUnits: Array.from(completedSet),
        updatedAt: new Date().toISOString()
    };

    if (SCORM.isConnected()) {
        const raw = SCORM.getSuspendData();
        let data = safeParseJson(raw);
        if (!data || typeof data !== "object") data = {};
        data.progress = payload;

        SCORM.setSuspendData(JSON.stringify(data));
        SCORM.commit();
    } else {
        localStorage.setItem("nao_progress", JSON.stringify(payload));
    }
}

function loadProgressFromStorage() {
    if (SCORM.isConnected()) {
        const raw = SCORM.getSuspendData();
        const data = safeParseJson(raw);
        const arr = data?.progress?.completedUnits;
        if (Array.isArray(arr)) {
            completedSet = new Set(arr.map(Number));
            return;
        }
    }

    const rawLocal = localStorage.getItem("nao_progress");
    const dataLocal = safeParseJson(rawLocal);
    const arrLocal = dataLocal?.completedUnits;
    if (Array.isArray(arrLocal)) {
        completedSet = new Set(arrLocal.map(Number));
    }
}

// =======================
// INTERACTION (multi-scenarios)
// =======================
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildRecommendation(goal, audience, minutes, chosen) {
    const has = (x) => chosen.includes(x);

    const openingsByGoal = {
        "היכרות": [
            "נתחיל בפתיחה קצרה כדי לשבור את הקרח ולהכיר את NAO.",
            "מומלץ להתחיל בהיכרות: מה NAO יכול לעשות ואיך עובדים איתו."
        ],
        "תרגול": [
            "נלך על תרגול מעשי קצר, עם משימה ברורה ומשוב מהיר.",
            "הכי טוב כאן: תרגול ממוקד עם דוגמאות והדגמה."
        ],
        "רפלקציה": [
            "נבנה רגע של רפלקציה: מה למדנו ומה נרצה לשפר בפעם הבאה.",
            "כדאי לסיים עם רפלקציה קצרה שמייצרת תובנות."
        ],
        "תקשורת צוותית": [
            "נבנה פעילות שמחזקת שיח, תפקידים והקשבה בצוות.",
            "הדגש כאן הוא על תקשורת צוותית: כללים, תפקידים וסיכום."
        ],
    };

    const audienceNote = ({
        "סטודנטים": "בסטודנטים – נשמור על קצב מהיר ודוגמאות מהקורס.",
        "עובדים בארגון": "בעובדים – נחבר לתרחיש מהעבודה ולמטרה ארגונית.",
        "אורחים/חדשים": "באורחים/חדשים – נסביר בשפה פשוטה ובצעדים קטנים."
    }[audience]) || "";

    const total = Number(minutes) || 3;
    const part1 = Math.max(1, Math.floor(total * 0.3));
    const part2 = Math.max(1, Math.floor(total * 0.5));
    const part3 = Math.max(1, total - part1 - part2);

    const opening = pick(openingsByGoal[goal] || ["בוא/י נעשה פעילות קצרה ומדויקת."]);

    const steps = [];
    steps.push(`1) פתיחה (${part1} דק׳): ${opening}`);
    if (audienceNote) steps.push(`   התאמה לקהל: ${audienceNote}`);

    if (has("דיון") || has("תקשורת צוותית")) {
        steps.push(`2) שיח (${part2} דק׳): שאלת הנעה + סבב קצר (כל אחד משפט).`);
    } else {
        steps.push(`2) פעילות (${part2} דק׳): הדגמה קצרה + משימה אחת לביצוע.`);
    }

    if (has("שאלון")) {
        steps.push(`3) בדיקה (${part3} דק׳): 2 שאלות קצרות לוודא הבנה.`);
    } else if (has("רפלקציה")) {
        steps.push(`3) רפלקציה (${part3} דק׳): "מה היה ברור?", "מה נשאר לא ברור?"`);
    } else {
        steps.push(`3) סיכום (${part3} דק׳): החלטה אחת להמשך + מה עושים בפעם הבאה.`);
    }

    const tips = [];
    if (goal === "תקשורת צוותית") {
        tips.push(pick([
            "טיפ: הגדירו תפקידים (מוביל/ת דיון, מסכם/ת, שואל/ת).",
            "טיפ: השתמשו בכלל 1–2–4: משפט אחד לכל משתתף, שני סבבים, ואז מסקנה."
        ]));
    }
    if (has("שאלון")) {
        tips.push(pick([
            "שאלון מומלץ: אמת/שקר + שאלה פתוחה אחת.",
            "שאלון מומלץ: 2 שאלות רב-ברירה כדי לסגור פערים."
        ]));
    }
    if (has("רפלקציה")) {
        tips.push(pick([
            "רפלקציה: כתבו 1 דבר שלמדתם + 1 דבר לשיפור.",
            "רפלקציה: 'מה הפתיע אותי?' ו-'מה איישם מחר?'."
        ]));
    }

    const header = `המלצה מותאמת ל-${total} דק׳ לקהל "${audience}" עם מטרה "${goal}".`;
    const optionsLine = chosen.length ? `נבחרו מרכיבים: ${chosen.join(", ")}.` : "";

    return [
        header,
        optionsLine,
        "",
        steps.join("\n"),
        tips.length ? "\n" + tips.join("\n") : ""
    ].join("\n");
}

function wireInteraction() {
    const minutes = document.getElementById("minutes");
    const minutesLabel = document.getElementById("minutesLabel");
    const box = document.getElementById("resultBox");
    const buildBtn = document.getElementById("buildBtn");
    const resetBtn = document.getElementById("resetInteraction");
    const audience = document.getElementById("audience");

    const goalMsg = document.getElementById("goalMsg");
    const audienceMsg = document.getElementById("audienceMsg");
    const optionsMsg = document.getElementById("optionsMsg");

    const checkIds = ["c1", "c2", "c3", "c4"];

    if (!minutes || !minutesLabel || !box || !buildBtn || !resetBtn || !audience) return;

    let tried = false;

    function hasGoal() {
        return !!document.querySelector("input[name='goal']:checked");
    }
    function hasAudience() {
        return audience.value !== "";
    }
    function hasAnyCheckbox() {
        return checkIds.some((id) => document.getElementById(id)?.checked);
    }
    function allComplete() {
        return hasGoal() && hasAudience() && hasAnyCheckbox();
    }

    function paintState() {
        const ok = allComplete();

        buildBtn.classList.toggle("btn-soft-disabled", !ok);
        buildBtn.classList.toggle("btn-ready", ok);

        // IMPORTANT: if disabled style only, still allow click -> we keep as type button but block with aria
        buildBtn.setAttribute("aria-disabled", String(!ok));

        if (tried) {
            if (goalMsg) goalMsg.classList.toggle("d-none", hasGoal());
            if (audienceMsg) audienceMsg.classList.toggle("d-none", hasAudience());
            if (optionsMsg) optionsMsg.classList.toggle("d-none", hasAnyCheckbox());
        } else {
            if (goalMsg) goalMsg.classList.add("d-none");
            if (audienceMsg) audienceMsg.classList.add("d-none");
            if (optionsMsg) optionsMsg.classList.add("d-none");
        }

        if (!ok) box.classList.add("d-none");
    }

    paintState();

    minutes.addEventListener("input", () => {
        minutesLabel.textContent = minutes.value;
        paintState();
    });

    document.querySelectorAll("input[name='goal']").forEach((r) => r.addEventListener("change", paintState));
    audience.addEventListener("change", paintState);

    checkIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", paintState);
    });

    buildBtn.addEventListener("click", () => {
        tried = true;
        paintState();
        if (!allComplete()) return;

        const goal = document.querySelector("input[name='goal']:checked")?.value || "";
        const aud = audience.value;

        const chosen = [
            document.getElementById("c1")?.checked ? "שאלון" : null,
            document.getElementById("c2")?.checked ? "רפלקציה" : null,
            document.getElementById("c3")?.checked ? "דיון" : null,
            document.getElementById("c4")?.checked ? "תקשורת צוותית" : null,
        ].filter(Boolean);

        const recommendation = buildRecommendation(goal, aud, minutes.value, chosen);

        box.className = "alert alert-info mt-3";
        box.textContent = recommendation;
        box.classList.remove("d-none");

        if (SCORM.isConnected()) {
            SCORM.setValue("cmi.core.lesson_location", "interaction_built");
            SCORM.commit();
        } else {
            localStorage.setItem("nao_location", "interaction_built");
        }
    });

    resetBtn.addEventListener("click", () => {
        tried = false;

        document.querySelectorAll("input[name='goal']").forEach((r) => (r.checked = false));
        checkIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        });

        audience.value = "";
        minutes.value = 3;
        minutesLabel.textContent = "3";

        box.classList.add("d-none");
        paintState();
    });
}

// =======================
// CONTACT FORM (disabled button + success banner)
// =======================
function wireContactForm() {
    const form = document.getElementById("contactForm");
    const success = document.getElementById("contactSuccess");
    const submitBtn = document.getElementById("contactSubmit");

    const fullName = document.getElementById("fullName");
    const email = document.getElementById("email");
    const role = document.getElementById("role");
    const msg = document.getElementById("msg");

    const nameErr = document.getElementById("nameErr");
    const emailErr = document.getElementById("emailErr");
    const roleErr = document.getElementById("roleErr");
    const msgErr = document.getElementById("msgErr");

    if (!form || !success || !submitBtn || !fullName || !email || !role || !msg) return;

    let tried = false;

    function normalizeSpaces(s) {
        return String(s || "").replace(/\s+/g, " ").trim();
    }

    function setError(inputEl, errEl, message) {
        inputEl.classList.add("is-invalid");
        if (errEl) {
            errEl.textContent = message;
            errEl.classList.remove("d-none");
        }
    }

    function clearError(inputEl, errEl) {
        inputEl.classList.remove("is-invalid");
        if (errEl) {
            errEl.textContent = "";
            errEl.classList.add("d-none");
        }
    }

    function validateName(value) {
        const v = normalizeSpaces(value);
        if (!v) return { ok: false, msg: "לא ניתן להשאיר ריק" };
        if (v.length < 2) return { ok: false, msg: "מינימום 2 תווים" };
        if (/\d/.test(v)) return { ok: false, msg: "לא ניתן להזין מספרים" };

        const allowed = /^[A-Za-z\u0590-\u05FF\s'’-]+$/;
        if (!allowed.test(v)) return { ok: false, msg: "לא ניתן להזין תווים מיוחדים" };

        return { ok: true, msg: "" };
    }

    function validateEmail(value) {
        const raw = String(value || "");
        const v = normalizeSpaces(raw);

        if (!v) return { ok: false, msg: "לא ניתן להשאיר ריק" };
        if (/\s/.test(raw)) return { ok: false, msg: "אין רווחים" };

        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
        if (!ok) return { ok: false, msg: "חייב להיות דוא\"ל תקין (example@mail.com)" };

        return { ok: true, msg: "" };
    }

    function validateRole(value) {
        if (!value) return { ok: false, msg: "לא ניתן להשאיר ריק" };
        return { ok: true, msg: "" };
    }

    function validateMsg(value) {
        const v = normalizeSpaces(value);
        if (!v) return { ok: true, msg: "" }; // optional
        if (v.length < 2) return { ok: false, msg: "מינימום 2 תווים" };
        if (v.length > 70) return { ok: false, msg: "מקסימום 70 תווים" };
        return { ok: true, msg: "" };
    }

    function formOk() {
        return (
            validateName(fullName.value).ok &&
            validateEmail(email.value).ok &&
            validateRole(role.value).ok &&
            validateMsg(msg.value).ok
        );
    }

    function paintFieldsIfNeeded() {
        if (!tried) return;

        const n = validateName(fullName.value);
        const e = validateEmail(email.value);
        const r = validateRole(role.value);
        const m = validateMsg(msg.value);

        if (!n.ok) setError(fullName, nameErr, n.msg); else clearError(fullName, nameErr);
        if (!e.ok) setError(email, emailErr, e.msg); else clearError(email, emailErr);
        if (!r.ok) setError(role, roleErr, r.msg); else clearError(role, roleErr);
        if (!m.ok) setError(msg, msgErr, m.msg); else clearError(msg, msgErr);
    }

    function updateButton() {
        const ok = formOk();

        submitBtn.disabled = !ok; // REAL disable
        submitBtn.classList.toggle("btn-ready", ok);
        submitBtn.classList.toggle("btn-soft-disabled", !ok);
        submitBtn.setAttribute("aria-disabled", String(!ok));
    }

    function onLive() {
        // hide previous success when user edits again
        success.classList.add("d-none");
        success.textContent = "";

        updateButton();
        paintFieldsIfNeeded();
    }

    // live
    fullName.addEventListener("input", onLive);
    email.addEventListener("input", onLive);
    role.addEventListener("change", onLive);
    msg.addEventListener("input", onLive);

    // init
    success.classList.add("d-none");
    success.textContent = "";
    updateButton();

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        tried = true;

        paintFieldsIfNeeded();
        updateButton();

        if (!formOk()) return;

        const payload = {
            fullName: normalizeSpaces(fullName.value),
            email: normalizeSpaces(email.value),
            role: role.value,
            message: normalizeSpaces(msg.value),
            timestamp: new Date().toISOString(),
        };

        saveContactToSuspendData(payload);

        if (SCORM.isConnected()) {
            SCORM.setValue("cmi.core.lesson_location", "contact_sent");
            SCORM.commit();
        } else {
            localStorage.setItem("nao_location", "contact_sent");
        }

        // show success (visible)
        success.textContent = " הטופס נשלח בהצלחה!";
        success.classList.remove("d-none");

        // reset form AFTER showing success
        form.reset();
        tried = false;

        clearError(fullName, nameErr);
        clearError(email, emailErr);
        clearError(role, roleErr);
        clearError(msg, msgErr);

        updateButton();
    });
}

function saveContactToSuspendData(payload) {
    const raw = SCORM.getSuspendData();
    let data = safeParseJson(raw);
    if (!data || typeof data !== "object") data = {};

    data.contact = payload;
    const json = JSON.stringify(data);

    if (SCORM.isConnected()) {
        SCORM.setSuspendData(json);
        SCORM.commit();
    } else {
        localStorage.setItem("nao_suspend_data", json);
    }
}

// =======================
// HELPERS
// =======================
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    }[s]));
}

function safeParseJson(raw) {
    if (!raw || typeof raw !== "string") return null;
    const t = raw.trim();
    if (!t) return null;
    try { return JSON.parse(t); } catch { return null; }
}
