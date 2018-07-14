"use strict";

// enable dotenv package
require('dotenv').config();

// const IP = window.location.hostname;
// process.env.PORT in case Heroku
const PORT = process.env.PORT || 8080;
const ENV = process.env.ENV || "development";

// load npm packages
const express = require("express");
const bodyParser = require("body-parser");
const sass = require("node-sass-middleware");

// enable express app
const app = express();

// knex configurations
const knexConfig = require("./knexfile");
const knex = require("knex")(knexConfig[ENV]);

// logging helper
const morgan = require('morgan');
const knexLogger = require('knex-logger');

// ROUTES
// Seperated Routes for each Resource
const usersRoutes = require("./routes/users");

// use ejs as a view engine
app.set("view engine", "ejs");

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes,
//         yellow for client error codes, cyan for redirection codes,
//         and uncolored for all other codes.
app.use(morgan('dev'));

// MIDDLEWARES
// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/styles", sass({
  src: __dirname + "/styles",
  dest: __dirname + "/public/styles",
  debug: true,
  outputStyle: 'expanded'
}));
// app.use(express.static("/public"));
app.use(express.static(__dirname + '/public'));

// ROUTES
// Mount routes
app.use('/', usersRoutes(knex));

// listen to port
// if we set the IP address to '0.0.0.0', anyone can view the web page through my IP address
// how to check IP address: 'ifconfig' on linux terminal -> check 'inet'
app.listen(PORT, '0.0.0.0', () => {
  console.log("Example app listening on port " + PORT);
});
