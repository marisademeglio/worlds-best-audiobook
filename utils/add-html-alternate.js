// process an EPUB 2 file
// unzips it, reads the TOC, makes one HTML5 file per TOC entry, named accordingly
// export a manifest.json readingOrder
// works best when the nav points are a flat list and the HTML is basically a flat list too, contained within <body>
// i.e. this should work well on project gutenberg EPUBs

const fs = require('fs-extra');
const path = require('path');
const program = require('commander');
const extractZip = require('extract-zip');
const tmp = require('tmp');
const xpath = require('xpath');
const DOMParser = require('xmldom-alpha').DOMParser;
const XMLSerializer = require('xmldom-alpha').XMLSerializer;
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const utils = require('./utils');

program.version('0.0.1');
program
    .requiredOption('-e, --epub <file>', 'EPUB2 file')
    .requiredOption('-a, --audiobook <file>', 'Audiobook manifest')
    .option('-f, --force', 'Overwrite existing output');
program.parse(process.argv);

tmp.setGracefulCleanup();

let audiobookPath = path.resolve(__dirname, program.audiobook);
let audioManifest = JSON.parse(fs.readFileSync(audiobookPath).toString());

// configure directories
let titleDir = `${audioManifest.name.replace(/ /gi, '-')}-with-html-alternate`
let out = path.resolve(__dirname, 'out');
let out_title = path.resolve(__dirname, `out/${titleDir}`);
fs.copySync(path.dirname(audiobookPath), out_title);

let out_html = path.resolve(__dirname, `out/${titleDir}/html`);

if (!fs.existsSync(out)){
    fs.mkdirSync(out);
}
if (!fs.existsSync(out_title)){
    fs.mkdirSync(out_title);
}
if (!fs.existsSync(out_html)){
    fs.mkdirSync(out_html);
}

// start processing
(async () => {
    // unzip the EPUB
    let tmpdir = await unzip(path.resolve(__dirname, program.epub));

    const select = xpath.useNamespaces({
        html: 'http://www.w3.org/1999/xhtml',
        epub: 'http://www.idpf.org/2007/ops',
        ncx: 'http://www.daisy.org/z3986/2005/ncx/',
        opf: 'http://www.idpf.org/2007/opf',
        dc: 'http://purl.org/dc/elements/1.1/'
    });


    const packageDocPath = calculatePackageDocPath(tmpdir);

    // merge all the content docs into one giant one
    const packagedoc = new DOMParser({ errorHandler }).parseFromString(fs.readFileSync(packageDocPath).toString());
    const spineItemIdrefs = select('//opf:itemref/@idref', packagedoc);
    let allBodyChildren = [];
    spineItemIdrefs.map(idref => {
        const manifestItem = select(`//opf:item[@id='${idref.nodeValue}']`, packagedoc);
        const filepath = path.join(path.dirname(packageDocPath), manifestItem[0].getAttribute('href'));
        const contentDoc = new DOMParser({ errorHandler }).parseFromString(fs.readFileSync(filepath).toString());
        const bodyElm = select('//html:body', contentDoc);
        Array.from(bodyElm[0].childNodes).map(node => {
            if ((node.hasOwnProperty('tagName') && node.tagName == 'br')
                ||
                (node.textContent.trim() != '' && node.textContent.trim() != '\n')
            ) {
                allBodyChildren.push(node);
            }
        })
    });

    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${allBodyChildren.join('')}</body></html>`);
    const bigContentDoc = dom.window.document;
    let allNodes = Array.from(bigContentDoc.querySelectorAll("*"));
    allNodes.map(node => {
        node.removeAttribute("class");
        node.removeAttribute("xmlns");
        node.removeAttribute('tag');
        node.removeAttribute('xml:space');
    });

    // look at the EPUB NCX
    const tocPath = path.resolve(path.dirname(packageDocPath), select('//opf:item[@id="ncx"]', packagedoc)[0].getAttribute('href'));

    const tocdoc = new DOMParser({ errorHandler }).parseFromString(
        fs.readFileSync(tocPath).toString(),
        'application/x-dtbncx+xml');
    audioReadingOrderNames = audioManifest.readingOrder.map(
        item => utils.stripPunctuation(item.name).toLowerCase()
    );

    // just consider the nav points that have an equivalent (judging by name) in the audiobook manifest
    let navPointElms = select("//ncx:navPoint", tocdoc)
    .filter(elm => audioReadingOrderNames.includes(utils.stripPunctuation(elm.textContent).toLowerCase()));

    let notIncluded = select('//ncx:navPoint', tocdoc)
    .filter(elm => navPointElms.includes(elm) === false);

    console.log("COULD NOT FIND: \n", 
        notIncluded.map(ni => utils.stripPunctuation(ni.textContent).toLowerCase()).join(', '));

    let readingOrder = navPointElms
        .map(navPoint => {
            let startFrag = select("ncx:content/@src", navPoint)[0].value;
            startFrag = startFrag.split("").reverse().join("");
            startFrag = startFrag.substr(0, startFrag.indexOf("#"));
            startFrag = startFrag.split("").reverse().join("");
            let name = select("ncx:navLabel/ncx:text", navPoint)[0].textContent;
            return {
                name: name,
                url: `${name.replace(/ /gi, '-')}.html`,
                start: startFrag
            };
        });

    //console.log(readingOrder);

    readingOrder.map((item, idx) => {
        let nextItem = idx + 1 < readingOrder.length ? readingOrder[idx + 1] : "END";
        let nodes = [];
        let startElm = bigContentDoc.querySelector("#" + item.start);
        let nextElm = startElm;
        let parentElm = startElm.parentElement;
        if (startElm.nodeName == "H2") {
            let modHeading = bigContentDoc.createElement('h1');
            modHeading.innerHTML = nextElm.innerHTML;
            let subsequentElm = startElm.nextSibling;
            parentElm.removeChild(startElm);
            if (subsequentElm) {
                parentElm.insertBefore(modHeading, subsequentElm);
            }
            else {
                parentElm.appendChild(modHeading);
            }
            nextElm = modHeading;
        }


        while (nextElm != null && nextElm.getAttribute("id") != nextItem.start) {
            nodes.push(nextElm);
            nextElm = nextElm.nextSibling;
        }

        const itemDom = new JSDOM(
            `<!DOCTYPE html><html><title>${item.name}</title><head></head><body>${nodes.map(n => n.outerHTML).join('')}</body></html>`);

        let outfile = `${item.url}`;
        let outpath = path.resolve(out_html, outfile);

        utils.writeOut(outpath, itemDom.serialize(), program.force);

        // add to the audio manifest
        let audioManifestItem = audioManifest.readingOrder.find(
            audioItem => utils.stripPunctuation(audioItem.name).toLowerCase() 
            === utils.stripPunctuation(item.name).toLowerCase());
    
        audioManifestItem.alternate = {
            encodingFormat: "text/html",
            url: `html/${item.url}`,
            type: 'LinkedResource'
        };
    });

    utils.writeOut(`${out_title}/${path.basename(program.audiobook)}`, JSON.stringify(audioManifest), program.force);
    
}

)();

// utility to write files

// UNZIP
async function unzip(path) {
    const tmpdir = tmp.dirSync({ unsafeCleanup: true }).name;
    return new Promise((resolve, reject) => {
        extractZip(path, { dir: tmpdir }, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(tmpdir);
            }
        });
    })
}

// parser requires this
const errorHandler = {
    warning: w => console.log("WARNING: ", w),
    error: e => console.log("ERROR: ", e),
    fatalError: fe => console.log("FATAL ERROR: ", fe),
}

// get to the package doc
function calculatePackageDocPath(epubDir) {
    const containerFilePath = `${epubDir}/META-INF/container.xml`;
    const content = fs.readFileSync(containerFilePath).toString();
    const doc = new DOMParser({ errorHandler }).parseFromString(content);
    const select = xpath.useNamespaces({ ocf: 'urn:oasis:names:tc:opendocument:xmlns:container' });
    const rootfiles = select('//ocf:rootfile[@media-type="application/oebps-package+xml"]/@full-path', doc);
    // just grab the first one as we're not handling the case of multiple renditions
    if (rootfiles.length > 0) {
        return (path.join(epubDir, rootfiles[0].nodeValue));
    }
    return '';
}

