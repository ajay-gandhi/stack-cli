
/**
 * Utility functions
 */

var inquirer = require('inquirer'),
    Promise  = require('es6-promise').Promise;

/**
 * Wraps inquirer to ask a list-type question
 */
var ask_list = function (answer_choices, prompt) {
  var questions = [{
    type: 'list',
    name: 'main_answer',
    message: prompt,
    choices: answer_choices
  }];

  return new Promise(function (resolve, reject) {
    inquirer.prompt(questions, function (answers) {
      resolve(answers.main_answer);
    });
  });
}

/** 
 * Wraps the stack overflow question function to keep asking if the user selects
 * "More"
 */
var pick_so_question = function (stack_overflow, searchterm, tags) {
  var q_data;

  return new Promise(function (resolve, reject) {
    stack_overflow
      .search_questions(searchterm, tags)
      .then(function (questions) {
        q_data = questions;

        // Create answer choices
        var answer_choices = q_data.data.slice();
        answer_choices.push(new inquirer.Separator());

        if (q_data.more) {
          answer_choices.push({
            name: 'More Questions',
            value: 'request_more_questions'
          });
          answer_choices.push(new inquirer.Separator());
        }

        // Ask
        return ask_list(answer_choices, 'Pick a question:');
      })
      .then(function (so_question) {
        // User requested more questions
        if (so_question === 'request_more_questions') {
          pick_so_question.then(resolve);

        // User picked a question
        } else {
          // Only want ids
          var ids = q_data.data.map(function (q) {
            return q.value;
          });

          resolve({
            all: ids,
            main: so_question
          });
        }
      })
      .catch(function (e) {
        console.error(e);
      });
  });
}

/**
 * Keeps asking user about which answer to display (or done)
 */
var answers_options = function (answers, curr_id, printer) {
  return new Promise(function (resolve, reject) {
      // Create commands
      var commands = [
        {
          name: 'See next answer',
          value: 'next'
        },
        {
          name: 'See previous answer',
          value: 'prev'
        },
        {
          name: 'View in browser',
          value: 'open'
        },
        {
          name: 'Done',
          value: 'done'
        }
      ];

      // Ask about next command
      ask_list(commands, 'What would you like to do?')
        .then(function (command) {
          // Just quit
          if (command === 'done') {
            resolve();

          // Open in browser
          } else if (command === 'open') {
            resolve(answers[curr_id].link);

          // Display next answer
          } else if (command === 'next') {
            // Index of next answer, wrapping around
            var next_idx = (curr_id + 1 == answers.length) ? 0 : curr_id + 1;

            // Print answer
            printer.ruler();
            printer.content(answers[next_idx].body);
            printer.ruler();

            // Ask again
            answers_options(answers, next_idx, printer).then(resolve);

          // Display previous answer
          } else if (command === 'prev') {
            // Index of previous answer, wrapping around
            var prev_idx = (curr_id == 0) ? answers.length - 1 : curr_id - 1;

            // Print answer
            printer.ruler();
            printer.content(answers[prev_idx].body);
            printer.ruler();

            // Ask again
            answers_options(answers, prev_idx, printer).then(resolve);
          }
        });
  });
}

/**
 * Sanitizes a string for inquirer, e.g. removes line breaks
 */
var sanitize = function (str) {
  return str.replace(/\r?\n|\r/g, '');
}

module.exports.ask_list         = ask_list;
module.exports.pick_so_question = pick_so_question;
module.exports.answers_options  = answers_options;
module.exports.sanitize         = sanitize;
