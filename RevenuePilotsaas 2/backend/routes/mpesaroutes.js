const router = require("express").Router();
const mpesaController = require("../controllers/mpesaController");

router.post("/stk", mpesaController.initiateSTK);
router.post("/callback", mpesaController.callback);

module.exports = router;