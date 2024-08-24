import { isInViewport } from '../common/utils.js';

let htmlDoc = null;
let contentWindow = null;

function enterCue(cue) {
    let cuePayload = JSON.parse(cue.text);
    let selector = cuePayload.selector;
    if (htmlDoc) {
        let range = createRange(selector);
        let highlight = new Highlight(range);
        contentWindow.CSS.highlights.set("sync", highlight);
        let elm = htmlDoc.querySelector("#" + selector.value);
        if (!isInViewport(elm, htmlDoc)) {
            elm.scrollIntoView();
        }
    }
}

function setContentWindow(win) {
    contentWindow = win;
    htmlDoc = win.document;
}

function createRange(selector) {
    if (selector.type != "FragmentSelector") {
        throw Error("Unsupported selector type " + selector.type);
    }
    let node = htmlDoc.querySelector("#" + selector.value);
    let range = null;
    try {
        range = new StaticRange({
            startContainer: node,
            startOffset: 0,
            endContainer: node.nextSibling ?? node,
            endOffset: 0
        });
    }
    catch(err) {
        console.log("ERR creating range ", err);
    }
    return range;
    
}
export { enterCue, setContentWindow };