#!/usr/bin/env node

// NPM modules
var program  = require('commander'),
    inquirer = require('inquirer'),
    open     = require('open'),
    readline = require('readline');

// Local modules
var stack_overflow = require('./lib/stackoverflow'),
    printer        = require('./lib/printer');

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
  return new Promise(function (resolve, reject) {
    stack_overflow
      .search_questions(program.args.join(' '), program.tags)
      .then(function (questions) {

        // Create answer choices
        var answer_choices = questions.data.slice();
        answer_choices.push(new inquirer.Separator());

        if (questions.more) {
          answer_choices.push({
            name: 'More',
            value: 'request_more_questions'
          });
          answer_choices.push(new inquirer.Separator());
        }

        // Create questions
        var inq_questions = [{
          type: 'list',
          name: 'so_question',
          message: 'Pick a question:',
          choices: answer_choices
        }];

        inquirer.prompt(inq_questions, function (answers) {
          // User requested more questions
          if (answers.so_question === 'request_more_questions') {
            pick_so_question.then(resolve);

          // User picked a question
          } else {
            // Only want ids
            var ids = questions.data.map(function (q) {
              return q.value;
            });

            resolve({
              all: ids,
              main: answers.so_question
            });
          }
        });
      })
      .catch(function (e) {
        console.error(e);
      });
  });
}

var user_q_id;

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

    printer.ruler();
    printer.title(user_q.title);
    printer.content(user_q.body);

    return stack_overflow.get_answers(user_q_id);
  })
  .then(function (answers) {
    var ans_choices = answers.map(function (a) {
      return {
        name: a.summary,
        value: a.body
      }
    });

    var question = [{
      type: 'list',
      name: 'which_answer',
      message: 'Choose an answer:',
      choices: ans_choices
    }];

    inquirer.prompt(question, function (answers) {
      printer.content(answers.which_answer);
    });
  });
