const router = require("express").Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const analyticsController = require("../controllers/analyticsController");

router.get(
    "/owner-summary",
    authMiddleware,
    roleMiddleware("owner"),
    analyticsController.getOwnerSummary
);

module.exports = router;