const HIGHLIGHT = "#ffff00";
const HIGHLIGHTBK = "#000000";
const FONTSIZE = "medium";
const USE_CUSTOM_HIGHLIGHT = false;

import * as LocalData from '../common/localdata.js';
document.addEventListener("DOMContentLoaded", async () => {
    let urlSearchParams = new URLSearchParams(document.location.search);
    if (urlSearchParams.has("from")) {
        document
            .querySelector("#playerLink")
            .setAttribute('href', `../player?q=${urlSearchParams.get('from')}`);
    }
    
    await LocalData.initdb();
    document.querySelector("#clearall").addEventListener("click", async event => {
        await LocalData.deleteAll();
        document.querySelector("#status").textContent = "Data cleared";
        document.querySelector("#publications tbody").innerHTML = '';
    });
    
    // read fontsize stored value
    let currentFontsize = localStorage.getItem("fontsize");
    if (!currentFontsize || currentFontsize == "") {
        currentFontsize = FONTSIZE;
        localStorage.setItem("fontsize", currentFontsize);
    }

    let fontsizeInput = document.querySelector("select[name=fontsize]");
    fontsizeInput.value = currentFontsize;
    fontsizeInput.addEventListener("change", e => {
        localStorage.setItem("fontsize", e.target.value);
        refreshSampleTextStyle();
    });
    document.querySelector("#reset-fontsize").addEventListener("click", e => {
        localStorage.setItem("fontsize", FONTSIZE);
        fontsizeInput.value = FONTSIZE;
        refreshSampleTextStyle();
    });

    // read "use custom highlight" stored value
    let useCustomHighlight = localStorage.getItem("use-custom-highlight") === "true";
    if (!useCustomHighlight || useCustomHighlight == "") {
        useCustomHighlight = USE_CUSTOM_HIGHLIGHT;
        localStorage.setItem("use-custom-highlight", useCustomHighlight);
    }
    // listen for changes to 'use custom highlight'
    let useCustomHighlightInput = document.querySelector("#use-custom-highlight");
    useCustomHighlightInput.value = useCustomHighlight;
    useCustomHighlightInput.addEventListener("change", e => {
        localStorage.setItem("use-custom-highlight", e.target.checked);
        enableDisableCustomHighlightSection();
    });


    // read highlight stored value
    let currentHighlightColor = localStorage.getItem("highlight");
    if (!currentHighlightColor || currentHighlightColor == "") {
        currentHighlightColor = HIGHLIGHT;
        localStorage.setItem("highlight", currentHighlightColor);
    }

    // select the right color
    document.querySelector("#hl").value = currentHighlightColor;
    
    // listen for changes to highlight color
    document.querySelector("#hl").addEventListener("change", e => {
        localStorage.setItem("highlight", e.target.value);
        refreshSampleTextStyle();
    });

    // read highlight-bk stored value
    let currentHighlightColorBk = localStorage.getItem("highlight-bk");
    if (!currentHighlightColorBk || currentHighlightColorBk == "") {
        currentHighlightColorBk = HIGHLIGHTBK;
        localStorage.setItem("highlight-bk", currentHighlightColorBk);
    }

    // select the right color
    document.querySelector("#hlbk").value = currentHighlightColorBk;
    
    // listen for changes to highlightbk color
    document.querySelector("#hlbk").addEventListener("change", e => {
        localStorage.setItem("highlight-bk", e.target.value);
        refreshSampleTextStyle();
    });

    document.querySelector("#reset-highlight").addEventListener("click", e => {
        localStorage.setItem("highlight", HIGHLIGHT);
        document.querySelector("#hl").value = HIGHLIGHT;
        document.querySelector("#hlbk").value = HIGHLIGHTBK;
        refreshSampleTextStyle();
    });

    refreshSampleTextStyle();
    enableDisableCustomHighlightSection();
    await loadBookData();

});

function refreshSampleTextStyle() {
    document.querySelector("#sample-text").style.fontSize = localStorage.getItem("fontsize");
    document.querySelector("#sample-text .highlight").style.color = localStorage.getItem("highlight");
    document.querySelector("#sample-text .highlight").style.backgroundColor = localStorage.getItem("highlight-bk");
    
}

function enableDisableCustomHighlightSection() {
    if (localStorage.getItem("use-custom-highlight") == "true") {
        document.querySelector("#use-custom-highlight").checked = true;
        document.querySelector("#custom-highlight fieldset").removeAttribute("disabled");
        document.querySelector("#custom-highlight").classList.remove("disabled");
    }
    else {
        document.querySelector("#use-custom-highlight").checked = false;
        document.querySelector("#custom-highlight fieldset").setAttribute("disabled", "disabled");
        document.querySelector("#custom-highlight").classList.add("disabled");
    }
}

async function clearLastRead(pubid) {
    let pubdata = await LocalData.getPositions(pubid);
    let position = pubdata.find(item => item.type === "last");
    await LocalData.removePosition(position.id);
}

async function clearBookmarks(pubid) {
    let pubdata = await LocalData.getPositions(pubid);
    let positions = pubdata.filter(item => item.type === "bookmark");
    let i;
    for (i=0; i<positions.length; i++) {
        await LocalData.removePosition(positions[i].id);
    }
}

async function loadBookData() {
    let pubs = await LocalData.getPublications();
    let tbody = document.querySelector("#publications tbody");
    pubs.map(pub => {
        let tr = document.createElement('tr');
        let tdTitle = document.createElement('td');
        tdTitle.textContent = pub.title;
        let tdClearLastRead = document.createElement('td');
        let buttonClearLastRead = document.createElement('button');
        buttonClearLastRead.textContent = "Clear last-read";
        buttonClearLastRead.addEventListener('click', e=>clearLastRead(pub.pubid));
        tdClearLastRead.appendChild(buttonClearLastRead);

        let tdClearBmks = document.createElement('td');
        let buttonClearBmks = document.createElement('button');
        buttonClearBmks.textContent = "Clear bookmarks"
        buttonClearBmks.addEventListener('click', e=>clearBookmarks(pub.pubid));
        tdClearBmks.appendChild(buttonClearBmks);

        tr.appendChild(tdTitle);
        tr.appendChild(tdClearLastRead);
        tr.appendChild(tdClearBmks);

        tbody.appendChild(tr);
    });
}