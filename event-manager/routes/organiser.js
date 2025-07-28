//Organiser routes: display homepage, event details, and site settings
const express = require('express');
require('dotenv').config();
const router = express.Router();
const db = global.db;
//Storing the password for the organiser login
const ORGANISER_PASSWORD = process.env.ORGANISER_PASSWORD;

//Middleware: organiserLoggedIn: Protect routes so only logged-in organisers can proceed
//No inputs, Outputs: redirects to login
function organiserLoggedIn(req, res, next) {
  if (req.session.isOrganiser) {
    return next();
  } else {
    return res.redirect('/organiser/login');
  }
}

//GET /organiser/login: show login page
//No inputs, Outputs: Renders the organiser login page
router.get('/login', (req, res) => {
  res.render('organiser/login', { error: null });
});

//POST /organiser/login: authenticate organiser
//Inputs: password
//Outputs: On success sets session and redirects to organiser home page or else show error message
router.post('/login', (req, res) => {
  const enteredPassword = req.body.password;

  if (enteredPassword === ORGANISER_PASSWORD) {
    req.session.isOrganiser = true;
    return res.redirect('/organiser');
  } else {
    return res.render('organiser/login', { error: 'Incorrect password.' });
  }
});

//GET /organiser/logout: log out organiser
//No inputs, Output: Redirects back to the organiser login page
router.get('/logout', (req, res) => {
  //Destroys the session
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).send('Could not log out.');
    }
    //Redirects to organiser login page
    res.redirect('/organiser/login');
  });
});

//GET /organiser/events/create: show empty form for creating a new event
//Inputs: organiser must be logged in
//Outputs: renders a empty event form for organiser to fill
router.get('/events/create', organiserLoggedIn, (req, res) => {
  res.render('organiser/edit-event', {
    event: {
      title: '',
      description: '',
      event_date: '',
      event_time: '',
      tickets_full_total: 0,
      price_full: 0,
      tickets_concession_total: 0,
      price_concession: 0
    }
  });
});

//POST /organiser/events/create: insert a new event into the database as a draft
//Inputs: req.body fields for title, description, date/time, ticket totals/prices
//Outputs: Redirects to organiser home pageor 500 on DB error
router.post('/events/create', organiserLoggedIn, (req, res) => {
  const {
    title,
    description,
    event_date,
    event_time,
    price_full,
    price_concession,
    tickets_full_total,
    tickets_concession_total
  } = req.body;

  //Converts inputs to numbers
  const priceFull = parseFloat(price_full) || 0;
  const priceConcession = parseFloat(price_concession) || 0;
  const standardTotal = parseInt(tickets_full_total) || 0;
  const concessionTotal = parseInt(tickets_concession_total) || 0;

  //SQL to insert new draft event into the database
  const sql = `
    INSERT INTO events (
      title,
      description,
      event_date,
      event_time,
      tickets_full_total,
      price_full,
      tickets_concession_total,
      price_concession,
       tickets_full,            
      tickets_concession,
      status,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', datetime('now'), datetime('now'))
  `;

  db.run(sql, [
    title,
    description,
    event_date || '',
    event_time,
    standardTotal,
    priceFull,
    concessionTotal,
    priceConcession,
    standardTotal,                 
    concessionTotal
  ], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error.');
    }

    //Redirects to organiser dashboard after inserting
    res.redirect('/organiser');
  });
});

//GET /organiser/events/:id/edit: loads existing event into edit form
//Inputs: event ID from req.params.id 
//Outputs: loads existing event into form, or sends error if not found
router.get('/events/:id/edit', organiserLoggedIn, (req, res) => {
  const eventId = req.params.id;

  db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Error loading event');
    }
    if (!row) {
      return res.status(404).send('Event not found');
    }

    //Render edit form with existing event data
    res.render('organiser/edit-event', { event: row });
  });
});

//POST /organiser/events/:id/edit: update an existing event record
//Inputs: title, description, date/time, ticket totals/prices
//Outputs: updates event in DB and redirects to organiser home page or 500 on DB error
router.post('/events/:id/edit', organiserLoggedIn, (req, res) => {
  const eventId = req.params.id;
  const {
    title,
    description,
    event_date,
    event_time,
    price_full,
    price_concession,
    tickets_full_total,
    tickets_concession_total
  } = req.body;

  //Convert values to numbers
  const priceFull = parseFloat(price_full) || 0;
  const priceConcession = parseFloat(price_concession) || 0;
  const standardTotal = parseInt(tickets_full_total) || 0;
  const concessionTotal = parseInt(tickets_concession_total) || 0;

  //Validate that the respective ticket prices are more than zero
  const errors = [];

  //If title, description, event date ot time is not filled show error
  if (!title || !description || !event_date || !event_time) {
    errors.push('Title, description, date, and time are required.');
  }

  //If price for full tickets is filled and price is not show error
  if (standardTotal > 0 && priceFull <= 0) {
    errors.push('Full ticket price must be greater than 0 if full tickets are entered.');
  }

  //If price for concession tickets is filled and price is not show error
  if (concessionTotal > 0 && priceConcession <= 0) {
    errors.push('Concession ticket price must be greater than 0 if concession tickets are entered.');
  }

  if (errors.length > 0) {
    return res.render('organiser/edit-event', {
      event: {
        id: eventId,
        title,
        description,
        event_date,
        event_time,
        tickets_full_total,
        tickets_concession_total,
        price_full,
        price_concession
      },
      error: errors.join(' ')
    });
  }

  //SQL to update existing event record
  const sql = `
    UPDATE events
    SET
      title = ?,
      description = ?,
      event_date = ?, 
      event_time = ?,
      tickets_full_total = ?,
      tickets_full = ?,  
      tickets_concession_total = ?,
      tickets_concession = ?,
      price_full = ?,
      price_concession = ?,
      created_at = datetime(created_at),
      updated_at = datetime('now')
    WHERE id = ?
  `;

  db.run(sql, [
    title,
    description,
    event_date || '',
    event_time,
    standardTotal,
    standardTotal,
    concessionTotal,
    concessionTotal,
    priceFull,
    priceConcession,
    eventId
  ], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error on update');
    }

    res.redirect('/organiser');
  });
});


//GET /organiser: dashboard showing drafts, published events, and settings
//No Inputs, Outputs: Renders organiser home page with new settings
router.get('/', organiserLoggedIn, (req, res, next) => {
    const settingsSql = `SELECT * FROM settings LIMIT 1`;
  
    //Fetch site settings
    db.get(settingsSql, [], (err, settingsRow) => {
      if (err) {
        console.error(err.message);
        return next(err);
      }
  
      //Fetch all events both draft and organiser
      const eventsSql = `SELECT * FROM events ORDER BY created_at DESC`;
      db.all(eventsSql, [], (err, rows) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send('Database error.');
        }
  
        //Separate drafts and published
        const drafts = rows.filter(event => event.status === 'draft');
        const published = rows.filter(event => event.status === 'published');
  
        //Renders the organiser home page with the other details
        res.render('organiser/home', {
          drafts,
          published,
          settings: settingsRow
        });
      });
    });
  });
  
//POST /organiser/events/:id/publish: publish a draft event
//Inputs: events, status
//Outputs: sets event status to 'published' then redirects to organiser home page
router.post('/events/:id/publish', organiserLoggedIn, (req, res) => {
  
  //SQL to insert new draft event into the database
  const eventId = req.params.id;
  const sql = `
    UPDATE events 
    SET status = 'published', published_at = datetime('now') 
    WHERE id = ?
  `;

  //Update the event to published
  db.run(sql, [eventId], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error.');
    }

    //Redirects to organiser home page
    res.redirect('/organiser');
  });
});

//POST /organiser/events/:id/delete: delete an event
//Inputs: req.params.id and Outputs: Deletes record then redirects to organiser home page
router.post('/events/:id/delete', organiserLoggedIn, (req, res) => {
  
  const eventId = req.params.id;
  const sql = `DELETE FROM events WHERE id = ?`;

  //Delete the event or show error message if can't
  db.run(sql, [eventId], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error.');
    }

     //Redirects to organiser home page
    res.redirect('/organiser');
  });
});
  
//GET /organiser/settings: Load site settings form
//No inputs, Outputs: Renders organiser site setting form
router.get('/settings', organiserLoggedIn, (req, res, next) => {
    const sql = `SELECT * FROM settings LIMIT 1`;
    db.get(sql, [], (err, row) => {
      if (err) {
        console.error(err.message);
        return next(err);
      }
  
      //Renders organiser site setting page
      res.render('organiser/settings', { settings: row });
    });
  });
  
//POST /organiser/settings: update site settings
//Inputs: name, description fromt the form 
//Outputs: Updates DB then redirects to organiser home page
router.post('/settings', organiserLoggedIn, (req, res, next) => {
  const { name, description } = req.body;

  //Validate that both fields are all filled
  if (!name || !description) {
    return res.status(400).send('All fields are required.');
  }

  //SQL to insert new draft event into the database
  const sql = `
    UPDATE settings
    SET name = ?, description = ?
    WHERE id = 1
  `;

  //Updates the setting in the database
  db.run(sql, [name, description], function (err) {
    if (err) {
      console.error(err.message);
      return next(err);
    }

    //Redirects to organiser home page
    res.redirect('/organiser');
  });
});

//GET /organiser/bookings: show all ticket bookings
//No Inputs, Outputs: Renders organiser bookings page
router.get('/bookings', organiserLoggedIn, (req, res, next) => {
  //SQL to insert new draft event into the database
  const sql = `
    SELECT
      bookings.id,
      bookings.event_id,
      bookings.name,
      bookings.email,
      bookings.tickets_full,
      bookings.tickets_concession,
      bookings.created_at,
      events.title AS event_title
    FROM bookings
    JOIN events ON bookings.event_id = events.id
    ORDER BY bookings.id ASC
`;

//Fetch all bookings with the details
db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return next(err);
    }

    //Render the organiser booking page
    res.render('organiser/bookings', { bookings: rows });
  });
});
  
module.exports = router;
