// Simple state
const state = {
  bodyQuestsCompleted: 0,
  totalBodyQuests: 5,
  calorieTarget: null,
  todayCalories: 0,
  foods: [],
  moodEntries: [],
  sleepPlan: null,
  sleepTouches: [],
  racers: {},
};

// Optional Firebase (anonymous "open sign-in")
let firebaseEnabled = false;
let firestore = null;
let currentUid = null;
let firebaseAuth = null;

async function initFirebaseIfConfigured() {
  const cfg = window.__FIREBASE_CONFIG__;
  if (!cfg) return;
  if (typeof firebase === "undefined") return;

  try {
    firebase.initializeApp(cfg);
    const auth = firebase.auth();
    firestore = firebase.firestore();
    firebaseEnabled = true;
    firebaseAuth = auth;

    const cred = await auth.signInAnonymously();
    currentUid = cred?.user?.uid ?? auth.currentUser?.uid ?? null;

    // Sync racers in realtime (shared scoreboard)
    firestore.collection("public").doc("racers").onSnapshot((snap) => {
      const data = snap.data();
      if (data && typeof data === "object" && data.racers && typeof data.racers === "object") {
        state.racers = data.racers;
        renderRaceTrack();
      }
    });

    setupGoogleAuthUI();
    auth.onAuthStateChanged((user) => {
      currentUid = user?.uid ?? null;
      updateGoogleAuthLabel(user);
    });
  } catch (err) {
    firebaseEnabled = false;
    firestore = null;
    currentUid = null;
    // Fallback to local mode silently
  }
}

function setupGoogleAuthUI() {
  const btn = document.getElementById("googleSignInBtn");
  if (!btn || !firebaseAuth) return;
  btn.addEventListener("click", async () => {
    if (!firebaseAuth) return;
    const user = firebaseAuth.currentUser;
    try {
      if (user && !user.isAnonymous) {
        // Signed in with Google already -> sign out
        await firebaseAuth.signOut();
        return;
      }
      const provider = new firebase.auth.GoogleAuthProvider();
      await firebaseAuth.signInWithPopup(provider);
    } catch (e) {
      console.error("Google sign-in failed", e);
      showPopup(
        "Google sign-in",
        "Could not sign in with Google right now. You can still use the app in guest mode."
      );
    }
  });
}

function updateGoogleAuthLabel(user) {
  const label = document.getElementById("googleUserLabel");
  const btn = document.getElementById("googleSignInBtn");
  if (!label || !btn) return;
  if (!user || user.isAnonymous) {
    btn.textContent = "Continue with Google";
    label.textContent = "";
  } else {
    btn.textContent = "Sign out";
    const email = user.email || "Google account connected";
    label.textContent = email;
  }
}

// Tabs
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-panel")
      .forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.getAttribute("data-tab");
    document.getElementById(target).classList.add("active");
  });
});

// Global popup
const popupEl = document.getElementById("globalPopup");
const popupTitleEl = document.getElementById("popupTitle");
const popupMessageEl = document.getElementById("popupMessage");
document.getElementById("closePopupBtn").addEventListener("click", () => {
  popupEl.classList.add("hidden");
});

function showPopup(title, message) {
  popupTitleEl.textContent = title;
  popupMessageEl.textContent = message;
  popupEl.classList.remove("hidden");
}

// BODY QUESTS
const bodyActivityForm = document.getElementById("bodyActivityForm");
const bodyQuestMessage = document.getElementById("bodyQuestMessage");
const resetBodyBtn = document.getElementById("resetBodyBtn");
const bodyProgressCount = document.getElementById("bodyProgressCount");
const bodyActivityLog = document.getElementById("bodyActivityLog");
const bodyDailyReport = document.getElementById("bodyDailyReport");

// Track which regions have at least one logged activity
const bodyRegionsHit = {
  face: false,
  heart: false,
  kidneys: false,
  hands: false,
  legs: false,
  abs: false,
};

const bodyActivities = [];

function repaintBodyFromRegions() {
  const idsToReset = [
    "face",
    "eyeLeft",
    "eyeRight",
    "mouth",
    "heart",
    "kidneyLeft",
    "kidneyRight",
    "armLeft",
    "armRight",
    "legLeft",
    "legRight",
    "torso",
  ];
  idsToReset.forEach((id) => {
    document.getElementById(id)?.classList.remove(
      "active-face",
      "active-eye",
      "active-mouth",
      "active-heart",
      "active-kidney",
      "active-limb",
      "active-abs",
      "completed"
    );
  });

  if (bodyRegionsHit.face) {
    document.getElementById("face")?.classList.add("active-face");
    document.getElementById("eyeLeft")?.classList.add("active-eye");
    document.getElementById("eyeRight")?.classList.add("active-eye");
    document.getElementById("mouth")?.classList.add("active-mouth");
  }
  if (bodyRegionsHit.heart) {
    document.getElementById("heart")?.classList.add("active-heart");
  }
  if (bodyRegionsHit.kidneys) {
    document.getElementById("kidneyLeft")?.classList.add("active-kidney");
    document.getElementById("kidneyRight")?.classList.add("active-kidney");
  }
  if (bodyRegionsHit.hands) {
    document.getElementById("armLeft")?.classList.add("active-limb");
    document.getElementById("armRight")?.classList.add("active-limb");
  }
  if (bodyRegionsHit.legs) {
    document.getElementById("legLeft")?.classList.add("active-limb");
    document.getElementById("legRight")?.classList.add("active-limb");
  }
  if (bodyRegionsHit.abs) {
    // Light pink so heart/kidneys stay visible
    document.getElementById("torso")?.classList.add("active-abs");
  }

  const completedCount = Object.values(bodyRegionsHit).filter(Boolean).length;
  const total = Object.keys(bodyRegionsHit).length;

  if (bodyProgressCount) {
    bodyProgressCount.innerHTML = `<strong>Today:</strong> ${completedCount}/${total} body parts supported`;
  }

  renderBodyActivityLog();
  renderBodyDailyReport();

  if (completedCount === 0) {
    bodyQuestMessage.textContent = "";
    return;
  }

  if (completedCount === total) {
    // Cute "everything complete" glow
    [
      "face",
      "eyeLeft",
      "eyeRight",
      "mouth",
      "heart",
      "kidneyLeft",
      "kidneyRight",
      "armLeft",
      "armRight",
      "legLeft",
      "legRight",
      "torso",
    ].forEach((id) => document.getElementById(id)?.classList.add("completed"));
    bodyQuestMessage.textContent =
      "Full body quest complete. You just lived the lifestyle most people only talk about.";
    showPopup(
      "Full Body Lit Up",
      "Congratulations – you hit every body quest today. This is the lifestyle most people dream about but never execute."
    );
  } else {
    bodyQuestMessage.textContent = `Progress: ${completedCount}/${total} done today.`;
  }
}

bodyActivityForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("activityName").value.trim();
  const focus = document.getElementById("activityFocus").value;
  if (!focus) return;

  // Map focus to regions
  if (focus === "face") {
    bodyRegionsHit.face = true;
  } else if (focus === "heart") {
    bodyRegionsHit.heart = true;
  } else if (focus === "kidneys") {
    bodyRegionsHit.kidneys = true;
  } else if (focus === "hands") {
    bodyRegionsHit.hands = true;
  } else if (focus === "legs") {
    bodyRegionsHit.legs = true;
  } else if (focus === "abs") {
    bodyRegionsHit.abs = true;
  }

  bodyActivities.unshift({
    name: name || "(no name)",
    focus,
    at: new Date(),
  });

  repaintBodyFromRegions();
  bodyActivityForm.reset();
});

resetBodyBtn.addEventListener("click", () => {
  Object.keys(bodyRegionsHit).forEach((key) => {
    bodyRegionsHit[key] = false;
  });
  bodyActivities.length = 0;
  repaintBodyFromRegions();
});

function renderBodyActivityLog() {
  if (!bodyActivityLog) return;
  if (bodyActivities.length === 0) {
    bodyActivityLog.innerHTML = "";
    return;
  }
  const prettyFocus = (f) => {
    if (f === "face") return "Face";
    if (f === "heart") return "Heart";
    if (f === "kidneys") return "Kidneys";
    if (f === "hands") return "Hands / Arms";
    if (f === "legs") return "Legs";
    if (f === "abs") return "Abs";
    return f;
  };
  const items = bodyActivities
    .slice(0, 6)
    .map((a) => `<div class="food-entry"><span>${a.name}</span><span>${prettyFocus(a.focus)}</span></div>`)
    .join("");
  bodyActivityLog.innerHTML = `<div style="margin-top:10px;"><strong>Recent:</strong></div>${items}`;
}

function renderBodyDailyReport() {
  if (!bodyDailyReport) return;
  const done = Object.entries(bodyRegionsHit)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const missing = Object.entries(bodyRegionsHit)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  const benefits = {
    face: "Face care supports skin barrier, confidence, and can reduce irritation/breakouts over time.",
    heart: "Breathing work supports calm focus, lowers stress spikes, and helps cardio endurance.",
    kidneys: "Hydration supports energy, digestion, skin, and reduces headache risk for many people.",
    hands: "Arm/hand training supports upper-body strength, posture, and makes daily tasks feel easier.",
    legs: "Leg training supports stamina, mobility, and overall energy (and often improves sleep).",
    abs: "Core work supports posture, lower‑back comfort, and stability in other workouts.",
  };
  const risks = {
    face: "Ignoring face care can increase dryness, irritation, and acne triggers (especially with pollution/sweat).",
    heart: "Skipping breathing work can make stress feel louder and recovery from workouts slower.",
    kidneys: "Low water intake can lead to fatigue, headaches, constipation, and darker urine.",
    hands: "Ignoring arms/hands can lead to weaker posture and faster fatigue during carrying/pushing/pulling.",
    legs: "Skipping leg movement can increase stiffness and reduce stamina, especially with lots of sitting.",
    abs: "Weak core can contribute to posture issues and lower‑back discomfort.",
  };

  const benefitList = done.length
    ? `<ul>${done.map((k) => `<li><strong>${k}</strong>: ${benefits[k]}</li>`).join("")}</ul>`
    : "<div style='color:var(--muted)'>No tracked benefits yet — add your first activity above.</div>";

  const riskList = missing.length
    ? `<ul>${missing.map((k) => `<li><strong>${k}</strong>: ${risks[k]}</li>`).join("")}</ul>`
    : "<div style='color:var(--success)'><strong>Perfect day!</strong> You supported every part today.</div>";

  bodyDailyReport.innerHTML = `
    <strong>Daily report</strong><br/>
    <div style="margin-top:8px;"><strong>Benefits unlocked:</strong>${benefitList}</div>
    <div style="margin-top:8px;"><strong>What to watch if ignored:</strong>${riskList}</div>
  `;
}

// FOOD TRACKER
const calorieTargetForm = document.getElementById("calorieTargetForm");
const calorieTargetResult = document.getElementById("calorieTargetResult");
const foodForm = document.getElementById("foodForm");
const foodLog = document.getElementById("foodLog");
const foodSummary = document.getElementById("foodSummary");
const addCustomFoodBtn = document.getElementById("addCustomFoodBtn");

const FOOD_TABLE = {
  rice: 130, // per 100g
  roti: 110,
  chapati: 120,
  apple: 52,
  banana: 89,
  egg: 155,
  chicken: 165,
  paneer: 265,
  milk: 60,
  dal: 116,
  bread: 265,
};

function calculateDailyCalories({ age, sex, height, weight, activity }) {
  const s = sex === "male" ? 5 : -161;
  const bmr = 10 * weight + 6.25 * height - 5 * age + s;
  return Math.round(bmr * activity);
}

calorieTargetForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const age = Number(document.getElementById("age").value);
  const sex = document.getElementById("sex").value;
  const height = Number(document.getElementById("height").value);
  const weight = Number(document.getElementById("weight").value);
  const activity = Number(document.getElementById("activity").value);
  if (!age || !height || !weight) return;

  const target = calculateDailyCalories({ age, sex, height, weight, activity });
  state.calorieTarget = target;
  updateFoodSummary();
  calorieTargetResult.innerHTML = `
    <strong>Your estimated daily target:</strong><br/>
    <span style="font-size:1.1rem;">${target.toLocaleString()} kcal</span><br/>
    <span style="color: var(--muted); font-size:0.78rem;">
      Uses the Mifflin‑St Jeor equation. Real coaching would fine‑tune this to your goals.
    </span>
  `;
});

function addFoodEntry(name, kcal) {
  state.foods.push({ name, kcal });
  state.todayCalories += kcal;
  const row = document.createElement("div");
  row.className = "food-entry";
  row.innerHTML = `<span>${name}</span><span>${Math.round(kcal)} kcal</span>`;
  foodLog.appendChild(row);
  updateFoodSummary();
}

foodForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("foodName");
  const qtyInput = document.getElementById("foodQty");
  const name = nameInput.value.trim().toLowerCase();
  const qty = Number(qtyInput.value);
  if (!name || !qty) return;

  const per100 = FOOD_TABLE[name];
  let kcal;
  if (per100) {
    kcal = (per100 * qty) / 100;
  } else {
    kcal = 0;
  }
  addFoodEntry(nameInput.value.trim(), kcal);
  nameInput.value = "";
  qtyInput.value = "";
});

addCustomFoodBtn.addEventListener("click", () => {
  const name = document.getElementById("customFoodName").value.trim();
  const kcal = Number(document.getElementById("customFoodKcal").value);
  if (!name || !kcal) return;
  addFoodEntry(name, kcal);
  document.getElementById("customFoodName").value = "";
  document.getElementById("customFoodKcal").value = "";
});

function updateFoodSummary() {
  if (state.calorieTarget == null && state.todayCalories === 0) {
    foodSummary.textContent = "";
    return;
  }
  const target = state.calorieTarget || 0;
  const remaining = target ? target - state.todayCalories : null;
  let text = `<strong>Today so far:</strong> ${Math.round(
    state.todayCalories
  )} kcal`;
  if (target) {
    text += `<br/>Target: ${target.toLocaleString()} kcal`;
    text += `<br/>Remaining: ${
      remaining >= 0 ? remaining.toLocaleString() : "0"
    } kcal`;
  }
  if (target && state.todayCalories >= target) {
    text +=
      "<br/><span style='color:var(--success);'>Daily calorie quest complete.</span>";
    showPopup(
      "Calorie Quest Complete",
      "You hit your daily calorie goal. Most people never track this consistently – you’re already ahead."
    );
  }
  foodSummary.innerHTML = text;
}

// MOOD / STRESS
const moodForm = document.getElementById("moodForm");
const moodScoreInput = document.getElementById("moodScore");
const moodScoreLabel = document.getElementById("moodScoreLabel");
const moodLog = document.getElementById("moodLog");
const moodSummary = document.getElementById("moodSummary");

moodScoreInput.addEventListener("input", () => {
  moodScoreLabel.textContent = moodScoreInput.value;
});

moodForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const time = document.getElementById("moodTime").value;
  const score = Number(moodScoreInput.value);
  const note = document.getElementById("moodNote").value.trim();
  state.moodEntries.push({ time, score, note, ts: new Date() });
  renderMoodLog();
  renderMoodSummary();
  moodForm.reset();
  moodScoreInput.value = 3;
  moodScoreLabel.textContent = "3";
});

function renderMoodLog() {
  moodLog.innerHTML = "";
  state.moodEntries.forEach((m) => {
    const row = document.createElement("div");
    row.className = "mood-row";
    const tagClass =
      m.score <= 2 ? "low" : m.score === 3 ? "medium" : "high";
    row.innerHTML = `
      <span>${m.time}</span>
      <span class="mood-tag ${tagClass}">score ${m.score}</span>
    `;
    moodLog.appendChild(row);
  });
}

function renderMoodSummary() {
  if (state.moodEntries.length === 0) {
    moodSummary.textContent = "No mood logs yet for today.";
    return;
  }
  const avg =
    state.moodEntries.reduce((sum, m) => sum + m.score, 0) /
    state.moodEntries.length;
  let level;
  let advice;
  if (avg <= 2) {
    level = "High stress zone";
    advice =
      "Your average mood is low. Your nervous system probably needs rest, boundaries, and support. Consider shorter to‑do lists, gentle movement, and talking to someone you trust.";
  } else if (avg < 4) {
    level = "Mixed / manageable stress";
    advice =
      "You’re carrying some load but still functioning. Protect the habits that help (sleep, food, movement) and reduce one unnecessary stressor this week.";
  } else {
    level = "Thriving zone";
    advice =
      "Your average mood is high. Double‑down on what’s working – routines, people, and environments that support you.";
  }
  moodSummary.innerHTML = `
    <strong>${level}</strong><br/>
    Average mood score today: ${avg.toFixed(1)} / 5<br/><br/>
    ${advice}
  `;
}

// WORKOUT PLAN
const workoutForm = document.getElementById("workoutForm");
const workoutPlanSummary = document.getElementById("workoutPlanSummary");
const workoutPlanUI = document.getElementById("workoutPlanUI");
const workoutDisabilityInput = document.getElementById("workoutDisability");
const workoutTimeInput = document.getElementById("workoutTime");
const enableWorkoutRemindersBtn = document.getElementById(
  "enableWorkoutRemindersBtn"
);
const workoutReminderHint = document.getElementById("workoutReminderHint");

let currentWorkoutPlan = null;
let workoutTickInterval = null;
let workoutSelectedDayIdx = null;

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function minutesSinceMidnight(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

function timeStrToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function scheduleWorkoutReminder() {
  const t = workoutTimeInput?.value;
  if (!t) return;
  saveJson("workoutTimePref", t);

  const workoutMin = timeStrToMinutes(t);
  const reminderMin = workoutMin - 15;
  const nowMin = minutesSinceMidnight();
  let deltaMin = reminderMin - nowMin;
  if (deltaMin < 0) deltaMin += 24 * 60;
  const ms = deltaMin * 60 * 1000;

  // store next reminder timestamp so if the tab is refreshed we can reschedule
  const nextAt = Date.now() + ms;
  saveJson("workoutNextReminderAt", nextAt);

  setTimeout(() => {
    const msg = "Almost time for your workout. Are you ready?";
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Workout reminder", { body: msg });
    } else {
      showPopup("Workout reminder", msg);
    }
    // schedule the next day reminder again
    scheduleWorkoutReminder();
  }, ms);
}

async function enableWorkoutReminders() {
  if (!("Notification" in window)) {
    workoutReminderHint.textContent =
      "Your browser does not support notifications. The app will show an in-app popup if open.";
    scheduleWorkoutReminder();
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === "granted") {
    workoutReminderHint.textContent =
      "Reminders enabled. You’ll get a notification 15 minutes before your workout time (when your device/browser allows it).";
  } else {
    workoutReminderHint.textContent =
      "Notifications are blocked. The app will show an in-app popup if it’s open.";
  }
  scheduleWorkoutReminder();
}

enableWorkoutRemindersBtn?.addEventListener("click", enableWorkoutReminders);

// restore workout time preference
const savedTime = loadJson("workoutTimePref", null);
if (savedTime && workoutTimeInput) workoutTimeInput.value = savedTime;

const DISABILITY_TAGS = [
  { key: "knee", match: ["knee", "knees", "acl", "meniscus"], note: "knee-sensitive" },
  { key: "back", match: ["back", "spine", "sciatica", "slip disc", "disc"], note: "back-sensitive" },
  { key: "asthma", match: ["asthma", "breathing"], note: "breathing-sensitive" },
  { key: "wheelchair", match: ["wheelchair", "paralysis"], note: "seated" },
];

function parseDisability(text) {
  const t = (text || "").toLowerCase();
  const tags = new Set();
  for (const d of DISABILITY_TAGS) {
    if (d.match.some((m) => t.includes(m))) tags.add(d.key);
  }
  return tags;
}

function buildWorkoutPlanV2({ level, goal, hours, disabilityText }) {
  const tags = parseDisability(disabilityText);
  const days = Math.min(6, Math.max(2, Math.round(hours)));
  const minutesPerDay = Math.round((hours * 60) / days);
  const warmup = Math.max(5, Math.min(12, Math.round(minutesPerDay * 0.15)));
  const cooldown = Math.max(4, Math.min(10, Math.round(minutesPerDay * 0.1)));
  const main = Math.max(10, minutesPerDay - warmup - cooldown);

  const intensity =
    level === "very-basic"
      ? 1
      : level === "basic"
      ? 2
      : level === "intermediate"
      ? 3
      : level === "inter-advanced"
      ? 4
      : level === "advanced"
      ? 5
      : 6;

  const cardioFocus = goal === "endurance" || goal === "fat-loss";
  const strengthFocus = goal === "muscle" || goal === "general";

  const exerciseBank = {
    warmup: [
      { name: "Neck + shoulder rolls", durationSec: 60 },
      { name: "March in place", durationSec: 90 },
      { name: "Arm circles", durationSec: 60 },
      { name: "Hip circles", durationSec: 60 },
      { name: "Ankle circles", durationSec: 45 },
    ],
    cardioLow: [
      { name: "Brisk walk (indoor/outdoor)", durationSec: 6 * 60 },
      { name: "Step-touch", durationSec: 4 * 60 },
      { name: "Low-impact shadow boxing", durationSec: 4 * 60 },
    ],
    cardioSeated: [
      { name: "Seated marching", durationSec: 4 * 60 },
      { name: "Seated punches", durationSec: 3 * 60 },
      { name: "Seated side bends", durationSec: 2 * 60 },
    ],
    strengthUpper: [
      { name: "Wall push-ups", durationSec: 90 },
      { name: "Chair triceps dips (tiny range)", durationSec: 75 },
      { name: "Bicep curls (water bottles)", durationSec: 75 },
      { name: "Shoulder press (light)", durationSec: 75 },
      { name: "Band row / towel row", durationSec: 90 },
    ],
    strengthLower: [
      { name: "Chair sit-to-stand", durationSec: 90 },
      { name: "Glute bridges", durationSec: 90 },
      { name: "Standing calf raises", durationSec: 75 },
      { name: "Side leg raises", durationSec: 75 },
    ],
    core: [
      { name: "Dead bug (slow)", durationSec: 90 },
      { name: "Bird-dog (slow)", durationSec: 90 },
      { name: "Plank (knees if needed)", durationSec: 60 },
      { name: "Glute bridge hold", durationSec: 60 },
    ],
    cooldown: [
      { name: "Box breathing (4-4-4-4)", durationSec: 120 },
      { name: "Hamstring stretch", durationSec: 60 },
      { name: "Chest opener stretch", durationSec: 60 },
      { name: "Child’s pose (or seated fold)", durationSec: 60 },
    ],
  };

  // Disability adjustments
  if (tags.has("knee")) {
    exerciseBank.cardioLow = [
      { name: "Gentle walk (flat surface)", durationSec: 5 * 60 },
      { name: "Upper-body shadow boxing (low impact)", durationSec: 4 * 60 },
    ];
    exerciseBank.strengthLower = [
      { name: "Glute bridges", durationSec: 90 },
      { name: "Side leg raises (small range)", durationSec: 75 },
      { name: "Calf raises (slow)", durationSec: 75 },
    ];
  }
  if (tags.has("back")) {
    exerciseBank.core = [
      { name: "Dead bug (tiny range)", durationSec: 90 },
      { name: "Bird-dog (tiny range)", durationSec: 90 },
      { name: "Cat-cow (gentle)", durationSec: 90 },
    ];
  }
  if (tags.has("asthma")) {
    exerciseBank.warmup.unshift({ name: "Nasal breathing warm-up", durationSec: 90 });
    exerciseBank.cooldown.unshift({ name: "Extended slow breathing", durationSec: 150 });
  }
  if (tags.has("wheelchair")) {
    exerciseBank.cardioLow = exerciseBank.cardioSeated;
    exerciseBank.strengthLower = [
      { name: "Seated knee extensions (if possible)", durationSec: 75 },
      { name: "Seated calf pumps", durationSec: 60 },
    ];
  }

  // Create a 7-day plan skeleton with workouts on `days` days
  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const activeDays = new Set();
  for (let i = 0; i < days; i++) activeDays.add(i);

  const splitTitles = [
    "Legs",
    "Chest & Back",
    "Shoulders & Arms",
    "Legs + Core",
    "Full Body",
    "Core + Mobility",
    "Active Recovery",
  ];

  const planDays = weekdayNames.map((label, idx) => {
    const isWorkout = activeDays.has(idx);
    if (!isWorkout) {
      const items = [
        {
          name: "Rest / light walk + stretching",
          durationSec: 10 * 60,
          section: "stretch",
          kind: "recovery",
          imageHint: "stretch",
        },
      ];
      return {
        label,
        type: "rest",
        title: "Rest day",
        items: normalizeDayItems(items, idx),
      };
    }

    const items = [];

    // Warmup block
    items.push(
      ...pickExercises(exerciseBank.warmup, warmup, intensity, {
        section: "warmup",
        kind: "warmup",
        imageHint: "warmup",
      })
    );

    // Main block
    if (tags.has("wheelchair")) {
      // Seated-friendly split
      items.push(
        ...pickExercises(exerciseBank.cardioSeated, Math.round(main * 0.35), intensity, {
          section: "workout",
          kind: "cardio",
          imageHint: "cardio",
        })
      );
      items.push(
        ...pickExercises(exerciseBank.strengthUpper, Math.round(main * 0.45), intensity, {
          section: "workout",
          kind: "strength-upper",
          imageHint: "upper body",
        })
      );
      items.push(
        ...pickExercises(exerciseBank.core, Math.round(main * 0.2), intensity, {
          section: "workout",
          kind: "core",
          imageHint: "core",
        })
      );
    } else {
      if (cardioFocus) {
        items.push(
          ...pickExercises(exerciseBank.cardioLow, Math.round(main * 0.5), intensity, {
            section: "workout",
            kind: "cardio",
            imageHint: "cardio",
          })
        );
      }
      if (strengthFocus) {
        items.push(
          ...pickExercises(exerciseBank.strengthUpper, Math.round(main * 0.25), intensity, {
            section: "workout",
            kind: "strength-upper",
            imageHint: "upper body",
          })
        );
        items.push(
          ...pickExercises(exerciseBank.strengthLower, Math.round(main * 0.25), intensity, {
            section: "workout",
            kind: "strength-lower",
            imageHint: "legs",
          })
        );
      }
      // Core for general/muscle or higher intensity
      if (goal !== "endurance" || intensity >= 3) {
        items.push(
          ...pickExercises(exerciseBank.core, Math.round(main * 0.2), intensity, {
            section: "workout",
            kind: "core",
            imageHint: "core",
          })
        );
      }
    }

    // Cooldown
    items.push(
      ...pickExercises(exerciseBank.cooldown, cooldown, intensity, {
        section: "stretch",
        kind: "stretch",
        imageHint: "stretching",
      })
    );

    const normalized = normalizeDayItems(items, idx);
    const totalMins = Math.max(
      1,
      Math.round(normalized.reduce((s, it) => s + (it.durationSec || 0), 0) / 60)
    );
    return {
      label,
      type: "workout",
      title: splitTitles[idx % splitTitles.length],
      totalMins,
      items: normalized,
    };
  });

  return {
    id: `plan-${Date.now()}`,
    level,
    goal,
    disabilityText: disabilityText || "",
    daysPerWeek: days,
    minutesPerDay,
    tags: Array.from(tags),
    createdAt: new Date().toISOString(),
    days: planDays,
  };
}

function normalizeDayItems(items, dayIdx) {
  const dayId = `day-${dayIdx}`;
  return items.map((it, n) => ({
    ...it,
    id: `${dayId}-ex-${n}-${slug(it.name)}`,
    checked: false,
  }));
}

function pickExercises(bank, targetMinutes, intensity, meta) {
  const out = [];
  let remaining = Math.max(1, targetMinutes) * 60;
  // simple loop that adds exercises until we fill the time
  let i = 0;
  while (remaining > 0 && i < 40) {
    const ex = bank[i % bank.length];
    const base = ex.durationSec;
    const scaled = Math.round(base * (0.9 + (intensity - 1) * 0.05));
    const durationSec = Math.min(scaled, remaining);
    out.push({
      name: ex.name,
      durationSec: Math.max(30, durationSec),
      section: meta?.section || "workout",
      kind: meta?.kind || "workout",
      imageHint: meta?.imageHint || "fitness",
    });
    remaining -= durationSec;
    i++;
  }
  return out;
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

// Persistent timers + completion state
function loadWorkoutState() {
  return loadJson("workoutStateV1", {
    plan: null,
    perExercise: {}, // id -> { startedAt:number|null, durationSec:number, timerDone:boolean, finished:boolean }
    points: 0,
  });
}

function saveWorkoutState(st) {
  saveJson("workoutStateV1", st);
}

function ensureWorkoutTicking() {
  if (workoutTickInterval) return;
  workoutTickInterval = setInterval(() => {
    // update timers in UI
    if (!currentWorkoutPlan) return;
    const st = loadWorkoutState();
    let changed = false;
    for (const day of currentWorkoutPlan.days) {
      if (!day.items) continue;
      for (const ex of day.items) {
        const exState = st.perExercise[ex.id];
        if (!exState || !exState.startedAt || exState.timerDone) continue;
        const elapsed = Math.floor((Date.now() - exState.startedAt) / 1000);
        if (elapsed >= exState.durationSec) {
          exState.timerDone = true;
          changed = true;
        }
      }
    }
    if (changed) saveWorkoutState(st);
    renderWorkoutPlanUI();
  }, 900);
}

function formatTimer(seconds) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function awardPoints(points) {
  const st = loadWorkoutState();
  st.points = (st.points || 0) + points;
  saveWorkoutState(st);

  // Add points to scoreboard under "You"
  const key = "You";
  const prev = Number(state.racers[key] || 0);
  state.racers[key] = Math.max(0, Math.min(100, prev + points));
  renderRaceTrack();
  if (firebaseEnabled && firestore) {
    firestore
      .collection("public")
      .doc("racers")
      .set({ racers: state.racers, updatedAt: new Date().toISOString() }, { merge: true })
      .catch(() => {});
  }
}

function confettiBurst(anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const container = document.createElement("div");
  container.className = "confetti-layer";
  container.style.left = `${rect.left + rect.width / 2}px`;
  container.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(container);

  const colors = ["#ffb3d9", "#60a5fa", "#fb7185", "#a3e635", "#facc15"];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement("span");
    p.className = "confetti";
    p.style.background = colors[i % colors.length];
    p.style.setProperty("--dx", `${(Math.random() * 2 - 1) * 140}px`);
    p.style.setProperty("--dy", `${-Math.random() * 160 - 40}px`);
    p.style.setProperty("--rot", `${Math.random() * 540}deg`);
    container.appendChild(p);
  }
  setTimeout(() => container.remove(), 1200);
}

function renderWorkoutPlanUI() {
  if (!workoutPlanUI) return;
  const st = loadWorkoutState();
  const plan = currentWorkoutPlan || st.plan;
  if (!plan) {
    workoutPlanUI.innerHTML = "";
    return;
  }
  currentWorkoutPlan = plan;

  // Save plan back if needed
  if (!st.plan || st.plan.id !== plan.id) {
    st.plan = plan;
    saveWorkoutState(st);
  }

  // Build "app-like" UI with date strip + single-day view
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0..Sun=6
  if (workoutSelectedDayIdx == null) {
    workoutSelectedDayIdx = loadJson("workoutSelectedDayIdx", todayIdx);
  }

  const totalExercises = plan.days.reduce((sum, d) => sum + (d.items ? d.items.length : 0), 0);
  const finishedCount = Object.values(st.perExercise).filter((x) => x?.finished)
    .length;

  const selectedDay = plan.days[workoutSelectedDayIdx] || plan.days[todayIdx];
  const selectedItems = selectedDay.items || [];

  const groups = {
    warmup: selectedItems.filter((x) => x.section === "warmup"),
    workout: selectedItems.filter((x) => x.section === "workout"),
    stretch: selectedItems.filter((x) => x.section === "stretch"),
  };
  const mins = (arr) => Math.max(0, Math.round(arr.reduce((s, it) => s + (it.durationSec || 0), 0) / 60));

  workoutPlanUI.innerHTML = `
    <div class="workout-strip">
      ${renderWorkoutDateStrip(plan, workoutSelectedDayIdx, todayIdx)}
    </div>

    <div class="workout-hero">
      <div>
        <div class="workout-hero-title">${escapeHtml(selectedDay.title || selectedDay.label)}</div>
        <div class="workout-hero-sub">${escapeHtml(plan.goal.replace("-", " "))} • ${escapeHtml(plan.level.replace("-", " "))} • ${plan.daysPerWeek} days</div>
      </div>
      <div class="workout-hero-mins">${selectedDay.totalMins || Math.max(1, mins(selectedItems))} mins</div>
    </div>

    <div class="workout-progress compact">
      <div class="workout-progress-top">
        <div class="workout-progress-title">Weekly progress</div>
        <div class="workout-progress-badge">${finishedCount}/${totalExercises}</div>
      </div>
      <div class="workout-progress-bar"><div class="workout-progress-fill" style="width:${totalExercises ? Math.round((finishedCount / totalExercises) * 100) : 0}%"></div></div>
    </div>

    ${renderWorkoutSection("Warm Up", "warmup", mins(groups.warmup), groups.warmup, st, true)}
    ${renderWorkoutSection("Workout", "workout", mins(groups.workout), groups.workout, st, true)}
    ${renderWorkoutSection("Stretch", "stretch", mins(groups.stretch), groups.stretch, st, false)}
  `;

  ensureWorkoutTicking();
}

function renderWorkoutDateStrip(plan, selectedIdx, todayIdx) {
  // show real month days for the current week starting Monday
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Mon=0
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return `
    <div class="date-strip">
      ${labels
        .map((lbl, idx) => {
          const d = new Date(monday);
          d.setDate(monday.getDate() + idx);
          const num = d.getDate();
          const active = idx === selectedIdx ? "active" : "";
          const today = idx === todayIdx ? "today" : "";
          return `<button class="date-pill ${active} ${today}" data-day="${idx}">
            <div class="num">${num}</div>
            <div class="dow">${lbl}</div>
          </button>`;
        })
        .join("")}
    </div>
  `;
}

function renderWorkoutSection(title, sectionKey, minutes, items, st, openByDefault) {
  const open = openByDefault ? "open" : "";
  return `
    <details class="section-card" ${open}>
      <summary>
        <div class="section-left">
          <div class="section-title">${title}</div>
          <div class="section-mins">${minutes} mins</div>
        </div>
        <div class="section-actions">
          <div class="icon-btn">＋</div>
          <div class="icon-btn chev">⌄</div>
        </div>
      </summary>
      <div class="section-body">
        ${items.length ? items.map((ex) => renderWorkoutExerciseRow(ex, st)).join("") : "<div class='hint'>Nothing here today.</div>"}
      </div>
    </details>
  `;
}

function renderWorkoutExerciseRow(ex, st) {
  const exState = st.perExercise[ex.id] || {
    startedAt: null,
    durationSec: ex.durationSec,
    timerDone: false,
    finished: false,
  };
  // persist duration in case plan changes rendering
  exState.durationSec = exState.durationSec || ex.durationSec;
  st.perExercise[ex.id] = exState;
  saveWorkoutState(st);

  const elapsed = exState.startedAt ? Math.floor((Date.now() - exState.startedAt) / 1000) : 0;
  const remaining = exState.timerDone ? 0 : Math.max(0, exState.durationSec - elapsed);

  const startDisabled = exState.finished ? "disabled" : "";
  const finishDisabled = !exState.timerDone || exState.finished ? "disabled" : "";
  const checked = exState.finished ? "checked" : "";
  const status = exState.finished
    ? "Completed"
    : exState.startedAt
    ? exState.timerDone
      ? "Finish"
      : "In progress"
    : "Start";

  const subtitle = buildExerciseSubtitle(ex, currentWorkoutPlan?.level);
  const thumb = getStockThumb(ex.imageHint || ex.kind || "fitness");

  return `
    <div class="exercise-row ${exState.finished ? "done" : ""}" data-ex="${ex.id}">
      <img class="exercise-thumb" src="${thumb}" alt="Exercise thumbnail" loading="lazy" />
      <div class="exercise-main">
        <div class="exercise-top">
          <div class="exercise-name">${escapeHtml(ex.name)}</div>
          <div class="exercise-menu">⋮</div>
        </div>
        <div class="exercise-sub">${escapeHtml(subtitle)}</div>
      </div>
      <div class="exercise-controls">
        <div class="exercise-timer">${exState.startedAt ? formatTimer(remaining) : formatTimer(ex.durationSec)}</div>
        <div class="exercise-buttons">
          <button class="secondary-btn small-btn js-start" ${startDisabled}>Start</button>
          <button class="js-finish" ${finishDisabled}>Finish</button>
        </div>
        <div class="exercise-status">${status}</div>
      </div>
    </div>
  `;
}

function buildExerciseSubtitle(ex, level) {
  // Mimic "10 reps • 10 reps • 10 reps" style for strength-like moves
  const kind = (ex.kind || "").toLowerCase();
  const isStrength = kind.includes("strength") || kind.includes("core") || ex.durationSec <= 120;
  if (isStrength) {
    const reps = level === "very-basic" ? 8 : level === "basic" ? 10 : 10;
    const sets = level === "advanced" || level === "intense" ? 4 : 3;
    const parts = new Array(sets).fill(`${reps} reps`);
    return parts.join(" • ");
  }
  // cardio/stretch: show minutes
  const m = Math.max(1, Math.round(ex.durationSec / 60));
  return `${m} min`;
}

function getStockThumb(hint) {
  const h = String(hint || "fitness").toLowerCase();
  // Stock images (Unsplash "source" endpoint). No user-provided images used.
  // Note: requires internet to load.
  const query =
    h.includes("stretch") ? "stretching,yoga" :
    h.includes("warm") ? "warmup,fitness" :
    h.includes("cardio") ? "cardio,running" :
    h.includes("leg") ? "leg-workout,fitness" :
    h.includes("upper") ? "upper-body,fitness" :
    h.includes("core") ? "abs,core-workout" :
    "gym,workout";
  return `https://source.unsplash.com/128x128/?${encodeURIComponent(query)}`;
}

workoutPlanUI?.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const dayBtn = target.closest(".date-pill");
  if (dayBtn && dayBtn instanceof HTMLElement) {
    const idx = Number(dayBtn.getAttribute("data-day"));
    if (!Number.isNaN(idx)) {
      workoutSelectedDayIdx = idx;
      saveJson("workoutSelectedDayIdx", idx);
      renderWorkoutPlanUI();
      return;
    }
  }
  const row = target.closest(".exercise-row");
  if (!row) return;
  const exId = row.getAttribute("data-ex");
  if (!exId) return;

  const st = loadWorkoutState();
  const exState = st.perExercise[exId];
  if (!exState) return;

  if (target.classList.contains("js-start")) {
    if (exState.finished) return;
    if (!exState.startedAt) {
      exState.startedAt = Date.now();
      exState.timerDone = false;
      saveWorkoutState(st);
      renderWorkoutPlanUI();
    }
  }

  if (target.classList.contains("js-finish")) {
    if (!exState.timerDone || exState.finished) return;
    exState.finished = true;
    saveWorkoutState(st);
    confettiBurst(target);
    awardPoints(2);
    renderWorkoutPlanUI();
  }
});

workoutForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const level = document.getElementById("workoutLevel").value;
  const goal = document.getElementById("workoutGoal").value;
  const hours = Number(document.getElementById("workoutHours").value || 3);
  const disabilityText = workoutDisabilityInput?.value || "";
  const workoutTime = workoutTimeInput?.value || "";

  const plan = buildWorkoutPlanV2({ level, goal, hours, disabilityText });
  currentWorkoutPlan = plan;

  // reset per-exercise state for new plan
  const st = loadWorkoutState();
  st.plan = plan;
  st.perExercise = {};
  saveWorkoutState(st);

  if (workoutTime) saveJson("workoutTimePref", workoutTime);

  workoutPlanSummary.innerHTML = `
    <strong>Your personalized plan is ready.</strong><br/>
    Days/week: ${plan.daysPerWeek} • ~${plan.minutesPerDay} min/day<br/>
    ${plan.disabilityText ? `Disability support: <strong>${escapeHtml(plan.disabilityText)}</strong><br/>` : ""}
    <span style="color:var(--muted); font-size:0.78rem;">
      Timers persist by saving the start time, so they continue correctly after you reopen the app.
    </span>
  `;

  renderWorkoutPlanUI();
  showPopup(
    "Workout Plan Ready",
    "Your weekly plan is generated. Consistency beats intensity – follow this for 4 weeks and then level up."
  );
});

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildWorkoutPlan(level, goal, days) {
  const intensityMap = {
    "very-basic": "Ultra gentle – mostly walking and mobility.",
    basic: "Gentle – walking, light strength, stretching.",
    intermediate: "Moderate – mix of strength and cardio.",
    "inter-advanced": "Challenging – progressive overload and intervals.",
    advanced: "High – structured strength split and conditioning.",
    intense: "Very high – athlete‑style training. Only if recovery is on point.",
  };

  const focus =
    goal === "fat-loss"
      ? "emphasis on steady‑state walking plus basic strength to keep muscle."
      : goal === "muscle"
      ? "focus on progressive strength training with enough rest."
      : goal === "endurance"
      ? "focus on cardio and intervals with 1–2 strength sessions."
      : "balanced mix of strength, mobility, and walking.";

  let sampleDay =
    level === "very-basic"
      ? "10–20 min easy walk + 5 min gentle stretching."
      : level === "basic"
      ? "20–30 min brisk walk + 10 min full‑body mobility."
      : level === "intermediate"
      ? "35–45 min alternating days of full‑body strength and brisk walking."
      : level === "inter-advanced"
      ? "45–60 min: upper/lower strength split + 1–2 interval sessions."
      : level === "advanced"
      ? "60–75 min: structured strength (push/pull/legs) + conditioning."
      : "75–90 min: advanced split + sprints or sport sessions, with strict recovery.";

  return `
    <strong>${days}-day plan (${level.replace("-", " ")}):</strong><br/>
    Goal: ${focus}<br/><br/>
    What this week looks like:<br/>
    • Training days: ${days} days / week<br/>
    • Rest / light days: ${7 - days} days / week<br/><br/>
    Typical training day:<br/>
    ${sampleDay}
  `;
}

// SLEEP
const sleepForm = document.getElementById("sleepForm");
const sleepPlan = document.getElementById("sleepPlan");
const sleepTouchLog = document.getElementById("sleepTouchLog");

sleepForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const currentBed = document.getElementById("currentBed").value;
  const currentWake = document.getElementById("currentWake").value;
  const targetSleepHours = Number(
    document.getElementById("targetSleepHours").value || 8
  );
  const plan = designSleepPlan(currentBed, currentWake, targetSleepHours);
  state.sleepPlan = plan;
  state.sleepTouches = [];
  renderSleepPlan();
});

function parseTimeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min) {
  const h = ((Math.floor(min / 60) % 24) + 24) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function designSleepPlan(currentBed, currentWake, targetHours) {
  const bedMin = parseTimeToMinutes(currentBed);
  const wakeMin = parseTimeToMinutes(currentWake);
  let currentDur = wakeMin - bedMin;
  if (currentDur <= 0) currentDur += 24 * 60;

  const targetDur = targetHours * 60;
  const shift = (targetDur - currentDur) / 2;
  const newBed = bedMin - shift;
  const newWake = wakeMin + shift;

  return {
    currentDuration: (currentDur / 60).toFixed(1),
    targetHours,
    newBed: minutesToTime(Math.round(newBed)),
    newWake: minutesToTime(Math.round(newWake)),
  };
}

function renderSleepPlan() {
  if (!state.sleepPlan) {
    sleepPlan.textContent = "";
    return;
  }
  const p = state.sleepPlan;
  sleepPlan.innerHTML = `
    You currently sleep about <strong>${p.currentDuration} hours</strong>.<br/>
    To reach <strong>${p.targetHours} hours</strong>, aim for:<br/>
    • Bedtime around <strong>${p.newBed}</strong><br/>
    • Wake time around <strong>${p.newWake}</strong><br/><br/>
    Try to protect a 60–90 min “wind‑down” with no intense screens or heavy food before bed.
  `;
}

// Track "phone touches" as any interaction during sleep window
document.addEventListener(
  "click",
  () => {
    if (!state.sleepPlan) return;
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const bed = parseTimeToMinutes(state.sleepPlan.newBed);
    const wake = parseTimeToMinutes(state.sleepPlan.newWake);
    let inWindow = false;
    if (bed < wake) {
      inWindow = minutes >= bed && minutes <= wake;
    } else {
      inWindow = minutes >= bed || minutes <= wake;
    }
    if (inWindow) {
      state.sleepTouches.push(now);
      sleepTouchLog.textContent = `Detected ${
        state.sleepTouches.length
      } interaction(s) during your sleep window. Treat this as “phone unlocks during sleep”.`;
    }
  },
  true
);

// GEO RISK
const geoForm = document.getElementById("geoForm");
const geoResult = document.getElementById("geoResult");

const GEO_DATA = {
  delhi: {
    pollution: "Very high PM2.5 and PM10 most of the year.",
    issues: [
      "Asthma and breathing issues",
      "Increased heart and blood‑pressure risk",
      "Eye irritation and headaches",
    ],
    tips: [
      "Use N95 mask on high‑pollution days.",
      "Keep windows closed during peak traffic hours.",
      "Add indoor plants and air purifier for bedroom if possible.",
      "Shift intense outdoor workouts to lower‑pollution times or indoors.",
    ],
  },
  mumbai: {
    pollution: "High but often lower than inland industrial cities.",
    issues: [
      "Humidity‑related skin and hair issues",
      "Occasional poor air quality near traffic/industrial zones",
    ],
    tips: [
      "Prefer sea‑facing or green routes for walks.",
      "Rinse skin and hair after exposure to heavy rain or polluted water.",
      "Stay updated with local AQI apps for bad‑air days.",
    ],
  },
  london: {
    pollution: "Moderate pollution, traffic‑based peaks.",
    issues: [
      "Respiratory irritation on busy roads",
      "Seasonal affective symptoms in winter (low daylight)",
    ],
    tips: [
      "Walk on back streets and parks instead of main roads.",
      "Maximise daylight exposure around midday, especially in winter.",
      "Consider vitamin D check if energy stays low.",
    ],
  },
  dubai: {
    pollution: "Dust and sand plus traffic pollution.",
    issues: [
      "Dry eyes, skin, and airways",
      "Heat stress risk in summer",
    ],
    tips: [
      "Use sunglasses and hydration breaks for any outdoor time.",
      "Train indoors during peak heat months.",
      "Moisturise skin and consider saline nasal rinses after dusty days.",
    ],
  },
};

geoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = document.getElementById("cityName").value.trim().toLowerCase();
  if (!city) return;
  const data = GEO_DATA[city];
  if (!data) {
    geoResult.innerHTML =
      "No preset data for this city yet. In the full version this would connect to live air‑quality and disease‑risk APIs.";
    return;
  }
  geoResult.innerHTML = `
    <strong>Pollution & risk snapshot:</strong><br/>
    ${data.pollution}<br/><br/>
    <strong>Common health issues:</strong>
    <ul>${data.issues.map((i) => `<li>${i}</li>`).join("")}</ul>
    <strong>Preventive moves:</strong>
    <ul>${data.tips.map((t) => `<li>${t}</li>`).join("")}</ul>
  `;
});

// SCOREBOARD
const scoreForm = document.getElementById("scoreForm");
const raceTrack = document.getElementById("raceTrack");

scoreForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("runnerName").value.trim();
  const score = Number(document.getElementById("runnerScore").value);
  if (!name || isNaN(score)) return;
  state.racers[name] = Math.max(0, Math.min(100, score));
  renderRaceTrack();
  if (firebaseEnabled && firestore) {
    firestore
      .collection("public")
      .doc("racers")
      .set({ racers: state.racers, updatedAt: new Date().toISOString() }, { merge: true })
      .catch(() => {});
  }
  scoreForm.reset();
});

function renderRaceTrack() {
  raceTrack.innerHTML = "";
  const entries = Object.entries(state.racers);
  if (entries.length === 0) return;
  entries.sort((a, b) => b[1] - a[1]);
  const topScore = entries[0][1] || 1;

  entries.forEach(([name, score], idx) => {
    const row = document.createElement("div");
    row.className = "race-row";
    const crown = idx === 0 ? '<span class="crown">👑</span>' : "";
    const width = (score / topScore) * 100;
    row.innerHTML = `
      <div class="race-label">
        <span class="name">${name} ${crown}</span>
        <span>${score} pts</span>
      </div>
      <div class="race-track-bar">
        <div class="race-car" style="width:${Math.max(
          10,
          Math.min(100, width)
        )}%;">🏎️</div>
      </div>
    `;
    raceTrack.appendChild(row);
  });
}

// THERAPIST CHATBOT (rule‑based demo)
const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

function addChatMessage(role, text) {
  const msg = document.createElement("div");
  msg.className = `chat-message ${role}`;
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  msg.appendChild(bubble);
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function analyseStressMessage(text) {
  const t = text.toLowerCase();
  const themes = [];
  if (t.includes("work") || t.includes("job") || t.includes("study")) {
    themes.push("pressure/expectations around work or studies");
  }
  if (t.includes("family") || t.includes("parents") || t.includes("relationship")) {
    themes.push("relationship or family tension");
  }
  if (t.includes("money") || t.includes("bills") || t.includes("finance")) {
    themes.push("financial safety and uncertainty");
  }
  if (t.includes("alone") || t.includes("lonely")) {
    themes.push("social support and feeling understood");
  }
  if (t.includes("health") || t.includes("body") || t.includes("weight")) {
    themes.push("health and body image worries");
  }

  let result =
    "Thank you for being honest about this. From what you wrote, it sounds like your stress might be connected to ";
  if (themes.length === 0) {
    result +=
      "a mix of responsibilities, thoughts, and feelings that have been building up over time.";
  } else if (themes.length === 1) {
    result += themes[0] + ".";
  } else {
    const last = themes.pop();
    result += themes.join(", ") + " and " + last + ".";
  }
  result +=
    " The main move I’d suggest is to pick just one tiny area you can influence this week, instead of trying to fix everything at once. Also, this app is not a replacement for a real therapist – if this feels heavy, talking to a professional is a strong, brave move.";
  return result;
}

async function callClaudeTherapistProxy(userText) {
  const url = window.__CLAUDE_PROXY_URL__;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        // Minimal context for the server; you can expand this later
        uid: currentUid,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data.reply !== "string") return null;
    return data.reply;
  } catch {
    return null;
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  addChatMessage("user", text);
  chatInput.value = "";
  setTimeout(async () => {
    const claudeReply = await callClaudeTherapistProxy(text);
    const reply = claudeReply ?? analyseStressMessage(text);
    addChatMessage("bot", reply);
  }, 150);
});

// POROSITY
const porosityForm = document.getElementById("porosityForm");
const porosityAdvice = document.getElementById("porosityAdvice");

porosityForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = document.getElementById("porosityResult").value;
  let title;
  let body;
  if (val === "floats") {
    title = "Low porosity hair";
    body =
      "Cuticles are tight and resist water. Products can sit on top and cause build‑up.\n\nTips:\n• Use lighter products and avoid heavy oils.\n• Warm water and occasional gentle clarifying can help products enter the strand.\n• Be patient – low porosity hair takes longer to get fully wet.";
  } else if (val === "middle") {
    title = "Medium / normal porosity";
    body =
      "Balance between moisture in and out. This type usually responds well to most routines.\n\nTips:\n• Mix of moisture and light protein masks.\n• Protect from heat and sun so it doesn’t become high‑porosity.\n• Keep a simple, consistent routine instead of chasing constant product changes.";
  } else {
    title = "High porosity hair";
    body =
      "Cuticles are more open. Hair drinks up moisture fast but also loses it quickly.\n\nTips:\n• Seal with oils or creams after hydrating.\n• Focus on gentle handling, less heat, and protective styles.\n• Occasional protein treatments can help strengthen the strand.";
  }
  porosityAdvice.innerHTML = `<strong>${title}</strong><br/>${body.replace(
    /\n/g,
    "<br/>"
  )}`;
  showPopup(
    "Hair Porosity Analysed",
    "You just unlocked your hair’s behaviour profile. Use this to match products and routines to what your strands actually need."
  );
});

// Start optional services
initFirebaseIfConfigured();

