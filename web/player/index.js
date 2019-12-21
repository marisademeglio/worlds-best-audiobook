import { Manifest } from '../common/pubmanifest-parse.min.js';
import { isAudio, isText, isImage } from '../common/utils.js';
import { Nav } from './nav.js';
import { AudioPlayer } from './audio.js';

var manifest;
var audio;
var nav;

document.addEventListener("DOMContentLoaded", () => {
    //document.querySelector("#rate").addEventListener("change", e => setRate(e.target.value));
    document.querySelector("footer").classList.add("disable");

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
        document.querySelector("footer").classList.remove("disable");
    }
    loadPubInfo(manifest);
    nav = new Nav();
    nav.setLoadContentCallback(loadContent);
    await nav.loadToc(manifest);

    let readingOrderItem = manifest.getCurrentReadingOrderItem();
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
function loadContent(url) {
    console.log(`Player: loading content ${url}`);
    let readingOrderItem = manifest.updateCurrentReadingOrderIndex(url);
    if (readingOrderItem) {
        nav.setCurrentTocItem(readingOrderItem.url);
        // first see if it has sync narration
        /* if (manifest.getSyncNarrForCurrentReadingOrderItem()) {
            // load sync narr
        }
        else {*/
        // otherwise, treat as a single media type
        if (isAudio(readingOrderItem.encodingFormat)) {
            console.log("Player: content is audio");
            loadCover();
            loadAudio(readingOrderItem.url);
        }
        else if (isText(readingOrderItem.encodingFormat)) {

        }
        // }
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
function loadAudio(url) {
    if (audio) {
        audio.pause();
    }
    if (!audio) {
        audio = new AudioPlayer();
        audio.setControlsArea(document.querySelector("#audio-player"));
    }
    audio.playClip(url, 0, -1, true, 
        () => {
            console.log("Player: end of audio clip");
            let readingOrderItem = manifest.gotoNextReadingOrderItem();
            if (readingOrderItem) {
                loadContent(readingOrderItem.url);
            }
            else {
                console.log("Player: end of book");
            }
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
