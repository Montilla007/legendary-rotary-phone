const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const bcrypt = require("bcrypt");
const db = require("./db");
const sanitizeHtml = require("sanitize-html");
const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));


const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret";
app.use(
  session({
    store: new SQLiteStore(),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  })
);


app.use((req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.INSECURE = process.env.INSECURE === "true";
  next();
});


app.get("/", (req, res) => {
  db.all(
    `SELECT posts.*, users.username FROM posts 
     JOIN users ON users.id = posts.user_id 
     ORDER BY created_at DESC`,
    (err, posts) => {
      if (err) return res.status(500).send("Error loading posts.");
      res.render("index", { 
        posts,
        searchQuery: null
      });
    }
  );
});

app.get("/signup", (req, res) => res.render("signup"));
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.send("Provide username and password.");
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (username, password) VALUES (?, ?)`,
      [username, hash],
      function (err) {
        if (err) {
          console.error(err);
          return res.send("Username already exists or database error.");
        }
        req.session.user = { id: this.lastID, username };
        res.redirect("/");
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error.");
  }
});

app.get("/login", (req, res) => res.render("login"));
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) return res.status(500).send("Server error.");
    if (!user) return res.send("User not found");
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.send("Invalid password");
    req.session.user = { id: user.id, username: user.username, isAdmin: !!user.isAdmin };
    res.redirect("/");
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.post("/post", (req, res) => {
  if (!req.session.user) return res.status(403).send("You must be logged in to post.");
  const rawContent = req.body.content || "";
  const INSECURE = process.env.INSECURE === "true";

  let toStore;
  if (INSECURE) {
    toStore = rawContent;
    console.warn("[WARNING] INSECURE mode is ON — storing raw HTML (stored XSS vulnerability).");
  } else {
    toStore = sanitizeHtml(rawContent, {
      allowedTags: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
      allowedAttributes: {
        a: ["href", "rel", "target"]
      },
      allowedSchemes: ["http", "https", "mailto"]
    });
  }

  db.run(`INSERT INTO posts (user_id, content) VALUES (?, ?)`, [req.session.user.id, toStore], (err) => {
    if (err) {
      console.error(err);
    }
    res.redirect("/");
  });
});

app.get("/search", (req, res) => {
  let username = req.query.username;
  
  if (!username) {
    return res.redirect("/");
  }

  username = username.toString().trim();

  db.all(
    `SELECT posts.*, users.username FROM posts 
     JOIN users ON users.id = posts.user_id 
     WHERE users.username LIKE ? 
     ORDER BY created_at DESC`,
    [`%${username}%`],
    (err, posts) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error searching posts.");
      }
      
      res.render("index", { 
        posts, 
        searchQuery: username
      });
    }
  );
});

app.get("/admin", (req, res) => {
  if (!req.session.user || !req.session.user.isAdmin) return res.status(403).send("Access denied.");
  db.all(
    `SELECT posts.*, users.username FROM posts JOIN users ON users.id = posts.user_id ORDER BY created_at DESC`,
    (err, posts) => {
      if (err) return res.status(500).send("Error");
      res.render("admin", { posts });
    }
  );
});

const SECRET_ADMIN_KEY = process.env.SECRET_ADMIN_KEY || "mysecretkey";
app.get("/secret-admin", (req, res) => res.render("admin_login"));
app.post("/secret-admin", (req, res) => {
  const { username, secret } = req.body;
  if (secret !== SECRET_ADMIN_KEY) return res.send("Invalid admin secret");
  db.get(`SELECT * FROM users WHERE username = ? AND isAdmin = 1`, [username], (err, user) => {
    if (!user) return res.send("Not an admin or invalid username");
    req.session.user = { id: user.id, username: user.username, isAdmin: true };
    res.redirect("/admin");
  });
});

app.get('/debug/posts', (req, res) => {
  db.all('SELECT id, user_id, content, created_at FROM posts ORDER BY created_at DESC LIMIT 20', (err, rows) => {
    if (err) return res.status(500).send('db error');
    res.type('json').send(rows);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}  (INSECURE=${process.env.INSECURE === "true"})`);
});