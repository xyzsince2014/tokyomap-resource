const router = require("express").Router();

const resourceController = require("./resourceController");

router
  .options("/resource", resourceController.handleCrossDomainRequest)
  .get("/resource", resourceController.handleCrossDomainRequest, resourceController.checkAccessToken, resourceController.getResource)
  .options("/products", resourceController.handleCrossDomainRequest)
  .get("/products", resourceController.handleCrossDomainRequest, resourceController.checkAccessToken, resourceController.getProducts)
  .get('/favorites', resourceController.checkAccessToken, resourceController.getFavorites)
  .get("/words", resourceController.checkAccessToken, resourceController.readWords)
  .post("/words", resourceController.checkAccessToken, resourceController.writeWords)
  .delete("/words", resourceController.checkAccessToken, resourceController.deleteWords)
  .get('/userinfo', resourceController.checkAccessToken, resourceController.getUserInfo);

module.exports = router;
