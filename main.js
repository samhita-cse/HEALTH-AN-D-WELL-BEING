// Simple state
const state = {
  bodyQuestsCompleted: 0,
  totalBodyQuests: 6,
  calorieTarget: null,
  todayCalories: 0,
  foods: [],
  moodEntries: [],
  sleepPlan: null,
  sleepTouches: [],
  racers: {},
};

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
        await firebaseAuth.signOut();
        return;
      }
      const provider = new firebase.auth.GoogleAuthProvider();
      await firebaseAuth.signInWithPopup(provider);
    } catch (e) {
      console.error("Google sign-in failed", e);
      showPopup("Google sign-in", "Could not sign in with Google. You can still use the app in guest mode.");
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
    label.textContent = user.email || "Google account connected";
  }
}

document.querySelectorAll(".mood-emoji-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mood-emoji-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedMoodEmoji = btn.getAttribute("data-emoji");
    document.getElementById("moodEmojiSelected").textContent = `Selected: ${btn.getAttribute("title")}`;
  });
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.getAttribute("data-tab");
    const panel = document.getElementById(target);
    if (panel) panel.classList.add("active");
    if (target === "riskRadar") initRiskRadar();
  });
});

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

const bodyRegionsHit = {
  face: false,
  heart: false,
  kidneys: false,
  hands: false,
  legs: false,
  abs: false,
};

let selectedMoodEmoji = null;

const bodyActivities = [];

function repaintBodyFromRegions() {
  const idsToReset = ["face", "eyeLeft", "eyeRight", "mouth", "heart", "kidneyLeft", "kidneyRight", "armLeft", "armRight", "palmLeft", "palmRight", "legLeft", "legRight", "torso", "neck"];
  idsToReset.forEach((id) => {
    document.getElementById(id)?.classList.remove("active-face", "active-eye", "active-mouth", "active-heart", "active-kidney", "active-limb", "active-abs", "completed");
  });

  if (bodyRegionsHit.face) {
    document.getElementById("face")?.classList.add("active-face");
    document.getElementById("eyeLeft")?.classList.add("active-eye");
    document.getElementById("eyeRight")?.classList.add("active-eye");
    document.getElementById("mouth")?.classList.add("active-mouth");
  }
  if (bodyRegionsHit.heart) document.getElementById("heart")?.classList.add("active-heart");
  if (bodyRegionsHit.kidneys) {
    document.getElementById("kidneyLeft")?.classList.add("active-kidney");
    document.getElementById("kidneyRight")?.classList.add("active-kidney");
  }
  if (bodyRegionsHit.hands) {
    document.getElementById("armLeft")?.classList.add("active-limb");
    document.getElementById("armRight")?.classList.add("active-limb");
    document.getElementById("palmLeft")?.classList.add("active-limb");
    document.getElementById("palmRight")?.classList.add("active-limb");
  }
  if (bodyRegionsHit.legs) {
    document.getElementById("legLeft")?.classList.add("active-limb");
    document.getElementById("legRight")?.classList.add("active-limb");
  }
  if (bodyRegionsHit.abs) document.getElementById("torso")?.classList.add("active-abs");

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
    ["face", "eyeLeft", "eyeRight", "mouth", "heart", "kidneyLeft", "kidneyRight", "armLeft", "armRight", "palmLeft", "palmRight", "legLeft", "legRight", "torso", "neck"].forEach((id) =>
      document.getElementById(id)?.classList.add("completed")
    );
    bodyQuestMessage.textContent = "Full body quest complete. You just lived the lifestyle most people only talk about.";
    showPopup("Full Body Lit Up", "Congratulations – you hit every body quest today. This is the lifestyle most people dream about but never execute.");
  } else {
    bodyQuestMessage.textContent = `Progress: ${completedCount}/${total} done today.`;
  }
}

bodyActivityForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("activityName").value.trim();
  const focus = document.getElementById("activityFocus").value;
  if (!focus) return;

  if (focus === "face") bodyRegionsHit.face = true;
  else if (focus === "heart") bodyRegionsHit.heart = true;
  else if (focus === "kidneys") bodyRegionsHit.kidneys = true;
  else if (focus === "hands") bodyRegionsHit.hands = true;
  else if (focus === "legs") bodyRegionsHit.legs = true;
  else if (focus === "abs") bodyRegionsHit.abs = true;

  bodyActivities.unshift({ name: name || "(no name)", focus, at: new Date() });
  repaintBodyFromRegions();
  bodyActivityForm.reset();
});

resetBodyBtn.addEventListener("click", () => {
  Object.keys(bodyRegionsHit).forEach((k) => { bodyRegionsHit[k] = false; });
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
    const m = { face: "Face", heart: "Heart", kidneys: "Kidneys", hands: "Hands / Arms", legs: "Legs", abs: "Abs" };
    return m[f] || f;
  };
  const items = bodyActivities.slice(0, 6).map((a) => `<div class="food-entry"><span>${a.name}</span><span>${prettyFocus(a.focus)}</span></div>`).join("");
  bodyActivityLog.innerHTML = `<div style="margin-top:10px;"><strong>Recent:</strong></div>${items}`;
}

function renderBodyDailyReport() {
  if (!bodyDailyReport) return;
  const done = Object.entries(bodyRegionsHit).filter(([, v]) => v).map(([k]) => k);
  const missing = Object.entries(bodyRegionsHit).filter(([, v]) => !v).map(([k]) => k);

  const benefits = {
    face: "Face care supports skin barrier and confidence.",
    heart: "Breathing work supports calm focus and cardio endurance.",
    kidneys: "Hydration supports energy, digestion, and skin.",
    hands: "Arm/hand training supports upper-body strength and posture.",
    legs: "Leg training supports stamina and mobility.",
    abs: "Core work supports posture and lower-back comfort.",
  };
  const risks = {
    face: "Ignoring face care can increase dryness and irritation.",
    heart: "Skipping breathing can make stress feel louder.",
    kidneys: "Low water can cause fatigue and headaches.",
    hands: "Weak arms can lead to poor posture.",
    legs: "Skipping legs can increase stiffness.",
    abs: "Weak core can cause lower-back discomfort.",
  };

  const benefitList = done.length ? `<ul>${done.map((k) => `<li><strong>${k}</strong>: ${benefits[k]}</li>`).join("")}</ul>` : "<div style='color:var(--muted)'>No tracked benefits yet.</div>";
  const riskList = missing.length ? `<ul>${missing.map((k) => `<li><strong>${k}</strong>: ${risks[k]}</li>`).join("")}</ul>` : "<div style='color:var(--success)'><strong>Perfect day!</strong></div>";

  bodyDailyReport.innerHTML = `<strong>Daily report</strong><br/><div style="margin-top:8px;"><strong>Benefits:</strong>${benefitList}</div><div style="margin-top:8px;"><strong>Watch if ignored:</strong>${riskList}</div>`;
}

// RISK RADAR
function initRiskRadar() {
  const container = document.getElementById("riskRadarContent");
  const tabs = document.querySelectorAll(".risk-tab");
  if (!container) return;
  const profile = loadJson("riskRadarProfile", { age: 30, sex: "male", height: 170, weight: 70, activity: 1.55 });
  const render = (id) => {
    if (id === "profile") {
      container.innerHTML = `<div class="stack-form"><h3>Your health profile</h3>
        <div class="field-row"><label>Age</label><input type="number" id="rrAge" value="${profile.age}" min="10" max="100" /></div>
        <div class="field-row"><label>Sex</label><select id="rrSex"><option value="male" ${profile.sex==="male"?"selected":""}>Male</option><option value="female" ${profile.sex==="female"?"selected":""}>Female</option></select></div>
        <div class="field-row"><label>Height (cm)</label><input type="number" id="rrHeight" value="${profile.height}" /></div>
        <div class="field-row"><label>Weight (kg)</label><input type="number" id="rrWeight" value="${profile.weight}" /></div>
        <div class="field-row"><label>Activity</label><select id="rrActivity"><option value="1.2" ${profile.activity==1.2?"selected":""}>Sedentary</option><option value="1.55" ${profile.activity==1.55?"selected":""}>Moderate</option><option value="1.9" ${profile.activity==1.9?"selected":""}>Athlete</option></select></div>
        <button type="button" id="rrSaveProfile">Save profile</button>
        <div class="highlight-card" id="rrProfileResult"></div></div>`;
      document.getElementById("rrSaveProfile")?.addEventListener("click", () => {
        const p = { age: Number(document.getElementById("rrAge")?.value)||30, sex: document.getElementById("rrSex")?.value||"male", height: Number(document.getElementById("rrHeight")?.value)||170, weight: Number(document.getElementById("rrWeight")?.value)||70, activity: Number(document.getElementById("rrActivity")?.value)||1.55 };
        saveJson("riskRadarProfile", p); state.calorieTarget = calculateDailyCalories(p);
        document.getElementById("rrProfileResult").innerHTML = `Target: <strong>${state.calorieTarget} kcal/day</strong> 🎯`;
      });
    } else if (id === "search") {
      container.innerHTML = `<div class="stack-form"><h3>Food search</h3>
        <input type="text" id="rrFoodName" placeholder="e.g. rice, apple" />
        <input type="number" id="rrFoodQty" value="100" placeholder="g" />
        <button type="button" id="rrAddFood">Add</button>
        <div id="rrSearchResult" class="highlight-card"></div></div>`;
      document.getElementById("rrAddFood")?.addEventListener("click", () => {
        const name = document.getElementById("rrFoodName")?.value?.trim()?.toLowerCase()||"";
        const qty = Number(document.getElementById("rrFoodQty")?.value)||100;
        const kcal = (FOOD_TABLE[name]||100)*qty/100;
        state.foods.push({name,kcal}); state.todayCalories+=kcal;
        document.getElementById("rrSearchResult").innerHTML = `Added ${name}: ${Math.round(kcal)} kcal 🍎`;
      });
    } else if (id === "triangle") { container.innerHTML = `<div class="highlight-card"><h3>🔄 Triangle Engine</h3><p>Sleep ↔ Stress ↔ Food. Poor sleep raises stress; stress affects food choices; food affects sleep.</p></div>`; }
    else if (id === "debt") { container.innerHTML = `<div class="highlight-card"><h3>💰 Health Debt</h3><p>Junk +debt, workouts/good food -debt. Resets daily.</p></div>`; }
    else if (id === "recipes") { container.innerHTML = `<div class="highlight-card"><h3>🍽️ Seasonal recipes</h3><p>Summer: salads. Winter: soups. Rainy: warm dal.</p></div>`; }
    else if (id === "risks") { container.innerHTML = `<div class="highlight-card"><h3>⚠️ Risk (estimate only)</h3><p>Maintain healthy weight & activity to reduce heart/diabetes/obesity risk.</p></div>`; }
    else if (id === "weekly") { container.innerHTML = `<div class="highlight-card"><h3>📊 Weekly</h3><p>Today: ${Math.round(state.todayCalories)} kcal</p></div>`; }
    tabs.forEach(t => t.classList.toggle("active", t.getAttribute("data-risk")===id));
  };
  if (!initRiskRadar._ready) {
    tabs.forEach(t => { t.addEventListener("click", () => render(t.getAttribute("data-risk"))); });
    initRiskRadar._ready = true;
  }
  const active = document.querySelector(".risk-tab.active");
  render(active ? active.getAttribute("data-risk") : "profile");
}

// FOOD (used by Risk Radar)
const calorieTargetForm = document.getElementById("calorieTargetForm");
const calorieTargetResult = document.getElementById("calorieTargetResult");
const foodForm = document.getElementById("foodForm");
const foodLog = document.getElementById("foodLog");
const foodSummary = document.getElementById("foodSummary");
const addCustomFoodBtn = document.getElementById("addCustomFoodBtn");

const FOOD_TABLE = {
  rice: 130, roti: 110, chapati: 120, apple: 52, banana: 89, egg: 155,
  chicken: 165, paneer: 265, milk: 60, dal: 116, bread: 265, oatmeal: 68,
  pasta: 131, potato: 77, broccoli: 34, spinach: 23, yogurt: 59,
};

function calculateDailyCalories({ age, sex, height, weight, activity }) {
  const s = sex === "male" ? 5 : -161;
  const bmr = 10 * weight + 6.25 * height - 5 * age + s;
  return Math.round(bmr * activity);
}

calorieTargetForm?.addEventListener("submit", (e) => {
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
  if (calorieTargetResult) calorieTargetResult.innerHTML = `<strong>Daily target:</strong><br/><span style="font-size:1.1rem;">${target.toLocaleString()} kcal</span><br/><span style="color:var(--muted);font-size:0.78rem;">Mifflin-St Jeor equation.</span>`;
});

function addFoodEntry(name, kcal) {
  state.foods.push({ name, kcal });
  state.todayCalories += kcal;
  if (foodLog) { const row = document.createElement("div"); row.className = "food-entry"; row.innerHTML = `<span>${name}</span><span>${Math.round(kcal)} kcal</span>`; foodLog.appendChild(row); }
  updateFoodSummary();
}

foodForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("foodName");
  const qtyInput = document.getElementById("foodQty");
  const name = nameInput.value.trim().toLowerCase();
  const qty = Number(qtyInput.value);
  if (!name || !qty) return;

  const per100 = FOOD_TABLE[name];
  const kcal = per100 ? (per100 * qty) / 100 : 0;
  addFoodEntry(nameInput.value.trim(), kcal);
  nameInput.value = "";
  qtyInput.value = "";
});

addCustomFoodBtn?.addEventListener("click", () => {
  const name = document.getElementById("customFoodName").value.trim();
  const kcal = Number(document.getElementById("customFoodKcal").value);
  if (!name || !kcal) return;
  addFoodEntry(name, kcal);
  document.getElementById("customFoodName").value = "";
  document.getElementById("customFoodKcal").value = "";
});

function updateFoodSummary() {
  if (!foodSummary) return;
  if (state.calorieTarget == null && state.todayCalories === 0) {
    foodSummary.textContent = "";
    return;
  }
  const target = state.calorieTarget || 0;
  const remaining = target ? target - state.todayCalories : null;
  let text = `<strong>Today:</strong> ${Math.round(state.todayCalories)} kcal`;
  if (target) {
    text += `<br/>Target: ${target.toLocaleString()} kcal`;
    text += `<br/>Remaining: ${remaining >= 0 ? remaining.toLocaleString() : "0"} kcal`;
  }
  if (target && state.todayCalories >= target) {
    text += "<br/><span style='color:var(--success);'>Calorie quest complete.</span>";
    showPopup("Calorie Quest Complete", "You hit your daily calorie goal. Most people never track this consistently – you're already ahead.");
  }
  foodSummary.innerHTML = text;
}

// MOOD / STRESS
const moodForm = document.getElementById("moodForm");
const moodScoreInput = document.getElementById("moodScore");
const moodScoreLabel = document.getElementById("moodScoreLabel");
const moodLog = document.getElementById("moodLog");
const moodSummary = document.getElementById("moodSummary");

moodScoreInput?.addEventListener("input", () => {
  moodScoreLabel.textContent = moodScoreInput.value;
});

const MOOD_QUOTES = {
  sad: "It's okay to not be okay sometimes. Every storm runs out of rain. 🌧️",
  happy: "Joy is the simplest form of gratitude. Keep shining! ✨",
  angry: "Take a breath. You're stronger than whatever is bothering you. 💪",
  crying: "Tears are the safety valve of the heart. Let it out, then rise. 💙",
  scared: "Courage isn't the absence of fear—it's moving forward despite it. 🦋",
  laughing: "Laughter is the best medicine. You're doing great! 😄",
};

moodForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const time = document.getElementById("moodTime").value;
  const score = Number(moodScoreInput.value);
  const note = document.getElementById("moodNote").value.trim();
  const emoji = selectedMoodEmoji || "happy";
  state.moodEntries.push({ time, score, note, emoji, ts: new Date() });
  renderMoodLog();
  renderMoodSummary();
  const quote = MOOD_QUOTES[emoji] || MOOD_QUOTES.happy;
  showPopup("Mood saved 💚", quote);
  moodForm.reset();
  moodScoreInput.value = 3;
  moodScoreLabel.textContent = "3";
  selectedMoodEmoji = null;
  document.querySelectorAll(".mood-emoji-btn").forEach((b) => b.classList.remove("selected"));
  document.getElementById("moodEmojiSelected").textContent = "";
});

const EMOJI_MAP = { sad: "😢", happy: "😊", angry: "😠", crying: "😭", scared: "😨", laughing: "😂" };

function renderMoodLog() {
  moodLog.innerHTML = "";
  state.moodEntries.forEach((m) => {
    const row = document.createElement("div");
    row.className = "mood-row";
    const tagClass = m.score <= 2 ? "low" : m.score === 3 ? "medium" : "high";
    const em = EMOJI_MAP[m.emoji] || "😊";
    row.innerHTML = `<span>${em} ${m.time}</span><span class="mood-tag ${tagClass}">score ${m.score}</span>`;
    moodLog.appendChild(row);
  });
}

function renderMoodSummary() {
  if (state.moodEntries.length === 0) {
    moodSummary.textContent = "No mood logs yet for today.";
    return;
  }
  const avg = state.moodEntries.reduce((sum, m) => sum + m.score, 0) / state.moodEntries.length;
  let level, advice;
  if (avg <= 2) {
    level = "High stress zone";
    advice = "Your average mood is low. Consider rest, boundaries, and support.";
  } else if (avg < 4) {
    level = "Mixed / manageable stress";
    advice = "Protect habits that help and reduce one unnecessary stressor this week.";
  } else {
    level = "Thriving zone";
    advice = "Double down on what's working.";
  }
  moodSummary.innerHTML = `<strong>${level}</strong><br/>Avg: ${avg.toFixed(1)}/5<br/><br/>${advice}`;
}

// WORKOUT PLAN
const workoutForm = document.getElementById("workoutForm");
const workoutPlanSummary = document.getElementById("workoutPlanSummary");
const workoutPlanUI = document.getElementById("workoutPlanUI");
const workoutDisabilityInput = document.getElementById("workoutDisability");
const workoutDisabilityYesNo = document.getElementById("workoutDisabilityYesNo");
const workoutDisabilityOptions = document.getElementById("workoutDisabilityOptions");
const workoutDisabilityOther = document.getElementById("workoutDisabilityOther");

workoutDisabilityYesNo?.addEventListener("change", () => {
  const show = workoutDisabilityYesNo?.value === "yes";
  workoutDisabilityOptions.style.display = show ? "block" : "none";
});
document.getElementById("workoutDisability")?.addEventListener("change", (e) => {
  workoutDisabilityOther.style.display = e.target.value === "other" ? "block" : "none";
});
const workoutTimeInput = document.getElementById("workoutTime");
const enableWorkoutRemindersBtn = document.getElementById("enableWorkoutRemindersBtn");
const workoutReminderHint = document.getElementById("workoutReminderHint");

let currentWorkoutPlan = null;
let workoutTickInterval = null;
let workoutSelectedDayIdx = null;

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function timeStrToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesSinceMidnight(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
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
  setTimeout(() => {
    const msg = "Almost time for your workout. Are you ready?";
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Workout reminder", { body: msg });
    } else {
      showPopup("Workout reminder", msg);
    }
    scheduleWorkoutReminder();
  }, ms);
}

async function enableWorkoutReminders() {
  if (!("Notification" in window)) {
    workoutReminderHint.textContent = "Notifications not supported. In-app popup when open.";
    scheduleWorkoutReminder();
    return;
  }
  const perm = await Notification.requestPermission();
  workoutReminderHint.textContent = perm === "granted" ? "Reminders enabled. 15 min before workout time." : "Notifications blocked. In-app popup when open.";
  scheduleWorkoutReminder();
}

enableWorkoutRemindersBtn?.addEventListener("click", enableWorkoutReminders);

const savedTime = loadJson("workoutTimePref", null);
if (savedTime && workoutTimeInput) workoutTimeInput.value = savedTime;

const DISABILITY_TAGS = [
  { key: "knee", match: ["knee", "knees", "acl", "meniscus"] },
  { key: "back", match: ["back", "spine", "sciatica", "slip disc", "disc"] },
  { key: "asthma", match: ["asthma", "breathing"] },
  { key: "wheelchair", match: ["wheelchair", "paralysis"] },
];

function parseDisability(text) {
  const t = (text || "").toLowerCase();
  const tags = new Set();
  DISABILITY_TAGS.forEach((d) => {
    if (d.match.some((m) => t.includes(m))) tags.add(d.key);
  });
  return tags;
}

function buildWorkoutPlanV2({ level, goal, hours, disabilityText }) {
  const tags = parseDisability(disabilityText);
  const days = Math.min(6, Math.max(2, Math.round(hours)));
  const minutesPerDay = Math.round((hours * 60) / days);
  const warmup = Math.max(5, Math.min(12, Math.round(minutesPerDay * 0.15)));
  const cooldown = Math.max(4, Math.min(10, Math.round(minutesPerDay * 0.1)));
  const main = Math.max(10, minutesPerDay - warmup - cooldown);

  const intensity = level === "very-basic" ? 1 : level === "basic" ? 2 : level === "intermediate" ? 3 : level === "inter-advanced" ? 4 : level === "advanced" ? 5 : 6;
  const cardioFocus = goal === "endurance" || goal === "fat-loss";
  const strengthFocus = goal === "muscle" || goal === "general";

  const exerciseBank = {
    warmup: [
      { name: "Neck + shoulder rolls", durationSec: 60 },
      { name: "March in place", durationSec: 90 },
      { name: "Arm circles", durationSec: 60 },
    ],
    cardioLow: [
      { name: "Brisk walk", durationSec: 6 * 60 },
      { name: "Step-touch", durationSec: 4 * 60 },
    ],
    cardioSeated: [
      { name: "Seated marching", durationSec: 4 * 60 },
      { name: "Seated punches", durationSec: 3 * 60 },
    ],
    strengthUpper: [
      { name: "Wall push-ups", durationSec: 90 },
      { name: "Bicep curls (water bottles)", durationSec: 75 },
    ],
    strengthLower: [
      { name: "Chair sit-to-stand", durationSec: 90 },
      { name: "Glute bridges", durationSec: 90 },
    ],
    core: [
      { name: "Dead bug", durationSec: 90 },
      { name: "Plank (knees if needed)", durationSec: 60 },
    ],
    cooldown: [
      { name: "Box breathing (4-4-4-4)", durationSec: 120 },
      { name: "Hamstring stretch", durationSec: 60 },
    ],
  };

  if (tags.has("knee")) {
    exerciseBank.cardioLow = [{ name: "Gentle walk (flat)", durationSec: 5 * 60 }];
  }
  if (tags.has("wheelchair")) {
    exerciseBank.cardioLow = exerciseBank.cardioSeated;
  }

  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const splitTitles = ["Legs", "Chest & Back", "Shoulders & Arms", "Legs + Core", "Full Body", "Core + Mobility", "Active Recovery"];
  const activeDays = new Set();
  for (let i = 0; i < days; i++) activeDays.add(i);

  function pickExercises(bank, targetMin, meta) {
    const out = [];
    let remaining = targetMin * 60;
    let i = 0;
    while (remaining > 0 && i < 20) {
      const ex = bank[i % bank.length];
      const dur = Math.min(ex.durationSec, Math.max(30, remaining));
      out.push({ ...ex, durationSec: dur, ...meta });
      remaining -= dur;
      i++;
    }
    return out;
  }

  const planDays = weekdayNames.map((label, idx) => {
    const isWorkout = activeDays.has(idx);
    if (!isWorkout) {
      return { label, type: "rest", title: "Rest day", items: [{ name: "Rest / light walk", durationSec: 600, section: "stretch", id: `day-${idx}-rest` }] };
    }

    const items = [];
    items.push(...pickExercises(exerciseBank.warmup, warmup, { section: "warmup", kind: "warmup", imageHint: "warmup" }));
    if (tags.has("wheelchair")) {
      items.push(...pickExercises(exerciseBank.cardioSeated, main * 0.35, { section: "workout", kind: "cardio", imageHint: "cardio" }));
      items.push(...pickExercises(exerciseBank.strengthUpper, main * 0.45, { section: "workout", kind: "strength", imageHint: "upper" }));
    } else {
      if (cardioFocus) items.push(...pickExercises(exerciseBank.cardioLow, main * 0.5, { section: "workout", kind: "cardio", imageHint: "cardio" }));
      if (strengthFocus) {
        items.push(...pickExercises(exerciseBank.strengthUpper, main * 0.25, { section: "workout", kind: "strength", imageHint: "upper" }));
        items.push(...pickExercises(exerciseBank.strengthLower, main * 0.25, { section: "workout", kind: "strength", imageHint: "legs" }));
      }
      items.push(...pickExercises(exerciseBank.core, main * 0.2, { section: "workout", kind: "core", imageHint: "core" }));
    }
    items.push(...pickExercises(exerciseBank.cooldown, cooldown, { section: "stretch", kind: "stretch", imageHint: "stretch" }));

    items.forEach((it, n) => { it.id = `day-${idx}-ex-${n}-${String(it.name).toLowerCase().replace(/\s+/g, "-").slice(0, 20)}`; it.checked = false; });
    const totalMins = Math.round(items.reduce((s, it) => s + it.durationSec, 0) / 60);
    return { label, type: "workout", title: splitTitles[idx % splitTitles.length], totalMins, items };
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

function loadWorkoutState() {
  return loadJson("workoutStateV1", { plan: null, perExercise: {}, points: 0 });
}

function saveWorkoutState(st) {
  saveJson("workoutStateV1", st);
}

function formatTimer(seconds) {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function confettiBurst(anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const container = document.createElement("div");
  container.className = "confetti-layer";
  container.style.cssText = `position:fixed;left:${rect.left + rect.width / 2}px;top:${rect.top + rect.height / 2}px;pointer-events:none;z-index:9999;`;
  document.body.appendChild(container);
  const colors = ["#ffb3d9", "#60a5fa", "#fb7185", "#a3e635", "#facc15"];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("span");
    p.className = "confetti";
    p.style.cssText = `position:absolute;width:8px;height:10px;background:${colors[i % colors.length]};border-radius:2px;animation:confetti-pop 1.1s ease-out forwards;--dx:${(Math.random() * 2 - 1) * 100}px;--dy:${-Math.random() * 120 - 40}px;--rot:${Math.random() * 360}deg;`;
    container.appendChild(p);
  }
  setTimeout(() => container.remove(), 1300);
}

function awardPoints(points) {
  const st = loadWorkoutState();
  st.points = (st.points || 0) + points;
  saveWorkoutState(st);
  const key = "You";
  state.racers[key] = Math.min(100, (state.racers[key] || 0) + points);
  renderRaceTrack();
  if (firebaseEnabled && firestore) {
    firestore.collection("public").doc("racers").set({ racers: state.racers, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  }
}

function getStockThumb(hint) {
  const h = String(hint || "fitness").toLowerCase();
  const q = h.includes("stretch") ? "yoga" : h.includes("warm") ? "warmup" : h.includes("cardio") ? "running" : h.includes("leg") ? "leg-workout" : h.includes("upper") ? "upper-body" : h.includes("core") ? "abs" : "gym";
  return `https://source.unsplash.com/128x128/?${q}`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
  if (!st.plan || st.plan.id !== plan.id) {
    st.plan = plan;
    saveWorkoutState(st);
  }

  const todayIdx = (new Date().getDay() + 6) % 7;
  if (workoutSelectedDayIdx == null) workoutSelectedDayIdx = loadJson("workoutSelectedDayIdx", todayIdx);
  const selectedDay = plan.days[workoutSelectedDayIdx] || plan.days[todayIdx];
  const items = selectedDay.items || [];

  const totalEx = plan.days.reduce((s, d) => s + (d.items?.length || 0), 0);
  const finishedCount = Object.values(st.perExercise).filter((x) => x?.finished).length;

  const groups = { warmup: items.filter((x) => x.section === "warmup"), workout: items.filter((x) => x.section === "workout"), stretch: items.filter((x) => x.section === "stretch") };
  const mins = (arr) => Math.round((arr.reduce((s, it) => s + (it.durationSec || 0), 0) / 60));

  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);

  let dateStrip = `<div class="date-strip">`;
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((lbl, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const active = idx === workoutSelectedDayIdx ? "active" : "";
    const today = idx === todayIdx ? "today" : "";
    dateStrip += `<button class="date-pill ${active} ${today}" data-day="${idx}"><div class="num">${d.getDate()}</div><div class="dow">${lbl}</div></button>`;
  });
  dateStrip += `</div>`;

  function renderSection(title, sectionKey, items) {
    const itemHtml = items.map((ex) => {
      const exState = st.perExercise[ex.id] || { startedAt: null, durationSec: ex.durationSec, timerDone: false, finished: false };
      exState.durationSec = exState.durationSec || ex.durationSec;
      st.perExercise[ex.id] = exState;
      const elapsed = exState.startedAt ? Math.floor((Date.now() - exState.startedAt) / 1000) : 0;
      const remaining = exState.timerDone ? 0 : Math.max(0, exState.durationSec - elapsed);
      const status = exState.finished ? "Completed" : exState.startedAt ? (exState.timerDone ? "Finish" : "In progress") : "Start";
      const checkClass = exState.finished ? "checkmark-animate" : "";
      return `
        <div class="exercise-row ${exState.finished ? "done" : ""}" data-ex="${ex.id}">
          <label class="exercise-check-wrap"><input type="checkbox" class="exercise-checkbox ${checkClass}" ${exState.finished ? "checked" : ""} disabled /></label>
          <img class="exercise-thumb" src="${getStockThumb(ex.imageHint)}" alt="" loading="lazy" />
          <div class="exercise-main">
            <div class="exercise-name">${escapeHtml(ex.name)}</div>
            <div class="exercise-sub">${Math.round(ex.durationSec / 60)} min</div>
          </div>
          <div class="exercise-controls">
            <div class="exercise-timer">${exState.startedAt ? formatTimer(remaining) : formatTimer(ex.durationSec)}</div>
            <button class="secondary-btn small-btn js-start" ${exState.finished ? "disabled" : ""}>Start</button>
            <button class="js-finish" ${!exState.timerDone || exState.finished ? "disabled" : ""}>Finish</button>
          </div>
        </div>`;
    }).join("");
    return `<details class="section-card" ${sectionKey === "warmup" ? "open" : ""}><summary><div class="section-left"><div class="section-title">${title}</div><div class="section-mins">${mins(items)} mins</div></div></summary><div class="section-body">${itemHtml}</div></details>`;
  }

  workoutPlanUI.innerHTML = `
    <div class="workout-strip">${dateStrip}</div>
    <div class="workout-hero">
      <div><div class="workout-hero-title">${escapeHtml(selectedDay.title)}</div><div class="workout-hero-sub">${plan.goal} • ${plan.level} • ${plan.daysPerWeek} days</div></div>
      <div class="workout-hero-mins">${selectedDay.totalMins || mins(items)} mins</div>
    </div>
    <div class="workout-progress compact">
      <div class="workout-progress-top"><div class="workout-progress-title">Weekly</div><div class="workout-progress-badge">${finishedCount}/${totalEx}</div></div>
      <div class="workout-progress-bar"><div class="workout-progress-fill" style="width:${totalEx ? (finishedCount / totalEx * 100) : 0}%"></div></div>
    </div>
    ${renderSection("Warm Up", "warmup", groups.warmup)}
    ${renderSection("Workout", "workout", groups.workout)}
    ${renderSection("Stretch", "stretch", groups.stretch)}
  `;

  workoutPlanUI.querySelectorAll(".date-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      workoutSelectedDayIdx = Number(btn.getAttribute("data-day"));
      saveJson("workoutSelectedDayIdx", workoutSelectedDayIdx);
      renderWorkoutPlanUI();
    });
  });

  workoutPlanUI.querySelectorAll(".exercise-row").forEach((row) => {
    const exId = row.getAttribute("data-ex");
    const exState = st.perExercise[exId];
    if (!exState) return;

    row.querySelector(".js-start")?.addEventListener("click", () => {
      if (exState.finished) return;
      if (!exState.startedAt) {
        exState.startedAt = Date.now();
        exState.timerDone = false;
        saveWorkoutState(st);
        renderWorkoutPlanUI();
      }
    });

    row.querySelector(".js-finish")?.addEventListener("click", () => {
      if (!exState.timerDone || exState.finished) return;
      const elapsed = Math.floor((Date.now() - exState.startedAt) / 1000);
      if (elapsed < exState.durationSec) return;
      exState.timerDone = true;
      exState.finished = true;
      saveWorkoutState(st);
      confettiBurst(row);
      awardPoints(2);
      renderWorkoutPlanUI();
    });
  });

  if (!workoutTickInterval) {
    workoutTickInterval = setInterval(() => {
      let changed = false;
      for (const day of plan.days) {
        for (const ex of day.items || []) {
          const es = st.perExercise[ex.id];
          if (es?.startedAt && !es.timerDone) {
            const elapsed = Math.floor((Date.now() - es.startedAt) / 1000);
            if (elapsed >= es.durationSec) {
              es.timerDone = true;
              changed = true;
            }
          }
        }
      }
      if (changed) {
        saveWorkoutState(st);
        renderWorkoutPlanUI();
      }
    }, 900);
  }
}

workoutForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const level = document.getElementById("workoutLevel").value;
  const goal = document.getElementById("workoutGoal").value;
  const hours = Number(document.getElementById("workoutHours").value || 3);
  let disabilityText = "";
  if (workoutDisabilityYesNo?.value === "yes") {
    const sel = workoutDisabilityInput?.value || "";
    disabilityText = sel === "other" ? (workoutDisabilityOther?.value || "") : sel;
  }
  const plan = buildWorkoutPlanV2({ level, goal, hours, disabilityText });
  currentWorkoutPlan = plan;
  const st = loadWorkoutState();
  st.plan = plan;
  st.perExercise = {};
  saveWorkoutState(st);
  workoutPlanSummary.innerHTML = `<strong>Plan ready.</strong> ${plan.daysPerWeek} days/week • ~${plan.minutesPerDay} min/day`;
  renderWorkoutPlanUI();
  showPopup("Workout Plan Ready", "Your weekly plan is generated. Consistency beats intensity.");
});

// SLEEP
const sleepForm = document.getElementById("sleepForm");
const sleepPlan = document.getElementById("sleepPlan");
const sleepTouchLog = document.getElementById("sleepTouchLog");
const sleepQualityReport = document.getElementById("sleepQualityReport");
const sleepWeeklySummary = document.getElementById("sleepWeeklySummary");
const enableSleepRemindersBtn = document.getElementById("enableSleepRemindersBtn");

function parseTimeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min) {
  const h = ((Math.floor(min / 60) % 24) + 24) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function scheduleBedtimeReminder() {
  if (!state.sleepPlan) return;
  saveJson("sleepBedtime", state.sleepPlan.newBed);
  const bedMin = parseTimeToMinutes(state.sleepPlan.newBed);
  const reminderMin = bedMin - 15;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  let deltaMin = reminderMin - nowMin;
  if (deltaMin < 0) deltaMin += 24 * 60;
  setTimeout(() => {
    const msg = "Your bedtime is coming up. Start winding down and get ready to sleep.";
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Bedtime reminder", { body: msg });
    } else {
      showPopup("Bedtime reminder", msg);
    }
    scheduleBedtimeReminder();
  }, Math.min(deltaMin * 60 * 1000, 24 * 60 * 60 * 1000));
}

enableSleepRemindersBtn?.addEventListener("click", async () => {
  if ("Notification" in window) await Notification.requestPermission();
  if (state.sleepPlan) scheduleBedtimeReminder();
  showPopup("Reminder set", "You'll get a notification 15 min before bedtime.");
});

sleepForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const currentBed = document.getElementById("currentBed").value;
  const currentWake = document.getElementById("currentWake").value;
  const targetSleepHours = Number(document.getElementById("targetSleepHours").value || 8);
  const bedMin = parseTimeToMinutes(currentBed);
  const wakeMin = parseTimeToMinutes(currentWake);
  let currentDur = wakeMin - bedMin;
  if (currentDur <= 0) currentDur += 24 * 60;
  const targetDur = targetSleepHours * 60;
  const shift = (targetDur - currentDur) / 2;
  state.sleepPlan = {
    currentDuration: (currentDur / 60).toFixed(1),
    targetHours: targetSleepHours,
    newBed: minutesToTime(Math.round(bedMin - shift)),
    newWake: minutesToTime(Math.round(wakeMin + shift)),
  };
  state.sleepTouches = [];
  renderSleepPlan();
  renderSleepQuality();
  renderSleepWeekly();
});

function renderSleepPlan() {
  if (!sleepPlan || !state.sleepPlan) return;
  const p = state.sleepPlan;
  sleepPlan.innerHTML = `You sleep ~<strong>${p.currentDuration} h</strong>.<br/>Target <strong>${p.targetHours} h</strong>: bed <strong>${p.newBed}</strong>, wake <strong>${p.newWake}</strong>.<br/>60–90 min wind-down before bed.`;
}

function renderSleepQuality() {
  if (!sleepQualityReport) return;
  const p = state.sleepPlan;
  if (!p) { sleepQualityReport.innerHTML = ""; return; }
  const touches = state.sleepTouches?.length || 0;
  const hrs = parseFloat(p.currentDuration);
  const quality = touches === 0 && hrs >= 7 ? "Slept well" : "Disturbed sleep";
  sleepQualityReport.innerHTML = `<strong>${quality} ${touches===0 && hrs>=7 ? "😊" : "😴"}</strong><br/>Total: ${hrs}h | Phone checks: ${touches}`;
}

function renderSleepWeekly() {
  if (!sleepWeeklySummary) return;
  const history = loadJson("sleepWeeklyHistory", []);
  if (history.length === 0) { sleepWeeklySummary.innerHTML = "Log sleep to see weekly summary."; return; }
  const avgHrs = (history.reduce((s, d) => s + (d.hours || 0), 0) / history.length).toFixed(1);
  const avgChecks = (history.reduce((s, d) => s + (d.checks || 0), 0) / history.length).toFixed(0);
  const good = parseFloat(avgHrs) >= 8;
  sleepWeeklySummary.innerHTML = `<strong>Weekly avg:</strong> ${avgHrs}h sleep, ${avgChecks} night checks.<br/>${good ? "Great job! Healthy schedule. 🎉" : "Try for 8+ hours. You've got this! 💪"}`;
}

document.addEventListener("click", () => {
  if (!state.sleepPlan || !sleepTouchLog) return;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const bed = parseTimeToMinutes(state.sleepPlan.newBed);
  const wake = parseTimeToMinutes(state.sleepPlan.newWake);
  const inWindow = bed < wake ? (minutes >= bed && minutes <= wake) : (minutes >= bed || minutes <= wake);
  if (inWindow) {
    state.sleepTouches.push(now);
    sleepTouchLog.innerHTML = `Detected <strong>${state.sleepTouches.length}</strong> interaction(s) during sleep. Try to avoid phone use. 😴`;
    if (state.sleepTouches.length >= 2) showPopup("Bedtime reminder", "It's your bedtime. Try to avoid using your phone and get some rest.");
    renderSleepQuality();
  }
}, true);

// GEO RISK
const geoForm = document.getElementById("geoForm");
const geoResult = document.getElementById("geoResult");

const GEO_DATA = {
  delhi: { pollution: "Very high PM2.5 and PM10.", issues: ["Asthma", "Heart/blood-pressure risk", "Eye irritation"], tips: ["N95 mask on bad days", "Keep windows closed during peak traffic", "Air purifier if possible"] },
  mumbai: { pollution: "High, humidity-related issues.", issues: ["Skin/hair from humidity"], tips: ["Sea-facing walks", "Rinse after exposure"] },
  london: { pollution: "Moderate, traffic peaks.", issues: ["Respiratory on busy roads", "Winter SAD"], tips: ["Parks over main roads", "Daylight exposure"] },
  dubai: { pollution: "Dust, sand, traffic.", issues: ["Dry eyes/skin", "Heat stress"], tips: ["Indoor training in summer", "Hydration"] },
};

geoForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = document.getElementById("cityName").value.trim().toLowerCase();
  if (!city) return;
  const data = GEO_DATA[city];
  geoResult.innerHTML = data
    ? `<strong>${city}:</strong><br/>${data.pollution}<br/><strong>Issues:</strong><ul>${data.issues.map((i) => `<li>${i}</li>`).join("")}</ul><strong>Tips:</strong><ul>${data.tips.map((t) => `<li>${t}</li>`).join("")}</ul>`
    : "No preset for this city. Full version would use live AQI APIs.";
});

// SCOREBOARD (Firebase-driven - scores from workouts)
const raceTrack = document.getElementById("raceTrack");

function renderRaceTrack() {
  if (!raceTrack) return;
  raceTrack.innerHTML = "";
  const entries = Object.entries(state.racers).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    raceTrack.innerHTML = '<p class="hint">Complete workouts to earn points! Scores sync from the database.</p>';
    return;
  }
  const top = entries[0]?.[1] || 1;
  entries.forEach(([name, score], idx) => {
    const row = document.createElement("div");
    row.className = "race-row";
    const crown = idx === 0 ? '<span class="crown">👑</span>' : "";
    const width = Math.max(12, Math.min(100, (score / top) * 100));
    row.innerHTML = `<div class="race-label"><span class="name">${escapeHtml(name)} ${crown}</span><span>${score} pts</span></div><div class="race-track-bar"><div class="race-car" style="width:${width}%;"><span class="race-car-emoji">🏎️</span> ${escapeHtml(name)}</div></div>`;
    raceTrack.appendChild(row);
  });
}

// CHATBOT
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

function getChatbotReply(text) {
  const t = text.toLowerCase().trim();
  if (!t) return "I'm here when you need me. How are you feeling today? 💙";
  if (/^(hi|hey|hello|yo|hola)/.test(t)) return "Hi! 👋 How are you feeling today? I'm here to listen.";
  if (/^(good|great|fine|ok|okay|well)/.test(t)) return "That's wonderful to hear! 😊 Keep that positive energy going. What's making you feel good?";
  if (/^(bad|sad|terrible|awful|down|low)/.test(t)) return "I'm sorry you're going through this. 💙 Remember, tough moments don't last forever. Would you like to talk about what's bothering you?";
  if (/^(thanks|thank you|ty)/.test(t)) return "You're welcome! 😊 I'm always here for you. Take care of yourself today! 🌟";
  if (/^(bye|goodbye|see ya)/.test(t)) return "Take care! 🌈 Remember to be kind to yourself. See you soon!";
  if (/^(work|job|office|boss|colleague)/.test(t)) return "Work stress is really common. 😌 Try taking short breaks, setting boundaries, and celebrating small wins. You've got this! 💪";
  if (/^(family|parent|relationship|partner)/.test(t)) return "Relationships can be complex. 💙 It helps to communicate openly and take time for yourself when needed. You deserve peace.";
  if (/^(money|finance|bills|debt)/.test(t)) return "Financial stress is heavy. 💰 Start with one small step—a budget, or talking to someone you trust. Progress over perfection! 🌱";
  if (/^(alone|lonely|isolated)/.test(t)) return "Feeling lonely is hard. 🤗 Reach out to one person today—a call, a text. Small connections matter. You're not as alone as it feels.";
  if (/^(sleep|tired|exhausted|insomnia)/.test(t)) return "Sleep affects everything! 😴 Try a wind-down routine, less screen time before bed, and keep a consistent schedule. Your body will thank you.";
  if (/^(anxious|anxiety|worried|nervous)/.test(t)) return "Anxiety can feel overwhelming. 🌸 Try 4-4-4 breathing: breathe in 4 sec, hold 4 sec, out 4 sec. You're stronger than you think!";
  const themes = [];
  if (/work|job|study/.test(t)) themes.push("work or study pressure");
  if (/family|parents|relationship/.test(t)) themes.push("relationship tension");
  if (/money|bills|finance/.test(t)) themes.push("financial uncertainty");
  if (/alone|lonely/.test(t)) themes.push("social support");
  if (/health|body|weight/.test(t)) themes.push("health or body image");
  let result = "Thank you for sharing. 💚 It sounds like your stress might connect to ";
  result += themes.length ? themes.join(", ") + "." : "responsibilities and feelings that have been building.";
  result += " Focus on one small area you can influence this week. You've got this! 🌟 This app is not a replacement for a therapist.";
  return result;
}

chatForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  addChatMessage("user", text);
  chatInput.value = "";
  setTimeout(() => {
    addChatMessage("bot", getChatbotReply(text));
  }, 200);
});

// POROSITY
const porosityForm = document.getElementById("porosityForm");
const porosityAdvice = document.getElementById("porosityAdvice");

const POROSITY_DATA = {
  floats: {
    title: "Low porosity hair",
    body: "Your cuticles lie flat and tight, so moisture has trouble entering the strand. Products can sit on top and cause buildup.\n\n• Use lighter, water-based products and avoid heavy oils and butters.\n• Warm water and steam help open cuticles—try a warm towel wrap before conditioning.\n• Use gentle clarifying shampoo occasionally to prevent buildup.\n• Protein can make low-porosity hair feel stiff—use sparingly and follow with moisture.\n• Be patient: low-porosity hair takes longer to get fully wet and to absorb products.\n• Deep condition with heat (shower cap + warm towel) for better penetration.",
    products: "Light leave-ins, water-based gels, apple cider vinegar rinses.",
    avoid: "Heavy oils, silicone-heavy products, cold-water rinses only.",
  },
  middle: {
    title: "Medium / normal porosity hair",
    body: "Your cuticles are balanced—moisture goes in and stays in reasonably well. This type responds well to most routines.\n\n• Use a mix of moisture and light protein.\n• Protect from heat and sun to avoid becoming high-porosity over time.\n• Keep a simple, consistent routine instead of constant product changes.\n• Deep condition 1–2x per week.\n• Light oils (argan, jojoba) can help seal without weighing hair down.",
    products: "Balanced conditioners, light oils, heat protectant.",
    avoid: "Overloading with protein, excessive heat styling.",
  },
  sinks: {
    title: "High porosity hair",
    body: "Your cuticles are more open, so hair absorbs moisture quickly but loses it just as fast. It can feel dry soon after washing.\n\n• Seal with oils or creams after hydrating (LOC or LCO method).\n• Focus on gentle handling—less heat, low-manipulation styles, satin/silk caps.\n• Protein treatments can help strengthen the strand and reduce breakage.\n• Use leave-in conditioners and butters to lock in moisture.\n• Cold-water rinses can help close cuticles slightly at the end of washing.\n• Avoid harsh chemicals and over-processing.",
    products: "Protein treatments, butters, heavier oils, deep conditioners.",
    avoid: "Harsh sulfates, excessive heat, over-washing.",
  },
};

porosityForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = document.getElementById("porosityResult").value;
  const data = POROSITY_DATA[val] || POROSITY_DATA.middle;
  porosityAdvice.innerHTML = `
    <strong>${data.title}</strong><br/>
    ${data.body.replace(/\n/g, "<br/>")}
    <br/><br/><strong>Recommended products:</strong> ${data.products}
    <br/><strong>Avoid:</strong> ${data.avoid}
  `;
  showPopup("Hair Porosity Analysed ✨", "Use this detailed analysis to match products and routines to what your strands actually need.");
});

initFirebaseIfConfigured();
