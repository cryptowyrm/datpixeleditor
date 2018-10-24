# Dat Pixel Editor

A pixel graphics editor for the [Beaker Browser](https://beakerbrowser.com/).

Opens images from and saves images to [Dat](https://datproject.org/) archives. The first time you open the app, it will ask you to create a new DAT archive where all your pictures are going to be stored.

You can try it out in the Beaker Browser at [dat://dpe.hashbase.io](dat://dpe.hashbase.io) or in other browsers at [https://dpe.hashbase.io](https://dpe.hashbase.io), where IndexedDB is used to store images instead of a Dat Archive.

![Screenshot](https://i.imgur.com/EZEX3X0.png)

## Features

It's very basic so should be quite intuitive. You can theoretically open any picture with the editor by putting one you want to edit into the images folder of the Dat archive it creates for you, but keep it within reason, if the image is too big it's going to be slow, it's meant for making icons and sprites and other small images like that :)

All icons in the app were drawn with the app itself, I take dogfeeding seriously! :) There's a pencil tool, eraser, fill bucket, move, line, rectangle and circle. A color picker, a palette with all the colors used in the picture, and a recent colors list. The color picker also has a neat shortcut, just press "p" and it opens right under your mouse cursor, so you don't need to move all the way to the left to change colors. Press "p" again and it's gone. It also stays open while you draw, so you can put it somewhere and leave it there until you need to move it (it closes when you click somewhere outside of the drawing canvas).

Another cool feature is this: There are two buttons for undo, "<<" and "<". The first is your normal undo, but the latter is "single pixel undo". Sometimes when you draw, especially when drawing contours, you do everything right but then at the last part your hand jerks and you have to undo everything. Not with single pixel undo! :) It goes back in time, pixel by pixel. Even works for the tools like the fill bucket, so you can for example see the flood fill algorithm at work, in reverse.

All buttons have a tooltip that shows you what they do and also shows their keyboard shortcut. Shortcuts are notoriously hard to do in web apps so they might not all work on your platform with your keyboard layout. I'm sure today there are some cool libraries that do a much better job there so that's something I'll have to look into.

## Tech stack

Written in plain JavaScript. Uses jQuery, but that could be replaced since browsers have integrated most of the jQuery features by now. Otherwise the code is very simple, I was a JavaScript beginner when I wrote it and updated it a bit to make use of new JavaScript features, so it should be very easy for people to hack on it even if you aren't an expert.

Half of the code is dealing with UI state, might be a good idea to convert that to Vue or React in the future. Vue especially is extremely easy to learn if you don't use components, then you don't even need webpack, so it's worth thinking about.

## History

This is based on code I wrote in 2011, back then the app wrote images to localStorage and synced with Google Drive, but I didn't have much time to improve it after the initial release because of work and the website has long since stopped working because Google made some breaking changes to Python on AppEngine where it was hosted. Now it's revived, fully decentralized for the Beaker Browser, Open Source (MIT), and will hopefully last online forever and be improved by the community.

The very first commit is a fully working version of the app where images are saved to localStorage without depending on Beaker Browser, so you can look at the changes from then on to see how I replaced it with Beaker Browser's DatArchive API, maybe that's useful as a learning resource.

## Plans for the future

- Ability to switch between multiple image Dat archives, so you could have one for private pictures and one for public pictures so that you can share the Dat URL
- Layers
- Create GIF animations
- Record and playback drawings

Due to the way the app works, these last three features are quite trivial to implement. Drawing playback is basically just "single pixel undo" in reverse, the draw commands would be saved to a simple JSON file.

## Pull requests

You're welcome to help me build this app, you don't have to be a JavaScript pro either (I'm certainly not, I use ClojureScript these days). I won't bite anyone's head off, so just have fun building something cool together! When you do make a pull request, you agree to license the contained code as MIT for inclusion in this project.

## Links

### HTTPS
- [Github (feel free to send pull requests and bug reports)](https://github.com/cryptowyrm/datpixeleditor)

### Beaker Browser
- [Dat Pixel Editor: dat://dpe.hashbase.io](dat://dpe.hashbase.io)
- [My Fritter profile: dat://fritter.hashbase.io/user/dat://fritter-cryptic.hashbase.io](dat://fritter.hashbase.io/user/dat://fritter-cryptic.hashbase.io)
- [My Beaker Homepage: dat://b6201615277a04b958afd25b3531b90083f9dc4e2c38e3cbedb0a257def456fe/](dat://b6201615277a04b958afd25b3531b90083f9dc4e2c38e3cbedb0a257def456fe/)