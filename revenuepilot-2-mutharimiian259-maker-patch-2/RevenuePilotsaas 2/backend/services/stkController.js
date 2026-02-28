const supabase = require("../config/supabase");
const { processStkPayment } = require("../services/paymentService");

exports.requestPayment = async (req,res)=>{

    const { phone, amount, customer_id } = req.body;

    const { data, error } = await supabase
        .from("stk_transactions")
        .insert([{
            phone,
            amount,
            customer_id,
            status:"PENDING"
        }])
        .select()
        .single();

    if(error) return res.status(400).json(error);

    processStkPayment(data.id);

    res.json(data);
};