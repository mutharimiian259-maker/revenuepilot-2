const supabase = require("../config/supabase");
const { generateAccessToken } = require("../services/mpesaService");
const { createLedgerEntries } = require("../services/ledgerService");

exports.initiateSTK = async (req,res)=>{

    const { phone, amount, business_id } = req.body;

    const token = await generateAccessToken();

    const timestamp = new Date()
        .toISOString()
        .replace(/[-:.TZ]/g,"")
        .slice(0,14);

    const password = Buffer.from(
        process.env.MPESA_SHORTCODE +
        process.env.MPESA_PASSKEY +
        timestamp
    ).toString("base64");

    const stkResponse = await fetch(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        {
            method:"POST",
            headers:{
                Authorization:`Bearer ${token}`,
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                BusinessShortCode:process.env.MPESA_SHORTCODE,
                Password:password,
                Timestamp:timestamp,
                TransactionType:"CustomerPayBillOnline",
                Amount:amount,
                PartyA:phone,
                PartyB:process.env.MPESA_SHORTCODE,
                PhoneNumber:phone,
                CallBackURL:process.env.MPESA_CALLBACK_URL,
                AccountReference:"RevenuePilot",
                TransactionDesc:"Business Payment"
            })
        }
    );

    const { data } = await supabase
        .from("stk_transactions")
        .insert([{
            phone,
            amount,
            business_id,
            status:"PENDING"
        }])
        .select()
        .single();

    res.json(data);
};

exports.callback = async (req,res)=>{

    const callbackData = req.body;

    const resultCode =
        callbackData.Body.stkCallback.ResultCode;

    const merchantRequestID =
        callbackData.Body.stkCallback.MerchantRequestID;

    const status = resultCode === 0 ? "SUCCESS" : "FAILED";

    const { data } = await supabase
        .from("stk_transactions")
        .update({ status })
        .eq("merchant_request_id", merchantRequestID)
        .select()
        .single();

    if(status === "SUCCESS"){
        await createLedgerEntries(data);

        await supabase.from("payment_audit_logs")
            .insert([{
                transaction_id:data.id,
                status:"SUCCESS"
            }]);
    }

    res.sendStatus(200);
};