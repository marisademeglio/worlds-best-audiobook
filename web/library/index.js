import { Manifest } from '../common/audiobooks.js';
import { isImage } from '../common/utils.js';

document.addEventListener("DOMContentLoaded", () => {
    populateTitles();
});

// just grab the title and cover image for display
async function populateTitles() {
    console.log(titles);
    // titles are defined in the main library document
    let i;
    let titlesData = [];
    for (i=0; i<titles.length; i++) {
        let title = titles[i];
        let manifest = new Manifest();
        manifest.setSupportedProfiles([{
            id: 'https://www.w3.org/TR/audiobooks/',
            encodingFormats: ['audio/mpeg']
        }]);
        let url = new URL(title, document.location.href);
        await manifest.loadUrl(url);
        let cover = manifest.getCover();
        if (!cover || !isImage(cover.encodingFormat)) {
            cover = null;
        }
        titlesData.push({
            url, 
            title: manifest.getTitle(),
            cover
        });
    }

    console.log(titlesData);
    
    titlesData.map(titleData => {
        let titleListElm = document.querySelector("#titles");
        let titleListItem = document.createElement("li");
        titleListItem.innerHTML = `
            <a href="../player/?q=${titleData.url}">
                <img src="${titleData.cover.url}" alt="Cover for ${titleData.title}">
            </a>
            <a href="../player/?q=${titleData.url}">
            ${titleData.title}
            </a>
        `;
        titleListElm.appendChild(titleListItem);
    });  
}

