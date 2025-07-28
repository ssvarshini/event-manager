//Attendee routes: display homepage, event details, and handle bookings
const express = require('express');
const router = express.Router();
const db = global.db;

//GET /attendee: Render attendee homepage with site settings and published events
//No input, outputs: Renders attendee home page
router.get('/', (req, res) => {
  // First get settings
  db.get(`SELECT name, description FROM settings WHERE id = 1`, [], (err, settings) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error while loading site settings.');
    }

  //Then get all published events details
  const sql = `
    SELECT
      id,
      title,
      description,
      event_date,
      event_time,
      tickets_full,
      price_full,
      tickets_concession,
      price_concession
    FROM events
    WHERE status = 'published'
    ORDER BY event_date ASC
`;

//If there is an error show error message
db.all(sql, [], (err, events) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Database error while loading events.');
      }
      
      //Renders the attendee homepage
      res.render('attendee/home', {
        settings,
        events
      });
    });
  });
});

//GET /attendee/events/:id: Shows details for a single published event
//Inputs: req.params.id
//Outputs: Renders attendee event or 404 if not found
router.get('/events/:id', (req, res) => {
  const eventId = req.params.id;
  const sql = `SELECT * FROM events WHERE id = ? AND status = 'published'`;

  //If database error, show error message
  db.get(sql, [eventId], (err, event) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error.');
    }

    //If event not found, show error message
    if (!event) {
      return res.status(404).send('Event not found or not published.');
    }

    //Render the attendee event page
    res.render('attendee/event', { event });
  });
});


//POST /attendee/events/:id/book: Route to handle booking tickets and update event availability for an event
//Inputs: name, email, standard_quantity, concession_quantity
//Outputs: renders booking confim page or error status
router.post('/events/:id/book', (req, res) => {
  const eventId = req.params.id;
   //Destructure form data from request body
  const {
    name,
    email,
    standard_quantity,
    concession_quantity,
  } = req.body;

  //Parse ticket quantities 
  const standard = parseInt(standard_quantity) || 0;
  const concession = parseInt(concession_quantity) || 0;

  //Validate input: name must be provided and at least one ticket selected
  if (!name || (standard + concession) === 0) {
    return res.status(400).send("Please enter your name and select at least one ticket.");
  }

  //Fetch the event from the database to ensure it's published and exists
  const sql = `SELECT * FROM events WHERE id = ? AND status = 'published'`;
  db.get(sql, [eventId], (err, event) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send("Database error.");
    }

    //If not found, show error message
    if (!event) {
      return res.status(404).send("Event not found.");
    }
    
    //Check availability for the tickets
    if (standard > event.tickets_full ||
        concession > event.tickets_concession) {
      return res.status(400).send("You are trying to book more tickets than are available.");
    }

    //Update the event ticket counts
    const updateSql = `
      UPDATE events SET
        tickets_full = tickets_full - ?,
        tickets_concession = tickets_concession - ?
      WHERE id = ?
    `;

    db.run(updateSql, [standard, concession, eventId], function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).send("Booking failed.");
      }

      //Insert a new booking record into the `bookings` table
      const insertSql = `
        INSERT INTO bookings (
          event_id,
          name,
          email,
          tickets_full,
          tickets_concession
        )
        VALUES (?, ?, ?, ?, ?)
      `;

      db.run(insertSql, [
        eventId,
        name,
        email,
        standard,
        concession
      ], function (err) {
        if (err) {
          console.error(err.message);
          return res.status(500).send("Failed to save booking.");
        }

        //Renders the booking confirm page
        res.render('attendee/booking-confirm', {
          name,
          eventTitle: event.title,
          standard,
          concession
        });
      });
    });
  });
});
  
module.exports = router;