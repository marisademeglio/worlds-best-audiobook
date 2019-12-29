function initIframe(url, loadedFn) {
    let content = document.querySelector('#player-page');
    content.innerHTML = '';
    let iframe = document.createElement('iframe');
    iframe.onload = () => {
        console.log(`iframe loaded ${url}`);
        if (iframe.contentDocument) {
            if (iframe.contentDocument.styleSheets.length == 0) {
                console.log("iframe has no styles -- applying style")
                let iframeStyle = iframe.contentDocument.createElement('link');
                iframeStyle.setAttribute('rel', 'stylesheet');
                iframeStyle.setAttribute('href', new URL('css/pub-default.css', document.location.href));
                let iframeHead = iframe.contentDocument.querySelector('head');
                iframeHead.appendChild(iframeStyle);
                loadedFn(iframe.contentDocument);
            }
            else {
                console.log("Document has default style, not modifying it");
                loadedFn(iframe.contentDocument);
            }
        }
        else {
            console.log("can't access iframe content doc");
            loadedFn(null);
        }
    };
    iframe.setAttribute('src', url);
    content.appendChild(iframe);
}

export {initIframe};