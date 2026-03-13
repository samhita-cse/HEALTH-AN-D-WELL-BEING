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

// Track which regions have at least one logged activity
const bodyRegionsHit = {
  head: false,
  torso: false,
  arms: false,
  legs: false,
  kidneys: false,
};

function repaintBodyFromRegions() {
  const allParts = [
    "head",
    "torso",
    "leftArm",
    "rightArm",
    "leftLeg",
    "rightLeg",
    "leftKidney",
    "rightKidney",
  ];
  allParts.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("filled", "completed");
  });

  if (bodyRegionsHit.head) {
    document.getElementById("head")?.classList.add("filled");
  }
  if (bodyRegionsHit.torso) {
    document.getElementById("torso")?.classList.add("filled");
  }
  if (bodyRegionsHit.arms) {
    document.getElementById("leftArm")?.classList.add("filled");
    document.getElementById("rightArm")?.classList.add("filled");
  }
  if (bodyRegionsHit.legs) {
    document.getElementById("leftLeg")?.classList.add("filled");
    document.getElementById("rightLeg")?.classList.add("filled");
  }
  if (bodyRegionsHit.kidneys) {
    document.getElementById("leftKidney")?.classList.add("filled");
    document.getElementById("rightKidney")?.classList.add("filled");
  }

  const completedCount = Object.values(bodyRegionsHit).filter(Boolean).length;
  if (completedCount === 0) {
    bodyQuestMessage.textContent = "";
    return;
  }

  if (completedCount === state.totalBodyQuests) {
    // Colour everything stronger when full body is hit
    document.querySelectorAll(".body-part").forEach((el) => {
      el.classList.add("completed");
    });
    bodyQuestMessage.textContent =
      "Full body quest complete. You just lived the lifestyle most people only talk about.";
    showPopup(
      "Full Body Lit Up",
      "Congratulations – you hit every body quest today. This is the lifestyle most people dream about but never execute."
    );
  } else {
    bodyQuestMessage.textContent = `Body progress: ${completedCount}/${state.totalBodyQuests} key regions trained today.`;
  }
}

bodyActivityForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("activityName").value.trim();
  const focus = document.getElementById("activityFocus").value;
  if (!focus) return;

  // Map focus to regions
  if (focus === "legs") {
    bodyRegionsHit.legs = true;
  } else if (focus === "arms") {
    bodyRegionsHit.arms = true;
  } else if (focus === "torso") {
    bodyRegionsHit.torso = true;
  } else if (focus === "head") {
    bodyRegionsHit.head = true;
  } else if (focus === "kidneys") {
    bodyRegionsHit.kidneys = true;
  } else if (focus === "full") {
    bodyRegionsHit.head = true;
    bodyRegionsHit.torso = true;
    bodyRegionsHit.arms = true;
    bodyRegionsHit.legs = true;
    bodyRegionsHit.kidneys = true;
  }

  repaintBodyFromRegions();
  bodyActivityForm.reset();
});

resetBodyBtn.addEventListener("click", () => {
  Object.keys(bodyRegionsHit).forEach((key) => {
    bodyRegionsHit[key] = false;
  });
  repaintBodyFromRegions();
});

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
const workoutPlan = document.getElementById("workoutPlan");

workoutForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const level = document.getElementById("workoutLevel").value;
  const goal = document.getElementById("workoutGoal").value;
  const hours = Number(document.getElementById("workoutHours").value || 3);

  const days = Math.min(6, Math.max(2, Math.round(hours)));
  const plan = buildWorkoutPlan(level, goal, days);
  workoutPlan.innerHTML = plan;
  showPopup(
    "Workout Plan Ready",
    "Your weekly plan is generated. Consistency beats intensity – follow this for 4 weeks and then level up."
  );
});

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

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  addChatMessage("user", text);
  chatInput.value = "";
  setTimeout(() => {
    const reply = analyseStressMessage(text);
    addChatMessage("bot", reply);
  }, 300);
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

