async function loadOwnerAnalytics(){

    const token = localStorage.getItem("token");

    const res = await fetch(
        "http://localhost:5000/api/analytics/owner-summary",
        {
            headers:{
                Authorization:`Bearer ${token}`
            }
        }
    );

    const data = await res.json();

    document.getElementById("totalRevenue").innerText =
        data?.total_revenue || 0;
}