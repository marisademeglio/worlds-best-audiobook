import * as Nav from './nav.js';
import * as Events from './events.js';
import * as Audio from './audio.js';
import * as Utils from '../common/utils.js';
import * as Narrator from './narrator.js';  
import * as Controls from './controls.js';
import { initIframe } from './iframe.js';

// load content doc into the content pane
async function play(manifest, offset=0) {
    let readingOrderItem = manifest.getCurrentReadingOrderItem();
    Nav.setCurrentTocItem(readingOrderItem.url);
    
    Events.off('Audio.clipDone', onAudioClipDone);
    Events.off('Narrator.Done', onNarratorDone);
    
    if (Utils.isAudio(readingOrderItem.encodingFormat)) {
        if (readingOrderItem.hasOwnProperty('alternate')) {
            if (readingOrderItem.alternate[0].encodingFormat == "text/html") {
                log.info("Player: alternate is HTML");
                await loadHtml(readingOrderItem.alternate[0].url);
                loadAudio(readingOrderItem.url, offset);
            }
            else if (readingOrderItem.alternate[0].encodingFormat == "application/vnd.syncnarr+json") {
                log.info("Player: alternate is sync narration");
                await loadSyncNarration(readingOrderItem.alternate[0].url, offset);
            }
        }
        else {
            log.info("Player: content is audio");
            loadCover(manifest);
            loadAudio(readingOrderItem.url);
        }
    }
}

// just load the cover as the content
function loadCover(manifest) {
    let contentElm = document.querySelector("#player-page");
    let cover = manifest.getCover();
    if (cover) {
        if (Utils.isImage(cover.encodingFormat)) {
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

function loadAudio(url, offset=0) {
    Controls.showAudioControls();
    Events.on('Audio.clipDone', onAudioClipDone);
    Audio.playClip(url, offset, -1, true);
}

async function loadSyncNarration(url, offset=0) {
    Controls.showSyncNarrationControls();
    Events.on('Narrator.Done', onNarratorDone);
    let data = await Utils.fetchFile(url);
    let syncnarrJson = JSON.parse(data);
    let htmlfile = new URL(syncnarrJson.properties.text, url).href;

    let iframeDoc = await initIframe(htmlfile, "#player-page");
    Narrator.setHtmlDocument(iframeDoc);
    Narrator.loadJson(syncnarrJson, offset);
}

function onAudioClipDone(src) {
    Events.trigger('Chapter.Done');
}

function onNarratorDone() {
    Events.trigger('Chapter.Done');
}

export {
    play
};
