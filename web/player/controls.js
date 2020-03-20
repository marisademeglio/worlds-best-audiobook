import * as Events from './events.js';
import * as Audio from './audio.js';
import * as Narrator from './narrator.js';
import * as LocalData from '../common/localdata.js';
import * as Utils from '../common/utils.js';

let isPlaying = false;
function init() {
    document.querySelector("#file-length").textContent = '--';
    document.querySelector("#current-position").textContent = '--';

    document.querySelector("#rate").addEventListener("input", 
        e => setPlaybackRate(e.target.value));
    document.querySelector("#volume").addEventListener("input", 
        e => setPlaybackVolume(e.target.value));
    
    document.querySelector("#reset-rate").addEventListener("click", 
        e => setPlaybackRate(100));
    document.querySelector("#mute").addEventListener("click", e => toggleMute());
    
    document.querySelector("#bookmark").addEventListener("click", e => addBookmark());

    document.querySelector("#rate").value = 100;
    setPlaybackRate(100);
    document.querySelector("#volume").value = 80;
    setPlaybackVolume(80);

    Events.on("Audio.PositionChange", onPositionChange);
    Events.on("Audio.Play", onPlay);
    Events.on("Audio.Pause", onPause);

    document.querySelector("#play-pause").addEventListener("click", e => {
        if (isPlaying) {
            Audio.pause();
        }
        else {
            Audio.resume();
        }
    });
}
function skipAhead() {
    Audio.setPosition(Audio.getPosition() + 10);
}
function skipBack() {
    Audio.setPosition(Audio.getPosition() - 10);
}
function nextPhrase() {
    Narrator.next();
}
function prevPhrase() {
    Narrator.prev();
}
function toggleMute() {
    if (Audio.isMuted()) {
        document.querySelector("#volume-wrapper").classList.remove("disabled");
        document.querySelector("#volume").disabled = false;
        document.querySelector("#mute").setAttribute("title", "Mute");
        document.querySelector("#mute").setAttribute("aria-label", "Mute");
        // make the x disappear on the icon
        Array.from(document.querySelectorAll(".mute-x")).map(node => node.classList.remove("muted"));
        Audio.unmute();
    }
    else {
        document.querySelector("#volume-wrapper").classList.add("disabled");
        document.querySelector("#volume").disabled = true;
        document.querySelector("#mute").setAttribute("title", "Unmute");
        document.querySelector("#mute").setAttribute("aria-label", "Unmute");
        // make the x appear on the icon
        Array.from(document.querySelectorAll(".mute-x")).map(node => node.classList.add("muted"));
        Audio.mute();
    }
}
function setPlaybackRate(val) {
    document.querySelector("#rate-value").textContent = `${val/100}x`;
    if (document.querySelector('#rate').value != val) {
        document.querySelector("#rate").value = val;
    }
    Audio.setRate(val/100);
}

function setPlaybackVolume(val) {
    document.querySelector("#volume-value").textContent = `${val}%`;
    Audio.setVolume(val/100);
}

function onPositionChange(position, fileDuration) {
    document.querySelector("#current-position").textContent = Utils.secondsToHms(position);
    if (document.querySelector("#file-length").textContent == '--') {
        document.querySelector("#file-length").textContent = Utils.secondsToHms(fileDuration);
    }
}

function onPlay() {
    document.querySelector("#pause").classList.remove("disabled");
    document.querySelector("#play").classList.add("disabled");
    document.querySelector("#play-pause").setAttribute("aria-label", "Pause");
    document.querySelector("#play-pause").setAttribute("title", "Pause");
    isPlaying = true;
}

function onPause() {
    document.querySelector("#pause").classList.add("disabled");
    document.querySelector("#play").classList.remove("disabled");
    document.querySelector("#play-pause").setAttribute("aria-label", "Play");
    document.querySelector("#play-pause").setAttribute("title", "Play");
    isPlaying = false;
}

function showSyncNarrationControls() {
    document.querySelector("#next").setAttribute("aria-label", "Next phrase");
    document.querySelector("#prev").setAttribute("aria-label", "Previous phrase");
    document.querySelector("#next").setAttribute("title", "Next phrase");
    document.querySelector("#prev").setAttribute("title", "Previous phrase");

    document.querySelector("#next").removeEventListener("click", nextPhrase);
    document.querySelector("#next").removeEventListener("click", skipAhead);
    document.querySelector("#prev").removeEventListener("click", prevPhrase);
    document.querySelector("#prev").removeEventListener("click", skipBack);
    
    document.querySelector("#next").addEventListener("click", e => nextPhrase());
    document.querySelector("#prev").addEventListener("click", e=> prevPhrase());
}

function showAudioControls() {
    document.querySelector("#next").setAttribute("aria-label", "Skip ahead 10 seconds");
    document.querySelector("#prev").setAttribute("aria-label", "Skip back 10 seconds");

    document.querySelector("#next").setAttribute("title", "Skip ahead 10 seconds");
    document.querySelector("#prev").setAttribute("title", "Skip back 10 seconds");

    document.querySelector("#next").removeEventListener("click", nextPhrase);
    document.querySelector("#next").removeEventListener("click", skipAhead);
    document.querySelector("#prev").removeEventListener("click", prevPhrase);
    document.querySelector("#prev").removeEventListener("click", skipBack);
    
    document.querySelector("#next").addEventListener("click", 
        e => skipAhead());
    document.querySelector("#prev").addEventListener("click", 
        e => skipBack());

}
function addBookmark() {
    // request the publication ID from the main player
    Events.off("Response.Pubid", _addBookmark);
    Events.on("Response.Pubid", _addBookmark);
    Events.trigger("Request.Pubid");
}
async function _addBookmark(id) {
    console.log("Got pub id, adding bmk");
    await LocalData.addBookmarkAtCurrentPosition(id);
    Events.trigger("Bookmarks.Refresh");
}

export {
    init,
    showSyncNarrationControls,
    showAudioControls
}