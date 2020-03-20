import { Manifest } from '../common/pubmanifest-parse.js';
import * as Nav from './nav.js';
import * as Audio from './audio.js';
import * as Controls from './controls.js';
import * as LocalData from '../common/localdata.js';
import * as Events from './events.js';
import * as Chapter from './chapter.js';
import * as Utils from '../common/utils.js';

var manifest;


document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded");
    LocalData.initdb();
    Events.on("Chapter.Done", chapterPlaybackDone);
    Events.on('Nav.LoadContent', loadContent);
    Events.on("Audio.PositionChange", onAudioPositionChange);
    Events.on("Request.Pubid", onRequestPubId);
    Events.on("Bookmarks.Refresh", onBookmarksRefresh);
    Events.on("Bookmarks.LoadBookmark", loadBookmark);

    let urlSearchParams = new URLSearchParams(document.location.search);
    if (urlSearchParams.has("q")) {
        open(urlSearchParams.get("q"));
    }
});

async function open(url) {
    manifest = new Manifest();
    manifest.supportedProfiles = [{
        id: 'https://www.w3.org/TR/audiobooks/',
        encodingFormats: ['audio/mpeg']
    }];
    await manifest.loadUrl(url);
    if (manifest.getFatalErrors().length > 0) {
        // TODO show error message
        return;
    }
    else {
        Controls.init();
    }
    document.querySelector("#settingsLink").setAttribute('href', `settings.html?from=${url}`)
    loadPubInfo(manifest);
    await Nav.loadToc(manifest);

    let lastReadPosition = await LocalData.getLastRead(manifest.data.id);
    console.log("Player: last read position is ", lastReadPosition);
    
    await loadBookmarks();

    let readingOrderItem = lastReadPosition ? 
        manifest.updateCurrentReadingOrderIndex(lastReadPosition.readingOrderItem) 
        : 
        manifest.getCurrentReadingOrderItem();
    if (readingOrderItem) {
        loadContent(readingOrderItem.url, lastReadPosition ? 
            lastReadPosition.offset ? lastReadPosition.offset : 0 : 0);
    }
    else {
        console.log("Player: reading order error");
    }
}

function loadPubInfo(manifest) {
    let infoElm = document.querySelector("#pub-info");
    infoElm.innerHTML = `
        <h1>${manifest.getTitle()}</h1>
    `;
}

// load content doc into the content pane
async function loadContent(url, offset=0) {
    console.log(`Player: loading content ${url}`);
    let readingOrderItem = manifest.updateCurrentReadingOrderIndex(url);
    saveChapterPosition(manifest.getCurrentReadingOrderItem());
    
    if (readingOrderItem) {
        Chapter.play(manifest, offset);
    }
}

// event callback
async function chapterPlaybackDone(src) {
    console.log("Player: end of chapter");
    if (src == manifest.getCurrentReadingOrderItem().url) {
        let readingOrderItem = manifest.gotoNextReadingOrderItem();
        if (readingOrderItem) {
            await loadContent(readingOrderItem.url);
        }
        else {
            console.log("Player: end of book");
        }
    }
    // else ignore it, sometimes the audio element generates multiple end events
}

// note our current position
function saveChapterPosition(readingOrderItem) {
    console.log("Player: saving last-read position"); 
    let pos = {
        pubid: manifest.data.id,
        readingOrderItem: readingOrderItem.originalUrl,
        label: manifest.getL10NStringValue(readingOrderItem.name)
    };
    LocalData.updateLastRead(pos);
}

// add offset data to the last read position
function onAudioPositionChange(position) {
    let pos = {
        pubid: manifest.data.id,
        offset: position
    };
    LocalData.updateLastRead(pos);
}

function onRequestPubId() {
    console.log("Got pubid request");
    Events.trigger("Response.Pubid", manifest.data.id);
}

async function onBookmarksRefresh() {
    await loadBookmarks();
}

async function loadBookmarks() {
    let bookmarks = await LocalData.getBookmarks(manifest.data.id);
    let bookmarksList = document.querySelector("#bookmarks nav ul");
    bookmarksList.innerHTML = bookmarks.map(bmk => 
        `<li>
            <a href="${bmk.readingOrderItem}#t=${bmk.offset}">
                ${bmk.label} @ ${Utils.secondsToHms(bmk.offset)}
            </a>
        </li>`
    ).join('');

    let bookmarkElms = Array.from(document.querySelectorAll("#bookmarks nav ul li a"));
    bookmarkElms.map(bookmarkElm => {
        bookmarkElm.addEventListener("click", (e) => {
            e.preventDefault();
            Events.trigger('Bookmarks.LoadBookmark', 
                bookmarkElm.getAttribute('href'));
        });
    });

}

function loadBookmark(href) {
    if (href.indexOf("#t=") != -1) {
        let hrefParts = href.split('#t=');
        loadContent(hrefParts[0], hrefParts[1]);
    }
    else {
        loadContent(href);
    }
}