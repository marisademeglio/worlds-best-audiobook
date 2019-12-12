# utils

## convert

`npm run convert -- --input ./example/audacity-labels.txt --meta ./example/meta.json`

Produces a Synchronized Narration file with the name of the audio file specified in `meta.json`.

Does not include HTML yet.

### TODO: 

* include HTML. As this is a special-purpose script, we can be strict about what we expect from the HTML in order to match up the sync points automatically. E.g. use only headings and paragraphs in sequence. Or, follow elements with IDs according to a certain scheme.
