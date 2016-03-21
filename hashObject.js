
exports.hash = hash;
exports.map = map;

function hash(obj) {
  //Default hash
  return JSON.stringify(obj);

  //String-hash
  // return hash(obj);
}

/**
 * map the array. Faster than Array.prototype.map
 *
 * @param  {function} f function
 * @param  {Array} a array-like
 * @return {Array}   new Array mapped by f
 */
function map(f, a) {

  var b =  new Array(a.length);
  for (var i = 0; i < a.length; i++) {
    // b[i] = f(typeof a[i] === "string"? a[i]: JSON.stringify(a[i]));
    b[i] = f(a[i]);
  }
  return b;
}
