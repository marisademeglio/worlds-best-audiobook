import { openDB, deleteDB } from 'https://unpkg.com/idb?module';

const dbname = "webplayer";
const dbversion = 1;
var db = null;

async function initdb() {
    db = await openDB(dbname, dbversion, {
        upgrade(db) {
            // Create a store of objects
            const store = db.createObjectStore('positions', {
                // The 'id' property of the object will be the key.
                keyPath: 'id',
                // If it isn't explicitly set, create a value by auto incrementing.
                autoIncrement: true,
            });
            // Create an index on the 'date' property of the objects.
            store.createIndex('pubid', 'pubid');
        },
    });
}

// tends to be blocked... 
async function deletedb() {
    await deleteDB(dbname, {
        blocked() {
            console.log("Delete DB blocked");
        },
    });
    db = null;
}

async function deleteAll() {
    let records = await db.getAll('positions');
    let i;
    if (records) {
        for (i=0; i<records.length; i++) {
            await removePosition(records[i].id);
        }    
    }
}

async function removePosition(id) {
    await db.delete('positions', id, 'id');
}
async function getPosition(id) {
    await db.get('positions', id, 'id');
}
async function getPositions(pubid) {
    return await db.getAllFromIndex('positions', 'pubid', pubid);
}

async function addBookmark(data) {
    await db.add('positions', {...data, type: 'bookmark'});
}
async function getBookmarks(pubid) {
    let records = await db.getAllFromIndex('positions', 'pubid', pubid);
    if (records) {
        return records.filter(r => r.type === 'bookmark');
    }
    else {
        return [];
    }
}

async function getLastRead(pubid) {
    let records = await db.getAllFromIndex('positions', 'pubid', pubid);
    // there is a way to query the db on multiple indices but the documentation is bad
    // and the search capabilities of indexeddb are generally recognized as limited
    // there won't be that many records so this is easier both architecturally and considering that
    // indexeddb will likely get better in this regard in the future, given the number of complaints
    if (records) {
        return records.find(r=>r.type === 'last');
    }
    else {
        return null;
    }
}

async function updateLastRead(data) {
    let position = await getLastRead(data.pubid);
    // update if exists
    if (position) {
        let newPosition  = { ...position, ...data };
        await db.put('positions', newPosition);
    }
    // else add a new record
    else {
        await db.add('positions', {...data, type: 'last'});
    }
}

export { 
    initdb, deletedb, deleteAll, 
    addBookmark, getBookmarks, 
    getPosition, removePosition, getPositions,
    getLastRead, updateLastRead };

/* position data:

Required for submitting
{
    pubid: "PublicationID",
    readingOrderItem: "relativeURL/item.mp3",
    offset: 400ms
}

Additional fields added by these functions:
{
    ...
    type: "last" | "bmk",
    id: ID
}

*/