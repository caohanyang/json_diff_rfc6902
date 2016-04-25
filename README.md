# JSON-Diff
JSON-Diff is to diff two JSON object and generate the patch, which is compliant to [JSON Patch RFC6902](https://tools.ietf.org/html/rfc6902).

You can use JSON-Diff to
- **diff** two JSON object
- **apply** patches to get JSON

JSON-Diff is able to handle operations:

_**Object**_
- **add**
- **remove**
- **replace**
- **copy**
- **move**

_**Array**_
- **add**
- **remove**
- **replace**
- **copy**
- **move**
- **permutation**

## INSTALL

### npm
`npm install json-diff-rfc6902 --save`

### bower
`bower install json-diff-rfc6902 --save`

- ```json-diff-rfc6902.js``` main bundle
- ```jdr```  global variable

## API

```js
var jdr = require('json-diff-rfc6902');

//diff the two JSON objects to get the pathes
var jdr_patch = jdr.diff(f_old, f_new [, options]);

The third parameter is optional, use the object options.
Default:
options.OBJ_COM = true   // Generate copy and move for object
options.ARR_COM = true   // Generate minimal patch for array
options.HASH_ID = null   // manually set the hash value

For example, if options.HASH_ID = "title", it will get the property value "title" of the elements in the array, and use them as the hash value to execute the operations transformation algorithem.

//apply the patches to the f_old object
jdr.apply(f_old, jdr_patch);
```

## TEST
`npm install -g mocha`

`cd tests`

`node diff.js`

`mocha`

# Test 1

OBJ_PROP_INS

This is an object where a property is added.

# Test 2

OBJ_PROP_DEL

This is an object where a property is removed.

# Test 3

OBJ_PROP_MOD

This is an object where a property value is modified.

# Test 4

OBJ_PROP_CPY

This is an object where a property is copied.

# Test 5

OBJ_PROP_REN

This is an object where a field is renamed.

# Test 6

ARR_OBJ_UNSHIFT

This is an array of objects with a insertion at the beginning of the array.

# Test 7

ARR_OBJ_PUSH

This is an array of objects with a insertion at the end of the array.

# Test 8

ARR_OBJ_RINS

This is an array of objects with a insertion in the middle of the array.

# Test 9

ARR_OBJ_SHIFT

This is an array of objects with a deletion of the first element.

# Test 10

ARR_OBJ_POP

This is an array of objects with a deletion of the last element

# Test 11

ARR_OBJ_RDEL

This is an array of objects with a deletion of the moddle element

# Test 12

ARR_OBJ_BREPLACE

This is an array of objects with a replacement of the first element

# Test 13

ARR_OBJ_EREPLACE

This is an array of objects with a replacement of the last element

# Test 14

ARR_OBJ_MREPLACE

This is an array of objects with a replacement of the middle element

# Test 15

ARR_OBJ_CPY

This is an array of objects where a object is copied.

# Test 16

ARR_OBJ_PERM1

Permutation of a objects in an array of objects. [a, b, c] => [a, c, b]

# Test 17

ARR_OBJ_PERM2

Permutation of a objects in an array of objects. [a, b, c] => [b, c, a]

# Test 18

ARR_OBJ_PERM3

Permutation of a objects in an array of objects. [a, b, c] => [b, a, c]

# Test 19

ARR_OBJ_PERM4

Permutation of a objects in an array of objects. [a, b, c] => [c, b, a]

# Test 20

ARR_OBJ_PERM5

Permutation of a objects in an array of objects. [a, b, c] => [c, a, b]
