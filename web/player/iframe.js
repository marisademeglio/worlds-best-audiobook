async function initIframe(url, parentId) {
    return new Promise((resolve, reject) => {
        let content = document.querySelector(parentId);
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
                    resolve(iframe.contentDocument);
                }
                else {
                    console.log("Document has default style, not modifying it");
                    resolve(iframe.contentDocument);
                }
            }
            else {
                console.log("can't access iframe content doc");
                resolve(null);
            }
        };
        iframe.setAttribute('src', url);
        content.appendChild(iframe);
    });
}

export {initIframe};