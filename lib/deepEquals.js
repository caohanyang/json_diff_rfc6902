module.exports._equals = _equals;

/**
 * Compare 2 JSON values, or recursively compare 2 JSON objects or arrays
 * @param {object|array|string|number|boolean|null} a
 * @param {object|array|string|number|boolean|null} b
 * @returns {boolean} true iff a and b are recursively equal
 */
 var _objectKeys = (function () {
     if (Object.keys)
         {return Object.keys;}

     return function (o) {
         var keys = [];
         for (var i in o) {
             if (o.hasOwnProperty(i)) {
                 keys.push(i);
             }
         }
         return keys;
     };
 })();

 var _isArray;
 if (Array.isArray) {
     _isArray = Array.isArray;
 } else {
     _isArray = function (obj) {
         return obj.push && typeof obj.length === 'number';
     };
 }

 /**
  * _equals - This can save a lot of time 5 ms
  *
  * @param  {type} a description
  * @param  {type} b description
  * @return {type}   description
  */
 function _equals(a, b) {
     switch (typeof a) {
         case 'undefined':
         case 'boolean':
         case 'string':
         case 'number':
             return a === b;
         case 'object':
             if (a === null)
                 {return b === null;}
             if (_isArray(a)) {
                 if (!_isArray(b) || a.length !== b.length)
                     {return false;}

                 for (var i = 0, l = a.length; i < l; i++) {
                   if (!_equals(a[i], b[i]))
                   {return false;}
                 }

                 return true;
             }

             var bKeys = _objectKeys(b);
             var bLength = bKeys.length;
             if (_objectKeys(a).length !== bLength)
                 {return false;}

             for (var i = 0, k; i < bLength; i++) {
               k = bKeys[i];
               if (!(k in a && _equals(a[k], b[k])))
               {return false;}
             }

             return true;

         default:
             return false;
     }
 }
