var hashToNum = require('string-hash');

exports.hash = hash;
exports.map = map;
exports.mapArray = mapArray;

function hash(obj) {
  //Default hash
  // return JSON.stringify(obj);

  //String-hash
  return hashToNum(obj);
}

/**
 * map the array. Faster than Array.prototype.map
 *
 * @param  {function} f function
 * @param  {Array} a array-like
 * @return {Array}   new Array mapped by f
 */
function map(f, a) {

  var b =  new Array({});
  for (var i = 0; i < a.length; i++) {
    b[i] = f(typeof a[i] === "string"? a[i]: JSON.stringify(a[i]));
    // JSON.stringnify
    // b[i] = f(a[i]);
  }
  return b;
}

/**
 * map the array. Faster than Array.prototype.map
 *
 * @param  {function} f function
 * @param  {Array} a array-like
 * @return {Array}   new Array mapped by f
 */
function mapArray(f, a) {

  var b =  [];
  for (var i = 0; i < a.length; i++) {
    b[i] = {};
    b[i].hash = f(typeof a[i] === "string"? a[i]: JSON.stringify(a[i]));
    b[i].index = i;
    b[i].value = a[i];
  }
  return b;
}
