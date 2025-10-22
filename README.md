# SocialSite (XSS Demo Mode)

**⚠️ Warning:** This project includes an *intentionally vulnerable mode* for educational use **only**.
Enable it **only** on localhost or an isolated virtual lab.
Never run `INSECURE=true` on public, production, or shared systems.

---

## 🧰 Prerequisites

* Node.js (v14 or newer)
* npm
* Git (optional)

---

## 📦 Installation

Install dependencies:

```bash
npm install
```

---

## 🚀 Run (Windows PowerShell — temporary one-off)

Start the app in **insecure XSS demo mode** for this session:

```powershell
$env:INSECURE="true"; npm run dev
```

> The environment variable exists only in this terminal session.
> Close PowerShell or restart without `INSECURE` to return to safe mode.

---

## 💻 Run (macOS / Linux / WSL)

For Unix-like shells:

```bash
INSECURE=true npm run dev
```

---

## 🛠 Recommended `package.json` Scripts

Example setup:

```json
"scripts": {
  "dev": "node app.js",
  "start": "node app.js"
}
```

Optional: use **nodemon** for auto-reload during development:

```bash
npm install --save-dev nodemon
```

Then update scripts:

```json
"scripts": {
  "dev": "nodemon app.js"
}
```

---

## 🔒 Disable Vulnerability Mode

Run without the `INSECURE` variable:

```bash
npm run dev
# or
node app.js
```

Without `INSECURE=true`, the app sanitizes user content before rendering.

---

## 🧠 Safety Notes

* Use **test accounts only**.
* Do **not** use payloads that contact external servers or exfiltrate data.
* Re-enable security headers (e.g., Helmet, CSP) and remove `INSECURE=true` when finished testing.
* Keep your `.env` file out of version control (`.gitignore` it).

---

## ✅ Verification

When the server starts, you should see:

```
✅ Server running on http://localhost:3000  (INSECURE=true)
```

If you don’t see `INSECURE=true`, restart the app using the commands above.

---

*Created for secure lab demonstration and web security education.*
