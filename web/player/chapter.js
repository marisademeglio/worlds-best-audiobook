import * as Nav from './nav.js';
import * as Events from './events.js';
import * as Audio from './audio.js';
import * as Utils from '../common/utils.js';
import * as Controls from './controls.js';
import * as Hilite from './highlight.js';

import { initIframe } from './iframe.js';


// load content doc into the content pane
async function play(manifest, autoplay, offset=0) {
    let readingOrderItem = manifest.getCurrentReadingOrderItem();
    Nav.setCurrentTocItem(readingOrderItem.url);
    
    if (Utils.isAudio(readingOrderItem.encodingFormat)) {
        if (readingOrderItem.hasOwnProperty('alternate')) {
            let alt = readingOrderItem.alternate;
            if (alt.length > 1) {
                let html = alt.find(item => item.encodingFormat == "text/html");
                let vtt = alt.find(item => item.encodingFormat == "text/vtt");
                if (html && vtt) {
                    log.info("Player: alternate is HTML + VTT");
                    await loadHtml(alt[0].url);
                    await loadAudio(readingOrderItem.url, vtt.url);
                }
            }
            else {
                if (alt[0].encodingFormat == "text/html") {
                    log.info("Player: alternate is HTML");
                    await loadHtml(alt[0].url);
                    await loadAudio(readingOrderItem.url);
                }
            }
        }
        else {
            log.info("Player: content is audio");
            loadCover(manifest);
            await loadAudio(readingOrderItem.url);
        }
    }
}

// just load the cover as the content
function loadCover(manifest) {
    let contentElm = document.querySelector("#player-page");
    let cover = manifest.getCover();
    if (cover) {
        if (Utils.isImage(cover.encodingFormat)) {
            contentElm.innerHTML = `<div id="cover-image-container"><img src="${cover.url}" alt="Cover for ${manifest.getTitle()}"></div>`;
        }
        else {
            // TODO load html cover
        }
    }
}

async function loadHtml(url) {
    let iframeWindow = await initIframe(url, "#player-page");
    setTimeout(() => {
        Hilite.setContentWindow(iframeWindow);
    }, 500);
}

async function loadAudio(url, vtt = null) {
    Controls.showAudioControls();
    Events.on('Audio.Done', onChapterDone);
    if (vtt) {
        await Audio.loadFile(url, vtt);
        Controls.showSyncNarrationControls();
    }
    else {
        await Audio.loadFile(url);
    }
    
}

function onChapterDone() {
    Events.trigger('Chapter.Done');
}



export {
    play
};
