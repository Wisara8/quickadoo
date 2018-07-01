'use strict';
const express = require('express');
const router = express.Router();
const { updateFormData, generateRandomString, capitaliseFirstLetter } = require('../libs/query-helpers');

module.exports = knex => {
  // root. redirect to /home with http status of 302
  router.get('/', (req, res) => {
    res.status(302).redirect('/home');
  });

  // landing page. render index.ejs (home page)
  router.get('/home', (req, res) => {
    res.render('index');
  });

  // 'click to start' btn on /home renders event.ejs
  router.get('/events', (req, res) => {
    res.render('event');
  });

  // url can be either admin_url (only admin knows it) or poll_url (public)
  router.get('/events/:url', (req, res) => {
    // use url to see if there is a corresponding event saved in psql
    const { url } = req.params;

    const getEventId = (knex, url) => {
      return new Promise((resolve, reject) => {
        knex.select('id').from('events')
          .where(function () {
            this.where('events.admin_url', url).orWhere('events.poll_url', url)
          }).then(eventId => {
            if (eventId.length) {
              resolve(eventId[0].id);
            } else {
              reject('no event_id found!');
            }
          })
      })
    }

    const checkExistingEvent = (knex, url) => {
      return new Promise((resolve, reject) => {
        knex.select('*').from('options')
          .join('events', 'options.event_id', 'events.id')
          .join('users', 'events.creator_id', 'users.id')
          .where(function () {
            this.where('events.admin_url', url).orWhere('events.poll_url', url)
          })
          .then(eventRecord => {
            if (eventRecord.length) {
              resolve(eventRecord);
            } else {
              reject('no url found!');
            }
          })
      })
    };


    const countVoters = (knex, event_id) => {
      return new Promise((resolve, reject) => {
        knex.raw(`select option_id, count(person_id) from
        (select id from options where event_id = ${event_id}) as tb1
        join option_voters on tb1.id = option_voters.option_id group by option_id;`)
          .then(result => {
            resolve(result.rows);
          })
      })
    }


    async function getEventRecord(knex, url) {
      const event_id = await getEventId(knex, url);
      const eventRecord = await checkExistingEvent(knex, url);
      const voterCounts = await countVoters(knex, event_id);
      return { eventRecord, voterCounts };
    }

    getEventRecord(knex, url)
      .then(stats => {
        console.log(stats);
        if (url === stats.eventRecord[0].admin_url) {
          console.log('render admin page');
          res.status(200).render('event', { formData: stats.eventRecord });
        } else {
          console.log('poll');
          res.status(200).render('poll', { poll: stats });
        }
      })
      .catch(err => {
        console.log(err);
      })
  });

  router.get("/api/users", (req, res) => {
    knex
      .select("*")
      .from("users")
      .then((results) => {
        res.json(results);
      });
  });

  // user submits the complete form
  router.post('/events', (req, res) => {
    // update neccessary tables to save event data
    // Note: form is validated on the client side
    const formValues = JSON.parse(Object.keys(req.body)[0]);

    // user data
    let { first_name, last_name, email } = formValues;
    // make sure first letter of name is capitalised
    first_name = capitaliseFirstLetter(first_name);
    last_name = capitaliseFirstLetter(last_name);
    const user = { first_name, last_name, email };

    // event data
    const { title, description } = formValues;
    const event = {
      title,
      description,
      created_at: new Date(),
      admin_url: generateRandomString(7),
      poll_url: generateRandomString(7)
    };

    updateFormData(knex, user, event, formValues).then(ids => {
      console.log('update complete', ids);

      res.status(200).send({
        admin_url: event.admin_url,
        poll_url: event.poll_url
      });
    }).catch(err => {
      console.log(err);
    });
  })

  return router;
}