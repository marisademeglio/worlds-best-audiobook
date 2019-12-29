// most common web audio mimetypes
// https://caniuse.com/#feat=audio
const AUDIOMIMES = 
[
    'audio/wav', 'audio/mpeg',  'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/aacp',
    'audio/flac', 'audio/ogg', 'audio/mp3'
];

// common image file types
// https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
const IMAGEMIMES = 
[
    'image/apng', 'image/bmp', 'image/gif', 'image/x-icon', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/tiff', 'image/webp'
];

async function fetchFile(file) {
    let data = await fetch(file);
    let text = await data.text();
    return text;
}

async function fetchContentType(file) {
    let res = null;
    try {
        res = await fetch(file);    
    }
    catch (err) {
        console.log(err);
        return '';
    }
    if (res) {
        let contentType = res.headers.get("Content-Type");
        if (contentType.indexOf(';') != -1) {
            return contentType.split(';')[0];
        }
        else {
            return contentType;
        }
    }
    return '';
}

// from https://github.com/SafetyCulture/bcp47/blob/develop/src/index.js
function isValidLanguageTag(locale) {
    const pattern = /^(?:(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))$|^((?:[a-z]{2,3}(?:(?:-[a-z]{3}){1,3})?)|[a-z]{4}|[a-z]{5,8})(?:-([a-z]{4}))?(?:-([a-z]{2}|\d{3}))?((?:-(?:[\da-z]{5,8}|\d[\da-z]{3}))*)?((?:-[\da-wy-z](?:-[\da-z]{2,8})+)*)?(-x(?:-[\da-z]{1,8})+)?$|^(x(?:-[\da-z]{1,8})+)$/i; // eslint-disable-line max-len

    /**
     * Validate a locale string to test if it is bcp47 compliant
     * @param {String} locale The tag locale to parse
     * @return {Boolean} True if tag is bcp47 compliant false otherwise
     */
    if (typeof locale !== 'string') return false;
    return pattern.test(locale);
}

function isAudioFormat(encodingFormat) {
    return AUDIOMIMES.includes(encodingFormat);
}

function isImageFormat(encodingFormat) {
    return IMAGEMIMES.includes(encodingFormat);
}

// looking for "PT4S" or "PT1234566S"
function isValidDuration(val) {
    if (typeof val != "string") {
        return false;
    }
    if (val.length < 4) {
        return false;
    }
    if (val.substr(0, 2) != 'PT') {
        return false;
    }
    if (val[val.length - 1] != 'S') {
        return false;
    }
    let res = parseInt(val.substr(2, val.length-3));
    return !isNaN(res);
}
function getDuration(val) {
    if (isValidDuration(val)) {
        let res = parseInt(val.substr(2, val.length-3));
        return !isNaN(res) ? res : -1;
    }
    return -1;
}

function isValidDate(val) {
    let re = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;
    let res =  re.test(val);
    return res;
}

const TermDefs = {
    ARRAY_OF_LITERALS: [
        'accessMode', 
        'accessibilityFeature', 
        'accessibilityHazard',
        'inLanguage',
        'uniqueResources',
        'rel',
        'type',
        'conformsTo'
    ],
    ARRAY_OF_LINKED_RESOURCES: [
        'readingOrder',
        'resources',
        'links',
        'alternate'
    ],
    ARRAY_OF_L10N_STRINGS: [
        'accessibilitySummary',
        'name',
        'description'
    ],
    ARRAY_OF_ENTITIES: [
        'artist',
        'author',
        'colorist',
        'contributor',
        'creator',
        'editor',
        'illustrator',
        'inker',
        'letterer',
        'penciler',
        'publisher',
        'readBy',
        'translator'
    ],
    ARRAY_OF_OBJECTS: [
        'accessModeSufficient'
    ],
    IDENTIFIERS: [
        'id'
    ],
    URLS: [
        'url'
    ],
    LITERALS: [
        'duration',
        'dateModified',
        'datePublished',
        'readingProgression',
        'license'
    ],
    BOOLEANS: [
        'abridged'
    ]
};

function normalizeData(term, value, lang, dir, base) {
    if (term == '@context') {
        return {success: false, value: null};
    }
    else if (TermDefs.ARRAY_OF_LITERALS.includes(term)) {
        return {
            success: true, 
            value: typeof value === "string" ? [value] : value
        };
    }
    else if (TermDefs.ARRAY_OF_ENTITIES.includes(term)) {
        if (typeof value === "string" || value instanceof Array) {
            let val = typeof value === "string" ? [{name: value}] : value;

            let entities = val.map (item => {
                if (typeof item === "string" || item instanceof Object) {
                    let v = typeof item === "string" ? {name: item} : item;
                    if (!v.hasOwnProperty('type')) {
                        v = {...v, type: ['Person']};
                    }
                    else {
                        if (typeof v.type === "string") {
                            v = {...v, type: [v.type]};
                        }
                    }
                    if (!v.type.includes('Person')) {
                        v = {...v, type: v.type.concat('Person')};
                    }
                    return v;
                }
                else {
                    return null;
                }
            });
            entities = entities.filter(e => e!=null);
            return {
                success: true,
                value: entities
            };
        }
        else {
            return {
                success: false,
                value: null
            };
        }
    }
    else if (TermDefs.ARRAY_OF_L10N_STRINGS.includes(term)) {
        if (typeof value === "string" || value instanceof Array) {
            let val = typeof value === "string" ? [{value: value}] : value;

            let entities = val.map (item => {
                if (typeof item === "string" || item instanceof Object) {
                    let v = typeof item === "string" ? {value: item} : item;
                    if (!v.hasOwnProperty('language')) {
                        v = {...v, language: lang};
                    }
                    if (!v.hasOwnProperty('direction')) {
                        v = {...v, direction: dir};
                    }
                    if (v.language == '') {
                        delete v.language;
                    }
                    if (v.direction == '') {
                        delete v.direction;
                    }
                    return v;
                }
                else {
                    return null;
                }
            });
            entities = entities.filter(e => e!=null);
            return {
                success: true,
                value: entities
            };
        }
        else {
            return {
                success: false,
                value: null
            };
        }
    }
    else if (TermDefs.ARRAY_OF_LINKED_RESOURCES.includes(term)) {
        if (typeof value === "string" || value instanceof Array || value instanceof Object) {
            let val = typeof value === "string" ? [{url: value}] : value;
            if (val instanceof Object && !(val instanceof Array)) {
                val = [val];
            }

            let entities = val.map (item => {
                if (typeof item === "string" || item instanceof Object) {
                    let v = typeof item === "string" ? {url: item} : item;
                    if (!v.hasOwnProperty('type')) {
                        v = {...v, type: ['LinkedResource']};
                    }
                    else {
                        if (typeof v.type === "string") {
                            v = {...v, type: [v.type]};
                        }
                    }
                    if (!v.type.includes('LinkedResource')) {
                        v = {...v, type: v.type.concat('LinkedResource')};
                    }
                    if (v.hasOwnProperty('url')) {
                        v.originalUrl = v.url; // save the original URL in case we want a relative value
                    }
                    Object.keys(v).map(key => {
                        let retval = normalizeData(key, v[key], lang, dir, base);
                        if (retval.success) {
                            v[key] = retval.value;
                        }
                    });
                    return v;
                }
                else {
                    return null;
                }
            });
            entities = entities.filter(e => e!=null);
            return {
                success: true,
                value: entities
            };
        }
        else {
            return {
                success: false,
                value: null
            };
        }
    }
    // URLs are weird because at the top level, they can be in arrays
    // but at the object (e.g. linked resource) level, they are just strings
    // so: if it's an array, keep it like that; else don't make it one.
    else if (TermDefs.URLS.includes(term)) {
        if (value instanceof Array) {
            value = value.map(v => new URL(v, base).href);
        }
        else {
            value = new URL(value, base).href;
        }
        return {
            success: true,
            value: value
        };
    }
    // pass it through
    else {
        return {'success': true, 'value': value};
    }
}

const AUDIO_REQUIRED_PROPERTIES = ["abridged", "accessMode", "accessModeSufficient", "accessibilityFeature", 
        "accessibilityHazard", "accessibilitySummary", "author", "dateModified", "datePublished", "id", 
        "inLanguage", "name", "readBy", "readingProgression", "resources", "url"];

const AUDIOBOOKS_PROFILE = "https://www.w3.org/TR/audiobooks/";        

function dataValidation(processed) {

    let processed_ = processed;
    let errors = [];

    Object.keys(processed_).map(key => {
        let retval = globalDataCheck(key, processed_[key]);
        {
            processed_[key] = retval.value;
        }
    });

    if (processed_.profile == AUDIOBOOKS_PROFILE) {
        try {
            let {data: processed__, errors: errors_} = audiobooksDataValidation(processed_);
            processed_ = processed__;
            errors = errors.concat(errors_);
        }
        catch(err) {
            errors.push({severity: "fatal", msg: `${err}`});
        }
    } 

    if (!processed_.hasOwnProperty('type') || processed_.type.length == 0 ) {
        processed_.type = ['CreativeWork'];
    }

    if (processed_.hasOwnProperty('accessModeSufficient')) {
        processed_.accessModeSufficient = processed_.accessModeSufficient.filter(item =>
            item.hasOwnProperty('type') 
            && item.type != 'ItemList'
        );
    }

    if (!processed_.hasOwnProperty('id') || processed_.id == '') {
        errors.push({severity: "validation", msg: "ID not set"});
    }

    if (processed_.hasOwnProperty('duration') && !isValidDuration(processed_.duration)) {
        errors.push({severity: "validation", msg: 'Invalid value for property "duration"'});
        delete processed_.duration;
    }

    if (processed_.hasOwnProperty('dateModified') && !isValidDate(processed_.dateModified)) {
        errors.push({severity: "validation", msg: 'Invalid value for property "dateModified"'});
        delete processed_.dateModified;
    }

    if (processed_.hasOwnProperty('datePublished') && !isValidDate(processed_.datePublished)) {
        errors.push({severity: "validation", msg: 'Invalid value for property "datePublished"'});
        delete processed_.datePublished;
    }

    if (processed_.hasOwnProperty('inLanguage')) {
        processed_.inLanguage.filter(lang => !isValidLanguageTag(lang))
            .map(invalidItem => errors.push({severity: "validation", msg: `Invalid languge tag *${invalidItem}*`}));
        processed_.inLanguage = processed_.inLanguage.filter(lang => isValidLanguageTag(lang));
    }

    if (processed_.hasOwnProperty('readingProgression')) {
        if (!["ltr", "rtl"].includes(processed_.readingProgression)) {
            errors.push({severity: "validation", msg: `Invalid value for property "readingProgression" *${processed_.readingProgression}*`});
            processed_.readingProgression = "ltr";
        }
    }
    else {
        processed_.readingProgression = 'ltr';
    }

    let urls = [];
    if (processed_.hasOwnProperty("readingOrder")) {
        urls = processed_.readingOrder.map(item => {
            let u = new URL(item.url);
            return `${u.origin}${u.pathname}`; // don't include the fragment
        });
    }

    if (processed_.hasOwnProperty("resources")) {
        urls = urls.concat(processed_.resources.map(item => {
            let u = new URL(item.url);
            return `${u.origin}${u.pathname}`; // don't include the fragment
        }));
    }
    processed_.uniqueResources = Array.from(new Set(urls));

    if (processed_.hasOwnProperty('links')) {
        let keepLinks = processed_.links.filter(item => {
            if (!item.hasOwnProperty('rel') || item.rel.length == 0) {
                errors.push({severity: "validation", msg: `Link missing property "rel" *${item.url}*`});
            }
            let u = new URL(item.url);
            let url = `${u.origin}${u.pathname}`; // don't include the fragment
            if (processed_.uniqueResources.includes(url)) {
                return false;
            }
            if (item.hasOwnProperty('rel') && 
                (item.rel.includes('contents') || item.rel.includes('pagelist') || item.rel.includes('cover'))) {
                errors.push({severity: "validation", msg: `Invalid value for property \"rel\" *cover*`});
                return false;
            }
            return true;
        });
        processed_.links = keepLinks;
    }

    let resources = [];
    if (processed_.hasOwnProperty('readingOrder')) {
        resources = processed_.readingOrder;
    }
    if (processed_.hasOwnProperty('resources')) {
        resources = resources.concat(processed_.resources);
    }
    if (resources.filter(item => item.hasOwnProperty("rel") && item.rel.includes("contents")).length > 1) {
        errors.push({severity: "validation", msg: "Multiple resources with rel=contents"});
    }
    if (resources.filter(item => item.hasOwnProperty("rel") && item.rel.includes("pagelist")).length > 1) {
        errors.push({severity: "validation", msg: "Multiple resources with rel=pagelist"});
    }
    if (resources.filter(item => item.hasOwnProperty("rel") && item.rel.includes("cover")).length > 1) {
        errors.push({severity: "validation", msg: "Multiple resources with rel=cover"});
    }
    resources.filter(item => item.hasOwnProperty("rel") && item.rel.includes("cover") 
        && isImageFormat(item.encodingFormat) && !item.hasOwnProperty('name')).map(item => 
        errors.push({severity: "validation", msg: `All image covers must have a "name" property`}));
    
    removeEmptyArrays(processed_);

    return {"data": processed_, errors};
}

function globalDataCheck(term, value) {
    // TODO
    return {success: true, value};
}

function removeEmptyArrays(value) {
    if (value instanceof Array && value.length == 0) {
        return false;
    }
    if (value instanceof Object) {
        Object.keys(value).map(key => {
            if (!removeEmptyArrays(value[key])) {
                delete value[key];
            }
        });
    }
    return true;
}

function audiobooksDataValidation(processed) {
    let processed_ = processed;
    let errors = [];

    // check reading order
    if (!processed_.hasOwnProperty('readingOrder')) {
        throw 'Missing property "readingOrder"';
    }

    let audioReadingOrderItems = processed_.readingOrder.filter(item => isAudioFormat(item.encodingFormat));
    if (processed_.readingOrder.length > audioReadingOrderItems.length) {
        errors.push({severity: "validation", msg: 'Non-audio reading order items encountered'});
        processed_.readingOrder = audioReadingOrderItems;
    }

    if (processed_.readingOrder.length == 0) {
        throw 'No reading order items available';
    }

    // check type
    if (!processed_.hasOwnProperty('type') || processed_.type.length == 0) {
        errors.push({severity: "validation", msg: 'Missing property "type"'});
        processed_.type = ["Audiobook"];
    }

    // check required properties
    AUDIO_REQUIRED_PROPERTIES.filter(prop => !processed_.hasOwnProperty(prop))
        .map(missingProp => errors.push(
            {severity: "validation", msg: `Missing property "${missingProp}"`}));
    
    // check for cover
    let cover = processed_.resources.find(r => r.rel ? r.rel.includes("cover") : false);
    if (!cover) {
        errors.push({severity: 'validation', msg: 'Missing "cover" resource'});
    }
    
    // check durations
    if (processed_.readingOrder) {
        processed_.readingOrder.map(item => {
            if (!item.hasOwnProperty('duration')) {
                errors.push({severity: 'validation', 
                    msg: `Reading order item ${item.url} missing property "duration"`});
            }
            else if (!isValidDuration(item.duration)) {
                errors.push({severity: 'validation', 
                    msg: `Reading order item ${item.url} has invalid value for property "duration" *${item.duration}*`});
                delete item.duration;
            }
        });
    }

    if (!processed_.hasOwnProperty('duration')) {
        errors.push({severity: "validation", msg: 'Missing property "duration"'});
    }
    else {
        let totalDuration = processed_.readingOrder.reduce((acc, curr) => {
            if (curr.hasOwnProperty('duration')) {
                acc+= getDuration(curr.duration);
            }
            return acc;
        }, 0);

        let correctDuration = `PT${totalDuration.toString()}S`;
        if (correctDuration != processed_.duration) {
            errors.push({severity: "validation", msg: 'Incorrect value for top-level property "duration"'});
        }
    }
    return {"data": processed_, errors};
}

const AUDIOBOOKS_PROFILE$1 = "https://www.w3.org/TR/audiobooks/";

class ManifestProcessor {
    constructor () {
        // error: {severity: "fatal|validation", msg: "description"}
        this.errors = [];
        this.json = {};
        this.processed = {};
        /*
        Profile description: 
        {
            profile: 'https://www.w3/org/TR/audiobooks/',
            encodingFormats: ['audio/mpeg']
        }
        Where mediaType is the accepted format of the reading order items. Used for guessing profiles.
        */
       // set to an array of profiles (described above)
        this.supportedProfiles =[];
        
        // set to default values
        this.defaults = {
            lang: '',
            dir: '',
            title: ''
        };
        
        this._readingOrderItems = [];
    }
    
    async loadJson(json, base = '', guessProfile = false) {
        this.json = json;
        if (!this.processed.hasOwnProperty('base')) {
            this.processed.base = '';
        }
        if (this.processed.base == '' && base != '') {
            this.processed.base = base;
        }

        try {
            this.checkContext();
            this.checkReadingOrder();
        }
        catch(err) {
            this.errors.push({severity: "fatal", msg: `${err}`});
            return;
        }

        try {
            await this.setProfile(guessProfile);
        }
        catch(err) {
            this.errors.push({severity: "fatal", msg: `${err}`});
            return;
        }

        this.setGlobalLangAndDir();

        // the reading order is partially normalized already; start where we left off
        let _manifest = {...this.json, readingOrder: this._readingOrderItems};
        // insert a title in case we add a user-defined default (read on...)
        if (!_manifest.hasOwnProperty('name')) {
            _manifest.name = '';
        }
        Object.keys(_manifest).map(key => {
            let retval = normalizeData(key, _manifest[key], 
                this.processed.lang, this.processed.dir, this.processed.base);
            if (retval.success) {
                this.processed[key] = retval.value;
            }
        });
        
        if (this.processed.name[0].value == '' && this.defaults.title != '') {
            this.processed.name[0].value = this.defaults.title;
        }

        if (this.processed.profile == AUDIOBOOKS_PROFILE$1) {  
            try {
                await this.audiobooksProcessing();    
            }  
            catch(err) {
                this.errors.push({severity: "fatal", msg: `${err}`});
            }
        }  

        let {data: processed_, errors: errors_} = dataValidation(this.processed);
        this.processed = processed_;
        this.errors = this.errors.concat(errors_);
    }

    checkContext() {
        if (this.json.hasOwnProperty('@context')) {
            if (this.json['@context'] instanceof Array) {
                if (this.json['@context'].length >= 2 && 
                    (this.json['@context'][0] != "https://schema.org" || 
                        this.json['@context'][1] != "https://www.w3.org/ns/pub-context")) {
                        throw 'Property "@context" does not contain the required values';
                }
            }   
            else {
                throw 'Property "@context" is not an Array';
            }   
        }
        else {
            throw 'Missing property "@context"';
        }
    }

    checkReadingOrder() {
        if (!this.json.hasOwnProperty('readingOrder')) {
            throw 'Missing property "readingOrder"';  
        }
        // this would be taken care of by 'normalize' except that doesn't happen until later
        // and some things we'd like to know now (in the case of guessing the profile)
        if (typeof this.json.readingOrder === "string") {
            this.json.readingOrder = [this.json.readingOrder];
        }
        // make an intermediate list of reading order objects
        this._readingOrderItems = this.json.readingOrder.map(item => {
            let itemObj = typeof item === "string" ? {url: item} : item;
            return itemObj;
        });
    }

    setGlobalLangAndDir() {
        let contexts = this.json['@context'].filter(item => item instanceof Object);
        contexts.map(context => {
            if (context.hasOwnProperty('language')) {
                this.processed.lang = context.language;
            }
            if (context.hasOwnProperty('direction')) {
                this.processed.dir = context.direction;
            }
        });
        if (!isValidLanguageTag(this.processed.lang)) {
            this.errors.push({severity: 'validation', msg: `Invalid language tag *${this.processed.lang}*`});
            this.processed.lang = '';
        }
        if (['rtl', 'ltr'].includes(this.processed.dir) == false) {
            this.errors.push({severity: 'validation', msg: `Invalid direction value *${this.processed.dir}*`});
            this.processed.dir = '';
        }
        if (this.processed.lang == '') {
            this.processed.lang = this.defaults.lang;
        }
        if (this.processed.dir == '') {
            this.processed.dir = this.defaults.dir;
        }
    }

    async setProfile(guessProfile = false) {
        let profiles = this.json.conformsTo instanceof Array ? 
            this.json.conformsTo : [this.json.conformsTo];
        
        let supportedProfileIds = this.supportedProfiles.map(profile => profile.id);

        let supportedProfileId = profiles.find(p => supportedProfileIds.includes(p));
        
        if (supportedProfileId) {
            // use the first declared profile that's supported
            this.processed.profile = supportedProfileId;
        }
        else {
            if (guessProfile) {
                // look at the readingOrder and guess
                let profile = await this.guessProfile();
                if (profile) {
                    this.processed.profile = profile.id;
                    this.errors.push({severity: "validation", msg: 'Had to guess what profile to use'});
                }
                else {
                    throw 'Could not determine profile';
                }
            }
            else {
                throw 'Could not determine profile';
            }
        }   
    }

    async guessProfile() {
        console.log("Guessing profile");
        this._readingOrderItems = await this.getEncodingFormats(this._readingOrderItems);
        let presentMediaTypes = Array.from(new Set(this._readingOrderItems.map(item => item.encodingFormat)));
        let profile = this.supportedProfiles.find(profile => {
            return !presentMediaTypes.map(mediaType => profile.encodingFormats.includes(mediaType)).includes(false);
        });
        return profile != undefined ? profile : null;
    }

    async getEncodingFormats(items) {
        return Promise.all(items.map(async item => {
            let contentType = await fetchContentType(new URL(item.url, this.processed.base));
            console.log(contentType);
            return {...item, encodingFormat: contentType};
        }));
    }

    
    // extended processing rules for audiobooks
    // https://www.w3.org/TR/audiobooks/#audio-manifest-processing
    async audiobooksProcessing() {
        // check for TOC
        let toc = this.processed.resources.find(r => r.rel ? r.rel.includes("contents") : false);
        if (toc != undefined) {
            let tocFile = await fetchFile(toc.url);
            const parser = new DOMParser();
            const tocDoc = parser.parseFromString(tocFile, "text/html");
            this.processed.toc = tocDoc.documentElement.querySelector("[role=doc-toc]") != undefined;
        }
        else {
            this.processed.toc = false;
        }
        if (!this.processed.toc) {
            this.errors.push({severity: "validation", msg: 'No HTML table of contents found'});
        }
    }
}

class Manifest {
    constructor () {
        // error: {type: "parse", msg: "description"}
        // types: parse | format | profile | validation
        this.errors = [];
        this.data = {};
        /*
        Profile description: 
        {
            profile: 'https://www.w3/org/TR/audiobooks/',
            encodingFormats: ['audio/mpeg']
        }
        Where mediaType is the accepted format of the reading order items. Used for guessing profiles.
        */
       // set to an array of profiles (described above)
        this.supportedProfiles =[];
        
        // set to default values
        this.defaults = {
            lang: '',
            dir: '',
            title: ''
        };
        this.readingOrderIndex = 0;
        this.toc = false;
        this.version = "0.1.4";
    }
    
    setSupportedProfiles(supportedProfiles) {
        this.supportedProfiles = supportedProfiles;
    }
    setDefaults(defaults) {
        this.defaults = {...this.defaults, ...defaults};
    }
    // url can be a URL object or a string
    async loadUrl(url, guessProfile = false) {
        console.log(`Loading manifest ${url}`);
        let json;
        let url_ = typeof url === "string" ? url : url.href;
        try {
            let data = await fetchFile(url_);
            json = JSON.parse(data);
        }
        catch(err) {
            this.errors.push({severity: "fatal", msg: `${err}`});
            console.log(err);
            return;
        }
        await this.loadJson(json, url_, guessProfile);
    }

    // base is the baseUrl and has to be a string
    async loadJson(json, base = '', guessProfile = false) {
        let manifestProcessor = new ManifestProcessor();
        manifestProcessor.supportedProfiles = this.supportedProfiles;
        manifestProcessor.defaults = this.defaults;
        await manifestProcessor.loadJson(json, base, guessProfile);
        this.data = manifestProcessor.processed;
        this.errors = this.errors.concat(manifestProcessor.errors);
    }

    getFatalErrors() {
        return this.errors.filter(e => e.severity === "fatal");
    }
    // return the first item in [name] that matches lang
    // use global lang if not specified
    // use first item in [name] if global lang also not specified
    getTitle(lang = '') {
        return this.getL10NStringValue(this.data.name, lang);
    }

    getCover() {
        return this.getResource("cover");
    }

    getPageList() {
        return this.getResource("pagelist");
    }

    // return the HTML TOC resource
    // or, if that doesn't exist, make a list of links from the reading order
    // [{name, url}...]
    getToc() {
        if (this.hasHtmlToc()) {
            return this.getResource('contents');
        }
        else {
            if (this.data.readingOrder) {
                return this.data.readingOrder.map(item => (
                    {
                        name: this.getL10NStringValue(item.name), 
                        url: item.url
                    })
                );
            }
            else {
                return [];
            }
        }
    }
    hasHtmlToc() {
        return this.getResource('contents') != null 
            && this.getResource('contents').encodingFormat == "text/html";
    }

    getCurrentReadingOrderItem() {
        if (this.data.readingOrder && this.data.readingOrder.length > this.readingOrderIndex) {
            return this.data.readingOrder[this.readingOrderIndex];
        }
        else {
            return null;
        }
    }

    gotoNextReadingOrderItem() {
        if (this.readingOrderIndex < this.data.readingOrder.length - 1) {
            this.readingOrderIndex++;
            return this.getCurrentReadingOrderItem();
        }
        else {
            return null;
        }
    }

    gotoPrevReadingOrderItem() {
        if (this.readingOrderIndex > 0) {
            this.readingOrderIndex--;
            return this.getCurrentReadingOrderItem();
        }
        else {
            return null;
        }
    }

    // set the reading order index to the reading order item that matches this url
    // absolute and relative URLs are both ok
    updateCurrentReadingOrderIndex(url) {
        let url_ = url.indexOf("://") == -1 ? 
            new URL(url, this.data.base) : new URL(url);
        
        if (this.data.readingOrder) {
            let idx = this.data.readingOrder.findIndex(item => item.url == url_.href);
            if (idx != -1) {
                this.readingOrderIndex = idx;
                return this.getCurrentReadingOrderItem();
            }
        }
        else {
            return null;
        }
    }


    // get a resource based on its rel value
    getResource(rel) {
        let resource = this.data.resources.find(r => r.rel ? r.rel.includes(rel) : false);
        return resource ? resource : null;
    }
    // for a localizable string, get the most sensible value, based on lang settings
    getL10NStringValue(l10nString, lang = '') {
        if (lang != '') {
            let s = l10nString.find(item => item.language === lang);
            if (s) {
                return s.value;
            }
            return l10nString[0].value;
        }
        else {
            if (this.data.lang != '') {
                let s = l10nString.find(n => n.language === this.data.lang);
                if (s) {
                    return s.value;
                }
            }
            return l10nString[0].value;
        }
    }
}

export { Manifest };
