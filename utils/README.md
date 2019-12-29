# utils

## add html alternate to audiobook

`npm run add-html-alternate -- --epub ../content/epub/blue.epub --audiobook ../content/audiobook/blue.json --force`

* Produces output (in this case) in: `utils/out/The-Blue-Fairy-Book-with-html-alternate`
* Cleans up a gutenberg EPUB2 file, sorting by chapter. 
* Only brings over the chapters that appear in the audiobook (the names must match, disregarding case and punctuation)
* Adds the cleaned-up HTML as `alternate`s for the audiobook reading order items

## add sync narr alternate to audiobook

`npm run add-sync-narr-alternate -- --audiobook ./out/The-Blue-Fairy-Book-with-html-alternate/blue.json --sync ./example/syncpoints --force`

* `--audiobook` is an audiobook with HTML alternates
* `--syncpoints` is a directory containing audacity labels files. They must be named the same as the HTML alternate files, but with a `txt` extension. E.g. `THE-MASTER-CAT;-OR,-PUSS-IN-BOOTS.txt`

This script creates a synchronized narration file for each chapter that has a corresponding `txt` file in the `syncpoints` directory. It then associates the synchronized narration JSON with the audiobook reading order item(s).

It is not required to have syncpoints files for every chapter. If there are not syncpoints for a chapter, it remains as-is and still has an HTML alternate.
