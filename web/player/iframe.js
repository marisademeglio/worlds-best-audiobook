async function initIframe(url, parentSelector) {
    return new Promise((resolve, reject) => {
        let content = document.querySelector(parentSelector);
        content.innerHTML = '';
        let iframe = document.createElement('iframe');
        iframe.onload = () => {
            log.debug(`iframe loaded ${url}`);
            if (iframe.contentDocument) {
                if (iframe.contentDocument.styleSheets.length == 0) {
                    log.info("Document has no styles -- applying default style")
                    let iframeStyle = iframe.contentDocument.createElement('link');
                    iframeStyle.setAttribute('rel', 'stylesheet');
                    iframeStyle.setAttribute('href', new URL('css/pub-default.css', document.location.href));
                    let iframeHead = iframe.contentDocument.querySelector('head');
                    iframeHead.appendChild(iframeStyle);
                    resolve(iframe.contentDocument);
                }
                else {
                    log.info("Document has default style, not modifying it");
                    resolve(iframe.contentDocument);
                }
            }
            else {
                log.warn("Can't access iframe content doc");
                resolve(null);
            }
        };
        iframe.setAttribute('src', url);
        content.appendChild(iframe);
    });
}

export {initIframe};