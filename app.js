#!/usr/bin/env node

var program  = require('commander'),
    inquirer = require('inquirer'),
    StackEx  = require('stackexchange'),
    Promise  = require('es6-promise').Promise,
    open     = require('open'),
    Entities = require('html-entities').AllHtmlEntities;

// Formats the inputted tags for the StackOverflow API
var so_format = function (str) { return str.replace(',', ';'); }

program
  .version(require('./package.json').version)
  .usage('<searchterm>')
  .option('-t, --tags <items>', 'tags to search under', so_format)
  .parse(process.argv);

if (!program.args.length) {
    program.help();
}

// Initialize objects
var stack_api = new StackEx({ version: 2.2 }),
    entities  = new Entities();

/**
 * Main code, recursively searches if necessary, etc
 */
var search_so = function (searchterm, p) {
  return new Promise(function (resolve, reject) {
    // Setup query
    var filter = {
      sort: 'relevance',
      order: 'desc',
      page: p,
      q: searchterm
    }

    if (program.tags) filter.tagged = program.tags;

    // Query StackOverflow
    stack_api.search.advanced(filter, function (err, results) {
      if (err) return console.error(err);

      // Create answers
      var answer_options = results.items.map(function (item) {
        return {
          name:  entities.decode(item.title),
          value: item.link
        }
      });

      // Add a more link if there are more
      if (results.has_more) {
        answer_options.push(new inquirer.Separator());
        answer_options.push({
          name: 'More',
          value: 'request_more_questions'
        });
        answer_options.push(new inquirer.Separator());

      // Add a separator to delimit wrapping
      } else if (answer_options.length >= 7) {
        answer_options.push(new inquirer.Separator());
      }

      // Create question
      var questions = [
        {
          type: 'list',
          name: 'so_question',
          message: 'Pick a question:',
          choices: answer_options
        }
      ];

      // Ask user
      inquirer.prompt(questions, function (answers) {
        if (answers.so_question === 'request_more_questions') {
          return search_so(searchterm, p + 1);
        }

        open(answers.so_question);
      });
    });
  });
}

// Call the above function
search_so(program.args.join(' '), 1);
