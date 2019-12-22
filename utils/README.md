# utils

## convert

`npm run convert -- --input ./example/audacity-labels.txt --config ./example/audacity-labels-meta.json`

Produces a Synchronized Narration file with the name of the audio file specified in `audacity-labels-meta.json`.

Does not include HTML yet.

## split

`npm run gutensplit -- --input ./example/blue.epub --config ./example/blue-config.json`

Splits a Gutenberg EPUB2 into one-per-chapter HTML5 files. Produces JSON with a reading order. Options provided in `blue-config.json`.

### TODO: 

* Script to merge audiobook with gutensplit output, plus audacity labels or other timing info, and get an audiobook with sync narr points. 
