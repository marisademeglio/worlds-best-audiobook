// ingest a set of HTML documents
// to any "leaf" element, add a class called "narrate"
// this makes it easier for the narrator to identify discrete elements
// when marking offsets
        
const fs = require('fs-extra');
const path = require('path');
const program = require('commander');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const utils = require('./utils');

program.version('0.0.1');
program
    .requiredOption('-h, --html <folder>', 'folder with html files');
program.parse(process.argv);

let htmlPath = path.resolve(__dirname, program.html);
let out = path.resolve(__dirname, 'out/prepare-text');
console.log(`Copying ${htmlPath} to ${out}`);
fs.copySync(htmlPath, out);

// list the html files in the directory
let htmls = fs.readdirSync(out);
htmls.map(htmlFile => {
    let html = fs.readFileSync(path.resolve(out, htmlFile)).toString();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    let body = doc.querySelector("body");
    addNarrationMarkers(body);

    utils.writeOut(path.resolve(out, htmlFile), dom.serialize(), true);    
});

console.log("Done");

function addNarrationMarkers(element) {
    console.log("Adding narration markers");
    let children = Array.from(element.childNodes);
    // if all the children are type=1 and type=3 with only whitespace
    // recurse on the type 1 children and ignore the type 3s
    // else apply the class to this node
    let nonEmptyTextNodes = children.filter(child => 
        child.nodeType === 3 && child.textContent.trim().length != 0);
    
    if (nonEmptyTextNodes.length > 0) {
        element.classList.add("narrate");
    }
    else {
        children.map(child => {
            if (child.nodeType == 1) {
                addNarrationMarkers(child);
            }
        });
    }

    
    // else if all its children are elements, then recursively call this function on each one
}