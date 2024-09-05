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
        console.log("SElECTOR #", selector.value);
        console.log("TEXT ", elm.textContent.trim());
        if (!isInViewport(elm, htmlDoc)) {
            elm.scrollIntoView();
        }
    }
}

function setContentWindow(win) {
    contentWindow = win;
    htmlDoc = win.document;
    if (localStorage.getItem("use-custom-highlight")) {
        htmlDoc.documentElement.style.setProperty("--highlight", localStorage.getItem("highlight"));
        htmlDoc.documentElement.style.setProperty("--highlight-bk", localStorage.getItem("highlight-bk"));
    }
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
            endContainer: node.nextSibling,
            endOffset: 100
        });
    }
    catch(err) {
        console.log("ERR creating range ", err);
    }
    return range;
    
}
export { enterCue, setContentWindow };