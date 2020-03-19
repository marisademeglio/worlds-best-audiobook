import * as Events from './events.js';
import * as Audio from './audio.js';
import * as Narrator from './narrator.js';

const secondsToHms = seconds => moment.utc(seconds * 1000).format('HH:mm:ss');
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
        document.querySelector("#mute").textContent = "🔇";
        document.querySelector("#mute").setAttribute("title", "Mute");
        document.querySelector("#mute").setAttribute("aria-label", "Mute");
        Audio.unmute();
    }
    else {
        document.querySelector("#volume-wrapper").classList.add("disabled");
        document.querySelector("#volume").disabled = true;
        document.querySelector("#mute").textContent = "🔈";
        document.querySelector("#mute").setAttribute("title", "Unmute");
        document.querySelector("#mute").setAttribute("aria-label", "Unmute");
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
    document.querySelector("#current-position").textContent = secondsToHms(position);
    if (document.querySelector("#file-length").textContent == '--') {
        document.querySelector("#file-length").textContent = secondsToHms(fileDuration);
    }
}

function onPlay() {
    document.querySelector("#play-pause").setAttribute("alt", "Pause");
    document.querySelector("#from-pause-to-play").beginElement();
    isPlaying = true;
}

function onPause() {
    document.querySelector("#play-pause").setAttribute("alt", "Play");
    document.querySelector("#from-play-to-pause").beginElement();
    isPlaying = false;
}

function showSyncNarrationControls() {
    document.querySelector("#next").setAttribute("alt", "Next phrase");
    document.querySelector("#prev").setAttribute("alt", "Previous phrase");

    document.querySelector("#next").removeEventListener("click", nextPhrase);
    document.querySelector("#next").removeEventListener("click", skipAhead);
    document.querySelector("#prev").removeEventListener("click", prevPhrase);
    document.querySelector("#prev").removeEventListener("click", skipBack);
    
    document.querySelector("#next").addEventListener("click", e => nextPhrase());
    document.querySelector("#prev").addEventListener("click", e=> prevPhrase());
}

function showAudioControls() {
    document.querySelector("#next").setAttribute("alt", "Skip ahead 10 seconds");
    document.querySelector("#prev").setAttribute("alt", "Skip back 10 seconds");

    document.querySelector("#next").removeEventListener("click", nextPhrase);
    document.querySelector("#next").removeEventListener("click", skipAhead);
    document.querySelector("#prev").removeEventListener("click", prevPhrase);
    document.querySelector("#prev").removeEventListener("click", skipBack);
    
    document.querySelector("#next").addEventListener("click", 
        e => skipAhead());
    document.querySelector("#prev").addEventListener("click", 
        e => skipBack());

}

export {
    init,
    showSyncNarrationControls,
    showAudioControls
}