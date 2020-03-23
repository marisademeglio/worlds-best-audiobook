import { Manifest } from '../common/audiobooks-js.js';
import { isImage } from '../common/utils.js';

document.addEventListener("DOMContentLoaded", () => {
    populateTitles();
});

// just grab the title and cover image for display
async function populateTitles() {
    // titles are defined in the main library document
    Promise.all(
        titles.map(async title => {
            // open each manifest and get the title + cover image
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
            return {
                url, 
                title: manifest.getTitle(),
                cover
            };
        })
    )
    .then(titlesData => {
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
    });
}

