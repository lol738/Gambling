const ip = require("./public/IP.js");
const express = require("express");
const http = require("http");
const path = require("path");
const sqlite3 = require('sqlite3');
const socketIo = require("socket.io");
const session = require("express-session");
const sharedSession = require("express-socket.io-session");

const app = express();
const server = http.createServer(app);
const port = 3000;
const io = socketIo(server);

const sessionMiddleware = session({
    secret: "GoldenGooner",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
});

io.use(sharedSession(sessionMiddleware, {
    autoSave: true
}));

app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

function isAuthenticated(req, res, next) {
    if (req.session.username) {
        return next();
    } else {
        res.redirect("/login");
    }
}

function updateBalance(amount, username, callback) {
    users.get("SELECT balance FROM users WHERE username = ?", [username], (err, row) => {
        if (err) {
            callback(err, null);
            return;
        }
        if (!row) {
            callback("User not found", null);
            return;
        }
        const newBalance = row.balance + amount;
        if (newBalance >= 0) {
            users.run("UPDATE users SET balance = ? WHERE username = ?", [newBalance, username], (err) => {
                if (err) {
                    callback(err, null);
                    return;
                }
                callback(null, newBalance);
            });
        }
        else {
            callback("Balance not high enough", null);
            return;
        }
    });
}

function getBalance(username, callback) {
    users.get("SELECT balance FROM users WHERE username = ?", [username], (err, row) => {
        if (err) {
            callback(err, null);
            return;
        }
        if (!row) {
            callback("User not found", null);
            return;
        }
        callback(null, row.balance);
    });
}

const users = new sqlite3.Database('./db/users.db');

users.serialize(() => users.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, balance INTEGER)"));
                                        
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public/register", "register.html"));
});

app.post("/register", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    users.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
        if (err) {
            console.error("Database error:", err);
        }
        if (row) {
            res.json({type: "username", error: "Username already in use"});
        } else {
            users.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
                updateBalance(3000, username, (err, balance) => {
                    if (err) {
                        console.error(err + 1);
                        return;
                    }
                });
                req.session.username = username;
                res.redirect("/main");
            });
        }
    });
});

app.get('/', (req, res) => {
    res.redirect("/login")
});

app.get("/login", (req, res) => {
    if (req.session.username) {
        res.redirect('/main');
    } else {
        res.sendFile(path.join(__dirname, "public/login", "login.html"));
    }
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    users.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
        if (err) {
            console.error("Database error:", err);
        }
        if (row) {
            if (row.password == password) {
                req.session.username = username;
                res.redirect("/main");
            } else {
                res.json({ type: "password", error: "Incorrect Password" });
            }
        } else {
            res.json({ type: "username", error: "Incorrect Username" });
        }
    });
});

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});

app.get("/main", isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "public/main", "main.html"));
});

app.get("/main/:page", isAuthenticated, (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, `public/${page}`, `${page}.html`);
    res.sendFile(filePath, err => {
        if (err) {
            res.status(404).send("Seite nicht gefunden");
        }
    });
});

io.on("connection", (socket) => {
    const username = socket.handshake.session.username;
    console.log("User connected: " + username);
    getBalance(username, (err, balance) => {
        if (err) {
            console.error(err);
            return;
        }
        socket.emit("updateBalance", (balance));
    });
    socket.on("getBalance", () => {
        getBalance(username, (err, balance) => {
            if (err) {
                console.error(err);
                return;
            }
            socket.emit("updateBalance", (balance));
        });
    });
    socket.on("updateBalance", (amount) => {
        updateBalance(amount, username, (err, balance) => {
            socket.emit("updateBalance", (balance));
        });
    });
});

server.listen(port, () => {
    console.log(`Server running at http://${ip}:${port}`);
});