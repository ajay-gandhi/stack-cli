
/**
 * Utility functions
 */

var inquirer = require('inquirer');

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

module.exports.ask_list = ask_list;
