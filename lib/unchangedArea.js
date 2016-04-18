var deepEqual = require('./deepEquals.js');
var hashObject = require('./hashObject.js');
var applyPatches = require('./applyPatches');

exports.generateUnchanged = generateUnchanged;
exports.findValueInUnchanged = findValueInUnchanged;


function generateUnchanged(oldJson, newJson, unchanged, path) {
  // Check if two json is the same
  // Equal
  if (deepEqual._equals(oldJson, newJson)) {
  // if (equal(oldJson, newJson)) {
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

function arrayCompare(oldArr, newArr, unchanged, path) {
  // Check if two array element (string) is the same
  // Equal
  if (oldArr === newArr) {
  // if (equal(oldJson, newJson)) {
    // console.log({path: path, value: copy.clone(newJson)});
    unchanged.push( path + "=" + newArr);
    return;
  }

}

//********************Need to be changed ********************
function generateUnchangedArray(oldJson, newJson, unchanged, path) {
    // Do nothing now
    // Generate when diff
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

    if (newValue.toString() === value) {
      return unchanged[i].split("=")[0];
    }
  }
}
