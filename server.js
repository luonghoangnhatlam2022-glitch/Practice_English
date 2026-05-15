const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database("./database.db");

db.run(`
  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    meaning TEXT NOT NULL,
    example TEXT,
    topic TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

function normalizePhone(phone) {
  return String(phone || "").replace(/\s+/g, "").trim();
}

function isValidPhone(phone) {
  return /^(\+?\d{9,15})$/.test(phone);
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function createUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone
  };
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice(7);
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ error: "Please log in" });
    return;
  }

  db.get(
    `SELECT users.id, users.name, users.phone
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?`,
    [token],
    function (err, user) {
      if (err) {
        res.status(500).json({ error: "Cannot check login" });
        return;
      }

      if (!user) {
        res.status(401).json({ error: "Login expired" });
        return;
      }

      req.user = user;
      next();
    }
  );
}

app.post("/api/auth/register", function (req, res) {
  const name = String(req.body.name || "").trim();
  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password || "");

  if (!name || !phone || !password) {
    res.status(400).json({ error: "Please enter your name, phone number, and password" });
    return;
  }

  if (!isValidPhone(phone)) {
    res.status(400).json({ error: "Phone number must contain 9 to 15 digits" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);

  db.run(
    "INSERT INTO users (name, phone, password_hash, password_salt) VALUES (?, ?, ?, ?)",
    [name, phone, passwordHash, salt],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          res.status(409).json({ error: "This phone number already has an account" });
          return;
        }

        res.status(500).json({ error: "Cannot create account" });
        return;
      }

      const token = crypto.randomBytes(32).toString("hex");
      const user = {
        id: this.lastID,
        name: name,
        phone: phone
      };

      db.run("INSERT INTO sessions (token, user_id) VALUES (?, ?)", [token, user.id], function (sessionErr) {
        if (sessionErr) {
          res.status(500).json({ error: "Account created, but login failed" });
          return;
        }

        res.status(201).json({ token: token, user: createUserPayload(user) });
      });
    }
  );
});

app.post("/api/auth/login", function (req, res) {
  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password || "");

  if (!phone || !password) {
    res.status(400).json({ error: "Please enter your phone number and password" });
    return;
  }

  db.get("SELECT * FROM users WHERE phone = ?", [phone], function (err, user) {
    if (err) {
      res.status(500).json({ error: "Cannot log in" });
      return;
    }

    if (!user) {
      res.status(401).json({ error: "Phone number or password is incorrect" });
      return;
    }

    const passwordHash = hashPassword(password, user.password_salt);

    if (passwordHash !== user.password_hash) {
      res.status(401).json({ error: "Phone number or password is incorrect" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");

    db.run("INSERT INTO sessions (token, user_id) VALUES (?, ?)", [token, user.id], function (sessionErr) {
      if (sessionErr) {
        res.status(500).json({ error: "Cannot start login session" });
        return;
      }

      res.json({ token: token, user: createUserPayload(user) });
    });
  });
});

app.get("/api/auth/me", requireAuth, function (req, res) {
  res.json({ user: createUserPayload(req.user) });
});

app.post("/api/auth/logout", requireAuth, function (req, res) {
  const token = getBearerToken(req);

  db.run("DELETE FROM sessions WHERE token = ?", [token], function () {
    res.json({ success: true });
  });
});

app.get("/api/words", function (req, res) {
  db.all("SELECT * FROM words ORDER BY id DESC", function (err, rows) {
    if (err) {
      res.status(500).json({ error: "Cannot get words" });
      return;
    }

    res.json(rows);
  });
});

app.post("/api/words", function (req, res) {
  const word = req.body.word;
  const meaning = req.body.meaning;
  const example = req.body.example;
  const topic = req.body.topic;

  if (!word || !meaning) {
    res.status(400).json({ error: "Word and meaning are required" });
    return;
  }

  db.run(
    "INSERT INTO words (word, meaning, example, topic) VALUES (?, ?, ?, ?)",
    [word, meaning, example, topic],
    function (err) {
      if (err) {
        res.status(500).json({ error: "Cannot add word" });
        return;
      }

      res.json({
        id: this.lastID,
        word: word,
        meaning: meaning,
        example: example,
        topic: topic
      });
    }
  );
});

app.delete("/api/words/:id", function (req, res) {
  const id = req.params.id;

  db.run("DELETE FROM words WHERE id = ?", [id], function (err) {
    if (err) {
      res.status(500).json({ error: "Cannot delete word" });
      return;
    }

    res.json({ success: true });
  });
});

app.listen(PORT, HOST, function () {
  console.log(`Server is running at http://${HOST}:${PORT}`);
});
