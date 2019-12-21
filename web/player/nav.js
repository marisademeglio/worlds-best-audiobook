import { fetchFile } from '../common/utils.js';

class Nav {
    constructor() {
        this.base = "";
        this.loadContentCallback = null;
    }
    
    setLoadContentCallback(fn) {
        this.loadContentCallback = fn;
    }

    async loadToc(manifest) {
        let toc = manifest.getToc();
        if (manifest.hasHtmlToc()) {
            this.base = toc.url;
            await this.loadHtmlToc(toc.url);
        }
        else {
            this.base = manifest.base;
            this.loadGeneratedToc(toc);
        }
    }

    async loadHtmlToc(url) {
        let tocFile = await fetchFile(url);
        const parser = new DOMParser();
        const tocDoc = parser.parseFromString(tocFile, "text/html");
        let navElm = tocDoc.documentElement.querySelector("[role=doc-toc]");
        document.querySelector("#player-toc").appendChild(navElm);
        let navListElms = Array.from(document.querySelectorAll("[role=doc-toc] li"));
        navListElms.map(navListElm => {
            navListElm.addEventListener("click", (e) => {
                e.preventDefault();
                if (this.loadContentCallback) {
                    this.loadContentCallback(navListElm.querySelector("a").getAttribute('href'));
                }
            });
        });
    }
    
    loadGeneratedToc(data, base) {
        this.base = base;
        let tocElm = document.querySelector("#player-toc")
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
                if (this.loadContentCallback) {
                    this.loadContentCallback(navListElm.querySelector("a").getAttribute('href'));
                }
            });
        });
    }
    
    setCurrentTocItem(url) {
        let navListElms = Array.from(document.querySelectorAll("[role=doc-toc] a"));
        navListElms.map(elm => elm.classList.remove("current"));
        let currentElm = navListElms.find(elm => new URL(elm.getAttribute('href'), this.base).href == url);
        if (currentElm) {
            currentElm.classList.add("current");
        }
    }
}

export { Nav };