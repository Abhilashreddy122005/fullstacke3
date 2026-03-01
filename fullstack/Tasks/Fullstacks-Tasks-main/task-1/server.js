const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host:"localhost",
  user:"root",
  password:"Naveen@8247",
  database:"studentformdata"
});

db.connect(err=>{
    if(err) console.log(err);
    else console.log("Database Connected");
});

app.post("/login",(req,res)=>{

    const {name,email,dob,department,phone} = req.body;

    console.log(req.body);

    const sql = "INSERT INTO students(name,email,dob,department,phone) VALUES(?,?,?,?,?)";

    db.query(sql,[name,email,dob,department,phone],(err,result)=>{
        if(err){
            console.log(err);
            res.status(500).json({message:"DB Error"});
        }else{
            res.status(201).json({message:"Inserted"});
        }
    });
});

app.listen(3000,()=>{
    console.log("Server running on 3000");
});
