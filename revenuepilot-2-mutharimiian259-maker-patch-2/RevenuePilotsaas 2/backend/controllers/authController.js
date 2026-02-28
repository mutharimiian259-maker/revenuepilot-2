const supabase = require("../config/supabase");

exports.login = async (req,res)=>{

    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if(error) return res.status(400).json(error);

    res.json(data);
};

exports.googleAuth = async (req,res)=>{

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider:"google"
    });

    if(error) return res.status(400).json(error);

    res.json(data);
};