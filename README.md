#Graph Example
This is a simple example of showing how to setup a single collection with directed nodes to 
allow us to find the ancestors of a group as well as decendents of a group.

## How to use
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

## About the example
This is a very simple one collection example which inserts 14 documents into the collection.
When the `createDemo()` function in the `groupManagement` library is executed it will create
a database **groupManagement** and a collection **groups**.

#### about the document format
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
  },
  status: 'ACTIVE INACTIVE'
}
```
Document validation is used ensure the groupname, groupusers, groupattrs, and status exist before
the document is inserted into the collection

## groupManagement Library
Once the graphExample.js is sourced in the shell, it will create a `groupManagement` module with
functions which can be called to show the various exmaples.

#### createFirstGroup()
Simple function to create the `global administrators` group

#### createGroup(parent, groupName, attributes, metadata, user)
Basic function to create a simple group with the document format above.

#### deleteGroup(groupName)
Attempt to delete the group, we introduce a constraint that if the children fields is not
empty each of the child groups will first be validated.  

#### findParent(groupName)
Attempt to find the parent for the group, every group will have a parent except for the 
root node or the `global administrators`.

#### findAncestors(grouName)
Attempt to find all the ancestors of the group, so follow the parent field up to the root, or
some maxDepth.

#### findChildren(grouName)
Attempt to find all the children of the group, not every group will have children, leaf nodes
will not have children.

#### findDescendants(groupName)
Attempt to find all the descendants down to the leaves for the group.

#### findGroupsByUser(user)
non-graph find of what group the user in is

#### findAncestorGroupsByUser(user)
find all the ancestor groups by the user

#### createDemo()
create the simple demo

## TODO
