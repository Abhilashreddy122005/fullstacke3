function Save(){

    let name = document.getElementById("name").value;
    let email = document.getElementById("email").value;
    let dob = document.getElementById("dob").value;
    let department = document.getElementById("department").value;
    let phone = document.getElementById("phone").value;

    if(!name || !email || !dob || !department || !phone){
        alert("Fill all fields");
        return;
    }

    fetch("http://localhost:3000/login",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            name,
            email,
            dob,
            department,
            phone
        })
    })
    .then(res => {
        console.log("Response status:", res.status);
        if (res.status === 201 || res.ok) {
            return res.json().then(data => {
                alert("Registration Successful");
                document.getElementById("registerform").reset();
                console.log(data);
            });
        } else {
            return res.json().then(err => {
                alert("Registration failed! " + (err.message || ""));
            });
        }
    })
    .catch(err=>{
        console.log(err);
        alert("Server error");
    });
}
