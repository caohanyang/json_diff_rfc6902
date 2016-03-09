function clone(x) {
  if (x == null | x != "object")
  return x;
  // array is object
  if (Array.isArray(x))
  return copyArray(x);

  if (typeof x == "object")
  return copyObject(x);
}

function copyArray(x) {

  var arr = new Array();
  for (var i = 0; i < x.length; x++) {
    arr[i] = x[i];
  }
  return arr;
}

function copyObject(x) {
  var objectKeys = Object.keys(x);
  var obj = {};
  for (var k, i = 0; i < objectKeys.length; i++) {
    k = objectKeys[i];
    obj[k] = x[k];
  }

  return obj;
}

module.exports.clone = clone;
