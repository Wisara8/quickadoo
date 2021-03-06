// check if there is any duplicate user data
const checkExistingUser = (knex, userObj) => {
  const { first_name, last_name, email } = userObj;
  return new Promise((resolve, reject) => {
    knex.where(function () {
      this.where('first_name', first_name)
        .orWhere('last_name', last_name)
        .orWhere('email', email)
    }).select('id').table('users')
      .then(user_id => {
        resolve(user_id);
      })
      .catch(err => {
        reject(err);
      })
  });
};

// calculate how many options were returned
const calculateOptionLen = (options, fields) => (Object.keys(options).length - 5) / fields.length;

// take out all the numbers from option keys (i.e. name-1 => name)
const modifyOptionKeys = (optionObj, optionKeys, eventId, i) => {
  const optionResults = {};
  optionKeys.forEach(key => {
    const fieldName = `${key}-${i + 1}`;
    optionResults[key] = optionObj[fieldName] ? optionObj[fieldName] : null;
  })
  optionResults.event_id = eventId;
  return optionResults;
};

// parse out option fields from form data and return them as an array of objects
const parseOptions = (userData, event_id) => {
  // options: calculate how many options were returned
  // # of returned options = (# of total fields - 5) / 4
  // 5: (3 user data fields, 2 event data fields))
  // 4: (4 option fields)
  const optionFields = ['name', 'start_time', 'end_time', 'note'];
  const optionLen = calculateOptionLen(userData, optionFields);
  const results = [];
  for (let i = 0; i < optionLen; i++) {
    const options = modifyOptionKeys(userData, optionFields, event_id, i);
    // results should be an array of objects to insert to db
    results.push(options);
  }
  return results;
};

// insert record when there is no duplicate
const insertTbRow = (knex, insertObj, tb) => {
  return new Promise((resolve, reject) => {
    knex(tb).insert(insertObj).returning('id')
      .then(id => {
        // event added. return event_id
        if (id.length) {
          resolve(id[0]);
        } else {
          // event not added. return error message
          reject({ message: `${tb} insertion unsuccessful. Please check your knex syntax!`, });
        }
      });
  });
};

async function updateFormData(knex, userObj, eventObj, optionForm) {
  // check if user exists. return row_id if exists or null for new record
  let userRecord = await checkExistingUser(knex, userObj);
  let user_id = '';
  if (userRecord.length) {
    // user exists in db. insert the user_id and the event record in events tb
    user_id = userRecord[0].id;
    console.log(`user exists. user_id = ${user_id}`);
  } else {
    // user doesn't exist in db. insert the new user record in users tb
    user_id = await insertTbRow(knex, userObj, 'users');
    console.log(`user DOESN'T exist. added user_id: ${user_id}`);
  }
  // append user_id into the event object
  eventObj.creator_id = user_id;
  // insert it to events tb
  const event_id = await insertTbRow(knex, eventObj, 'events');

  // process the options obj
  const optionInputs = parseOptions(optionForm, event_id);
  // insert it to options tb
  const option_id = await insertTbRow(knex, optionInputs, 'options');
  return { user_id, event_id, option_id };
}

module.exports = updateFormData;