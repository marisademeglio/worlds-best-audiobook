import { Manifest } from '../common/audiobooks.js';
import * as Nav from './nav.js';
import * as Audio from './audio.js';
import * as Controls from './controls.js';
import * as LocalData from '../common/localdata.js';
import * as Events from './events.js';
import * as Chapter from './chapter.js';
import * as Utils from '../common/utils.js';

var manifest;
let isEditBookmarks = false;
let isCaption = false;
log.setLevel("trace");

document.addEventListener("DOMContentLoaded", async () => {
    await LocalData.initdb();
    Events.on("Chapter.Done", chapterPlaybackDone);
    Events.on('Nav.LoadContent', loadContent);
    Events.on("Audio.PositionChange", onAudioPositionChange);
    Events.on("Request.Pubid", onRequestPubId);
    Events.on("Bookmarks.Refresh", onBookmarksRefresh);
    Events.on("Bookmarks.LoadBookmark", loadBookmark);
    Events.on("Narrator.Highlight", onNarratorHighlight);
    Events.on("Captions.On", onCaptionsOn);
    Events.on("Captions.Off", onCaptionsOff);

    
    if (window.matchMedia('(max-width: 768px)')) {
        collapse();
    }

    let urlSearchParams = new URLSearchParams(document.location.search);
    if (urlSearchParams.has("q")) {
        open(urlSearchParams.get("q"));
    }

    if (localStorage.getItem("fontsize")) {
        document.querySelector("body").style.fontSize = localStorage.getItem("fontsize");
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
        // TODO show detailed error message
        log.error("Manifest error(s)");
        return;
    }
    else {
        Controls.init();
    }
    document.querySelector("#settingsLink").setAttribute('href', `settings.html?from=${url}`)
    document.title = `Audiobook: ${manifest.getTitle()}`;
    loadPubInfo(manifest);
    LocalData.addPublication(manifest.data.id, manifest.getTitle());
    await Nav.loadToc(manifest);

    let lastReadPosition = await LocalData.getLastRead(manifest.data.id);
    log.debug("Player: last read position is ", lastReadPosition);
    
    await loadBookmarks();

    let readingOrderItem = lastReadPosition ? 
        manifest.updateCurrentReadingOrderIndex(lastReadPosition.readingOrderItem) 
        : 
        manifest.getCurrentReadingOrderItem();
    if (readingOrderItem) {
        loadContent(readingOrderItem.url, false, lastReadPosition ? 
            lastReadPosition.offset ? lastReadPosition.offset : 0 : 0);
    }
    else {
        log.error("Player: reading order error");
    }
}

function loadPubInfo(manifest) {
    let infoElm = document.querySelector("#pub-info");
    infoElm.innerHTML = `
        <h1>${manifest.getTitle()}</h1>
    `;
}

// load content doc into the content pane
function loadContent(url, autoplay=true, offset=0) {
    log.debug(`Player: loading content ${url} @ ${offset}`);
    let readingOrderItem = manifest.updateCurrentReadingOrderIndex(url);
    saveChapterPosition(manifest.getCurrentReadingOrderItem());
    
    if (readingOrderItem) {
        Chapter.play(manifest, autoplay, offset);
    }
}

function onNarratorHighlight(id, innerHTML) {
    document.querySelector("#player-captions").innerHTML = innerHTML;
    if (localStorage.getItem("highlight")) {
        document.querySelector("#player-captions").style.color = localStorage.getItem("highlight");
    }
}

// event callback
async function chapterPlaybackDone(src) {
    log.debug("Player: end of chapter", src);
    // narrator sends empty strings for src values
    // we really just need to check it against the manifest for audio-only chapters
    if (src == '' || src == manifest.getCurrentReadingOrderItem().url) {
        let readingOrderItem = manifest.gotoNextReadingOrderItem();
        if (readingOrderItem) {
            await loadContent(readingOrderItem.url);
        }
        else {
            log.debug("Player: end of book");
        }
    }
    // else ignore it, sometimes the audio element generates multiple end events
}

// note our current position
function saveChapterPosition(readingOrderItem) {
    log.debug("Player: saving last-read position"); 
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
    Events.trigger("Response.Pubid", manifest.data.id);
}

async function onBookmarksRefresh() {
    await loadBookmarks();
}

// refresh the bookmarks list
async function loadBookmarks() {
    let bookmarks = await LocalData.getBookmarks(manifest.data.id);
    let bookmarksNav = document.querySelector("#bookmarks nav");
    if (bookmarks.length > 0) {
        // each bookmark is a clickable list item with a "delete" button, which is disabled if we're not in "edit bookmarks" mode
        let bookmarksListItems = bookmarks.map(bmk => 
            `<li>
                <a href="${bmk.readingOrderItem}#t=${bmk.offset}">
                    ${bmk.label} @ ${Utils.secondsToHms(bmk.offset)}
                </a>
                <button id="bmk-${bmk.id}" ${isEditBookmarks ? '' : `class="disabled"`}>Delete</button>
            </li>`
        ).join('');
        bookmarksNav.innerHTML = "<ul>" + bookmarksListItems + "</ul>" + 
            `<button id="edit-bookmarks">${isEditBookmarks ? "Done" : "Edit"}</button>`;
        
        let bookmarkElms = Array.from(document.querySelectorAll("#bookmarks nav ul li a"));
        bookmarkElms.map(bookmarkElm => {
            bookmarkElm.addEventListener("click", (e) => {
                e.preventDefault();
                Events.trigger('Bookmarks.LoadBookmark', 
                    bookmarkElm.getAttribute('href'));
            });
        });

        let bookmarkDeleteButtons = Array.from(document.querySelectorAll("#bookmarks nav ul li button"));
        bookmarkDeleteButtons.map(deleteButton => deleteButton.addEventListener("click", async e => {
            let bmkId = deleteButton.getAttribute("id").split("-")[1];
            await LocalData.deleteBookmark(bmkId);
            loadBookmarks();
        }));

        let bookmarkEditModeButton = document.querySelector("#edit-bookmarks").addEventListener("click", e => {
            if (isEditBookmarks) {
                isEditBookmarks = false;
                let buttons = Array.from(document.querySelectorAll("#bookmarks nav li button"));
                buttons.map(button => button.classList.add("disabled"));
                document.querySelector("#edit-bookmarks").textContent = "Edit";
            }
            else {
                isEditBookmarks = true;
                let buttons = Array.from(document.querySelectorAll("#bookmarks nav li button"));
                buttons.map(button => button.classList.remove("disabled"));
                document.querySelector("#edit-bookmarks").textContent = "Done";
            }
            
        });
    }
    else {
        bookmarksNav.innerHTML = "<p>No bookmarks</p>";
        isEditBookmarks = false;
    }
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

function collapse() {
    // this should work but doesn't... 
    // document.querySelector("#player-toc details").setAttribute("open", false);
    // document.querySelector("#bookmarks details").setAttribute("open", false);
    
    collapseDetailsSummary(document.querySelector("#player-toc"));
    collapseDetailsSummary(document.querySelector("#bookmarks"));
}

function collapseDetailsSummary(parent) {
    // it's closed, so open it
    if (parent.querySelector("details").getAttribute("open") == null) {
        parent.querySelector("summary").click();
        parent.querySelector("summary").setAttribute("aria-expanded", true);
    }

    // it's open, so close it
    if (parent.querySelector("details").getAttribute("open") == "") {
        parent.querySelector("summary").click();
        parent.querySelector("summary").setAttribute("aria-expanded", false);
    }
}

function onCaptionsOn() {
    isCaption = true;
    log.info("Caption mode ON");
    document.querySelector("#player-captions").classList.remove("disabled");
    document.querySelector("#player-page").classList.add("disabled");
}

function onCaptionsOff() {
    isCaption = false;
    log.info("Caption mode OFF");
    document.querySelector("#player-captions").classList.add("disabled");
    document.querySelector("#player-page").classList.remove("disabled");
}

