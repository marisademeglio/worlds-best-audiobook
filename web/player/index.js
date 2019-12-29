import { Manifest } from '../common/pubmanifest-parse.js';
import { isAudio, isText, isImage } from '../common/utils.js';
import { Nav } from './nav.js';
import { AudioPlayer } from './audio.js';
import { initSyncNarration } from './syncnarr.js';
import { initdb, deleteAll, 
    addBookmark, getBookmarks, 
    getPosition, removePosition, getPositions,
    getLastRead, updateLastRead } from '../common/localdata.js';
import { initIframe } from './iframe.js';

var manifest;
var audio;
var nav;

document.addEventListener("DOMContentLoaded", () => {
    //document.querySelector("#rate").addEventListener("change", e => setRate(e.target.value));
    //document.querySelector("footer").classList.add("disable");
    initdb();

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
        //document.querySelector("footer").classList.remove("disable");
    }
    document.querySelector("#settingsLink").setAttribute('href', `settings.html?from=${url}`)
    loadPubInfo(manifest);
    nav = new Nav();
    nav.setLoadContentCallback(loadContent);
    await nav.loadToc(manifest);

    let lastReadPosition = await getLastRead(manifest.data.id);
    console.log("Player: last read position is ", lastReadPosition);
    let readingOrderItem = lastReadPosition ? 
        manifest.updateCurrentReadingOrderIndex(lastReadPosition.readingOrderItem) 
        : 
        manifest.getCurrentReadingOrderItem();
    if (readingOrderItem) {
        loadContent(readingOrderItem.url);
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
async function loadContent(url) {
    console.log(`Player: loading content ${url}`);
    let readingOrderItem = manifest.updateCurrentReadingOrderIndex(url);
    savePosition(manifest.getCurrentReadingOrderItem().originalUrl);
    if (readingOrderItem) {
        nav.setCurrentTocItem(readingOrderItem.url);
        if (isAudio(readingOrderItem.encodingFormat)) {
            document.querySelector("#controls").innerHTML = '';
            audio = null;
            if (readingOrderItem.hasOwnProperty('alternate')) {
                if (readingOrderItem.alternate[0].encodingFormat == "text/html") {
                    console.log("Player: alternate is HTML");
                    await loadHtml(readingOrderItem.alternate[0].url);
                    loadAudio(readingOrderItem.url);
                }
                else if (readingOrderItem.alternate[0].encodingFormat == "application/vnd.syncnarr+json") {
                    console.log("Player: alternate is sync narration");
                    await initSyncNarration(readingOrderItem.alternate[0].url);
                }
            }
            else {
                console.log("Player: content is audio");
                loadCover();
                loadAudio(readingOrderItem.url);
            }
            
            
            
        }
    }
}

// just load the cover as the content
function loadCover() {
    let contentElm = document.querySelector("#player-page");
    let cover = manifest.getCover();
    if (cover) {
        if (isImage(cover.encodingFormat)) {
            contentElm.innerHTML = `<img src="${cover.url}" alt="Cover for ${manifest.getTitle()}">`;
        }
        else {
            // TODO load html cover
        }
    }
}

async function loadHtml(url) {
   await initIframe(url, "#player-page");
}

function loadAudio(url) {
    if (audio) {
        audio.pause();
    }
    if (!audio) {
        audio = new AudioPlayer();
        document.querySelector("#controls").innerHTML = '';
        audio.setControlsArea(document.querySelector("#controls"));
    }
    
    // -1 means play the whole file
    audio.playClip(url, 0, -1, true, 
        async src => {
            console.log("Player: end of audio clip");
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
    );
}

function setRate(val) {
    console.log(`Player: setRate ${val}`);
    if (audio) {
        audio.setRate(val/10);
    }
}

function setPosition(val) {
    console.log(`Player: setPosition ${val}`);
    if (audio) {
        audio.setPosition(val);
    }
}

// note our current position
function savePosition(url) {
    console.log("Player: saving last-read position"); 
    let pos = {
        pubid: manifest.data.id,
        readingOrderItem: url,
    }
    if (audio) {
        pos.offset = {audio: audio.getCurrentTime()};
    }
    updateLastRead(pos);
}
