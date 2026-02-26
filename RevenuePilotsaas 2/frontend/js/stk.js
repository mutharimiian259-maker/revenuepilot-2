async function requestStk(){

    const token = localStorage.getItem("token");

    const phone = document.getElementById("phone").value;
    const amount = document.getElementById("amount").value;

    await fetch("http://localhost:5000/api/stk/request",{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            Authorization:`Bearer ${token}`
        },
        body:JSON.stringify({
            phone,
            amount
        })
    });

    alert("Payment request sent");
}