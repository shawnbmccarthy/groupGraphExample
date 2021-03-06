/*
 * graphExample.js
 *
 * simple example of using the $graphLookup operator in a single collection
 */
var groupManagement = (function(){
    var _DB_NAME     = 'groupManagement';
    var _COLL_NAME   = 'groups';
    var _ADMIN_GROUP = 'global administrators';
    var _ADMIN_USERS = ['gadmin1', 'gadmin2', 'gadmin3'];
    var _ADMIN_ATTRS = ['owner', 'createGroups', 'deleteGroups', 'updateGroups', 'givePermissions'];

    var createFirstGroup = function(){
        db = db.getSiblingDB(_DB_NAME);

        if(db[_COLL_NAME].findOne() != null){
            db[_COLL_NAME].drop();
            db.createCollection(_COLL_NAME,
                {
                    validator: {
                        $and: [
                            {groupname: {$type: 'string'}},
                            {'groupusers.0': {$exists: true}},
                            {'groupattrs.0': {$exists: true}},
                            {status: {$in: ['ACTIVE', 'INACTIVE']}}
                        ]
                    }
                })
        }

        try {
            db[_COLL_NAME].insertOne({
                groupname: _ADMIN_GROUP,
                groupusers: _ADMIN_USERS,
                groupattrs: _ADMIN_ATTRS,
                status: 'ACTIVE'
            });
            print('createFirstGroup(): successfully created admin group');
        }catch(wError){
            print('createFirstGroup(): failed to create first group - ' + wError.errmsg);
            throw wError;
        }
    };

    var createGroup = function(parent, groupName, attributes, metadata, user){
        db  = db.getSiblingDB(_DB_NAME);
        var doc = db[_COLL_NAME].findOne({groupname: parent}, {_id: 1, groupname: 1});
        if(doc === null || doc === {}){
            print('createGroup(): cannot create group(' + groupName + '), parent(' + parent + ') does not exists');
            throw new Error('parent group does not exist(' + parent + ')');
        }

        try {
            var ret = db[_COLL_NAME].insertOne({
                groupname: groupName,
                groupusers: [user],
                groupattrs: attributes,
                groupmeta: metadata,
                status: 'ACTIVE',
                parent: doc
            });
            db[_COLL_NAME].updateOne({_id: doc['_id']}, {$push: {children: {groupname: groupName, groupid: ret.insertedId}}});
            print('createGroup(): Successfully created and linked group');
        }catch(wError){
            print('createFirstGroup(): failed to create first group - ' + wError.errmsg);
            throw wError;
        }
    };

    var addUsersToGroup = function(groupName, users){
        db = db.getSiblingDB(_DB_NAME);
        try {
            db[_COLL_NAME].updateOne({groupname: groupName}, {$addToSet: {groupusers: {$each: users}}});
            print('addUsersToGroup(): successfully added users to group');
        }catch(wError){
            print('createFirstGroup(): failed to create first group - ' + wError.errmsg);
            throw wError;
        }
    }

    var deleteGroup = function(groupName){
        db = db.getSiblingDB(_DB_NAME);
        var doc = db[_COLL_NAME].findOne({groupname: groupName});
        if(doc !== null || doc !== {}){
            print('deleteGroup(): cannot find ' + groupName + ' to delete');
            throw new Error('group ' + groupName + ' does not exists');
        }

        if(doc.hasOwnProperty('children') && doc['children'].length > 0){
            print('deleteGroup(): WARNING - children are not empty, validating group existence');
            var count = db[_COLL_NAME].count({groupname: {$in: doc['children']}});
            if(count > 0){
                print('deleteGroup(): WARNING - cannot delete group as children still exist');
                return;
            }
        }

        try {
            var ret = db[_COLL_NAME].deleteOne({groupname: groupName});
            print('deleteGroup(): deleted ' + ret.deletedCount + ' document(s)');
        } catch(wEerror){
            print('deleteGroup(): failed to delete group');
            throw wEerror;
        }
    };

    /*
     * not fully tested - need to have a look
     */
    var removeGroupWithRelink = function(groupName) {
        db = db.getSiblingDB(_DB_NAME);
        var doc = db[_COLL_NAME].findOne({groupname: groupName});

        if(!doc.hasOwnProperty('parent') && doc['parent'] !== ''){
            //doc does not have parent - must be root
            print('removeGroupWithRelink(): cannot remove root document');
            return;
        }

        try {
            db[_COLL_NAME].updateOne({groupname: doc['parent']}, {$addToSet: {groupusers: {$each: doc['children']}}});
            db[_COLL_NAME].updateOne({groupname: doc['parent']}, {
                $pull: { children: { groupname: doc['groupname'],  groupid: doc['_id'] } }
            });
            db[_COLL_NAME].deleteOne({groupname: doc['groupname']});
        } catch(wError){
            print('removeGroupWithRelink(): failed to update document');
            throw wError;
        }
    };

    var findParent = function(groupName){
        db = db.getSiblingDB(_DB_NAME);
        var cursor = db[_COLL_NAME].aggregate([
            {
                $match: {groupname: groupName}
            },
            {
                $graphLookup: {
                    from: _COLL_NAME,
                    startWith: '$parent.groupname',
                    connectFromField: 'parent.groupname',
                    connectToField: 'groupname',
                    as: 'directancestors',
                    depthField: 'depth',
                    maxDepth: 0
            }
        }]);
        return cursor.toArray();
    };

    var findAncestors = function(groupName){
        db = db.getSiblingDB(_DB_NAME);
        var cursor = db[_COLL_NAME].aggregate([
            {
                $match: {groupname: groupName}
            },
            {
                $graphLookup: {
                    from: _COLL_NAME,
                    startWith: '$parent.groupname',
                    connectFromField: 'parent.groupname',
                    connectToField: 'groupname',
                    as: 'ancestors',
                    depthField: 'depth'
            }
        }]);
        return cursor.toArray();
    };

    var findChildren = function(groupName){
        db = db.getSiblingDB(_DB_NAME);
        var cursor = db[_COLL_NAME].aggregate([
            {
                $match: {groupname: groupName}
            },
            {
                $graphLookup: {
                    from: _COLL_NAME,
                    startWith: '$children.groupname',
                    connectFromField: 'children.groupname',
                    connectToField: 'groupname',
                    as: 'directdescendants',
                    depthField: 'depth',
                    maxDepth: 0
            }
        }]);
        return cursor.toArray();
    };

    var findDescendants = function(groupName){
        db = db.getSiblingDB(_DB_NAME);
        var cursor = db[_COLL_NAME].aggregate([
            {
                $match: {groupname: groupName}
            },
            {
                $graphLookup: {
                    from: _COLL_NAME,
                    startWith: '$children.groupname',
                    connectFromField: 'children.groupname',
                    connectToField: 'groupname',
                    as: 'descendants',
                    depthField: 'depth'
            }
        }]);
        return cursor.toArray();
    };

    var findGroupsByUser = function(user){
        db = db.getSiblingDB(_DB_NAME);
        var cursor = db[_COLL_NAME].find({groupusers: user});
        return cursor.toArray();
    }

    var findAncestorGroupsByUser = function(user){
        db = db.getSiblingDB(_DB_NAME);
        var cursor = db[_COLL_NAME].aggregate([
            {
                $match: {groupusers: user}
            },
            {
                $graphLookup: {
                    from: _COLL_NAME,
                    startWith: '$parent.groupname',
                    connectFromField: 'parent.groupname',
                    connectToField: 'groupname',
                    as: 'ancestors',
                    depthField: 'depth'
                }
            },
            {
                $project: {
                    ancestors: 1,
                    _id: 0
                }
            },
            {
                $unwind: '$ancestors'
            }
        ]);
        return cursor.toArray();
    }

    /*
     * maybe move to a json file?
     */
    var createDemo = function(){
        db = db.getSiblingDB(_DB_NAME);
        // admin group
        createFirstGroup();

        // level 1 groups
        createGroup(_ADMIN_GROUP, 'group1 level1', ['create', 'read', 'update', 'delete', 'g1l1 custom'], ['g1l1m1', 'g1l1m2'], 'g1l1u1');
        createGroup(_ADMIN_GROUP, 'group2 level1', ['create', 'read', 'update', 'delete', 'g2l1 custom'], ['g2l1m1', 'g2l1m2'], 'g2l1u1');
        createGroup(_ADMIN_GROUP, 'group3 level1', ['create', 'read', 'update', 'delete', 'g3l1 custom'], ['g3l1m1', 'g3l1m2'], 'g3l1u1');

        addUsersToGroup('group1 level1', ['g1l1u2', 'g1l1u3', 'g1l1u4']);
        addUsersToGroup('group2 level1', ['g2l1u2', 'g2l1u3', 'g2l1u4']);
        addUsersToGroup('group3 level1', ['g3l1u2', 'g3l1u3', 'g3l1u4']);

        // level 2 groups
        createGroup('group1 level1', 'group11 level2', ['create', 'read', 'update', 'delete', 'g11l2 custom'], ['g11l2m1', 'g11l2m2'], 'g11l2u1');
        createGroup('group1 level1', 'group12 level2', ['create', 'read', 'update', 'delete', 'g12l2 custom'], ['g12l2m1', 'g11l2m2'], 'g12l2u1');
        createGroup('group1 level1', 'group13 level2', ['create', 'read', 'update', 'delete', 'g13l2 custom'], ['g13l2m1', 'g11l2m2'], 'g13l2u1');

        addUsersToGroup('group11 level2', ['g11l2u2', 'g11l2u3', 'g11l2u4']);
        addUsersToGroup('group12 level2', ['g12l2u2', 'g12l2u3', 'g12l2u4']);
        addUsersToGroup('group13 level2', ['g13l2u2', 'g13l2u3', 'g13l2u4']);

        createGroup('group2 level1', 'group21 level2', ['create', 'read', 'update', 'delete', 'g21l2 custom'], ['g21l2m1', 'g21l2m2'], 'g21l2u1');
        createGroup('group2 level1', 'group22 level2', ['create', 'read', 'update', 'delete', 'g22l2 custom'], ['g22l2m1', 'g22l2m2'], 'g22l2u1');

        addUsersToGroup('group21 level2', ['g21l2u2', 'g21l2u3', 'g21l2u4']);
        addUsersToGroup('group22 level2', ['g22l2u2', 'g22l2u3', 'g22l2u4']);

        createGroup('group3 level1', 'group31 level2', ['create', 'read', 'update', 'delete', 'g31l2 custom'], ['g31l2m1', 'g31l2m2'], 'g31l2u1');

        addUsersToGroup('group31 level2', ['g31l2u2', 'g31l2u3', 'g31l2u4']);

        //level 3 groups
        createGroup('group21 level2', 'group31 level3', ['create', 'read', 'update', 'delete', 'g31l3 custom'], ['g31l3m1', 'g31l3m2'], 'g31l3u1');
        createGroup('group21 level2', 'group32 level3', ['create', 'read', 'update', 'delete', 'g32l3 custom'], ['g32l3m1', 'g32l3m2'], 'g32l3u1');
        createGroup('group21 level2', 'group33 level3', ['create', 'read', 'update', 'delete', 'g33l3 custom'], ['g33l3m1', 'g33l3m2'], 'g33l3u1');

        addUsersToGroup('group31 level3', ['g31l3u2', 'g31l3u3', 'g1l3u4']);
        addUsersToGroup('group32 level3', ['g32l3u2', 'g32l3u3', 'g1l3u4']);
        addUsersToGroup('group33 level3', ['g33l3u2', 'g33l3u3', 'g1l3u4']);

        //level 4 groups
        createGroup('group31 level3', 'group41 level4', ['create', 'read', 'update', 'delete', 'g41l4 custom'], ['g41l4m1', 'g41l4m2'], 'g41l4u1');

        addUsersToGroup('group41 level4', ['g41l4u2', 'g41l4u3', 'g41l4u4']);

    }

    return {
        createFirstGroup: createFirstGroup,
        createGroup: createGroup,
        deleteGroup: deleteGroup,
        findParent: findParent,
        findAncestors: findAncestors,
        findChildren: findChildren,
        findDescendants: findDescendants,
        findGroupsByUser: findGroupsByUser,
        findAncestorGroupsByUser: findAncestorGroupsByUser,
        createDemo: createDemo
    };
}());