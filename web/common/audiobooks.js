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
    if (data) {
        let text = await data.text();
        return text;
    }
    else {
        return null;
    }
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
    // if (val.length < 4) {
    //     return false;
    // }
    // if (val.substr(0, 2) != 'PT') {
    //     return false;
    // }
    // if (val[val.length - 1] != 'S' && val[val.length - 1] != 'M') {
    //     return false;
    // }
    // let res = parseInt(val.substr(2, val.length-3));
    // return !isNaN(res);

    // just check that it is nonzero
    return moment.duration(val).asMilliseconds() != 0;
}
function getDurationInSeconds(val) {
    return moment.duration(val).asSeconds();
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
    ACCESS_MODE_SUFFICIENT: [
        'accessModeSufficient'
    ],
    IDENTIFIERS: [
        'id'
    ],
    URLS: [
        'url', 
        'id'
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

let errors = [];
function normalize(manifest, processed) {
    errors = [];
    let processed_ = processed;
    Object.keys(manifest).map(key => {
        let retval = normalizeData(key, manifest[key], processed.lang, processed.dir);
        if (retval.success) {
            processed_[key] = retval.value;
        }
    });
    return {data: processed_, errors};
}
function normalizeData(term, value, lang, dir) {
    if (term == '@context') {
        return {success: false, value: null, errors};
    }
    if (TermDefs.ARRAY_OF_LITERALS.includes(term)) {
        return {
            success: true, 
            value: typeof value === "string" ? [value] : value
        };
    }
    if (TermDefs.ARRAY_OF_ENTITIES.includes(term)) {
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
            let namedEntities = entities.filter(e => e!=null && e.hasOwnProperty("name"));
            if (namedEntities.length != entities.length) {
                errors.push({severity: "validation", msg: "Entity missing required property 'name'."});
            }
            let i;
            for (i=0; i<namedEntities.length; i++) {
                let normName = normalizeData("name", entities[i].name, lang, dir);
                if (normName.success) {
                    namedEntities[i].name = normName.value;
                }
            }
            return {
                success: true,
                value: namedEntities
            };
        }
        else {
            return {
                success: false,
                value: null
            };
        }
    }
    if (TermDefs.ARRAY_OF_L10N_STRINGS.includes(term)) {
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
    if (TermDefs.ARRAY_OF_LINKED_RESOURCES.includes(term)) {
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
                        let retval = normalizeData(key, v[key], lang, dir);
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
        return {
            success: false,
            value: null
        };
    }
    // we purposely don't process URLs here, we do it in a separate step
    // which allows us to also catch the URL properties on LinkedResources
    
    // else pass it through
    else {
        return {'success': true, 'value': value};
    }
}

let errors$1 = [];

function globalDataCheck(processed) {
    errors$1 = [];
    let data = checkObject(processed);
    return {data, errors: errors$1};
}
function checkObject(obj) {
    let obj_ = obj;
    Object.keys(obj_).map(key => {
        let retval = checkTerm(key, obj_[key]);
        if (retval != null) {
            obj_[key] = retval;
        }
        else {
            errors$1.push({severity: 'validation', msg: `Term ${key} failed global data check and has been removed`});
            delete obj_[key];
        }
    });
    return obj_;
}
function checkTerm(term, value) {
    if (TermDefs.ARRAY_OF_ENTITIES.includes(term) || 
        TermDefs.ARRAY_OF_L10N_STRINGS.includes(term) ||
        TermDefs.ARRAY_OF_LINKED_RESOURCES.includes(term) ||
        TermDefs.ARRAY_OF_LITERALS.includes(term)) {

        if (value instanceof Array) {
            // check each value in the array
           if (TermDefs.ARRAY_OF_ENTITIES.includes(term) ||
               TermDefs.ARRAY_OF_L10N_STRINGS.includes(term) ||
               TermDefs.ARRAY_OF_LINKED_RESOURCES.includes(term)) {
                // recursively check each object property
                let filteredArray = value.map(v => checkObject(v)).filter(v => v != {});
                return filteredArray.length > 0 ? filteredArray : null;
            }
            else {
                // it's an array of literals
                let stringValues = value.filter(v => typeof v === 'string');

                if (stringValues.length != value.length) {
                    errors$1.push({severity: "validation", msg: `Array of literals expected for ${term}`});
                    return stringValues;
                }
                else {
                    return value;
                }
            }
        }
        else {
            errors$1.push({severity: "validation", msg: `Array expected for ${term}`});
            return null;
        }
    }
    if (TermDefs.BOOLEANS.includes(term)) {
        if (value != true && value != false) {
            errors$1.push({severity: "validation", msg: `Boolean expected for ${term}`});
            return null;
        }
        else {
            return value;
        }
    }
    if (TermDefs.IDENTIFIERS.includes(term) || 
             TermDefs.LITERALS.includes(term) ||
             TermDefs.URLS.includes(term)) {
        // URLs also need to allow arrays for when 'url' is a top level property
        if (typeof value != 'string' && !(value instanceof Array)) {
            errors$1.push({severity: "validation", msg: `String or Array expected for ${term}`});
            return null;
        }
        else {
            return value;
        }
    }
    return value;
}

const AUDIO_REQUIRED_PROPERTIES = ["abridged", "accessMode", "accessModeSufficient", "accessibilityFeature", 
        "accessibilityHazard", "accessibilitySummary", "author", "dateModified", "datePublished", "id", 
        "inLanguage", "name", "readBy", "readingProgression", "resources", "url"];

const AUDIOBOOKS_PROFILE = "https://www.w3.org/TR/audiobooks/";        
let errors$2 = [];

function dataValidation(processed) {

    let processed_ = processed;
    errors$2 = [];    

    // use lowercase everywhere
    if (processed_.hasOwnProperty('links')) {
        processed_.links = lowerCaseRel(processed_.links);
    }
    if (processed_.hasOwnProperty('readingOrder')) {
        processed_.readingOrder = lowerCaseRel(processed_.readingOrder);        
    }
    if (processed_.hasOwnProperty('resources')) {
        processed_.resources = lowerCaseRel(processed_.resources);
    }


    if (processed_.profile == AUDIOBOOKS_PROFILE) {
        try {
            let {data: processed__, errors: errors_} = audiobooksDataValidation(processed_);
            processed_ = processed__;
            errors$2 = errors$2.concat(errors_);
        }
        catch(err) {
            errors$2.push({severity: "fatal", msg: `${err}`});
        }
    } 

    if (!processed_.hasOwnProperty('type') || processed_.type.length == 0 ) {
        errors$2.push({severity: "validation", msg: "No type"});
        processed_.type = ['CreativeWork'];
    }

    if (processed_.hasOwnProperty('accessModeSufficient')) {
        let value = processed_.accessModeSufficient;
        if (value instanceof Array) {
            processed_.accessModeSufficient = value.filter(v => {
                if (v.hasOwnProperty('type') && v.type === 'ItemList') {
                    return true;
                }
                else {
                    errors$2.push({severity: 'validation', msg: `accessModeSufficient requires an array of ItemList objects`});
                    return false;
                }
            });
        }
        else {
            errors$2.push({severity: 'validation', msg: `Array expected for accessModeSufficient`});
            delete processed_.accessModeSufficient;
        }
    }

    if (!processed_.hasOwnProperty('id') || processed_.id == '') {
        errors$2.push({severity: "validation", msg: "ID not set"});
    }

    if (processed_.hasOwnProperty('duration') && !isValidDuration(processed_.duration)) {
        errors$2.push({severity: "validation", msg: 'Invalid value for property "duration"'});
        delete processed_.duration;
    }

    if (processed_.hasOwnProperty('dateModified') && !isValidDate(processed_.dateModified)) {
        errors$2.push({severity: "validation", msg: 'Invalid value for property "dateModified"'});
        delete processed_.dateModified;
    }

    if (processed_.hasOwnProperty('datePublished') && !isValidDate(processed_.datePublished)) {
        errors$2.push({severity: "validation", msg: 'Invalid value for property "datePublished"'});
        delete processed_.datePublished;
    }

    if (processed_.hasOwnProperty('inLanguage')) {
        processed_.inLanguage.filter(lang => !isValidLanguageTag(lang))
            .map(invalidItem => errors$2.push({severity: "validation", msg: `Invalid language tag *${invalidItem}*`}));
        processed_.inLanguage = processed_.inLanguage.filter(lang => isValidLanguageTag(lang));
    }

    if (processed_.hasOwnProperty('readingProgression')) {
        if (!["ltr", "rtl"].includes(processed_.readingProgression)) {
            errors$2.push({severity: "validation", msg: `Invalid value for property "readingProgression" *${processed_.readingProgression}*`});
            processed_.readingProgression = "ltr";
        }
    }
    else {
        processed_.readingProgression = 'ltr';
    }

    let urls = [];
    if (processed_.hasOwnProperty("readingOrder")) {
        urls = processed_.readingOrder.map(item => {
            let u = new URL(item.url, processed_.base);
            return `${u.origin}${u.pathname}`; // don't include the fragment
        });
    }

    if (processed_.hasOwnProperty("resources")) {
        urls = urls.concat(processed_.resources.map(item => {
            let u = new URL(item.url, processed_.base);
            return `${u.origin}${u.pathname}`; // don't include the fragment
        }));
    }
    processed_.uniqueResources = Array.from(new Set(urls));

    if (processed_.hasOwnProperty('links')) {
        let keepLinks = processed_.links.filter(item => {
            if (!item.hasOwnProperty('rel') || item.rel.length == 0) {
                errors$2.push({severity: "validation", msg: `Link missing property "rel" *${item.url}*`});
            }
            let u = new URL(item.url);
            let url = `${u.origin}${u.pathname}`; // don't include the fragment
            if (processed_.uniqueResources.includes(url)) {
                errors$2.push({severity: "validation", msg: `URL ${item.url} appears in bounds; removed from "links".`});
                return false;
            }
            if (item.hasOwnProperty('rel') && 
                (item.rel.includes('contents') || item.rel.includes('pagelist') || item.rel.includes('cover'))) {
                errors$2.push({severity: "validation", msg: `Invalid value for property "rel" in "links" (cannot be "cover", "contents", or "pagelist").`});
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

    // warn on duplicates in reading order
    if (processed_.hasOwnProperty('readingOrder')) {
        let urls_ = processed_.readingOrder.map(item => {
            let u = new URL(item.url);
            return `${u.origin}${u.pathname}`;
        });
        let uniqueUrls_ = Array.from(new Set(urls_));
        if (urls_.length != uniqueUrls_.length) {
            errors$2.push({severity: "validation", msg: "Reading order contains duplicate URLs"});
        }
    }

    // warn about duplicates in resources
    if (processed_.hasOwnProperty('resources')) {
        let urls_ = processed_.resources.map(item => {
            let u = new URL(item.url);
            return `${u.origin}${u.pathname}`;
        });
        let uniqueUrls_ = Array.from(new Set(urls_));
        if (urls_.length != uniqueUrls_.length) {
            errors$2.push({severity: "validation", msg: "Resources contain duplicate URLs"});
        }
    }
    
    if (resources.filter(item => item.hasOwnProperty("rel") && item.rel.includes("contents")).length > 1) {
        errors$2.push({severity: "validation", msg: "Multiple resources with rel=contents"});
    }
    if (resources.filter(item => item.hasOwnProperty("rel") && item.rel.includes("pagelist")).length > 1) {
        errors$2.push({severity: "validation", msg: "Multiple resources with rel=pagelist"});
    }
    if (resources.filter(item => item.hasOwnProperty("rel") && item.rel.includes("cover")).length > 1) {
        errors$2.push({severity: "validation", msg: "Multiple resources with rel=cover"});
    }
    resources.filter(item => item.hasOwnProperty("rel") && item.rel.includes("cover") 
        && isImageFormat(item.encodingFormat) && !item.hasOwnProperty('name')).map(item => 
        errors$2.push({severity: "validation", msg: `All image covers must have a "name" property`}));
    
    if (processed_.hasOwnProperty('readingOrder')) {
        processed_.readingOrder = validateDurations(processed_.readingOrder);
    }
    if (processed_.hasOwnProperty('links')) {
        processed_.links = validateDurations(processed_.links);
    }
    if (processed_.hasOwnProperty('resources')) {
        processed_.resources = validateDurations(processed_.resources);
    }
    
    removeEmptyArrays(processed_);

    let {data: globalDataCheckProcessed, errors: globalDataCheckErrors} = globalDataCheck(processed_);
    processed_ = globalDataCheckProcessed;
    errors$2 = errors$2.concat(globalDataCheckErrors);

    return {"data": processed_, errors: errors$2};
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
        throw 'No audio reading order items available.';
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
    
    let cover = null;
    // check for cover
    if (processed_.hasOwnProperty('resources')) {
        cover = processed_.resources.find(r => r.rel ? r.rel.includes("cover") : false);
    }
    if (!cover) {
        errors.push({severity: 'validation', msg: 'Missing "cover" resource'});
    }

    // check that reading order duration is present
    if (processed_.hasOwnProperty('readingOrder')) {
        processed_.readingOrder.map(item => {
            if (!item.hasOwnProperty('duration')) {
                errors.push({severity: 'validation', 
                    msg: `Reading order item ${item.url} missing property "duration"`});
            }
        });
    }
    if (!processed_.hasOwnProperty('duration')) {
        errors.push({severity: "validation", msg: 'Missing property "duration"'});
    }
    else {
        let totalDuration = processed_.readingOrder.reduce((acc, curr) => {
            if (curr.hasOwnProperty('duration')) {
                acc+= getDurationInSeconds(curr.duration);
            }
            return acc;
        }, 0);

        if (totalDuration != getDurationInSeconds(processed_.duration)) {
            errors.push({severity: "validation", msg: 'Incorrect value for top-level property "duration"'});
        }
    }
    return {"data": processed_, errors};
}

function lowerCaseRel(linkedResources) {
    let output = linkedResources.map(item => 
        item.hasOwnProperty('rel') ? 
            ({...item, rel: item.rel.map(r => r.toLowerCase())}) : item);
    return output;
}

function validateDurations(linkedResourcesArr) {
    let linkedResourcesArr_ = linkedResourcesArr.map(item => {
        if (item.hasOwnProperty('duration')) {
            if (!isValidDuration(item.duration)) {
                errors$2.push({severity: 'validation', 
                    msg: `Linked resource item ${item.url} has invalid value for property "duration" *${item.duration}*`});
                let item_ = item;
                delete item_.duration;
                return item_;
            }
            else {
                return item;
            }
        }
        else {
            return item;
        }
    });
    return linkedResourcesArr_;
}

let errors$3 = [];
// test out all the URLs to make sure we can work with them
// if they are valid, make them into URL objects
function validateUrlsAndRenormalize(data) {
    errors$3 = [];
    data = scanProperties(data, data.base);

    // Renormalize:
    // remove any LinkedResources that are now missing urls (because we removed invalid properties in the steps below)
    if (data.hasOwnProperty('links')) {
        data['links'] = removeItemsWithNoUrl(data['links']);
    }
    if (data.hasOwnProperty('readingOrder')) {
        data['readingOrder'] = removeItemsWithNoUrl(data['readingOrder']);
    }
    if (data.hasOwnProperty('resources')) {
        data['resources'] = removeItemsWithNoUrl(data['resources']);
    }

    return {data, errors: errors$3};
}

function removeItemsWithNoUrl(linkedResources) {
    let items_ = linkedResources.filter(item => item.hasOwnProperty('url'));
    if (items_.length != linkedResources.length) {
        errors$3.push({severity: 'validation', msg: "LinkedResource removed"});
    }
    return items_;
}
function scanProperties(obj, base) {
    let data = obj;
    Object.keys(data).map(key => {
        if (typeof data[key] === 'string' && TermDefs.URLS.includes(key)) {
            let result = checkUrl(data[key], base);
            if (!result) {
                delete data[key];
            }
            else {
                data[key] = result;
            }
        }
        else if (data[key] instanceof Array) {
            data[key] = data[key].map(item => {
                if (typeof item === 'string' && TermDefs.URLS.includes(key)) {
                    return checkUrl(item, base);
                }
                else if (item instanceof Object) {
                    return scanProperties(item, base);
                }
                else {
                    return item;
                }
            })
            .filter(item => item != null);
        }
        else if (data[key] instanceof Object) {
            data[key] = scanProperties(data[key]);
        }
    });
    return data;
}

function checkUrl(url, base) {
    let url_;
    try {
        url_ = new URL(url, base).href;
    }
    catch (err) {
        errors$3.push({severity: "validation", msg: `Invalid URL ${url}`});
        return null;
    }
    return url_;
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
        
        this.defaults = {};
        
        this._readingOrderItems = [];
    }
    
    async loadJson(json, base = '', guessProfile = false, htmlUrl = '') {
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

        let {data: normalizedData, errors: normalizedErrors} = normalize(_manifest, this.processed);
        this.errors = this.errors.concat(normalizedErrors);

        Object.keys(normalizedData).map(k => this.processed[k] = normalizedData[k]);
        //this.processed = {...this.processed, ...normalizedData};
        
        
        if (this.processed.name[0].value == '') {
            if (this.defaults.title != '') {
                this.processed.name[0].value = this.defaults.title;
            }
            else {
                this.processed.name[0].value = "Publication";
                this.errors.push({severity: "validation", msg: "No default title found"});
            }
        }

        let {data: urlsProcessed, errors: urlErrors} = validateUrlsAndRenormalize(this.processed);
        this.errors = this.errors.concat(urlErrors);

        this.processed = urlsProcessed;

        let {data: dataValidationProcessed, errors: dataValidationErrors} = dataValidation(this.processed);

        this.processed = dataValidationProcessed;
        
        this.checkDocumentUrl(htmlUrl);

        this.errors = this.errors.concat(dataValidationErrors);
        
        if (this.processed.profile == AUDIOBOOKS_PROFILE$1) {  
            try {
                await this.audiobooksProcessing();    
            }  
            catch(err) {
                this.errors.push({severity: "fatal", msg: `${err}`});
            }
        }
    }

    checkContext() {
        if (this.json.hasOwnProperty('@context')) {
            if (this.json['@context'] instanceof Array) {
                if (this.json['@context'].length >= 2) {
                    if (this.json['@context'][0] != "https://schema.org" ||  
                        this.json['@context'][1] != "https://www.w3.org/ns/pub-context") {
                        throw 'Property "@context" does not contain the required values';
                    }
                }
                else {
                    throw 'Property @context does not contain the required values';
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
            this.json.readingOrder = [];
        }
        // if (!this.json.hasOwnProperty('readingOrder')) {
        //     throw 'Missing property "readingOrder"';  
        // }
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
        this.processed.lang = '';
        this.processed.dir = '';
        contexts.map(context => {
            
            if (context.hasOwnProperty('language')) {
                this.processed.lang = context.language;
            }
            if (context.hasOwnProperty('direction')) {
                this.processed.dir = context.direction;
            }
        });
        if (this.processed.lang != '' && !isValidLanguageTag(this.processed.lang)) {
            this.errors.push({severity: 'validation', msg: `Invalid language tag *${this.processed.lang}*`});
            this.processed.lang = '';
        }
        if (this.processed.dir != '' && ['rtl', 'ltr'].includes(this.processed.dir) == false) {
            this.errors.push({severity: 'validation', msg: `Invalid direction value *${this.processed.dir}*`});
            this.processed.dir = '';
        }
        if (this.processed.lang == '' && this.defaults.hasOwnProperty('lang')) {
            this.processed.lang = this.defaults.lang;
        }
        if (this.processed.dir == '' && this.defaults.hasOwnProperty('dir')) {
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
                if (this.defaults.hasOwnProperty('profile')) {
                    this.processed.profile = this.defaults.profile;
                    this.errors.push({severity: "validation", msg: 'Conformance statement missing; using default profile'});
                }
                else {
                    throw "Could not determine profile, and no default profile was set."
                }
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
        this.processed.toc = false;
        if (this.processed.hasOwnProperty('resources')) {
            let toc = this.processed.resources.find(r => r.rel ? r.rel.includes("contents") : false);
            if (toc != undefined) {
                let tocFile = await fetchFile(toc.url);
                const parser = new DOMParser();
                const tocDoc = parser.parseFromString(tocFile, "text/html");
                this.processed.toc = tocDoc.documentElement.querySelector("[role=doc-toc]") != undefined;
            }
        }
        if (!this.processed.toc) {
            if (this.defaults.toc) {
                this.processed.toc = true;
            }
            else {
                this.errors.push({severity: "validation", msg: 'No HTML table of contents found'});
            }
        }
    }

    checkDocumentUrl(url) {
        if (this.processed.hasOwnProperty("readingOrder") == false) {
            this.processed.readingOrder = [];
        }
        if (this.processed.readingOrder.length == 0) {
            if (url == '') {
                this.errors.push({severity: "fatal", msg: "No reading order items available."});
            }
            else {
                if (this.defaults.toc) {
                    this.processed.readingOrder.push({url, rel: "contents"});
                }
                else {
                    this.processed.readingOrder.push({url});
                }
                this.processed.uniqueResources.push(url);
            }
        }
        else {
            if (url != '' && this.processed.uniqueResources.includes(url) == false) {
                this.errors.push({severity: "validation", msg: "Document URL must be included as a reading order entry or resource entry."});
            }
        }
    }
}

const VERSION = '0.2.4';

class Manifest {
    constructor () {
        // error: {type: "parse", msg: "description"}
        // types: fatal, validation
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
            title: '',
            toc: null
        };
        this.readingOrderIndex = 0;
        this.toc = false;
        this.version = VERSION;
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
        let base = url_;
        let contentType = '';
        try {
            contentType = await fetchContentType(url_);
            // we're opening an HTML file
            if (contentType == 'text/html') {
                let htmlFile = await fetchFile(url_); 
                if (!htmlFile) {
                    throw `Could not fetch ${url_}`;
                }
                let dom = new DOMParser().parseFromString(htmlFile, 'text/html');
                if (dom.querySelector("title") != null && dom.querySelector('title').textContent != "") {
                    this.defaults.title = dom.querySelector("title").textContent;
                }
                if (dom.querySelector("html") != null 
                    && dom.querySelector("html").hasAttribute("lang") 
                    && dom.querySelector("html").getAttribute("lang") != '') {
                    this.defaults.lang = dom.querySelector("html").getAttribute("lang");
                }
                else {
                    this.defaults.lang = "en";
                }
                if (dom.querySelector("html") != null 
                    && dom.querySelector("html").hasAttribute("dir") 
                    && dom.querySelector("html").getAttribute("dir") != '') {
                    this.defaults.dir = dom.querySelector("html").getAttribute("dir");
                }
                else {
                    this.defaults.dir = "ltr";
                }
                if (dom.querySelector("nav[role=doc-toc]")) {
                    this.defaults.toc = dom.querySelector("nav[role=doc-toc]");
                }
                
                let linkElm = dom.querySelector("link[rel='publication']");
                if (linkElm === null) {
                    throw "Publication link not found";
                }
                let manifestHref = linkElm.getAttribute('href');
                if (manifestHref[0] == '#') {
                    let embeddedManifestElm = dom.querySelector(manifestHref);
                    if (embeddedManifestElm == null) {
                        throw `Manifest at ${manifestHref} does not exist`;
                    }
                    let baseElm = dom.querySelector('base');
                    if (baseElm) {
                        base = baseElm.getAttribute('href');
                    }
                    json = JSON.parse(embeddedManifestElm.textContent);
                }
                else {
                    let linkedManifestUrl = new URL(manifestHref, url_);
                    let data = await fetchFile(linkedManifestUrl);
                    json = JSON.parse(data);
                    base = linkedManifestUrl;
                }

                // make sure that if there is no reading order, it gets set to the Document URL
                if (!json.hasOwnProperty('readingOrder')) {
                    json.readingOrder = url_;
                }

            }
            // we're opening a JSON file
            else if (contentType == 'application/ld+json' || contentType == 'application/json') {
                let data = await fetchFile(url_);
                if (!data) {
                    throw `Could not fetch ${url_}`;
                }
                json = JSON.parse(data);
            }
            else {
                throw `Content type *${contentType}* not recognized`;
            }
        }
        catch(err) {
            this.errors.push({severity: "fatal", msg: `${err}`});
            console.log(err);
            return;
        }
        await this.loadJson(json, base, guessProfile, contentType === "text/html" ? url_ : '');
    }

    // base is the baseUrl and has to be a string
    async loadJson(json, base = '', guessProfile = false, htmlUrl = '') {
        let manifestProcessor = new ManifestProcessor();
        manifestProcessor.supportedProfiles = this.supportedProfiles;
        manifestProcessor.defaults = this.defaults;
        await manifestProcessor.loadJson(json, base, guessProfile, htmlUrl);
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
