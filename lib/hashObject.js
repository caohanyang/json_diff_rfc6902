var hashToNum = require('string-hash');

exports.hash = hash;
exports.map = map;
exports.mapArray = mapArray;

function hash(obj, HASH_ID) {
  //Default hash
  // return JSON.stringify(obj);

  // return id|id_str|title || obj.title
  if (obj[HASH_ID] !== void 0 ) {
    return typeof obj[HASH_ID] === "string"? hashToNum(obj[HASH_ID]): obj[HASH_ID];
  } else {
    // || hashToNum(JSON.stringify(obj))
    // || (obj.title === undefined)? obj.title: hashToNum(JSON.stringify(obj.title))
    return obj.id || obj._id || (obj.title === undefined? obj.title: hashToNum(JSON.stringify(obj.title))) || hashToNum(JSON.stringify(obj));
  }

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
function mapArray(f, a, HASH_ID) {

  var b =  [];
  for (var i = 0; i < a.length; i++) {
    b[i] = {};
    // b[i].hash = f(typeof a[i] === "string"? a[i]: JSON.stringify(a[i]));
    b[i].hash = f(a[i], HASH_ID);
    b[i].index = i;
    b[i].value = a[i];
  }
  return b;
}
