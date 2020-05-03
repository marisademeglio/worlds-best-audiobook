# The World's Best Audiobook

Audiobook player + sample content

[Live demo](https://marisademeglio.github.io/worlds-best-audiobook/web/library/)

## Scope

Demonstrate playback of three types of audiobooks, all developed according to the [W3C Audiobooks](https://www.w3.org/TR/audiobooks/) standard.

## Goal

Show how web standards make your audio books better.

## Features

### Audiobooks
* Shows the cover and plays from beginning to end
* Access to table of contents while listening
* User controls for volume, rate, play/pause
* Jump forward/back by 30 seconds
* Remembers last-read position
* Set bookmarks, named automatically by chapter + offset

### Audiobooks + HTML

* All of the features above, PLUS
* HTML page displayed during playback
* Change the font size

### Audiobooks + Synchronized narration

* All of the above, PLUS
* Synchronized highlight of the HTML sentences or paragraphs during playback
* Optional "Caption" mode
* Instead of moving in 30 second increments, move by sentence
* Click phrase to start playback
* Change highlight color (settings)

## About this demo

* Runs in a web browser
* Employs principles of web accessibility
* Built with HTML/CSS/Vanilla JS
* Uses [audiobooks-js](https://marisademeglio.github.io/audiobooks-js) library

## Run it locally

1. Check out the code
2. Start a server: `npx http-serve -c-1`
3. Go to `http://localhost:8080/web/library/`
4. Click a title.

