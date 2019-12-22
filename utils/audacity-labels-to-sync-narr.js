const fs = require('fs');
const path = require('path');
const program = require('commander');
program.version('0.0.1');
program
    .requiredOption('-i, --input <file>', 'Audacity labels file')
    .requiredOption('-c, --config <file>', 'Config JSON file (see example)')
    .option('-f, --force', 'Overwrite existing output');
program.parse(process.argv);


let syncNarrTemplate = {
    role: "body",
    properties: {
        "sync-media-css-class-active": "-active-element",
        "sync-media-css-class-playing": "-document-playing"
    }
};

if (!fs.existsSync(path.resolve(__dirname, 'out'))){
    fs.mkdirSync(path.resolve(__dirname, 'out'));
}



let meta = JSON.parse(fs.readFileSync(path.resolve(__dirname, program.config)).toString());
let labels = fs.readFileSync(path.resolve(__dirname, program.input));
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
        pairs.push(newPair);
    }
}

syncNarrTemplate.narration = pairs.map(p => {
    return {
        "audio": `${meta.audiofile}#t=${p.start.toFixed(2)},${p.end.toFixed(2)}`
    };
});
let outfile = `${path.basename(meta.audiofile, path.extname(meta.audiofile))}.json`;
let outpath = path.resolve(__dirname, 'out/', outfile);

if (fs.existsSync(outpath) && program.force || !fs.existsSync(outpath)) {
    fs.writeFileSync(outpath, JSON.stringify(syncNarrTemplate));
    console.log(`Wrote ${outpath}`);
} 
else {
    console.log(`ERROR: Cannot overwrite existing file of the same name:\n ${outpath}\nUse --force.\n`);
}
