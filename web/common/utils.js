async function fetchFile(file) {
    let data = await fetch(file);
    let text = await data.text();
    return text;
}


function isImage(encodingFormat) {
    return [
        'image/jpeg',
        'image/png',
        'image/svg+xml',
        'image/gif'
    ].includes(encodingFormat);
}

function isAudio(encodingFormat) {
    return [
        'audio/mpeg',
        'audio/ogg',
        'audio/mp-4'
    ].includes(encodingFormat);
}
function isText() {
    return true;
}
export { fetchFile, isImage, isAudio, isText };