const supabase = require("../config/supabase");

exports.getOwnerSummary = async (req,res)=>{

    const { data, error } = await supabase
        .from("revenue_summary")
        .select("*")
        .single();

    if(error) return res.status(400).json(error);

    res.json(data);
};