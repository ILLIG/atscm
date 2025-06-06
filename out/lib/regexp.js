"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.escapeForRegExp = escapeForRegExp;
exports.specialCharsRegExp = exports.specialChars = void 0;
/** Special characters in regular expressions. */
const specialChars = exports.specialChars = ['[', '\\', '^', '$', '.', '|', '?', '*', '+', '(', ')', ']'];

/** A regular expression that matches all special characters in regular expressions. */
const specialCharsRegExp = exports.specialCharsRegExp = new RegExp(`(${specialChars.map(c => `\\${c}`).join('|')})`, 'g');

/**
 * Returns a string with all special regular expression characters escaped.
 * @param source The string to escape.
 */
function escapeForRegExp(source) {
  return source.replace(specialCharsRegExp, '\\$1');
}
//# sourceMappingURL=regexp.js.map