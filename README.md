# RxPlain

> A web application that simplifies medical documents for end‑users.

This guide explains how to run the project locally, **strictly following what is already in the codebase**.  
**⚠️ Important:** API / Firebase credentials are **_not_** stored in this file.  
You will find the full list of required keys in the accompanying project _report_ (see the “.env file” section there). Copy them into a `.env` file as described below.

---

## Project Overview

| File / Dir | Purpose |
|------------|---------|
| **server.js** | Entry point. Imports the Express app from `app.js` and starts the server on a configurable port (default **3000**). |
| **app.js** | Creates the Express instance, loads environment variables, sets up middleware, registers routes, and serves static assets from `public/`. |
| **config/** | Centralises Firebase configuration: <br>• `firebase-config.js` – client‑side SDK config (exported as `firebaseConfig`).<br>• `firebase-admin.js` – server‑side Admin initialisation. |
| **package.json → scripts** | <br>• `"start": "node server.js"` – production run.<br>• `"dev": "nodemon server.js"` – development with auto‑reload. |

---

## Step‑by‑Step: Running RxPlain

### 1 · Install dependencies

```bash
npm install
````

### 2 · Add configuration files

```text
config/
├── firebase-config.js   # client‑side SDK keys (public)
└── firebase-admin.js    # server‑side Admin initialisation
```

Both files should live inside the **`config/`** directory at the project root.

### 3 · Create your `.env` file

1. Locate the section titled **“In the .env file, copy‑paste the following to re‑use our keys”** in the project report.
2. Copy that block into a new file named `.env` **in the project root (outside `config/`)**.

Minimal structure:

```dotenv
PORT=3000
NODE_ENV=development
# …all other variables copied from the report
```

> **Do not commit** the actual keys—keep `.env` in your `.gitignore`.

### 4 · (Opt.) Build Tailwind CSS

If you modify styles in `src/input.css`, compile them:

```bash
npm run build:css
```

This generates `public/css/styles.css`.

### 5 · Start the server

| Mode            | Command       | Description                                            |
| --------------- | ------------- | ------------------------------------------------------ |
| **Production**  | `npm start`   | Runs `node server.js`.                                 |
| **Development** | `npm run dev` | Runs with **nodemon** for auto‑reload on file changes. |

### 6 · Open your browser

Navigate to:

```
http://localhost:3000
```

—or whichever `PORT` you set in the `.env` file.

