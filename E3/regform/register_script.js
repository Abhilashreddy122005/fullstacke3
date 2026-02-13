document.getElementById("registerform").addEventListener("submit", function(event) {
    event.preventDefault();
    
    let username = document.getElementById("username").value;
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;
    let confirmpassword = document.getElementById("confirmpassword").value;
    
    if(username === "" || email === "" || password === "" || confirmpassword === "") {
        alert("Please fill all the fields");
        return;
    }
    
    if(password !== confirmpassword) {
        alert("Passwords do not match");
        return;
    }
    
    alert("Registration successful!");
    document.getElementById("registerform").reset();
});