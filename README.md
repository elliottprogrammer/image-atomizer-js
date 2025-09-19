# ImageAtomizer.js

This is a small JavaScript library that that takes any image and explodes it into thousands of animated particles that gracefully come together to form the image again. The particles repel from the mouse pointer creating an interactive particle animation effect.

## Demos & Documentation

Demo on CodePen: [https://codepen.io/melliatto/pen/jEWOMWe](https://codepen.io/melliatto/pen/jEWOMWe)

You can also see this in action on my developer portfolio website: [https://elliottprogrammer.com](https://elliottprogrammer.com)

You can learn more about it on my blog: [Transforming Particles Into An Image ✨ (Meet imageAtomizer.js)](https://blog.elliottprogrammer.com/transforming-particles-into-an-image-meet-imageatomizer-js/)

## How to use it

Just add some HTML like this:

```html
<div id="image-atomizer">
  <canvas class="atomizer"></canvas>
</div>
```

Include the `imageAtomizer.js` file before the ending `</body>` tag in your HTML:

```html
<script src="imageAtomizer.js"></script>
```

Then instanciate the ImageAtomizer class:

```html
<script type="text/javascript">
    const myImage = './image-filename.png';
    new ImageAtomizer(myImage, {
        particleGap: 1,
        particleSize: 2,
        restless: false,
    });
</script>
```

## Options

```js
        new ImageAtomizer(myImage, {
            elementId: "image-atomizer", // The ID of your container div.
            width: 0,                   // Canvas width (auto-sizes if 0).
            height: 0,                  // Canvas height (auto-sizes if 0).
            particleGap: 0,             // Spacing between particles.
            particleSize: 2,            // Size of each particle (px).
            offsetX: 0,                 // X-offset from center.
            offsetY: 0,                 // Y-offset from center.
            monochrome: false,          // Force all particles to one color.
            monochromeColor: "#fff",    // Which color, if monochrome is true.
            mouseForce: 4000,           // How strongly particles repel from the mouse.
            restless: false,            // Adds jittery, restless motion when particles are at resting state.
            onSizeChange: null,         // Callback when the container dimension changes.
        } );




#### Author

[Bryan Elliott](https://github.com/elliottprogrammer)

