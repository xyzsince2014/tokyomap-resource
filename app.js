const cons = require('consolidate');
const express = require("express");
const path = require("path");
const app = express();

const router = require('./router');

app.engine('html', cons.underscore);
app.set('view engine', 'html');
app.set("views", path.join(__dirname, "public/html"));
app.set('json spaces', 2);

app
  .use(express.urlencoded({ extended: true }))
  .use(express.static(path.join(__dirname, "public")))
  .use("/", router);

module.exports = app;
