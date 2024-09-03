import * as Events from './events.js';
import * as Highlight from './highlight.js';

/* Audio events:
Play
Pause
*/

let settings = {
    volume: 0.8,
    rate: 1.0
};
let audio = null;

async function loadFile(file, vtt) {
    log.debug("Audio Player: file = ", file);
    let wasMuted = false;
    if (audio) {
        audio.pause();
        wasMuted = audio.muted;
    }
    audio = new Audio(file);
    audio.muted = wasMuted;
    audio.volume = settings.volume;
    audio.playbackRate = settings.rate;
    audio.autoplay = true;
    audio.onplay = e => {
        Events.trigger('Audio.Play');
    };
    audio.onpause = e => {
        Events.trigger('Audio.Pause');
    };
    audio.onended = e => {
        Events.trigger('Audio.Done');
    };
    audio.ontimeupdate = e => {
        Events.trigger('Audio.PositionChange', audio.currentTime, audio.duration);
    };

    if (vtt) {
        loadCues(audio, vtt);
    }
}

function pause() {
    if (audio) {
        audio.pause();
    }
}

async function resume() {
    if (audio) {
        await audio.play();
    }
}

function isPlaying() {
    return !!(audio.currentTime > 0 
        && !audio.paused 
        && !audio.ended 
        && audio.readyState > 2);
}

function setRate(val) {
    settings.rate = val;
    if (audio) {
        audio.playbackRate = val;
    }
}

function setPosition(val) {
    if (audio) {
        if (val < 0){ 
            audio.currentTime = 0;
        }
        else if (val > audio.duration) {
            audio.currentTime = audio.duration;
        }
        else {
            audio.currentTime = val;
        }
    }
}

function setVolume(val) {
    settings.volume = val;
    if (audio) {
        audio.volume = val;
    }
}

function getPosition() {
    if (audio) {
        return audio.currentTime;
    }
    else {
        return 0;
    }
}

function mute() {
    if (audio) {
        audio.muted = true;
    }
}

function unmute() {
    if (audio) {
        audio.muted = false;
    }
}
function isMuted() {
    if (audio) {
        return audio.muted;
    }
    return false;
}


function loadCues(audioElm, vttUrl) {
    let track = document.createElement("track");
    track.default = true;
    track.kind = "metadata";
    track.src = vttUrl;
    track.onload = e => {
        let cues = audioElm.textTracks[0].cues;
        Array.from(cues).map(cue => {
            cue.onenter = e => Highlight.enterCue(cue)
        });
    }
    audioElm.append(track);
}

function nextCue() {
    let activeCueIdx = getActiveCueIndex();
    
    if (activeCueIdx != -1) {
        let cues = audio.textTracks[0].cues;
        if (activeCueIdx == cues.length - 1) {
            // DONE
        }
        else {
            activeCueIdx++;
            let startTime = cues[activeCueIdx].startTime;
            audio.currentTime = startTime;
            console.log("start time", startTime);
        }
    }
    
}

function prevCue() {
    
    let activeCueIdx = getActiveCueIndex();
    if (activeCueIdx != -1) {

        if (activeCueIdx == 0) {
            // AT START
        }
        else {
            let cues = audio.textTracks[0].cues;
            audio.currentTime = cues[activeCueIdx-1].startTime;
        }
    }
}

function getActiveCueIndex() {
    let cues = audio.textTracks[0].cues;
    let activeCues = audio.textTracks[0].activeCues;    
    let activeCueId = activeCues[activeCues.length - 1]?.id ?? -1;
    let activeCueIdx = Array.from(cues).findIndex(c => c.id == activeCueId);
    console.log("ID", activeCueId);
    console.log("IDX", activeCueIdx);
    return activeCueIdx;
}

export { 
    loadFile,
    isPlaying,
    pause,
    resume,
    setRate,
    setPosition,
    getPosition,
    setVolume,
    mute,
    unmute,
    isMuted,
    nextCue,
    prevCue
};
