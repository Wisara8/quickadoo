'use strict';
const express = require('express');
const router = express.Router();

// import functions
const { validateVoters, castVotes } = require('../libs/update-voter-queries');
const getEventRecord = require('../libs/update-event-queries');
const updateFormData = require('../libs/update-form-queries');
const { filterObj, generateRandomString, capitaliseFirstLetter } = require('../libs/query-helpers');

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

    getEventRecord(knex, url)
      .then(stats => {
        //console.log(stats);
        if (url === stats.eventRecord[0].admin_url) {
          //console.log('render admin page');
          res.status(200).render('event', { formData: stats.eventRecord });
        } else {
          //console.log('poll');
          res.status(200).render('poll', { poll: stats });
        }
      })
      .catch(err => {
        console.log(err);
      })
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
    const randomStrLen = 7;
    const event = {
      title,
      description,
      created_at: new Date(Date.now()),
      admin_url: generateRandomString(randomStrLen),
      poll_url: generateRandomString(randomStrLen)
    };

    // update form data to appropriate tables
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

  //check if email exists and if exists, returns voters info
  router.post('/voters', (req, res) => {
    const { email } = req.body;

    validateVoters(knex, email)
      .then(voterResult => {
        res.status(200).send(voterResult);
      })
      .catch(err => {
        console.log(err);
      })
  });

  router.post('/events/:event_id/vote', (req, res) => {
    // fields that we need
    const { voter_first_name, voter_last_name, voter_email, poll_url, poll_info } = req.body;
    const first_name = capitaliseFirstLetter(voter_first_name);
    const last_name = capitaliseFirstLetter(voter_last_name);

    // check if the fields have some value
    if (!voter_email || !first_name || !last_name) {
      const err = {
        poll: JSON.parse(poll_info),
        message: 'Please fill your e-mail and name'
      };
      res.status(302).render('poll', err);
      return;
    }

    // we filter all the keys 'option?' where ? is any number
    // and we return all the options_id that the user selected
    const filteredOptions = filterObj(req.body, /option/);
    const voterData = {
      first_name,
      last_name,
      email: voter_email
    };

    castVotes(knex, voter_email, voterData, filteredOptions)
      .then(() => {
        console.log("we are here ", poll_url);
        // 2 - redirect to the thanks page
      
        res.status(200).render('thanks', { url: poll_url });
      })
      .catch(err => {
        console.log(err);
      });
  });

  return router;
};