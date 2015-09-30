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

// Local cache of properties
// Need this to keep a copy of vars between promises
var cache = {
  user_q_id:  0,
  user_q_url: '',
  answers:    {}
};

util
  // List the questions relevant to the search
  .pick_so_question(stack_overflow, program.args.join(' '), program.tags)
  // Retrieve question content
  .then(function (q_data) {
    cache.user_q_id = q_data.main;

    // Retrieve the question content, and display the selected one
    return stack_overflow.get_questions(q_data.all);
  })
  // Display question, ask for next command
  .then(function (questions_with_content) {
    // Only want user's q
    var user_q = questions_with_content.reduce(function (acc, q) {
      return (q.id == cache.user_q_id) ? q : acc;
    }, false);

    cache.user_q_url = user_q.link;

    printer.ruler();
    printer.title(user_q.title);
    printer.ruler();
    printer.content(user_q.body);
    printer.ruler();

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
  // Execute command, possibly fetch answers
  .then(function (command) {
    // Open in browser
    if (command === 'open') {
      open(cache.user_q_url);

    // Fetch and display answers
    } else if (command === 'answers') {
      return stack_overflow.get_answers(cache.user_q_id);
    }
  })
  // List answers, let user choose one
  .then(function (answers) {
    cache.answers = answers;

    var answer_choices = answers.map(function (answer, i) {
      return {
        name: util.sanitize(answer.summary),
        value: i
      }
    });

    return util.ask_list(answer_choices, 'Choose an answer:');
  })
  // Print answer, display next commands
  .then(function (id) {
    // Print selected answer
    printer.ruler();
    printer.content(cache.answers[id].body);
    printer.ruler();

    return util.answers_options(cache.answers, id, printer);
  })
  // Open URL if requested
  .then(function (url) {
    if (url) open(url);
  })
  // Catch all errors
  .catch(function (e) {
    throw e;
  });
