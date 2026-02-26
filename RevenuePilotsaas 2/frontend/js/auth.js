async function login(){

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch("http://localhost:5000/api/auth/login",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({email,password})
    });

    const data = await res.json();

    if(data?.session?.access_token){

        localStorage.setItem(
            "token",
            data.session.access_token
        );

        window.location.href="/dashboard-owner.html";
    }else{
        alert("Login failed");
    }
}