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
            // Create an index on the 'pubid' property of the objects.
            store.createIndex('pubid', 'pubid');
        },
    });
}

// tends to be blocked... 
async function deletedb() {
    await deleteDB(dbname, {
        blocked() {
            log.error("IndexedDB error: Delete DB blocked");
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
async function addPublication(pubid, title) {
    let pubs = await getPublications();
    if (!pubs.find(pub => pub.pubid === pubid)) {
        await db.add('positions', {pubid, title, type: "publication"});
    }
}
async function getPublications() {
    let alldata = await db.getAll('positions');
    return alldata.filter(data => data.type === "publication");
}
async function removePosition(id) {
    await db.delete('positions', id);
}
async function getPosition(id) {
    await db.get('positions', id, 'id');
}
async function getPositions(pubid) {
    return await db.getAllFromIndex('positions', 'pubid', pubid);
}
// just copy from the most recent last read position
// which is constantly updated
async function addBookmarkAtCurrentPosition(pubid) {
    let lastRead = await getLastRead(pubid);
    let bmk = {
        pubid: lastRead.pubid,
        readingOrderItem: lastRead.readingOrderItem,
        offset: lastRead.offset,
        label: lastRead.label,
        type: "bookmark"
    };
    await addBookmark(bmk);
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
// nicer name
async function deleteBookmark(id) {
    await removePosition(parseInt(id));
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
    addBookmark, addBookmarkAtCurrentPosition, getBookmarks, 
    getPosition, removePosition, getPositions,
    getLastRead, updateLastRead, deleteBookmark,
    addPublication, getPublications };

/* position data:

Required for submitting
{
    pubid: "PublicationID",
    readingOrderItem: "relativeURL/item.mp3",
    label: label text,
    offset: 400ms
}

Additional fields added by these functions:
{
    ...
    type: "last" | "bookmark" | "publication",
    id: ID
}

*/