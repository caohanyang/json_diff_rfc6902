var jpn = require('./JSON-Diff');
var fs = require('fs');
var assert = require('assert');

var n_pathlogic = 20;

for (var i = 1; i <= n_pathlogic; i++) {

  //Assert
  describe('EqualJson', function() {
    console.log("Processing test case " + i);

    var root = "./tests/" + i + "/";
    var f_old = require(root + "old.json");
    var f_new = require(root + "new.json");

    var expect_patch = require(root + "expected.json");
    var jpn_patch = require(root + "jpn_patch.json");
    var gen_new = require(root + "gen_new.json");
    var app_new = require(root + "app_new.json");

    it('Case ' + i + ': generate expected patch', function() {
      var equalPatch = deepCompare(jpn_patch, expect_patch);
      assert.equal(equalPatch, true);
    });
    it('Case ' + i + ': FJP apply to get the same JSON', function() {
      var equalJson = deepCompare(gen_new, f_new);
      assert.equal(equalJson, true);
    });
    it('Case ' + i + ': Our apply to get the same JSON', function() {
      var equalJsonApp = deepCompare(app_new, f_new);
      assert.equal(equalJsonApp, true);
    });

  });

}

// Compare two JSON are same or not
function deepCompare () {
  var i, l, leftChain, rightChain;

  function compare2Objects (x, y) {
    var p;

    // remember that NaN === NaN returns false
    // and isNaN(undefined) returns true
    if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
      return true;
    }

    // Compare primitives and functions.
    // Check if both arguments link to the same object.
    // Especially useful on step when comparing prototypes
    if (x === y) {
      return true;
    }

    // Works in case when functions are created in constructor.
    // Comparing dates is a common scenario. Another built-ins?
    // We can even handle functions passed across iframes
    if ((typeof x === 'function' && typeof y === 'function') ||
    (x instanceof Date && y instanceof Date) ||
    (x instanceof RegExp && y instanceof RegExp) ||
    (x instanceof String && y instanceof String) ||
    (x instanceof Number && y instanceof Number)) {
      return x.toString() === y.toString();
    }

    // At last checking prototypes as good a we can
    if (!(x instanceof Object && y instanceof Object)) {
      return false;
    }

    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
      return false;
    }

    if (x.constructor !== y.constructor) {
      return false;
    }

    if (x.prototype !== y.prototype) {
      return false;
    }

    // Check for infinitive linking loops
    if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
      return false;
    }

    // Quick checking of one object beeing a subset of another.
    // todo: cache the structure of arguments[0] for performance
    for (p in y) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
        return false;
      }
      else if (typeof y[p] !== typeof x[p]) {
        return false;
      }
    }

    for (p in x) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
        return false;
      }
      else if (typeof y[p] !== typeof x[p]) {
        return false;
      }

      switch (typeof (x[p])) {
        case 'object':
        case 'function':

        leftChain.push(x);
        rightChain.push(y);

        if (!compare2Objects (x[p], y[p])) {
          return false;
        }

        leftChain.pop();
        rightChain.pop();
        break;

        default:
        if (x[p] !== y[p]) {
          return false;
        }
        break;
      }
    }

    return true;
  }

  if (arguments.length < 1) {
    return true; //Die silently? Don't know how to handle such case, please help...
    // throw "Need two or more arguments to compare";
  }

  for (i = 1, l = arguments.length; i < l; i++) {

    leftChain = []; //Todo: this can be cached
    rightChain = [];

    if (!compare2Objects(arguments[0], arguments[i])) {
      return false;
    }
  }

  return true;
}
