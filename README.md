# RxPlain

> A web application that simplifies medical documents for end‑users.

This guide explains how to run the project locally.

---

## Project Overview

| File | Purpose |
|------|---------|
| **server.js** | Entry point. Imports the Express app from `app.js` and starts the server on a configurable port (default **3000**). |
| **app.js** | Creates the Express instance, loads environment variables, sets up middleware, registers routes, and serves static assets from `public/`. |
| **package.json → scripts** | <br>• `"start": "node server.js"` – production run<br>• `"dev": "nodemon server.js"` – development with auto‑reload |

> **Note:** The app expects a `.env` file containing keys for Firebase, Gemini API, and other variables referenced in the code.

---

## Step‑by‑Step: Running RxPlain

### 1 · Install dependencies

```bash
npm install
````

### 2 · Set up environment variables

Create a `.env` file in the project root and add every key required by the code (we included the additional keys in our report)

```dotenv
PORT=3000           
```

### 3 · Build Tailwind CSS (only if you edited styles)

```bash
npm run build:css
```

This compiles `src/input.css` into `public/css/styles.css`.

### 4 · Start the server

| Mode            | Command       | Description                                            |
| --------------- | ------------- | ------------------------------------------------------ |
| **Production**  | `npm start`   | Runs `node server.js`.                                 |
| **Development** | `npm run dev` | Runs with **nodemon** for auto‑reload on file changes. |

### 5 · Open your browser

Navigate to:

```
http://localhost:3000
```

—or whichever `PORT` you set in the `.env` file.

```
