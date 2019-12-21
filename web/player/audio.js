class AudioPlayer {

    constructor() {
        this.file = '';
        this.audioElm = null;
        this.start = 0;
        this.end = 0;
        this.clipDoneCallback = null;
        this.waitForSeek = false;
        this.isLastClip = 0;
        this.parentElm = null;
        this.volume = .8; // default volume
        this.rate = 1.0; // default rate
        console.log("AudioPlayer: constructor");
    }
    setControlsArea(elm) {
        this.parentElm = elm;
    }
    setFile(file) {
        console.log("Audio Player: file = ", file);
        this.file = file;
        this.audioElm = new Audio(this.file);
        this.audioElm.currentTime = 0;
        this.audioElm.volume = this.volume;
        this.audioElm.playbackRate = this.rate;
        if (this.parentElm) {
            this.parentElm.innerHTML = '';
            this.audioElm.controls = true;
            this.parentElm.appendChild(this.audioElm);
        }
        this.audioElm.addEventListener('progress', e => { this.onAudioProgress(e) });
        this.audioElm.addEventListener('timeupdate', e => { this.onAudioTimeUpdate(e) });
        this.audioElm.addEventListener('volumechange', e => this.volume = e.target.volume );
    }

    playClip(file, start, end, isLastClip, clipDoneFn) {
        this.start = parseFloat(start);
        this.end = parseFloat(end);
        this.isLastClip = isLastClip;
        this.clipDoneCallback = clipDoneFn;
        
        if (file != this.file) {
            this.audioElm = null;
            this.setFile(file);
        }
        else {
            this.waitForSeek = true;
            // check that the current time is far enough from the desired start time
            // otherwise it stutters due to the coarse granularity of the browser's timeupdate event
            if (this.audioElm.currentTime < this.start - .10 || this.audioElm.currentTime > this.start + .10) {
                this.audioElm.currentTime = this.start;
            }
            else {
                console.log(`Audio Player: ${this.audioElm.currentTime} vs ${this.start}`);
                console.log("Audio Player: close enough, not resetting");
            }
        }
    }

    pause() {
        if (this.audioElm) {
            this.audioElm.pause();
        }
    }

    async resume() {
        await this.audioElm.play();
    }

    isPlaying() {
        return !!(this.audioElm.currentTime > 0 
            && !this.audioElm.paused 
            && !this.audioElm.ended 
            && this.audioElm.readyState > 2);
    }

    // this event fires when the file downloads/is downloading
    async onAudioProgress(event) {
        // if the file is playing while the rest of it is downloading,
        // this function will get called a few times
        // we don't want it to reset playback so check that current time is zero before proceeding
        if (this.audioElm.currentTime == 0) {
            console.log("Audio Player: starting playback");
            this.audioElm.currentTime = this.start;
            await this.audioElm.play();
        }
    }

    // this event fires when the playback position changes
    async onAudioTimeUpdate(event) {
        if (this.waitForSeek) {
            this.waitForSeek = false;
            await this.audioElm.play();
        }
        else {
            if (this.end != -1 && this.audioElm.currentTime >= this.end) {
                if (this.isLastClip) {
                    this.audioElm.pause();
                }
                this.clipDoneCallback();
            }
            else if (this.audioElm.currentTime == this.audioElm.duration && this.audioElm.ended) {
                console.log("Audio Player: element ended playback");
                console.log(`current time: ${this.audioElm.currentTime}`);
                this.clipDoneCallback();
            }
        }
    }

    setRate(val) {
        console.log(`Audio Player: rate ${val}`);
        this.rate = val;
        if (this.audioElm) {
            this.audioElm.playbackRate = val;
        }
    }

    // val is a percentage of the total duration
    setPosition(val) {
        console.log(`Audio Player: position ${val}`);
        if (this.audioElm) {
            this.audioElm.currentTime = this.audioElm.duration * val/100;
        }
    }

    setVolume(val) {
        this.volume = val;
        console.log(`Audio Player: volume ${val}`);
        if (this.audioElm) {
            this.audioElm.volume = val;
        }
    }
}

export { AudioPlayer };
