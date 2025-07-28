//index.js: This is your main app entry point
//Module Imports
//Set up express, bodyparser and EJS
const express = require('express');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs'); //set the app to use ejs for rendering
app.use(express.static(__dirname + '/public')); //set location of static files

//Seccion Setup
const session = require('express-session');

//Purpose: enable session management for login/logout
//Inputs: secret key, config options and Outputs: Creates session cookies to track user logins
app.use(session({
  //Secret for signing session cookies
  secret: process.env.SESSION_SECRET || 'fallbackSecret',
  //Don't resave unchanged sessions
  resave: false,
  //Don't save uninitialized sessions
  saveUninitialized: false,
  //Use HTTPS cookies in production
  cookie: {
    httpOnly: true,
    secure:  process.env.NODE_ENV === 'production', 
    //Expire after 1 hour       
    maxAge: 60 * 60 * 1000 
  }
}));

//Purpose: connect to SQLite database and make it globally accessible
//Inputs: ./database.db path and Outputs: connected DB stored in global.db
const sqlite3 = require('sqlite3').verbose();
global.db = new sqlite3.Database('./database.db',function(err){
    if(err){
        console.error(err);
        //Bail out we can't connect to the DB
        process.exit(1);
    } else {
        console.log("Database connected");
        //Tell SQLite to pay attention to foreign key constraints
        global.db.run("PRAGMA foreign_keys=ON"); 
    }
});

//GET/ Purpose: Render the main home page
//No inputs, outputs: Renders mainhome.ejs
app.get('/', (req, res, next) => {
    const sql = `SELECT * FROM settings LIMIT 1`; 
  
    //Pass error to default Express error handler
    db.get(sql, [], (err, row) => {
      if (err) {
        console.error(err.message);
        return next(err);
      }
  
      //Renders main home page 
      res.render('mainhome', { settings: row }); 
    });
  });
  
//Add all organiser route handles under /organsier 
//Purpose: Handle organiser login, event creation, management, settings
//Input and output depends on the route chosen, detailed info can be found on organiser.js
const organiserRoutes = require('./routes/organiser');
app.use('/organiser', organiserRoutes);

//Add all attendee route handles under /attendee 
//Purpose: Display events to attendees, allow booking
//Input and output depends on the route chosen, detailed info can be found on attendee.js
const attendeeRoutes = require('./routes/attendee');
app.use('/attendee', attendeeRoutes);


//Make the web application listen for HTTP requests
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})



