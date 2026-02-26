const axios = require("axios");

async function generateAccessToken(){

    const credentials = Buffer
        .from(
            process.env.MPESA_CONSUMER_KEY + ":" +
            process.env.MPESA_CONSUMER_SECRET
        )
        .toString("base64");

    const response = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        {
            headers:{
                Authorization:`Basic ${credentials}`
            }
        }
    );

    return response.data.access_token;
}

module.exports = { generateAccessToken };