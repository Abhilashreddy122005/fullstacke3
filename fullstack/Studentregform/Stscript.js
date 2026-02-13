//this is the script for student registration form this connects the stregister.css and streg.html and saves this to the server 

function Save(){

    var name = document.getElementById("Name").value;
    var email = document.getElementById("email").value;
    var dob = document.getElementById("dob").value;
    var department = document.getElementById("department").value;
    var year = document.getElementById("year").value;
    var phone = document.getElementById("phone").value;
    
    if(name === "" || email === "" || dob === "" || year === "" || phone === ""|| department === "") {
        alert("Please fill all the fields");
        return;
    }

    var data = {
        name: name,
        email: email,
        dob: dob,
        department: department,
        year: year,
        phone: phone

    };

    fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {

            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok) {
            alert("Registration successful!");
            document.getElementById("registerform").reset();
        } else {
            alert("Registration failed!");
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("An error occurred while registering!");
    });
}



