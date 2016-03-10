var equal = require('deep-equal');
exports = module.exports.generateUnchanged = generateUnchanged;
exports = module.exports.findValueInUnchanged = findValueInUnchanged;


function generateUnchanged(oldJson, newJson, unchanged, path) {
  // Check if two json is the same
  // Equal
  if (equal(oldJson, newJson)) {
    // console.log({path: path, value: copy.clone(newJson)});
    unchanged.push( path + "=" + JSON.stringify(newJson));
    return;
  }

  // Not equal
  // Check the type
  if (typeof oldJson !== typeof newJson) { return; }

  // Type is the same
  if (Array.isArray(oldJson) && Array.isArray(newJson)) {
    // Array
    generateUnchangedArray(oldJson, newJson, unchanged, path);
    return;
  }

  if (typeof oldJson === "object" && oldJson !== null && typeof newJson === "object"  && newJson !== null) {
    // Object
    generateUnchangedObject(oldJson, newJson, unchanged, path);
    return;
  }
}

//********************Need to be changed ********************
function generateUnchangedArray(oldJson, newJson, unchanged, path) {
  var miniLength = Math.min(oldJson.length, newJson.length);
  console.log("miniLength is " + miniLength);
  for (var i = 0; i < miniLength; i++) {
    generateUnchanged(oldJson[i], newJson[i], unchanged, path + "/" + i);
  }
}

function generateUnchangedObject(oldJson, newJson, unchanged, path) {
  var oldKeys = Object.keys(oldJson);
  var newKeys = Object.keys(newJson);

  for (var i = 0; i < oldKeys.length; i++) {
    var oldKey = oldKeys[i];
    if (newJson.hasOwnProperty(oldKey)) {
      generateUnchanged(oldJson[oldKey], newJson[oldKey], unchanged, path + "/" + oldKey);
    }
  }
}

function findValueInUnchanged(newValue, unchanged) {
  for (var i = 0; i < unchanged.length; i++) {
    var value = unchanged[i].split("=")[1];
    // console.log("Value = " +  value);
    // console.log("ValueType = " +  Array.isArray(value));
    // console.log("newValue = " +  newValue);
    // console.log("newValueType = " +  typeof newValue);
    if (equal(newValue, value)) {
      return unchanged[i].split("=")[0];
    }
  }
}
