
/** 
 * Wraps the stackexchange node module
 */

var StackEx  = require('stackexchange'),
    Entities = require('html-entities').AllHtmlEntities,
    Promise  = require('es6-promise').Promise;

var PAGE_SIZE = 10,
    SUMM_LEN  = 40;

module.exports = (function () {

  function StackOverflow () {
    this.stack_api = new StackEx({ version: 2.2 }),
    this.entities  = new Entities();
  }

  /**
   * Searches SO for the given searchterm with optional tags, returning
   * a list of question titles and ids
   */
  StackOverflow.prototype.search_questions = function (searchterm, tags, p) {
    var so = this.stack_api,
        en = this.entities;

    // Default p
    if (!p) p = 1;

    return new Promise(function (resolve, reject) {
      // Setup query
      var filter = {
        sort:     'relevance',
        order:    'desc',
        pagesize: PAGE_SIZE,
        page:     p,
        q:        searchterm
      }

      // Add tags if user added them
      if (tags) filter.tagged = tags;

      // Query StackOverflow
      so.search.advanced(filter, function (err, results) {
        if (err) return console.error(err);

        if (results.error_id == 502) {
          return console.log(results);
        }

        // Are there answers
        if (results.items.length) {
          // Extract useful data
          var useful_data = results.items.map(function (item) {
            return {
              name:  en.decode(item.title),
              value: item.question_id
            }
          });

          var return_obj = {
            data: useful_data,
            more: false
          }

          // Add a more link if there are more
          if (results.has_more) return_obj.more = true;

          resolve(return_obj);

        // There were no questions matching
        } else {
          reject('No matching questions.');
        }
      });
    });
  }

  /**
   * Get and return question content
   */
  StackOverflow.prototype.get_questions = function (ids) {
    var so = this.stack_api,
        en = this.entities;

    return new Promise(function (resolve, reject) {
      var filter = {
        sort:     'activity',
        order:    'desc',
        pagesize: PAGE_SIZE,
        page:     1,
        filter:   '!9YdnSIoOi' // see stack api, this filter returns body markdn
      }

      // Query StackOverflow
      so.questions.questions(filter, function (err, results) {
        if (err) return console.error(err);

        resolve(results.items.map(function (result) {
          return {
            title: result.title,
            id:    result.question_id,
            link:  result.link,
            body:  en.decode(result.body_markdown)
          };
        }));
      }, ids);
    });
  }

  /**
   * Get and return the answers for the given question id
   */
  StackOverflow.prototype.get_answers = function (q_id) {
    var so = this.stack_api,
        en = this.entities;

    return new Promise(function (resolve, reject) {
      var filter = {
        sort:     'activity',
        order:    'desc',
        pagesize: PAGE_SIZE,
        page:     1,
        filter:   '!9YdnSMlgz' // see stack api, this filter returns body markdn
      }

      // Query StackOverflow
      so.questions.answers(filter, function (err, results) {
        if (err) return console.error(err);

        resolve(results.items.map(function (result) {
          // Create summary of answer
          if (result.body_markdown.length > SUMM_LEN) {
            var summary = result.body_markdown.substr(0, SUMM_LEN);
            var end     = Math.min(summary.length, summary.lastIndexOf(' '));

            // Re-trim summary if word is cut off
            summary = summary.substr(0, end);
            summary += '...';

          } else {
            var summary = result.body_markdown;
          }

          return {
            summary: en.decode(summary),
            id:      result.answer_id,
            body:    en.decode(result.body_markdown)
          };
        }));
      }, [q_id]);
    });
  }

  return new StackOverflow();

})();
