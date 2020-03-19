// processes sync narr json
// controls highlight and audio playback

import { isInViewport } from '../common/utils.js';
import * as Events from './events.js';
import * as Audio from './audio.js';

let htmlDocument = null;
let items = [];
let properties = {};
let documentPlayingClass = '-document-playing';
let activeElementClass = '-active-element';
let textid = '';
let position = 0;
let seekToOffsetOneTime = false;
let offsetTimestamp = 0;

/* Narrator events:
Done
Highlight
*/

function setHtmlDocument(doc) {
    htmlDocument = doc;
}

function loadJson(json, offset) {
    properties = json.properties;
    documentPlayingClass = json.properties.hasOwnProperty("sync-media-document-playing") ? 
      json.properties["sync-media-document-playing"] : documentPlayingClass;
    activeElementClass = json.properties.hasOwnProperty("sync-media-active-element") ? 
      json.properties["sync-media-active-element"] : activeElementClass;
    items = flatten(json.narration);
    Events.on("Audio.ClipDone", onAudioClipDone);

    console.log("Starting");
    position = offset != 0 ? findOffsetPosition(offset) : 0;
    if (position != 0) {
        seekToOffsetOneTime = true;
        offsetTimestamp = offset;
    }
    
    render(items[position]);
    htmlDocument.getElementsByTagName("body")[0].classList.add(documentPlayingClass);
}

function next() {
    textid = items[position].text.split("#")[1];

    resetTextStyle(textid);
    
    if (position+1 < items.length) {
        position++;
        console.log("Loading clip " + position);
        render(
            items[position],
            position+1 >= items.length
        );
    }
    else {
        htmlDocument.getElementsByTagName("body")[0].classList.remove(documentPlayingClass);
        console.log("Document done");
        Events.trigger('Narrator.Done');
    }
}

function prev() {
    textid = items[position].text.split("#")[1];

    resetTextStyle(textid);
    
    if (position-1 >= 0) {
        position--;
        console.log("Loading clip " + position);
        render(
            items[position],
            false
        );
    }
    else {
        htmlDocument.getElementsByTagName("body")[0].classList.remove(documentPlayingClass);
        console.log("Start of document");
    }
}

function render(item, isLast) {
    /*if (item['role'] != '') {
        // this is a substructure
        onCanEscape(item["role"]);
    }*/
    textid = item.text.split("#")[1];
    highlightText(textid);

    let audiofile = item.audio.split("#t=")[0];
    if (audiofile == '') {
        audiofile = properties.audio;
    }
    let start = item.audio.split("#t=")[1].split(",")[0];
    let end = item.audio.split("#t=")[1].split(",")[1];

    if (seekToOffsetOneTime) {
        start = offsetTimestamp;
        seekToOffsetOneTime = false;
    }

    Audio.playClip(audiofile, start, end, isLast);
}

function onAudioClipDone() {
    console.log("Clip done");
    resetTextStyle(textid);
    next();
}

function highlightText(id) {
    let elm = htmlDocument.getElementById(id);
    elm.classList.add(activeElementClass);
    if (!isInViewport(elm, htmlDocument)) {
        elm.scrollIntoView();
    }
    Events.trigger("Narrator.Highlight", id);
}

function resetTextStyle(id) {
    let elm = htmlDocument.getElementById(id);
    elm.classList.remove(activeElementClass);
}

// find the node that includes this offset
// assuming one audio file per syncnarr document
function findOffsetPosition(offset) {
    let idx = items.findIndex(item => {
        let start = parseFloat(item.audio.split("#t=")[1].split(",")[0]);
        let end = parseFloat(item.audio.split("#t=")[1].split(",")[1]);

        return start <= offset && end >= offset;        
    });
    return idx === -1 ? 0 : idx;
}

let groupId = 0;
// flatten out any nested items
function flatten (itemsArr, roleValue) {
    var flatter = itemsArr.map(item => {
        if (item.hasOwnProperty("narration")) {
            groupId++;
            return flatten(item['narration'], item['role']);
        }
        else {
            item.role = roleValue ? roleValue : '';
            item.groupId = groupId;
            return item;
        }
    })
    .reduce((acc, curr) => acc.concat(curr), []);
    groupId--;
    return flatter;
}

/*
function escape() {
    console.log("Escape");
    
    let textid = items[position].text.split("#")[1];
    resetTextStyle(textid);

    position = items.slice(position).findIndex(thing => thing.groupId !== items[position].groupId) 
        + (items.length - items.slice(position).length) - 1;
    next();
}
*/

export { 
    loadJson,
    setHtmlDocument,
    next,
    prev
 };