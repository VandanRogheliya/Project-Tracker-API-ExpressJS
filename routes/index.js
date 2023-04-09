// for testing purposes
var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.json({ title: "Project-T API" });
});

module.exports = router;
