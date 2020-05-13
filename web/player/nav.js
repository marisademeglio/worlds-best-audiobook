import { fetchFile, isInViewport } from '../common/utils.js';
import { initIframe } from './iframe.js';
import * as Events from './events.js';

let base = "";
let onLoadContentListener = null;
let tocdoc = null;
let textColors = [];

async function loadToc(manifest) {
    let toc = manifest.getToc();
    if (manifest.hasHtmlToc()) {
        base = toc.url;
        await loadHtmlToc(toc.url);
    }
    else {
        base = manifest.base;
        loadGeneratedToc(toc);
    }
}

async function loadHtmlToc(url) {
    tocdoc = await initIframe(url, "#player-toc details div");
    let navListElms = Array.from(tocdoc.querySelectorAll("[role=doc-toc] a"));
    navListElms.map(navListElm => {
        navListElm.addEventListener("click", (e) => {
            e.preventDefault();
            Events.trigger('Nav.LoadContent', navListElm.getAttribute('href'));
        });

        // save the colors so we can restore them 
        textColors.push(navListElm.style.color);
    });
}


function loadGeneratedToc(data, base) {
    base = base;
    tocdoc = document;
    let tocElm = document.querySelector("#player-toc details div")
    tocElm.innerHTML = `
    <nav role='doc-toc'>
        <ol>
            ${data.map(item => `<li><a href=${item.url}>${item.name}</a></li>`).join('')}
        </ol>
    </nav>`;
    let navListElms = Array.from(document.querySelectorAll("[role=doc-toc] li"));
    navListElms.map(navListElm => {
        navListElm.addEventListener("click", (e) => {
            e.preventDefault();
            Events.trigger('Nav.LoadContent', 
                navListElm.querySelector("a").getAttribute('href'));
        });
    });
}
    
function setCurrentTocItem(url) {
    let navListElms = Array.from(tocdoc.querySelectorAll("[role=doc-toc] a"));
    navListElms.map(elm => elm.classList.remove("current"));
    navListElms.map((elm, idx) => elm.style.color = textColors[idx]);
    let currentElm = navListElms.find(elm => new URL(elm.getAttribute('href'), base).href == url);
    if (currentElm) {
        currentElm.classList.add("current");
        if (localStorage.getItem("highlight")) {
            currentElm.style.color = localStorage.getItem("highlight");
        }
        if (!isInViewport(currentElm, tocdoc)) {
            currentElm.scrollIntoView();
        }
    }
}

export { 
    loadToc,
    setCurrentTocItem 
};