
/**
 * Printing functions
 */

var chalk = require('chalk'),
    wrap  = require('word-wrap');

module.exports = (function () {

  function Printer() {
    this.indent = 2;
    this.width  = 60;
  }

  /**
   * Prints a full-width ruler
   */
  Printer.prototype.ruler = function (print) {
    var should_print = (print == false) ? false : true;

    var str = '';
    var size = should_print ? this.width + this.indent : this.width;
    for (var i = 0; i < size; i++) str += '─';

    if (should_print) console.log(str);
    else              return str;
  }

  /**
   * Prints the given text as a formatted title
   */
  Printer.prototype.title = function (t) {
    console.log(wrap(chalk.bold(t), { indent: 2 }));
  }

  /**
   * Prints the given content as formatted body
   */
  Printer.prototype.content = function (b) {
    var self = this;

    console.log('');

    var content = b
      // Inline code
      .replace(/(\`[^`]+\`)/g, function (s) {
        return chalk.green(s.substr(1, s.length - 2));
      })
      // Links
      .replace(/(\[[^\]]+\]\[[\d]+\]|\[[^\]]+\]\(.+\))/g, function (s) {
        return chalk.underline.green(/^\[([^\]]+)\]/.exec(s)[1]);
      })
      // Horizontal rule
      .replace(/[\s]*(\*\*[\*]+|\-\-[\-]+|\_\_[\_]+)[\s]*\n/g, function (s) {
        return '\n' + self.ruler(false) + '\n';
      })
      // // Bold
      // .replace(/(__|\*\*)([^_^\*]+)(__|\*\*)/g, function (s) {
      //   return chalk.bold(/(__|\*\*)([^_^\*]+)(__|\*\*)/.exec(s)[2]);
      // });
      // // Italic
      // .replace(/(_|\*)([^_^\*]+)(_|\*)/g, function (s) {
      //   return chalk.italic(/(_|\*)([^_^\*]+)(_|\*)/.exec(s)[2]);
      // });

    var og_lines  = content.split('\r\n');
    var coded_content = [false];

    // Create content blocks
    for (var i = 0; i < og_lines.length; i++) {
      var prev = coded_content[coded_content.length - 1],
          line = og_lines[i];

      // Newlines go on the prev obj regardless
      if (line.trim() === '') {
        prev.content.push(line);
        
      // Is code
      } else if (line.substr(0, 4) === '    ') {
        line = '\t' + line.substr(4);

        // Previous content block is code
        if (prev.is_code) {
          prev.content.push(line);

        // Create a new content block for code
        } else {
          var block = {
            is_code: true,
            content: [line]
          }
          coded_content.push(block);
        }

      // Regular content line
      } else {
        // Previous content block is code
        if (!prev || prev.is_code) {
          var block = {
            is_code: false,
            content: [line]
          }
          coded_content.push(block);

        // Create a new content block for code
        } else {
          // Ignore empty lines
          if (line.trim() !== '')
            prev.content.push(line);
        }
      }
    }

    coded_content.shift();

    // Collapse content blocks
    content = coded_content
      .map(function (bl) {
        if (bl.is_code) {
          return bl.content.join('\r\n');
        } else {
          var collapsed = bl.content.join('\r\n');
          return wrap(collapsed, { indent: self.indent, width: self.width });
        }
      })
      .join('\r\n');

    console.log(content, '\n');
  }

  return new Printer();

})();
