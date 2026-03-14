# LifeQuest Health Hub

LifeQuest Health Hub is a single-page health and wellness web app built with plain HTML, CSS, and JavaScript, backed by Firebase Realtime Database and Firebase Authentication.

This README is based on the latest version of:
- `index (3).html`
- `styles.css`
- `main.js`
- `index.js`
- `package.json`

## Main Features

- Google sign-in with Firebase
- Persistent login until manual sign-out
- Firebase-based per-user data storage
- Humanoid body tracker for daily habits
- Food Analysis tab with:
  - profile inputs
  - BMI calculation
  - calorie estimate
  - breakfast/lunch/dinner food tracking
  - macros and ingredients
  - allergy swap suggestions
  - risk-factor guidance
- Stress and mood logging with emoji selection
- Workout planner with:
  - generated plan
  - per-exercise start/resume timer
  - pause behavior when `Finish` is pressed too early
  - completion state and confetti popup
- Sleep tracker with Sunday-Saturday sleep hours
- Weekly sleep graph and sleep quality summary
- Friend leaderboard and race track
- Therapist chatbot
- Hair porosity checker

## File Overview

### `index (3).html`

This file contains:
- the full app structure and tab layout
- login screen and signed-in app shell
- Firebase module imports
- Firebase configuration
- Google sign-in and sign-out logic
- Realtime Database helper functions exposed on `window`

Important Firebase helpers added here:
- `saveUserData`
- `getUserData`
- `listenToUserData`
- `deleteUserData`
- `findUsersByNameOrEmail`
- `getUsersByUids`
- `listenToUsersByUids`
- `saveCurrentUserScore`

### `main.js`

This file contains the app logic for:
- tab switching
- popup handling
- humanoid/body progress
- app state persistence and Firebase sync
- Food Analysis rendering and calculations
- mood and stress logging
- workout plan generation
- workout timers and points
- sleep tracking and graph generation
- friend leaderboard logic
- chatbot responses
- hair porosity analysis

Important current behavior:
- user app data is saved under `users/<uid>/appState`
- workout scores are saved under `users/<uid>/scoreboard/points`
- friend leaderboard reads other users from Firebase
- friend scores update in real time
- account-specific state is scoped by Firebase user

### `styles.css`

This file contains:
- app layout
- tab and card styling
- humanoid SVG styling
- workout planner styling
- sleep graph styling
- leaderboard race track styling
- chatbot styling
- food-analysis card styling
- popup and confetti presentation

### `index.js`

This file is the small Express server used for deployment platforms such as Render.

It:
- serves the `applied from saanvi` folder as static files
- returns `index (3).html` at the root route
- listens on `process.env.PORT || 3000`

### `package.json`

This file provides the Node/Render setup for deployment.

It currently includes:
- `express` as a dependency
- `start` script: `node index.js`
- `build` script: `echo "No build step required"`

Important note:
- the project does not use a frontend bundler right now, so there is no real build pipeline
- the `build` script is intentionally a no-op for Render compatibility

## Firebase Setup

This app is already wired to:
- Firebase Auth
- Firebase Realtime Database

Current config is embedded directly in `index (3).html`.

The app expects:
- Google sign-in enabled in Firebase Authentication
- authorized domains configured for local development
- Realtime Database enabled

## How Sign-In Works

- Users sign in with Google
- login persistence is set to `browserLocalPersistence`
- the user remains signed in until pressing `Sign out`
- the Google provider uses `prompt: "select_account"` so account choice appears again

## Data Storage Model

Per-user data is stored in Firebase like this:

```text
users/
  <uid>/
    name
    email
    createdAt
    lastLogin
    scoreboard/
      points
      updatedAt
    appState/
      foods
      moodEntries
      friendConnections
      sleepPlan
      sleepWeeklyHistory
      workoutStateV1
      profile
      ...
```

## Friend Leaderboard

The leaderboard supports:
- adding friends by username or email
- saving friend connections in your own `appState`
- showing you plus added friends on the race track
- real-time score refresh from Firebase

Important notes:
- each friend must exist as a Firebase user record
- each friend should sign into the app at least once
- self-add is blocked for the currently signed-in account

## Workout Scoring

Current scoring rules:
- each completed workout item gives `2` points
- points are cumulative
- points are capped at `100`
- all racers move toward the same `100` finish line
- scores are shown as `current/100 pts`

Timer behavior:
- `Start` begins an exercise timer
- pressing `Finish` before time ends pauses the exercise
- pressing `Start` again resumes it
- once time is fully completed, `Finish` marks it as finished
- completed exercises stay in the `Finished` state

## Running the App

Use a local server such as VS Code Live Server.

Recommended:
1. Open the `applied from saanvi` folder in VS Code
2. Right-click `index (3).html`
3. Choose `Open with Live Server`

## Deploying on Render

This project can be deployed as a Node web service on Render using the added Express server.

Files used for deployment:
- `index.js`
- `package.json`

Recommended Render settings:
1. Root Directory: `applied from saanvi`
2. Environment: `Node`
3. Build Command: `npm install`
4. Start Command: `npm start`

How it works:
- Render runs `node index.js`
- Express serves the frontend files directly
- the app opens from the hosted URL instead of Live Server

Important Firebase note for Render:
- after deploying, add your Render domain to Firebase Authentication authorized domains

Example:
- `your-app-name.onrender.com`

Without that, Google sign-in may fail on the deployed site.

## Recommended Test Flow

1. Sign in with one Google account
2. Add body, food, mood, sleep, and workout data
3. Complete one workout item
4. Open Firebase Realtime Database and confirm data is being saved
5. Add one or more friends by email or username
6. Refresh the leaderboard
7. Sign into another account and confirm account-specific data remains separate

## Current Notes

- The app is implemented in plain frontend files with a very small Express wrapper for deployment
- Some older legacy code still exists in `main.js`, but the latest logic is layered on top and is the active behavior
- The Firebase integration is the source of truth for signed-in user data
- Local development can use Live Server, while production deployment can use Render

## Future Improvement Ideas

- move all legacy/local fallback state fully into Firebase-backed structured nodes
- add stronger validation and clearer friend search results
- improve workout scoring by duration or difficulty
- add a visible finish flag on the race track
- clean up remaining mojibake/encoding text fragments in older HTML strings


##SCREENSHOTS
https://drive.google.com/drive/folders/1ire96sBkAXLNFdwliI51CEP3dbgQL-UU
