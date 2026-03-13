# LifeQuest Health Hub (Prototype)

A single‑page health “game dashboard” that turns habits into progress:

- **Humanoid body outline** that highlights body parts only when you **log an activity targeting that part**
- **Food tracker** with a daily calorie target calculator (Mifflin‑St Jeor)
- **Mood / stress logger** (3× per day) with a simple daily stress summary
- **Workout plan generator** by level + goal
- **Sleep schedule designer** (with a basic “interaction during sleep window” tracker)
- **City health GeoRisk demo** (preset cities) with prevention tips
- **Friends & family scoreboard** with race cars + crown for #1
- **Therapist‑style chatbot demo** (rule‑based)
- **Hair porosity checker** (water test) + care tips

This is a **prototype**: it runs fully in the browser with **no backend**.

---

## Files

- `index.html` – UI (tabs and sections)
- `styles.css` – styling
- `main.js` – app logic

Keep these files **in the same folder**.

---

## Optional: Firebase syncing (no visible login)

If you want the **scoreboard to sync** between devices, you can use Firebase with **Anonymous Auth** (the app stays “open” but still gets a user session in the background).

### 1) Create Firebase project

- Go to `https://firebase.google.com/`
- Create a project
- Add a **Web app**
- Copy the **firebaseConfig**

### 2) Enable Auth + Firestore

- **Authentication → Sign-in method → Anonymous → Enable**
- **Firestore Database → Create database**

### 3) Paste config into the site

Open `index.html` and set:

- `window.__FIREBASE_CONFIG__ = { ... }`

### 4) Firestore rules (important)

Do NOT leave your database open for everyone forever. For a quick prototype you can start permissive, but lock it down later.

---

## Claude chatbot (Anthropic) setup

Claude **cannot be called directly from the browser** without exposing your API key.

You need a small server endpoint (examples):

- Firebase Cloud Functions
- Cloudflare Worker
- Your own Node/Express server

Then set in `index.html`:

- `window.__CLAUDE_PROXY_URL__ = "https://YOUR_SERVER/chat"`

Your server should accept:

```json
{ "message": "user text", "uid": "optional user id" }
```

And return:

```json
{ "reply": "Claude reply text" }
```

---

## Run locally (Windows)

### Option 1: Double‑click

Open the folder and **double‑click `index.html`**.

### Option 2: PowerShell

```powershell
cd "c:\Users\Sammy\OneDrive\Desktop\New folder"
start index.html
```

---

## Share to another laptop

1. Copy the whole folder (or zip it).
2. On the other laptop, extract/copy it.
3. Open `index.html` in a browser.

---

## Put it on GitHub (online upload)

1. Go to GitHub → **New repository** → create it.
2. In the repo, click **Add file → Upload files**.
3. Upload:
   - `index.html`
   - `styles.css`
   - `main.js`
   - `README.md`
4. Click **Commit changes**.

---

## (Optional) Publish with GitHub Pages

After your files are in a GitHub repo:

1. Repo → **Settings**
2. **Pages**
3. **Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main** / **root**
4. Save → GitHub will give you a public site link.

---

## Notes / limitations (prototype)

- **Food calories**: uses a small built‑in food list + custom manual entries (not a live nutrition API).
- **GeoRisk**: preset demo cities only (not live AQI data).
- **Sleep “phone touch detection”**: browsers can’t read real phone unlocks without OS permissions; this demo counts **page interactions** during the sleep window instead.
- **Chatbot**: rule‑based demo; a real therapist bot would use an AI model + safety checks.

