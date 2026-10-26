
"use strict";

/* ==========================================
   IntelliStudy v1.0
   Student productivity web application
   HTML + CSS + JavaScript
   ========================================== */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE_KEY = "intellistudy_v1_data";

const subjectInfo = [
  { name: "Programming", icon: "⌘", color: "#b7a0ff", description: "Practise coding and programming fundamentals." },
  { name: "Mathematics", icon: "∑", color: "#83b7ff", description: "Revise formulas, concepts, and problem-solving." },
  { name: "Data Structures", icon: "⌘", color: "#ed9dff", description: "Study algorithms, trees, graphs, and data structures." },
  { name: "Database Systems", icon: "▤", color: "#72dfc0", description: "Explore SQL, database design, and normalization." },
  { name: "Computer Networks", icon: "⌁", color: "#ffbd82", description: "Learn networking, protocols, and communication." },
  { name: "Other", icon: "✦", color: "#c1b0ff", description: "Keep track of everything else you are learning." }
];

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function offsetDateString(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function createInitialState() {
  const today = localDateString();

  return {
    profile: {
      name: "Student",
      course: "B.Tech Information Technology"
    },
    tasks: [
      {
        id: "sample-1",
        title: "Revise programming fundamentals",
        subject: "Programming",
        priority: "High",
        dueDate: today,
        completed: false,
        createdAt: Date.now()
      },
      {
        id: "sample-2",
        title: "Practise data structure problems",
        subject: "Data Structures",
        priority: "Medium",
        dueDate: today,
        completed: false,
        createdAt: Date.now() + 1
      },
      {
        id: "sample-3",
        title: "Review database normalization",
        subject: "Database Systems",
        priority: "Low",
        dueDate: today,
        completed: true,
        createdAt: Date.now() + 2
      }
    ],
    notes: [],
    sessions: [],
    focusMinutes: 0,
    studyDays: [],
    planner: [],
    dailyGoal: 3
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();

    const saved = JSON.parse(raw);
    const initial = createInitialState();

    return {
      ...initial,
      ...saved,
      profile: { ...initial.profile, ...(saved.profile || {}) },
      tasks: Array.isArray(saved.tasks) ? saved.tasks : initial.tasks,
      notes: Array.isArray(saved.notes) ? saved.notes : [],
      sessions: Array.isArray(saved.sessions) ? saved.sessions : [],
      studyDays: Array.isArray(saved.studyDays) ? saved.studyDays : [],
      planner: Array.isArray(saved.planner) ? saved.planner : []
    };
  } catch (error) {
    console.error("Could not load saved IntelliStudy data:", error);
    return createInitialState();
  }
}

let state = loadState();
let currentPage = "dashboard";
let currentTaskFilter = "all";
let currentSubjectFilter = "all";
let searchQuery = "";
let toastTimer = null;

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Could not save IntelliStudy data:", error);
    showToast("Could not save data. Check your browser storage settings.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatDate(dateString) {
  if (!dateString) return "No date";
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function showToast(message) {
  const region = $("#toastRegion");
  if (!region) return;

  clearTimeout(toastTimer);
  region.replaceChildren();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  region.append(toast);

  toastTimer = setTimeout(() => toast.remove(), 3200);
}

function showEmpty(container, title, message) {
  container.innerHTML = `
    <div class="empty-state">
      <strong>${escapeHTML(title)}</strong>
      <span>${escapeHTML(message)}</span>
    </div>`;
}

function getTodayTasks() {
  const today = localDateString();
  return state.tasks.filter(task => task.dueDate === today);
}

function getCompletedTasks() {
  return state.tasks.filter(task => task.completed);
}

function getPendingTasks() {
  return state.tasks.filter(task => !task.completed);
}

function getTaskProgress() {
  if (!state.tasks.length) return 0;
  return Math.round(getCompletedTasks().length / state.tasks.length * 100);
}

/* ==========================================
   NAVIGATION
   ========================================== */

function navigateTo(page) {
  const target = $(`#page-${page}`);
  if (!target) return;

  currentPage = page;

  $$(".page-section").forEach(section => {
    section.classList.toggle("active", section.id === `page-${page}`);
  });

  $$(".nav-link").forEach(button => {
    const active = button.dataset.page === page;
    button.classList.toggle("active", active);

    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  const activeLink = $(`.nav-link[data-page="${page}"]`);
  const titles = {
    dashboard: "Dashboard",
    tasks: "My Tasks",
    planner: "Study Planner",
    notes: "My Notes",
    focus: "Focus Room",
    progress: "My Progress",
    subjects: "My Subjects",
    assistant: "AI Study Assistant"
  };

  $("#breadcrumbTitle").textContent = titles[page] || "Workspace";

  if (activeLink) {
    $("#breadcrumbTitle").textContent =
      activeLink.textContent.trim().replace(/\s+/g, " ");
  }

  $("#sidebar").classList.remove("open");

  if (page === "tasks") renderAllTasks();
  if (page === "planner") renderPlanner();
  if (page === "notes") renderNotes();
  if (page === "subjects") renderSubjects();
  if (page === "progress") renderProgress();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", event => {
  const navButton = event.target.closest("[data-page]");
  if (navButton) {
    event.preventDefault();
    navigateTo(navButton.dataset.page);
  }
});

$("#mobileMenu").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

/* ==========================================
   DATE AND PROFILE
   ========================================== */

function renderHeader() {
  const today = new Date();

  $("#todayDate").textContent = today.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const name = state.profile.name.trim() || "Student";
  const firstName = name.split(/\s+/)[0];

  $("#welcomeTitle").innerHTML =
    `Let's make today count<span class="title-sparkle"> ✦</span>`;

  $("#welcomeSubtitle").textContent =
    `Welcome back, ${firstName}. A little progress every day adds up to big results.`;

  $("#sidebarName").textContent = name;
  $("#topName").textContent = name;

  $$(".avatar").forEach(avatar => {
    avatar.textContent = firstName.charAt(0).toUpperCase();
  });
}

function openProfileDialog() {
  const form = $("#profileForm");
  form.elements.name.value = state.profile.name || "";
  form.elements.course.value = state.profile.course || "";
  $("#profileDialog").showModal();
}

$("#editProfileBtn").addEventListener("click", openProfileDialog);
$("#topProfileBtn").addEventListener("click", openProfileDialog);

$("#closeProfileDialog").addEventListener("click", () => $("#profileDialog").close());
$("#cancelProfileBtn").addEventListener("click", () => $("#profileDialog").close());

$("#profileForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;

  state.profile.name = form.elements.name.value.trim() || "Student";
  state.profile.course = form.elements.course.value.trim();

  saveState();
  renderHeader();
  $("#profileDialog").close();
  showToast("Your profile has been updated.");
});

/* ==========================================
   TASK MANAGEMENT
   ========================================== */

function taskMarkup(task) {
  const priorityClass = `priority-${task.priority.toLowerCase()}`;

  return `
    <div class="task-row ${task.completed ? "is-completed" : ""}" data-task-id="${escapeHTML(task.id)}">
      <button class="task-check ${task.completed ? "checked" : ""}"
        data-action="toggle-task" data-id="${escapeHTML(task.id)}"
        aria-label="${task.completed ? "Mark incomplete" : "Mark complete"}"
        aria-pressed="${task.completed}">${task.completed ? "✓" : ""}</button>
      <div class="task-main">
        <div class="task-title">${escapeHTML(task.title)}</div>
        <div class="task-meta">
          <span>${escapeHTML(task.subject)}</span>
          <span>·</span>
          <span>${escapeHTML(formatDate(task.dueDate))}</span>
          <span class="task-priority ${priorityClass}">${escapeHTML(task.priority)}</span>
        </div>
      </div>
      <button class="task-delete" data-action="delete-task" data-id="${escapeHTML(task.id)}" aria-label="Delete task">×</button>
    </div>`;
}

function renderDashboardTasks() {
  const container = $("#dashboardTaskList");
  const tasks = getTodayTasks().sort((a, b) => {
    return Number(a.completed) - Number(b.completed);
  }).slice(0, 5);

  if (!tasks.length) {
    showEmpty(container, "A fresh start!", "Add a task due today to get started.");
    return;
  }

  container.innerHTML = tasks.map(taskMarkup).join("");
}

function renderAllTasks() {
  const container = $("#allTaskList");

  let tasks = [...state.tasks];

  if (currentTaskFilter === "pending") {
    tasks = tasks.filter(task => !task.completed);
  } else if (currentTaskFilter === "completed") {
    tasks = tasks.filter(task => task.completed);
  }

  if (currentSubjectFilter !== "all") {
    tasks = tasks.filter(task => task.subject === currentSubjectFilter);
  }

  if (searchQuery) {
    tasks = tasks.filter(task =>
      `${task.title} ${task.subject} ${task.priority}`
        .toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  tasks.sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    return a.dueDate.localeCompare(b.dueDate);
  });

  if (!tasks.length) {
    showEmpty(container, "No matching tasks", "Add a task or change your filters.");
    return;
  }

  container.innerHTML = tasks.map(taskMarkup).join("");
}

function updateTaskCount() {
  $("#navTaskCount").textContent = getPendingTasks().length;
}

function openTaskDialog() {
  const form = $("#taskForm");
  form.reset();
  form.elements.dueDate.value = localDateString();
  $("#taskDialog").showModal();
  form.elements.title.focus();
}

$("#addTaskBtn").addEventListener("click", openTaskDialog);
$("#dashboardAddTask").addEventListener("click", openTaskDialog);
$("#closeTaskDialog").addEventListener("click", () => $("#taskDialog").close());
$("#cancelTaskBtn").addEventListener("click", () => $("#taskDialog").close());

$("#taskForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const title = form.elements.title.value.trim();

  if (!title) {
    showToast("Please enter a task title.");
    return;
  }

  state.tasks.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    title,
    subject: form.elements.subject.value,
    priority: form.elements.priority.value,
    dueDate: form.elements.dueDate.value || localDateString(),
    completed: false,
    createdAt: Date.now()
  });

  saveState();
  refreshApp();
  $("#taskDialog").close();
  showToast("Task added to your study list.");
});

document.addEventListener("click", event => {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const { action, id } = actionButton.dataset;

  if (action === "toggle-task") {
    const task = state.tasks.find(item => item.id === id);
    if (!task) return;

    task.completed = !task.completed;

    if (task.completed) {
      showToast("Great work! Task completed.");
    } else {
      showToast("Task moved back to pending.");
    }

    saveState();
    refreshApp();
  }

  if (action === "delete-task") {
    const task = state.tasks.find(item => item.id === id);
    if (!task) return;

    state.tasks = state.tasks.filter(item => item.id !== id);
    saveState();
    refreshApp();
    showToast("Task deleted.");
  }

  if (action === "delete-planner") {
    state.planner = state.planner.filter(item => item.id !== id);
    saveState();
    renderPlanner();
    showToast("Study session removed.");
  }

  if (action === "delete-note") {
    state.notes = state.notes.filter(item => item.id !== id);
    saveState();
    renderNotes();
    updateProgressCards();
    showToast("Note deleted.");
  }
});

$("#taskFilters").addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  currentTaskFilter = button.dataset.filter;

  $$(".filter-tab").forEach(tab => {
    tab.classList.toggle("active", tab === button);
  });

  renderAllTasks();
});

$("#subjectFilter").addEventListener("change", event => {
  currentSubjectFilter = event.target.value;
  renderAllTasks();
});

/* ==========================================
   STUDY PLANNER
   ========================================== */

$("#plannerDate").value = localDateString();

$("#plannerForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;

  const title = form.elements.title.value.trim();
  if (!title) return;

  state.planner.push({
    id: String(Date.now() + Math.random()),
    title,
    subject: form.elements.subject.value,
    date: form.elements.date.value,
    time: form.elements.time.value,
    duration: Number(form.elements.duration.value)
  });

  state.planner.sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
  );

  saveState();
  form.reset();
  $("#plannerDate").value = localDateString();
  form.elements.time.value = "18:00";
  renderPlanner();
  showToast("Study session added to your planner.");
});

function renderPlanner() {
  const container = $("#plannerList");
  const entries = [...state.planner].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
  );

  if (!entries.length) {
    showEmpty(container, "No sessions planned", "Add your first study session using the form.");
    return;
  }

  container.innerHTML = entries.map(item => {
    const date = new Date(`${item.date}T12:00:00`);
    const day = date.toLocaleDateString(undefined, { day: "2-digit" });
    const month = date.toLocaleDateString(undefined, { month: "short" });

    return `
      <div class="planner-item">
        <div class="planner-date-box"><strong>${escapeHTML(day)}</strong><small>${escapeHTML(month)}</small></div>
        <div class="planner-item-content">
          <strong>${escapeHTML(item.title)}</strong>
          <p>${escapeHTML(item.subject)} · ${escapeHTML(item.time)} · ${escapeHTML(String(item.duration))} min</p>
        </div>
        <button data-action="delete-planner" data-id="${escapeHTML(item.id)}" aria-label="Remove session">×</button>
      </div>`;
  }).join("");
}

/* ==========================================
   NOTES
   ========================================== */

$("#newNoteBtn").addEventListener("click", () => {
  $("#noteForm").classList.remove("hidden");
  $("#noteForm").elements.title.focus();
});

$("#cancelNoteBtn").addEventListener("click", () => {
  $("#noteForm").reset();
  $("#noteForm").classList.add("hidden");
});

$("#noteForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const title = form.elements.title.value.trim();
  const content = form.elements.content.value.trim();

  if (!title || !content) {
    showToast("Add a title and some note content first.");
    return;
  }

  state.notes.unshift({
    id: String(Date.now() + Math.random()),
    title,
    subject: form.elements.subject.value,
    content,
    createdAt: Date.now()
  });

  saveState();
  form.reset();
  form.classList.add("hidden");
  renderNotes();
  updateProgressCards();
  showToast("Your note has been saved.");
});

function renderNotes() {
  const container = $("#notesGrid");

  if (!state.notes.length) {
    showEmpty(container, "Your notes start here", "Create a note to keep useful ideas close at hand.");
    return;
  }

  container.innerHTML = state.notes.map(note => `
    <article class="note-card">
      <h3>${escapeHTML(note.title)}</h3>
      <div class="task-meta"><span>${escapeHTML(note.subject)}</span><span>·</span><span>${escapeHTML(new Date(note.createdAt).toLocaleDateString())}</span></div>
      <p>${escapeHTML(note.content)}</p>
      <div class="note-card-footer">
        <span>✦ Saved note</span>
        <button data-action="delete-note" data-id="${escapeHTML(note.id)}">Delete</button>
      </div>
    </article>
  `).join("");
}

/* ==========================================
   FOCUS TIMER
   ========================================== */

let timerDuration = 25 * 60;
let timerRemaining = timerDuration;
let timerInterval = null;
let timerRunning = false;
let timerMode = "focus";
let sessionStartedAt = null;

function renderTimer() {
  const minutes = Math.floor(timerRemaining / 60);
  const seconds = timerRemaining % 60;

  $("#timerDisplay").textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const elapsed = timerDuration - timerRemaining;
  const progress = timerDuration ? elapsed / timerDuration : 0;

  $("#timerRing").style.background =
    `conic-gradient(#a78bfa ${progress * 360}deg, #342b4c ${progress * 360}deg)`;

  $("#timerStartBtn").textContent = timerRunning ? "Ⅱ Pause focus" : "▶ Start focus";

  $("#timerModeTitle").textContent =
    timerMode === "focus" ? "Time to focus" : "Take a breather";

  $("#timerModeLabel").textContent =
    timerMode === "focus" ? "FOCUS SESSION" : "BREAK SESSION";

  $$(".preset-button").forEach(button => {
    const active = Number(button.dataset.minutes) * 60 === timerDuration &&
      (button.dataset.mode || "focus") === timerMode;
    button.classList.toggle("active", active);
  });
}

function stopTimer() {
  if (timerInterval !== null) clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
}

function setTimer(minutes, mode = "focus") {
  stopTimer();
  timerMode = mode;
  timerDuration = minutes * 60;
  timerRemaining = timerDuration;
  sessionStartedAt = null;
  $("#timerMessage").textContent = "Your session is ready when you are.";
  renderTimer();
}

function startTimer() {
  if (timerRunning) {
    stopTimer();
    $("#timerMessage").textContent = "Session paused. Resume when ready.";
    renderTimer();
    return;
  }

  if (timerRemaining <= 0) {
    timerRemaining = timerDuration;
  }

  timerRunning = true;
  sessionStartedAt = Date.now();
  $("#timerMessage").textContent =
    timerMode === "focus" ? "You're doing great. Keep your attention on one task." : "Relax and recharge.";

  renderTimer();

  // Use an end timestamp so background browser throttling
  // doesn't make the timer drift significantly.
  const endTime = Date.now() + timerRemaining * 1000;

  timerInterval = setInterval(() => {
    timerRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

    if (timerRemaining <= 0) {
      stopTimer();
      timerRemaining = 0;

      if (timerMode === "focus") {
        state.focusMinutes += Math.round(timerDuration / 60);
        state.sessions.push({
          id: String(Date.now()),
          date: localDateString(),
          minutes: Math.round(timerDuration / 60)
        });

        if (!state.studyDays.includes(localDateString())) {
          state.studyDays.push(localDateString());
        }

        saveState();
        refreshApp();
        $("#timerMessage").textContent = "Focus session complete! Take a well-deserved break.";
        showToast("Focus session complete. Excellent work!");
      } else {
        $("#timerMessage").textContent = "Break complete. Ready for your next step?";
        showToast("Break finished. Return when you're ready.");
      }
    }

    renderTimer();
  }, 250);
}

$("#timerStartBtn").addEventListener("click", startTimer);

$("#timerResetBtn").addEventListener("click", () => {
  setTimer(timerDuration / 60, timerMode);
  $("#timerMessage").textContent = "Timer reset. Start again whenever you're ready.";
});

$$(".preset-button").forEach(button => {
  button.addEventListener("click", () => {
    setTimer(Number(button.dataset.minutes), button.dataset.mode || "focus");
  });
});

window.addEventListener("beforeunload", () => {
  if (timerInterval !== null) clearInterval(timerInterval);
});

/* ==========================================
   SUBJECTS
   ========================================== */

function getSubjectStats(subjectName) {
  const tasks = state.tasks.filter(task => task.subject === subjectName);
  const completed = tasks.filter(task => task.completed).length;

  return {
    total: tasks.length,
    completed,
    progress: tasks.length ? Math.round(completed / tasks.length * 100) : 0
  };
}

function subjectMarkup(subject) {
  const stats = getSubjectStats(subject.name);

  return `
    <article class="subject-card">
      <div class="subject-card-top">
        <span class="subject-icon" style="color:${subject.color}">${escapeHTML(subject.icon)}</span>
        <span class="task-meta">${stats.total} task${stats.total === 1 ? "" : "s"}</span>
      </div>
      <h3>${escapeHTML(subject.name)}</h3>
      <p>${escapeHTML(subject.description)}</p>
      <div class="subject-bar"><span style="width:${stats.progress}%"></span></div>
      <div class="subject-card-footer"><span>${stats.completed} completed</span><strong>${stats.progress}%</strong></div>
    </article>`;
}

function renderSubjects() {
  $("#allSubjectsGrid").innerHTML = subjectInfo.map(subjectMarkup).join("");

  $("#dashboardSubjects").innerHTML = subjectInfo.slice(0, 4).map(subject => {
    const stats = getSubjectStats(subject.name);

    return `
      <div class="subject-row">
        <span class="subject-icon" style="color:${subject.color}">${escapeHTML(subject.icon)}</span>
        <div>
          <div class="subject-name">${escapeHTML(subject.name)}</div>
          <div class="subject-bar"><span style="width:${stats.progress}%"></span></div>
        </div>
        <span class="subject-count">${stats.completed}/${stats.total}</span>
      </div>`;
  }).join("");
}

/* ==========================================
   DASHBOARD AND PROGRESS
   ========================================== */

function getStudyStreak() {
  const dates = new Set(state.studyDays);
  let cursor = new Date();

  // Count today's activity, or continue yesterday's streak
  // if no activity has been recorded today.
  if (!dates.has(localDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (dates.has(localDateString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function updateDashboardStats() {
  const completed = getCompletedTasks().length;
  const pending = getPendingTasks().length;
  const total = state.tasks.length;
  const progress = getTaskProgress();
  const focus = state.focusMinutes || 0;
  const streak = getStudyStreak();

  $("#completedStat").textContent = completed;
  $("#pendingStat").textContent = pending;
  $("#focusStat").textContent = focus;
  $("#streakStat").textContent = streak;

  $("#completedTrack").style.width = `${progress}%`;
  $("#pendingTrack").style.width = `${total ? pending / total * 100 : 0}%`;
  $("#focusTrack").style.width = `${Math.min(focus / 120 * 100, 100)}%`;
  $("#streakTrack").style.width = `${Math.min(streak / 7 * 100, 100)}%`;

  const todayTasks = getTodayTasks();
  const todayCompleted = todayTasks.filter(task => task.completed).length;
  const dailyGoal = Math.max(1, Number(state.dailyGoal) || 3);
  const goalProgress = Math.min(100, Math.round(todayCompleted / dailyGoal * 100));

  $("#goalPercent").textContent = `${goalProgress}%`;
  $("#goalCircle").style.background =
    `conic-gradient(#a78bfa ${goalProgress * 3.6}deg, #342b4c ${goalProgress * 3.6}deg)`;
  $("#goalCompleted").textContent = `${todayCompleted} / ${dailyGoal}`;
  $("#goalCaption").textContent = goalProgress >= 100
    ? "Daily goal achieved. Well done!"
    : "Every completed task brings you closer.";

  $("#focusPageStat").textContent = focus;
}

function updateProgressCards() {
  const completed = getCompletedTasks().length;
  const total = state.tasks.length;
  const progress = getTaskProgress();

  $("#progressCompleted").textContent = completed;
  $("#progressFocus").textContent = state.focusMinutes || 0;
  $("#progressNotes").textContent = state.notes.length;
  $("#progressSessions").textContent = state.sessions.length;

  $("#progressTaskRatio").textContent = `${progress}%`;
  $("#progressTaskBar").style.width = `${progress}%`;

  $("#progressMessage").textContent = !total
    ? "Add your first task to start tracking your progress."
    : completed === total
      ? "Amazing! You've completed every task on your list."
      : `You've completed ${completed} out of ${total} tasks. Keep moving forward.`;

  const milestones = [
    { icon: "✦", title: "First Step", description: "Complete your first task.", unlocked: completed >= 1 },
    { icon: "✓", title: "Getting Things Done", description: "Complete 5 tasks.", unlocked: completed >= 5 },
    { icon: "◷", title: "Focus Starter", description: "Record a focus session.", unlocked: state.sessions.length >= 1 },
    { icon: "▤", title: "Note Taker", description: "Save your first note.", unlocked: state.notes.length >= 1 },
    { icon: "⌘", title: "Task Champion", description: "Complete 10 tasks.", unlocked: completed >= 10 },
    { icon: "♨", title: "Consistency", description: "Build a 3-day study streak.", unlocked: getStudyStreak() >= 3 }
  ];

  $("#achievementGrid").innerHTML = milestones.map(item => `
    <article class="achievement-card ${item.unlocked ? "unlocked" : ""}">
      <span>${item.icon}</span>
      <strong>${escapeHTML(item.title)} ${item.unlocked ? "✓" : ""}</strong>
      <p>${escapeHTML(item.description)}</p>
    </article>
  `).join("");
}

function refreshApp() {
  renderHeader();
  renderDashboardTasks();
  updateDashboardStats();
  updateProgressCards();
  updateTaskCount();
  renderSubjects();

  if (currentPage === "tasks") renderAllTasks();
  if (currentPage === "planner") renderPlanner();
  if (currentPage === "notes") renderNotes();
  if (currentPage === "subjects") renderSubjects();
}

/* ==========================================
   STUDY ASSISTANT
   This is local educational guidance, not a
   connected AI service in version 1.0.
   ========================================== */

const assistantResponses = {
  plan: {
    title: "Build a simple study plan",
    intro: "Try this practical structure for your next study session:",
    items: [
      "Choose one specific topic to study.",
      "Work on it for 25 minutes without distractions.",
      "Take a 5-minute break.",
      "Spend 5 minutes recalling what you learned.",
      "Record your next step in your task list."
    ]
  },
  revise: {
    title: "A quick revision strategy",
    intro: "Use active recall instead of only rereading your notes:",
    items: [
      "Write down the key concepts from memory.",
      "Check your notes and identify gaps.",
      "Solve two or three practice questions.",
      "Explain the hardest concept in your own words.",
      "Add anything important to My Notes."
    ]
  },
  focus: {
    title: "Improve your focus",
    intro: "Make your next session easier to complete:",
    items: [
      "Set one clear, achievable goal.",
      "Silence unnecessary notifications.",
      "Keep only the materials you need open.",
      "Use the Focus Room timer.",
      "Take a break when the session ends."
    ]
  },
  motivate: {
    title: "Start with one small win",
    intro: "You don't need to finish everything at once.",
    items: [
      "Pick the easiest useful task on your list.",
      "Commit to just five minutes of starting.",
      "Mark the task complete when you finish it.",
      "Choose your next step based on your energy.",
      "Remember that consistency matters more than perfection."
    ]
  }
};

$$(".suggestion-card").forEach(button => {
  button.addEventListener("click", () => {
    const response = assistantResponses[button.dataset.prompt];
    if (!response) return;

    const container = $("#assistantResponse");
    container.innerHTML = `
      <h3>${escapeHTML(response.title)}</h3>
      <p>${escapeHTML(response.intro)}</p>
      <ol>${response.items.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ol>
      <p><strong>Next step:</strong> Add a task to your planner and start a focus session.</p>`;
    container.classList.remove("hidden");
    container.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

/* ==========================================
   SEARCH AND DAILY SUMMARY
   ========================================== */

$("#globalSearch").addEventListener("input", event => {
  searchQuery = event.target.value.trim();

  if (searchQuery) {
    navigateTo("tasks");
    renderAllTasks();
  } else if (currentPage === "tasks") {
    renderAllTasks();
  }
});

$("#globalSearch").addEventListener("keydown", event => {
  if (event.key === "Escape") {
    event.target.value = "";
    searchQuery = "";
    renderAllTasks();
    event.target.blur();
  }

  if (event.key === "Enter") {
    navigateTo("tasks");
    renderAllTasks();
  }
});

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#globalSearch").focus();
  }
});

$("#notificationBtn").addEventListener("click", () => {
  const pending = getPendingTasks().length;
  const today = getTodayTasks();
  const doneToday = today.filter(task => task.completed).length;

  showToast(
    `Daily summary: ${pending} pending tasks, ${doneToday} of today's tasks completed, ${state.focusMinutes} focus minutes recorded.`
  );
});

/* ==========================================
   INITIALIZE
   ========================================== */

function initializeApp() {
  renderHeader();
  renderDashboardTasks();
  updateDashboardStats();
  updateProgressCards();
  updateTaskCount();
  renderSubjects();
  renderPlanner();
  renderNotes();
  renderTimer();

  $("#taskDueDate").min = localDateString();
  $("#plannerDate").min = localDateString();

  // Initialize the first page and its navigation state.
  navigateTo("dashboard");
}

initializeApp();
