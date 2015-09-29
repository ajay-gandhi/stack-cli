#!/usr/bin/env node

// NPM modules
var program  = require('commander'),
    inquirer = require('inquirer'),
    open     = require('open'),
    readline = require('readline'),
    Promise  = require('es6-promise').Promise;

// Local modules
var stack_overflow = require('./lib/stackoverflow'),
    printer        = require('./lib/printer'),
    util           = require('./lib/util');

// Formats the inputted tags for the StackOverflow API
var so_format = function (str) {
  return str
    .replace(',', ';')
    // Some hardcoded aliases
    .replace(';js;', ';javascript;');
}

program
  .version(require('./package.json').version)
  .usage('<searchterm>')
  .option('-t, --tags <items>', 'tags to search under', so_format)
  .parse(process.argv);

if (!program.args.length) {
    program.help();
}

/** 
 * Wraps the question picker to keep asking if the user selects "More"
 */
var pick_so_question = function () {
  var q_data;

  return new Promise(function (resolve, reject) {
    stack_overflow
      .search_questions(program.args.join(' '), program.tags)
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

        // Create questions
        return util.ask_list(answer_choices, 'Pick a question:');
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

var user_q_id,
    user_q_url;

// List the questions
pick_so_question()
  .then(function (q_data) {
    user_q_id = q_data.main;

    // Retrieve the questions, and display the selected one
    return stack_overflow.get_questions(q_data.all);
  })
  .then(function (more_data) {
    // Only want user's q
    var user_q = more_data.reduce(function (acc, q) {
      return (q.id == user_q_id) ? q : acc;
    }, false);

    user_q_url = user_q.link;

    printer.ruler();
    printer.title(user_q.title);
    printer.ruler();
    printer.content(user_q.body);

    // Ask for next command
    var commands = [
      {
        name: 'View answers',
        value: 'answers'
      },
      {
        name: 'View in browser',
        value: 'open'
      }
    ];
    return util.ask_list(commands, 'What would you like to do?');
  })
  .then(function (command) {
    // Open in browser
    if (command === 'open') {
      open(user_q_url);

    // Fetch and display answers
    } else if (command === 'answers') {
      return stack_overflow.get_answers(user_q_id);
    }
  })
  .then(function (answers) {
    var ans_choices = answers.map(function (a) {
      return {
        name: a.summary,
        value: a.body
      }
    });

    return util.ask_list(ans_choices, 'Choose an answer:');
  })
  .then(function (answer_content) {
    printer.content(answer_content);
  });
