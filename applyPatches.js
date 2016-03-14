var fs = require('fs');

module.exports.apply = apply;

var objectOps = {
  add: function(child_json, key, all_json) {
    // console.log(this);
    // console.log(child_json);
    child_json[key] = this.value;
    console.log("Add operation = " + this.value);
    return true;
  },
  remove: function(child_json, key, all_json) {
    delete child_json[key];
    console.log("Remove operation = " + child_json);
    return true;
  },
  replace: function(child_json, key, all_json) {
   child_json[key] = this.value;
   console.log("replace operation = " + this.value);
   return true;
  },
  copy: function(child_json, key, all_json) {
    // console.log("copy operation = " + JSON.stringify(child_json));
    // console.log("key = " + key);
    var tmpOp = {"op": "val_get", "path": this.from};
    //Get the tmp value
    apply(all_json, [tmpOp]);
    apply(all_json, [{
      "op": "add", "path": this.path, "value": tmpOp.value
    }]);
    return true;
  },
  move: function(child_json, key, all_json) {
    console.log("move operation = " + JSON.stringify(child_json));
    var tmpOp = {"op": "val_get", "path": this.from};
    //Get the tmp value
    apply(all_json, [tmpOp]);
    apply(all_json, [{"op": "remove", "path": this.from}]);
    apply(all_json, [{"op": "add", "path": this.path, "value": tmpOp.value}]);
  },
  val_get: function(child_json, key) {
    this.value = child_json[key];
  }
};

var arrayOps = {
  add: function(arr, key, all_json) {
    arr.splice(key, 0, this.value);
    console.log("Add operation = " + this.value);
    return true;
  },
  remove: function(arr, key, all_json) {
    arr.splice(key, 1);
    console.log("Remove operation = " + key);
    return true;
  },
  replace: function(arr, key, all_json) {
    arr[key] = this.value;
    return true;
  },
  copy: objectOps.copy,
  move: objectOps.move,
  val_get: objectOps.val_get
};


function apply(all_json, patches) {
   for (var i = 0; i < patches.length; i++) {
     var patch = patches[i];
     if (patch !== void 0) {
      var path = patch.path || "";
      console.log(path);
      var keys = path.split("/");
      var child_json = all_json;

      //first element is undefined
      var key;
      //child_json is the second end element
      for (var j = 1; j < keys.length - 1; j++) {
         key = keys[j];
         child_json = child_json[key];
      }
      //key is the last element's path
      key = keys[keys.length -1];

      if (key === void 0) {
        console.log("The key is undefined");
      }

      if (Array.isArray(child_json)) {
        console.log("***********Array operations****************");
        if (key === '-') {
          key = child_json.length;
        } else {
          key = parseInt(key);
        }
        arrayOps[patch.op].call(patch, child_json, key, all_json);
      } else {
        console.log("***********Object operations***************");
        objectOps[patch.op].call(patch, child_json, stringToPoint(key), all_json);
      }
     }
   }
}

function stringToPoint(str) {
  // According to RFC 6901
  // '~' needs to be encoded as '~0'
  // '/' needs to be encoded as '~1'
  if(str && str.indexOf('~') !== -1) {
    return str.replace(/~0/g, '~').replace(/~1/g, '/');
  }
  return str;
}
