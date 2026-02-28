const supabase = require("../config/supabase");

async function authMiddleware(req,res,next){

    try{

        const token = req.headers.authorization?.split(" ")[1];

        if(!token){
            return res.status(401).json({error:"Unauthorized"});
        }

        const { data, error } = await supabase.auth.getUser(token);

        if(error || !data.user){
            return res.status(401).json({error:"Invalid session"});
        }

        req.user = data.user;

        next();

    }catch{
        res.status(500).json({error:"Auth middleware failure"});
    }
}

module.exports = authMiddleware;