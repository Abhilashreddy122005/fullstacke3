//this is the server file for the student registration form where I have the stregister.css and streg.html and stscript.js that saves this to the server
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(cors());
app.use(bodyParser.json()); 

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Abhi@122005",
  database: "studentdata"
});

db.connect((err) => {
  if (err) {
    console.log("Database connection failed");
    console.log(err);
  } else {
    console.log("Database connected");
  }
});

app.post("/login", (req, res) =>{

    const name = req.body.name;
    const email = req.body.email;
    const dob = req.body.dob;
    const department = req.body.department;
    const year = req.body.year;
    const phone = req.body.phone;

  console.log('Received registration:', req.body);


    const sql = "INSERT INTO students (name, email,dob,department, year, phone) VALUES (?, ?, ?, ?, ?, ?)";

    db.query(sql, [name, email, dob, department, year, phone], (err, result) => {
      if (err) {
        console.error('DB insert error:', err);
        res.status(500).json({ message: "Database error" });
      } else {
        res.status(201).json({ message: "Registration successful" });
      }
    });

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

