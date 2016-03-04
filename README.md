# JSON-Diff

## INSTALL
`npm install`

## API

```js
var jpn = require('./JSON-Diff');
var jpn_patch = jpn.diff(f_old, f_new);
```

## TEST
`node diff.js`

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