//Dependencies 
var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");

// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");

// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
//Set up the port
var PORT = process.env.PORT || 8080;

// Initialize Express
var app = express();
// Use body parser
app.use(bodyParser.urlencoded({extended: false}));
// Make public a static directory
app.use(express.static(process.cwd() + "/public"));

// Database configuration with mongoose
var databaseUri = "mongodb://localhost/mongoosearticles";

if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI);
  } else {
    mongoose.connect(databaseUri);
  }
  
  var db = mongoose.connection;

//set engine and default for handlebars
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

//Scraping articles from New York Times
var scrape = function(cb) {

    var articlesArr = [];
  
    request("https://www.nytimes.com/", function(error, response, html) {
  
        var $ = cheerio.load(html);
  
  
        $("h2.story-heading").each(function(i, element) {
  
            var result = {};
  
            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this).children("a").text();
            result.link = $(this).children("a").attr("href");
  
            if (result.title !== "" && result.link !== "") {
                articlesArr.push(result);
            }
        });
        cb(articlesArr);
    });
  
  };
  

//setup listener
app.listen(port, function() {
    console.log("App running on port " + PORT);
  });