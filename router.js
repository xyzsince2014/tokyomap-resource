const router = require("express").Router();

const resourceController = require("./resourceController");

router
  .get('/userinfo', resourceController.checkAccessToken, resourceController.getUserInfo);

module.exports = router;
