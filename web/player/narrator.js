// processes sync narr json
// controls highlight and audio playback

import { AudioPlayer } from './audio.js';
import { isInViewport } from '../common/utils.js';

class Narrator {
  constructor() {
    this.items = [];
    this.properties = {};
    this.htmlDocument = null;
    this.position = 0;
    this.audioPlayer = new AudioPlayer();
    this.onStart = null;
    this.onPause = null;
    this.onDone = null;
    this.onResume = null;
    this.onCanEscape = null;
    this.onEscape = null;
    this.onHighlight = null;
    this.documentPlayingClass = '-document-playing';
    this.activeElementClass = '-active-element';
  }

  loadJson(json) {
    this.properties = json.properties;
    this.documentPlayingClass = json.properties.hasOwnProperty("sync-media-document-playing") ? 
      json.properties["sync-media-document-playing"] : this.documentPlayingClass;
    this.activeElementClass = json.properties.hasOwnProperty("sync-media-active-element") ? 
      json.properties["sync-media-active-element"] : this.activeElementClass;
    this.items = flatten(json.narration);
  }

  setHtmlDocument(doc) {
    this.htmlDocument = doc;
  }

  start(){
    console.log("Starting");
    this.onStart();
    this.position = 0;
    this.render(this.items[this.position]);
    this.htmlDocument.getElementsByTagName("body")[0].classList.add(this.documentPlayingClass);
  }

  pause() {
    console.log("Pausing");
    this.onPause();
    this.audioPlayer.pause();
  }

  resume() {
    console.log("Resuming");
    this.onResume();
    this.audioPlayer.resume();
  }

  escape() {
    console.log("Escape");
    this.onEscape();
    this.audioPlayer.pause();
    let textid = this.items[this.position].text.split("#")[1];
    this.resetTextStyle(textid);
    
    this.position = this.items.slice(this.position).findIndex(thing => thing.groupId !== this.items[this.position].groupId) 
      + (this.items.length - this.items.slice(this.position).length) - 1;
    this.next();
  }

  next() {
    let textid = this.items[this.position].text.split("#")[1];

    this.resetTextStyle(textid);
    
    if (this.position+1 < this.items.length) {
      this.position++;
      console.log("Loading clip " + this.position);
      this.render(
        this.items[this.position],
        this.position+1 >= this.items.length);
    }
    else {
      this.htmlDocument.getElementsByTagName("body")[0].classList.remove(this.documentPlayingClass);
      console.log("Document done");
      this.onDone();
    }
  }

  render(item, isLast) {
    if (item['role'] != '') {
      // this is a substructure
      this.onCanEscape(item["role"]);
    }
    let textid = item.text.split("#")[1];
    this.highlightText(textid);

    let audiofile = item.audio.split("#t=")[0];
    if (audiofile == '') {
      audiofile = this.properties.audio;
    }
    let start = item.audio.split("#t=")[1].split(",")[0];
    let end = item.audio.split("#t=")[1].split(",")[1];

    this.audioPlayer.playClip(audiofile, start, end, isLast, ()=>{
      console.log("Clip done");
      this.resetTextStyle(textid);
      this.next();
    });
  }

  highlightText(id) {
    let elm = this.htmlDocument.getElementById(id);
    elm.classList.add(this.activeElementClass);
    if (!isInViewport(elm, this.htmlDocument)) {
      elm.scrollIntoView();
    }
    this.onHighlight(id);
  }

  resetTextStyle(id) {
    let elm = this.htmlDocument.getElementById(id);
    elm.classList.remove(this.activeElementClass);
  }

}

let groupId = 0;
// flatten out any nested items
var flatten = function(itemsArr, roleValue) {
  var flatter = itemsArr.map(item => {
    if (item.hasOwnProperty("narration")) {
      groupId++;
      return flatten(item['narration'], item['role']);
    }
    else {
      item.role = roleValue ? roleValue : '';
      item.groupId = groupId;
      return item;
    }
  }).reduce((acc, curr) => acc.concat(curr), []);
  groupId--;
  return flatter;
}

export { Narrator };