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
let textids = [];
let position = 0;
let seekToOffsetOneTime = false;
let offsetTimestamp = 0;
let autoplayFirstItem = true;
let previousTextColor = '';
let startingPosition = 0;
let base = '';

/* Narrator events:
Done
Highlight
*/

function setHtmlDocument(doc) {
    htmlDocument = doc;
    Events.on("Document.Click", loadFromElement);
}

function loadJson(json, baseurl, autoplay, offset) {
    properties = json.properties;
    base = baseurl;
    autoplayFirstItem = autoplay;
    documentPlayingClass = json.properties.hasOwnProperty("sync-media-document-playing") ? 
      json.properties["sync-media-document-playing"] : documentPlayingClass;
    activeElementClass = json.properties.hasOwnProperty("sync-media-active-element") ? 
      json.properties["sync-media-active-element"] : activeElementClass;
    items = flatten(json.narration);
    // make sure all text properties are arrays
    items = items.map(item => item.hasOwnProperty("text") && !(item.text instanceof Array) ? ({...item, text: [item.text]}) : item);

    Events.off("Audio.ClipDone", onAudioClipDone);
    
    log.debug("Starting sync narration");
    position = offset != 0 ? findOffsetPosition(offset) : 0;
    if (position != 0) {
        seekToOffsetOneTime = true;
        offsetTimestamp = offset;
    }
    startingPosition = position;
    Events.on("Audio.ClipDone", onAudioClipDone);
    render(items[position]);
    htmlDocument.getElementsByTagName("body")[0].classList.add(documentPlayingClass);
}

function next() {
    textids = items[position].text.map(textitem => textitem.split("#")[1]);

    resetTextStyle(textids);
    
    if (position+1 < items.length) {
        position++;
        log.debug("Loading clip " + position);
        render(
            items[position],
            position+1 >= items.length
        );
    }
    else {
        htmlDocument.getElementsByTagName("body")[0].classList.remove(documentPlayingClass);
        log.debug("Narration document done");
        Events.trigger('Narrator.Done', '');
    }
}

function prev() {
    textids = items[position].text.map(textitem => textitem.split("#")[1]);

    resetTextStyle(textids);
    
    if (position-1 >= 0) {
        position--;
        log.debug("Loading clip " + position);
        render(
            items[position],
            false
        );
    }
    else {
        htmlDocument.getElementsByTagName("body")[0].classList.remove(documentPlayingClass);
        log.debug("Start of narration document");
    }
}

function render(item, isLast) {
    /*if (item['role'] != '') {
        // this is a substructure
        onCanEscape(item["role"]);
    }*/
    textids = item.text.map(textitem => textitem.split("#")[1]);
    highlightText(textids);

    let audiofile = item.audio.split("#t=")[0];
    if (audiofile == '') {
        audiofile = properties.audio;
    }
    audiofile = new URL(audiofile, base).href;
    let start = item.audio.split("#t=")[1].split(",")[0];
    let end = item.audio.split("#t=")[1].split(",")[1];

    if (seekToOffsetOneTime) {
        start = offsetTimestamp;
        seekToOffsetOneTime = false;
    }

    let autoplay = startingPosition == position ? autoplayFirstItem : true;
    Audio.playClip(audiofile, autoplay, start, end, isLast);
}

function onAudioClipDone(src) {
    // TODO this is not robust
    if (src == new URL(properties.audio, base).href) {
        resetTextStyle(textids);
        next();
    }
    // else ignore it, the Audio player generates some extra events    
}

function highlightText(ids) {
    let elm;
    ids.map(id => {
        elm = htmlDocument.getElementById(id);
        let text = elm.innerHTML;
        previousTextColor = elm.style.color;
        elm.classList.add(activeElementClass);
        if (localStorage.getItem("highlight")) {
            elm.style.color = localStorage.getItem("highlight");
        }
        Events.trigger("Narrator.Highlight", id, text);
    });

    // this is tricky because we can't possibly scroll all of them into view
    // the last element wins, I guess
    if (!isInViewport(elm, htmlDocument)) {
        elm.scrollIntoView();
    }
}

function resetTextStyle(ids) {
    ids.map(id => {
        let elm = htmlDocument.getElementById(id);
        elm.classList.remove(activeElementClass);
        elm.style.color = previousTextColor;
    });
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

function loadFromElement(id) {
    textids = items[position].text.map(textitem => textitem.split("#")[1]);

    resetTextStyle(textids);
    
    // TODO this assumes all IDs are fragment only
    let itemIdx = items.findIndex(item => item.text.includes(`#${id}`));

    position = itemIdx;
    
    render(
        items[position],
        position+1 >= items.length
    );
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