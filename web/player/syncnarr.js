// sync narr interface
// buttons etc

import { Narrator } from './narrator.js';
import { fetchFile } from '../common/utils.js';
import { initIframe} from './iframe.js';

var narrator;

let states = {0: "NOTSTARTED", 1: "PLAYING", 2: "PAUSED"};
let state = 0;
let captionMode = false;

async function initSyncNarration(syncnarrUrl) {

    narrator = new Narrator();
    let controlsArea = document.querySelector('#controls');
    controlsArea.innerHTML = '';

    /* 
    play button
    */
    let playButton = makeButton("Start", controlsArea);
    playButton.onclick = (e) => {
        e.preventDefault();
        if (state === 0) {
            narrator.start();
        }
        else if (state === 1) {
            narrator.pause();
        }
        else if (state === 2) {
            narrator.resume();
        }
    }

    /*
    next button
    */
    let nextButton = makeButton("Next", controlsArea);
    nextButton.onclick = (e) => {
        e.preventDefault();
        narrator.next();
    }
    /* 
    escape button
    */
    let escapeButton = makeButton("Escape", controlsArea);
    escapeButton.onclick = (e) => {
        e.preventDefault();
        narrator.escape();
    }
    escapeButton.hidden = true;

    /* 
    events
    */
    narrator.onStart = () => {
        playButton.textContent = "Pause";
        state = 1;
    }
    narrator.onPause = () => {
        playButton.textContent = "Play";
        state = 2;
    }
    narrator.onResume = () => {
        playButton.textContent = "Pause";
        state = 1;
    }
    narrator.onDone = () => {
        playButton.textContent = "Start";
        state = 0;
    }
    narrator.onCanEscape = rolevalue => {
        escapeButton.hidden = false;
        escapeButton.textContent = `Escape ${rolevalue}`;
    }
    narrator.onEscape = () => {
        escapeButton.hidden = true;
    }
    narrator.onHighlight = (id) => {
        if (id.indexOf("src_") == -1) {
            // extract the text and display it
            let elm = document.querySelector(`[id=${id}]`);
            //caption.textContent = elm.textContent;
        }
    }

    let data = await fetchFile(syncnarrUrl);
    let syncnarrJson = JSON.parse(data);
    let htmlfile = new URL(syncnarrJson.properties.text, syncnarrUrl).href;

    let iframeDoc = await initIframe(htmlfile, "#player-page");
    narrator.setHtmlDocument(iframeDoc);
    narrator.loadJson(syncnarrJson);
}

function makeButton(label, parentElm) {
    let button = document.createElement("button");
    button.textContent = label;
    parentElm.append(button);
    return button;
}

export { initSyncNarration };