/**
 * @file ImageAtomizer.js
 * @author elliottprogrammer https://github.com/elliottprogrammer <bryan@elliottprogrammer.com>
 * @version 1.0.0
 * @license MIT
 * @description
 * This class transforms a bitmap image into animated JavaScript particles effected/animated by the mouse pointer.
 */
class ImageAtomizer {
    constructor(imageSrc, options) {
        // Default properties
        this.elementId = "image-atomizer";
        this.width = 0;
        this.height = 20;
        this.particleGap = 0;
        this.particleSize = 2;
        this.offsetX = 0;
        this.offsetY = 0;
        this.monochrome = false;
        this.monochromeColor = "#fff";
        this.mouseForce = 4000;
        this.restless = false;
        this.onWidthChange = null;
        this.onHeightChange = null;
        this.onSizeChange = null;
        
        // Apply custom options
        if (options) {
            const optionKeys = [
                "elementId", "width", "height", "particleGap", "particleSize", "monochrome", "monochromeColor",
                "mouseForce", "restless", "onWidthChange", "onHeightChange", "onSizeChange", 'offsetX', 'offsetY'
            ];
            
            for (let i = 0, len = optionKeys.length; i < len; i++) {
                if (options[optionKeys[i]]) {
                    this[optionKeys[i]] = options[optionKeys[i]];
                }
            }
        }
        
        // DOM elements
        this.$container = document.getElementById(this.elementId);
        this.$canv = document.querySelector(".draw");
        
        // Canvas elements
        this.$srcCanv = document.createElement("canvas");
        this.$srcCanv.style.display = "none";
        this.$container.appendChild(this.$srcCanv);
        
        // Set dimensions if not specified
        if (this.width <= 0) {
            this.width = this.$container.clientWidth;
        }
        if (this.height <= 0) {
            this.height = this.$container.clientHeight;
        }
        
        // Mouse and interaction properties 
        this.monochromeColorArr = this.parseColor(this.monochromeColor);
        this.mx = -1;
        this.my = -1;
        // For touch/swipe devices
        this.touchX = null;
        this.touchY = null;
        
        // Canvas dimensions
        this.cw = this.getCw();
        this.ch = this.getCh();
        
        // Animation properties
        this.frame = 0;
        this.hasInitialized = false;
        
        // Particle buffers
        this.pxlBuffer = { first: null };
        this.recycleBuffer = { first: null };
        
        // Canvas contexts
        this.ctx = this.$canv.getContext("2d");
        this.srcCtx = this.$srcCanv.getContext("2d");
        
        // Set canvas dimensions
        this.$canv.width = this.cw;
        this.$canv.height = this.ch;

        this.supportsSwipeEvents = function() {
            return window && 'ontouchstart' in window;
        }
        
        // Shuffle function for arrays
        this.shuffle = function() {
            let temp, randomIndex;
            for (let i = 0, len = this.length; i < len; i++) {
                randomIndex = Math.floor(Math.random() * len);
                temp = this[i];
                this[i] = this[randomIndex];
                this[randomIndex] = temp;
            }
        };
        Array.prototype.shuffle = this.shuffle;

        const getOffset = (element) => {
            let offsetLeft = 0;
            let offsetTop = 0;
            let targetElement = typeof element === "string" ? document.getElementById(element) : element;
            
            if (targetElement) {
                offsetLeft = targetElement.offsetLeft;
                offsetTop = targetElement.offsetTop;
                const body = document.getElementsByTagName("body")[0];
                
                while (targetElement.offsetParent && targetElement !== body) {
                    offsetLeft += targetElement.offsetParent.offsetLeft;
                    offsetTop += targetElement.offsetParent.offsetTop;
                    targetElement = targetElement.offsetParent;
                }
            }
            
            return { x: offsetLeft + this.offsetX, y: offsetTop + this.offsetY };
        };
        
        // Mouse event handlers
        this.$canv.onmouseout = () => {
            this.mx = -1;
            this.my = -1;
        };
        
        if (this.supportsSwipeEvents()) {
            const trackTouchCoordinates = (x, y) => {
                const offset = getOffset(this.$container);
                this.mx = x - offset.x + document.body.scrollLeft + document.documentElement.scrollLeft;
                this.my = y - offset.y + document.body.scrollTop + document.documentElement.scrollTop;
            }
            this.$canv.ontouchstart = (event) => {
                trackTouchCoordinates(event.touches[0].clientX, event.touches[0].clientY);
            }
            this.$canv.ontouchmove = (event) => {
                trackTouchCoordinates(event.touches[0].clientX, event.touches[0].clientY);
            }
            this.$canv.ontouchend = (event) => {
                this.mx = -1;
                this.my = -1;
            }
        } else {
            this.$canv.onmousemove = (event) => {
                const offset = getOffset(this.$container);
                this.mx = event.clientX - offset.x + document.body.scrollLeft + document.documentElement.scrollLeft;
                this.my = event.clientY - offset.y + document.body.scrollTop + document.documentElement.scrollTop;
            };
        }
        
        // Set the image source
        this.image = new Image();
        this.isImageLoaded = false;

        if (imageSrc) {
            this.image.src = imageSrc;
            this.image.onload = () => {
                this.isImageLoaded = true;
                this.resize();
                // Start animation
                this.requestAnimationFrame(() => {
                    this.nextFrame();
                });
            };
        } else {
            return console.error('ImageAtomizer: You must provide an image source as the first argument when instanciating a `new ImageAtomizer(imageSrc, options)`.');
        }

        this.image.onerror = () => {
            return console.error('ImageAtomizer: Failed to load the provided image source (%s). Please check the image exists.', imageSrc);
        }
    }
    
    // Particle class as inner class
    static Particle = class {
        constructor(imageAtomizer) {
            this.atomizer = imageAtomizer;
            this.ttl = null;
            this.color = imageAtomizer.colorArr;
            this.next = null;
            this.prev = null;
            this.gravityX = 0;
            this.gravityY = 0;
            this.x = Math.random() * imageAtomizer.cw;
            this.y = Math.random() * imageAtomizer.ch;
            this.velocityX = Math.random() * 10 - 5;
            this.velocityY = Math.random() * 10 - 5;
        }
        
        move() {
            const imageAtomizer = this.atomizer;
            
            if (this.ttl !== null && this.ttl-- <= 0) {
                imageAtomizer.swapList(this, imageAtomizer.pxlBuffer, imageAtomizer.recycleBuffer);
                this.ttl = null;
            } else {
                const dx = this.gravityX - this.x;
                const dy = this.gravityY - this.y;
                const distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                const angle = Math.atan2(dy, dx);
                let force = distance * 0.01;
                
                if (imageAtomizer.restless === true) {
                    force += Math.random() * 0.1 - 0.05;
                } else if (force < 0.01) {
                    this.x = this.gravityX + 0.25;
                    this.y = this.gravityY + 0.25;

                }
                
                let mouseForce = 0;
                let mouseAngle = 0;
                
                if (imageAtomizer.mx >= 0 && imageAtomizer.mouseForce) {
                    const mouseDx = this.x - imageAtomizer.mx;
                    const mouseDy = this.y - imageAtomizer.my;
                    mouseForce = Math.min(imageAtomizer.mouseForce / (Math.pow(mouseDx, 2) + Math.pow(mouseDy, 2)), imageAtomizer.mouseForce);
                    mouseAngle = Math.atan2(mouseDy, mouseDx);
                    
                    if (typeof this.color === "function") {
                        mouseAngle += Math.PI;
                        mouseForce *= 0.001 + Math.random() * 0.1 - 0.05;
                    }
                } else {
                    mouseForce = 0;
                    mouseAngle = 0;
                }
                
                this.velocityX += force * Math.cos(angle) + mouseForce * Math.cos(mouseAngle);
                this.velocityY += force * Math.sin(angle) + mouseForce * Math.sin(mouseAngle);
                
                this.velocityX *= 0.92;
                this.velocityY *= 0.92;
                
                this.x += this.velocityX;
                this.y += this.velocityY;
            }
        }
    };
    
    swapList(particle, fromList, toList) {
        if (particle === null) {
            particle = new ImageAtomizer.Particle(this);
        }
        
        if (fromList.first === particle) {
            if (particle.next !== null) {
                particle.next.prev = null;
                fromList.first = particle.next;
            } else {
                fromList.first = null;
            }
        } else {
            if (particle.next === null) {
                particle.prev = null;
            } else {
                particle.prev.next = particle.next;
                particle.next.prev = particle.prev;
            }
        }
        
        if (toList.first === null) {
            toList.first = particle;
            particle.prev = null;
            particle.next = null;
        } else {
            particle.next = toList.first;
            toList.first.prev = particle;
            toList.first = particle;
            particle.prev = null;
        }
    }
    
    parseColor(color) {
        let result;
        color = color.replace(" ", "");
        
        if (result = /^#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/.exec(color)) {
            result = [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16)
            ];
        } else if (result = /^#([\da-fA-F])([\da-fA-F])([\da-fA-F])/.exec(color)) {
            result = [
                parseInt(result[1], 16) * 17,
                parseInt(result[2], 16) * 17,
                parseInt(result[3], 16) * 17
            ];
        } else if (result = /^rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*.[\d]+)\)/.exec(color)) {
            result = [+result[1], +result[2], +result[3], +result[4]];
        } else if (result = /^rgb\(([\d]+),([\d]+),([\d]+)\)/.exec(color)) {
            result = [+result[1], +result[2], +result[3]];
        } else {
            return null;
        }
        
        if (isNaN(result[3])) {
            result[3] = 1;
        }
        result[3] *= 255;
        
        return result;
    }
    
    nextFrame() {
        
        let particle = this.pxlBuffer.first;
        let nextParticle = null;
        
        while (particle !== null) {
            nextParticle = particle.next;
            particle.move();
            particle = nextParticle;
        }
        
        this.drawParticles();
        
        if (this.frame++ % 25 === 0 && (this.cw !== this.getCw() || this.ch !== this.getCh())) {
            const newHeight = this.getCh();
            const newWidth = this.getCw();
            
            if (this.ch !== newWidth && typeof this.onWidthChange === "function") {
                this.onWidthChange(this, newWidth);
            }
            if (this.ch !== newHeight && typeof this.onHeightChange === "function") {
                this.onHeightChange(this, newHeight);
            }
            if (typeof this.onSizeChange === "function") {
                this.onSizeChange(this, newWidth, newHeight);
            }
            this.resize();
        }
        
        setTimeout(() => {
            this.requestAnimationFrame(() => {
                this.nextFrame();
            });
        }, 15);
    }
    
    drawParticles() {
        let imageData = this.ctx.createImageData(this.cw, this.ch);
        let pixelIndex, x, y, pixelX, pixelY, color;
        
        let particle = this.pxlBuffer.first;
        while (particle !== null) {
            x = ~~particle.x;
            y = ~~particle.y;
            
            for (pixelX = x; pixelX < x + this.particleSize && pixelX >= 0 && pixelX < this.cw; pixelX++) {
                for (pixelY = y; pixelY < y + this.particleSize && pixelY >= 0 && pixelY < this.ch; pixelY++) {
                    pixelIndex = (pixelY * imageData.width + pixelX) * 4;
                    color = typeof particle.color === "function" ? particle.color() : particle.color;
                    
                    imageData.data[pixelIndex + 0] = color[0];
                    imageData.data[pixelIndex + 1] = color[1];
                    imageData.data[pixelIndex + 2] = color[2];
                    imageData.data[pixelIndex + 3] = color[3];
                }
            }
            particle = particle.next;
        }
        
        this.ctx.putImageData(imageData, 0 + this.offsetX, 0 + this.offsetY);
    }
    
    getPixelFromImageData(imageData, offsetX, offsetY) {
        const pixels = [];
        
        for (let x = 0; x < imageData.width; x += this.particleGap + 1) {
            for (let y = 0; y < imageData.height; y += this.particleGap + 1) {
                const pixelIndex = (y * imageData.width + x) * 4;
                const alpha = imageData.data[pixelIndex + 3];
                
                if (alpha > 0) {
                    pixels.push({
                        x: offsetX + x,
                        y: offsetY + y,
                        color: this.monochrome === true
                            ? [this.monochromeColorArr[0], this.monochromeColorArr[1], this.monochromeColorArr[2], this.monochromeColorArr[3]]
                            : [imageData.data[pixelIndex], imageData.data[pixelIndex + 1], imageData.data[pixelIndex + 2], imageData.data[pixelIndex + 3]],
                    });
                }
            }
        }
        
        return pixels;
    }
    
    init() {
        if (this.isImageLoaded) {
            this.$srcCanv.width = this.image.width;
            this.$srcCanv.height = this.image.height;
            this.srcCtx.clearRect(0, 0, this.$srcCanv.width, this.$srcCanv.height);
            this.srcCtx.drawImage(this.image, 0, 0);
            
            const pixels = this.getPixelFromImageData(
                this.srcCtx.getImageData(0, 0, this.$srcCanv.width, this.$srcCanv.height),
                ~~(this.cw / 2 - this.$srcCanv.width / 2),// + this.offsetX,
                ~~(this.ch / 2 - this.$srcCanv.height / 2),// + this.offsetY
            );
            
            pixels.shuffle();
            
            let particle = this.pxlBuffer.first;
            for (let i = 0; i < pixels.length; ++i) {
                var newParticle = null;
                
                if (particle !== null) {
                    newParticle = particle;
                    particle = particle.next;
                } else {
                    this.swapList(this.recycleBuffer.first, this.recycleBuffer, this.pxlBuffer);
                    newParticle = this.pxlBuffer.first;
                }
                
                newParticle.gravityX = pixels[i].x;
                newParticle.gravityY = pixels[i].y;
                newParticle.color = pixels[i].color;
            }
            
            while (particle !== null) {
                particle.ttl = ~~(Math.random() * 10);
                particle.gravityY = ~~(this.ch * Math.random());
                particle.gravityX = ~~(this.cw * Math.random());
                particle = particle.next;
            }
        }
        this.hasInitialized = true;
    }
    
    getCw() {
        return Math.min(document.body.clientWidth, this.width, this.$container.clientWidth);
    }
    
    getCh() {
        return Math.min(document.body.clientHeight, this.height, this.$container.clientHeight);
    }
    
    resize() {
        this.cw = this.getCw();
        this.ch = this.getCh();
        this.$canv.width = this.cw;
        this.$canv.height = this.ch;
        this.init();
    }
    
    setColor(color) {
        this.monochromeColorArr = this.parseColor(color);
    }
    
    requestAnimationFrame(callback) {
        const requestAnimFrame = window.requestAnimationFrame || 
                              window.webkitRequestAnimationFrame || 
                              window.mozRequestAnimationFrame || 
                              window.oRequestAnimationFrame || 
                              window.msRequestAnimationFrame || 
                              function(callback) {
                                  window.setTimeout(callback, 1000 / 60);
                              };
        requestAnimFrame(callback);
    }
}

export { ImageAtomizer };
