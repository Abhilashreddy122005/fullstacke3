const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Abhi@122005",
  database: "login_db"
});

db.connect((err) => {
  if (err) {
    console.log("Database connection failed");
    console.log(err);
  } else {
    console.log("Database connected");
  }
});

// Login API
app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const sql = "SELECT * FROM users WHERE username=? AND password=?";

  db.query(sql, [username, password], (err, result) => {
  if (err) {
    console.log(err);
    res.json({ message: "Database error" });
  } else if (result.length > 0) {
    res.json({ message: "Login successful" });
  } else {
    res.json({ message: "Invalid username or password" });
  }
});
});

// START SERVER (MOST IMPORTANT)
app.listen(3000, () => {
  console.log("Server started on port 3000");
});