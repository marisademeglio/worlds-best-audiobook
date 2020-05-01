// take an audiobook with html alternates, and a directory of sync points, and make a sync narr book
// the sync points must be audacity labels files, named the same as the corresponding HTML file
// e.g. THE-MASTER-CAT;-OR,-PUSS-IN-BOOTS.txt for THE-MASTER-CAT;-OR,-PUSS-IN-BOOTS.html
        
const fs = require('fs-extra');
const path = require('path');
const program = require('commander');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const utils = require('./utils');

program.version('0.0.1');
program
    .requiredOption('-a, --audiobook <file>', 'audiobook manifest')
    .requiredOption('-s, --sync <folder>', 'sync points folder')
    .option('-f, --force', 'Overwrite existing output')
    .option('-m, --markup', 'Use narration markup (class="narrate") to determine elements');
program.parse(process.argv);

let audiobookPath = path.resolve(__dirname, program.audiobook);
let audioManifest = JSON.parse(fs.readFileSync(audiobookPath));
let syncPointsPath = path.resolve(__dirname, program.sync);

let titleDir = `${audioManifest.name.replace(/ /gi, '-')}-with-sync-narr-alternate`
let out = path.resolve(__dirname, 'out');
let out_title = path.resolve(__dirname, `out/${titleDir}`);
console.log(`Copying ${audiobookPath} to ${out_title}`);
fs.copySync(path.dirname(audiobookPath), out_title);

let out_sync = path.resolve(__dirname, `out/${titleDir}/sync`);

if (!fs.existsSync(out)){
    fs.mkdirSync(out);
}
if (!fs.existsSync(out_title)){
    fs.mkdirSync(out_title);
}
if (!fs.existsSync(out_sync)){
    fs.mkdirSync(out_sync);
}

// generate sync narr files
audioManifest.readingOrder.map(item => {
    // open each text file
    let textPath = path.resolve(path.dirname(audiobookPath), item.alternate.url);
    let textFile = fs.readFileSync(textPath).toString();
    let syncPointsFilepath = path.resolve(syncPointsPath, 
        path.basename(item.alternate.url).replace('.html', '.txt'));
        
    // if this reading order entry has a corresponding sync points file:
    if (fs.existsSync(syncPointsFilepath)) {

        // parse the HTML file and prepare the elements
        const dom = new JSDOM(textFile);
        const doc = dom.window.document;
        let body = doc.querySelector("body");
        let elms = [];
        // if we're choosing elements based on class="narrate"
        if (program.markup) {
            elms = doc.querySelectorAll("*[class='narrate']");
            elms = Array.from(elms);
        }
        // else just grab the first body child and proceed through its siblings
        else {
            let elm = body.firstElementChild;
            while (elm != null) {
                if (!elm.hasAttribute('id')) {
                    elms.push(elm);
                }
                elm = elm.nextElementSibling;
            }
        }

        let pairs = parseSyncPoints(syncPointsFilepath);
        let narration = [];
        let count = 0;
        let idx = 0;
        elms.map(elm => {
            elm.setAttribute('id', `sn-${count}`);
            count++;
            // this approach depends on the number of elements and number of sync points lining up
            if (idx < pairs.length ) {
                narration.push({
                    text: `#${elm.getAttribute('id')}`,
                    audio: `#t=${pairs[idx].start.toFixed(2)},${pairs[idx].end.toFixed(2)}`
                });
            }
            else {
                console.log("Warning: more elms than pairs ", elm.getAttribute('id'));
            }
            idx++;
        });

        let syncnarrFilename = path.basename(textPath).replace('.html', '.json');
        let syncnarrPath = path.resolve(out_sync, syncnarrFilename);
        let syncnarr = {
            properties: {
                text: `../${item.alternate.url}`,
                audio: item.url,
                "sync-media-css-class-active": "-active-element",
                "sync-media-css-class-playing": "-document-playing"
            }, 
            role: 'document', 
            narration
        };

        // save html file
        utils.writeOut(path.resolve(out_title, item.alternate.url), dom.serialize(), program.force);

        // save sync narr file
        utils.writeOut(syncnarrPath, JSON.stringify(syncnarr), program.force);

        // create association in audiobook manifest - either html or sync narr, depending on 
        // if the word offset data was available
        item.alternate = {
            type: "LinkedResource",
            url: `sync/${syncnarrFilename}`,
            encodingFormat: 'application/vnd.syncnarr+json'
        };
    }
});

// save audiobook manifest
utils.writeOut(
    path.resolve(out_title, path.basename(audiobookPath)), 
    JSON.stringify(audioManifest),
    program.force);

function parseSyncPoints(filepath) {
    let labels = fs.readFileSync(filepath);
    let lines = labels.toString().split("\n");

    let i;
    let points = [];
    for (i=0; i<lines.length; i++) {
        if (lines[i].trim() != "") {
            let [start, end] = lines[i].trim().split("\t");
            if (start != end) {
                console.error("ERROR: label ranges not supported. Use them like single points.");
            }
            points.push(parseFloat(start));
        }
    }
    
    let pairs = [];
    for (i = 0; i<points.length; i++) {
        if (i < points.length - 1) {
            let newPair = {
                start: points[i],
                end: points[i+1]
            };
            //console.log("pair ", newPair);
            pairs.push(newPair);
        }
    }

    return pairs;
}

