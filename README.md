#Graph Example
This is a simple example of showing how to setup a single collection with directed nodes to 
allow us to find the ancestors of a group as well as decendents of a group.

# How to use
Clone repository into local filesystem using `git` and run mongodb shell commands:
1. change directory: 
    ```bash
    $ cd [SOME_DIRECTORY]
    ```
2. clone repo into directory: 
    ```bash
    $ git clone https://github.com/shawnbmccarthy/groupGraphExample
    ```
3. start mongodb shell:
    ```bash
    <PATH_TO_MDB>/bin/mongo <SOME_DIRECTORY>/groupGraphExample/graphExample.js --shell
    ```
4. start demo:
    ```javascript
    > groupManagement.createDemo();
    > groupManagement.findChildren('global administrators');
    ```
5. If you get to here everything is successful and now explore the different functions

# About the example
This is a very simple one collection example which inserts 14 documents into the collection.
When the `createDemo()` function in the `groupManagement` library is executed it will create
a database **groupManagement** and a collection **groups**.

## about the document format
```javascript
{
  _id: ObjectId(...),
  groupname: 'NAME OF GROUP',
  groupusers: [uid1, uid2, ..., uidN],
  groupattrs: ['attr1', 'attr2', ..., 'attrN'],
  children: [
      {
        groupname: 'NAME OF CHILD GROUP',
        groupid: ObjectId(...)
      }, 
      ....
  ],
  parent: {
    groupname: 'NAME OF PARENT',
    groupid: 'PARENT GROUP ID'
  }
}
```
Everything but the children and parent are currently not required.