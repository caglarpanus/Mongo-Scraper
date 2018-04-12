// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

// Requiring Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");

// Scraping tools
var request = require("request");
var cheerio = require("cheerio");

// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

//Define port
var PORT = process.env.PORT || 8080;

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

// Make public a static dir
app.use(express.static("public"));

// Set Handlebars.
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({
    defaultLayout: "main",
    modalDir: path.join(__dirname, "/views/layouts/modal")
}));
app.set("view engine", "handlebars");

// Database configuration with mongoose
var databaseUri = "mongodb://localhost/mongoosearticles";

var db = mongoose.connection;

// A GET request to scrape the website

app.get("/scrape", function(req,res){
    //We first must grab the body of the html
    request("https://www.nytimes.com/", function(error,response,html){
        //then we load it to the cheerio, and $ sign is our selector.Don't confuse with jQuery. 
        var $ = cheerio.load(html);
        //we grab h2 with article tag
        $("article").each(function(i,element){
            //our results will be saved into this variable.
            var result= {};

            //add the title and summary of every news, and save them into result variable.
            result.title = $(this).children("h2").text();
            result.summary = $(this).children(".summary").text();
            result.link = $(this).children("h2").children("a").attr("href");

            //now we must pass our result object into the entry,
            //Article below is coming from out models which helps us create a new entry in our database.
            var entry = new Article(result);

            entry.save(function(err, doc){
                if(err){
                    console.log(err)
                }
                else{
                    console.log(doc)
                }
            });
        });
        res.send("Scrape is done!")
    })
});

//GET request to render handlebars

app.get("/", function(req,res){
    Article.find({"saved": false}, function(err,data){
        var hbsObject = {
            article: data
          };
        console.log(hbsObject);
        res.render("home", hbsObject);
    });
});

app.get("/saved", function(req,res){
    Article.saved.find({"saved":true})
    .populate("notes")
    .then(function(err,articles){
        var hbsObject = {
            article: articles
            };
        
        res.render("saved",hbsObject);
    });
})

//GET all the articles from mongoDB 
app.get("/articles", function(req,res){
    //grab all the articles from Article
    Article.find({}, function(err,data){
        if(err){
            console.log(err);
        }
        else{
            console.log(data);
            res.send(data);
        }
    });
});

//now grab all the articles by their IDs 

app.get("/articles/:id", function(req,res){
    //find the matching ID 
    Article.findOne({"_id":req.params.id})
    //populate all the notes associated with that ID
    .populate("note")
    .then(function(err,data){
        if(err){
            console.log(err);
        }
        else{
            //sending data to the browser as json object
            res.json(data);
        }
    });
});

//Save an article
app.post("/articles/saved/:id", function(req,res){
    //we must use id to find and update its saved boolean
    Article.findOneAndUpdate({"_id":req.params.id}, {"saved":true})
    //we use promise to execute query above.
    .then(function(err,data){
        if(err){
            console.log(err);
        }
        else{
            //sending data or the record to the browser
            res.send(data);
        }
    });
});

//Delete an article
app.post("/articles/delete/:id", function(req,res){
     //we must use id to find and update its saved boolean
     Article.findByIdAndUpdate({"_id":req.params.id},{"saved":false, "notes":[]})
     .then(function(err,data){
         if(err){
             console.log(err);
         }
         else{
             res.send(data);
         }
     })
})

//create or add a new note 
app.post("/notes/save/:id", function(req,res){
    //create a new not and this must past through req.body
    var newNote = new Note({
        body:req.body.text,
        article:req.params.id
    });
    console.log(req.body);
    //saving new note to database
    newNote.save(function(err,note){
        if(err){
            console.log(err);
        }
        else{
            Article.findOneAndUpdate({"_id":req.params.id}, {$push:{"notes":note}})
            .then(function(err){
                if(err){
                    console.log(err);
                }
                else{
                    res.send(note);
                }
            });
        }
    });
});

// Delete a note
app.delete("/notes/delete/:note_id/:article_id", function(req,res){
    //use note ID to find and delete it
    Note.findOneAndRemove({"_id":req.params.note_id}, function(err){
        if(err){
            console.log(err);
            res.send(err);
        }
        else{
            Article.findOneAndUpdate({"_id":req.params.article_id},{$pull:{"notes":req.params.note_id}})
            .then(function(err){
                if(err){
                    console.log(err);
                    res.send(err);
                }
                else{
                    res.send("Note Deleted")
                }
            })
        }
    })
})

// Listen on port
app.listen(port, function() {
    console.log("App running on port " + PORT);
  });