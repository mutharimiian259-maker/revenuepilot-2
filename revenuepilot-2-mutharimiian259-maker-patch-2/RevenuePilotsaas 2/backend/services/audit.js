const supabase = require("../config/supabase");

async function createAuditLog(businessId, action, description) {

    await supabase.from("audit_logs").insert({
        business_id: businessId,
        action,
        description,
        created_at: new Date()
    });
}

module.exports = { createAuditLog };