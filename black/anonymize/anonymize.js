var canvas;
var ctx;

var transferCanvas;
var transferCtx;
var displacementCanvas;
var displacementCtx;

var sourceImage;

var selectImageInput;
var fileName;
var slider;
var brushSize;

var painting = false;
var lastPos = { x: 0, y: 0};

window.addEventListener("load", () => {
    selectImageInput = document.getElementById("selectImageInput");
    selectImageInput.addEventListener("change", handleImage, false);
    selectImageInput.multiple = false;

    brushSlider = document.getElementById("brushSlider");
    brushSize = brushSlider.value;

    canvas = document.querySelector("#anon-canvas");
    ctx = canvas.getContext("2d");

    transferCanvas = document.querySelector("#transfer-canvas");
    transferCtx = transferCanvas.getContext("2d");

    displacementCanvas = document.querySelector("#displacement-canvas");
    displacementCtx = displacementCanvas.getContext("2d");


    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onExit);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseout", onExit);

    canvas.addEventListener("touchstart", onTouchStart);
    canvas.addEventListener("touchmove", onTouchMove);
    canvas.addEventListener("touchend", onExit);
    canvas.addEventListener("touchcancel", onExit);

    brushSlider.oninput = function() {
        brushSize = this.value;
    }

    document.getElementById("savebtn").addEventListener("click", saveImage);
});

function handleImage(e) {
    var reader = new FileReader();
    reader.onload = function(event) {
        var img = new Image();
        img.addEventListener('load', function() {
            document.getElementById("processing_label").style = "display: none;";
        }, false );
        document.getElementById("processing_label").style = "display: block;";

        var resizeCanvas = document.createElement('canvas');
        var max_size = 2500;
        img.onload = function() {
            var width = img.width;
            var height = img.height;
            if (width > height) {
                if (width > max_size) {
                    height *= max_size / width;
                    width = max_size;
                }
            } else {
                if (height > max_size) {
                    width *= max_size / height;
                    height = max_size;
                }
            }

            resizeCanvas.width = width;
            resizeCanvas.height = height;
            resizeCanvas.getContext('2d').drawImage(img, 0, 0, width, height);

            canvas.width = transferCanvas.width = displacementCanvas.width = resizeCanvas.width;
            canvas.height =  transferCanvas.height = displacementCanvas.height = resizeCanvas.height;

            ctx.drawImage(resizeCanvas,0,0);
            displacementCtx.drawImage(resizeCanvas, 0, 0);


            imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            for(var y = 0; y < imgData.height; y++)
            {
                for(var x = 0; x < imgData.width; x++)
                {
                    var range = 40;
                    var tempX = x + getRandomInt(-range, range);
                    var tempY = y + getRandomInt(-range, range);
                    if (tempX < 0)
                    tempX = 0;
                    else if (tempX >= imgData.width)
                    tempX = imgData.width - 1;
                    if (tempY < 0)
                    tempY = 0;
                    else if (tempY >= imgData.height)
                    tempY = imgData.height - 1;

                    var red = imgData.data[4 * (tempY * imgData.width + tempX)];
                    var green = imgData.data[4 * (tempY * imgData.width + tempX) + 1];
                    var blue = imgData.data[4 * (tempY * imgData.width + tempX) + 2];
                    var alpha = imgData.data[4 * (tempY * imgData.width + tempX) + 3];


                    imgData.data[4 * (y * imgData.width + x)] = red;
                    imgData.data[4 * (y * imgData.width + x) + 1] = green;
                    imgData.data[4 * (y * imgData.width + x) + 2] = blue;
                    imgData.data[4 * (y * imgData.width + x) + 3] = alpha;
                }
            }
            displacementCtx.putImageData(imgData, 0, 0);
            stackBlurCanvasRGBA("displacement-canvas", 0, 0, displacementCanvas.width, displacementCanvas.height, 50);
            sourceImage = resizeCanvas;
        }

        img.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);
    fileName = e.target.files[0].name;
    document.getElementById("savebtn").disabled = false;
}

function saveImage() {
    var link = document.createElement('a');
    link.download = fileName.substring(0, fileName.length - 4) + '-anon.jpg';
    link.href = canvas.toDataURL();
    link.click();
}

function onMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!painting) return;
    if (sourceImage == null) return;

    var dist = distance(lastPos, getMousePos(canvas, e));
    var angle = angleDiff(lastPos, getMousePos(canvas, e));

    for (var i = 0; i < dist; i+=5) {

        x = lastPos.x + (Math.sin(angle) * i);
        y = lastPos.y + (Math.cos(angle) * i);

        var radgrad = ctx.createRadialGradient(x,y, 0,x,y,brushSize / 2);

        radgrad.addColorStop(0, 'black');
        radgrad.addColorStop(0.5, 'rgba(0,0,0,0.5)');
        radgrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = radgrad;
        ctx.fillRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
    }

    for (var i = 0; i < dist; i+=5) {
        transferCtx.lineTo(getMousePos(canvas, e).x, getMousePos(canvas, e).y);
        transferCtx.stroke();
    }

    lastPos.x = getMousePos(canvas, e).x;
    lastPos.y = getMousePos(canvas, e).y;
}

function onTouchMove(e) {
    e.preventDefault();
    e.stopPropagation();

    var touch = e.touches[0];
    var mouseEvent = new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function onMouseDown(e) {
    painting = true;

    transferCtx.beginPath();
    transferCtx.lineWidth = brushSize;
    transferCtx.lineJoin = transferCtx.lineCap = 'round';
    transferCtx.moveTo(getMousePos(canvas, e).x, getMousePos(canvas, e).y);


    lastPos = getMousePos(canvas, e);
}

function onTouchStart(e) {
    painting = true;

    transferCtx.beginPath();
    transferCtx.lineWidth = brushSize;
    transferCtx.lineJoin = transferCtx.lineCap = 'round';
    transferCtx.moveTo(getTouchPos(canvas, e).x, getTouchPos(canvas, e).y);

    lastPos = getMousePos(canvas, e);
}

function onExit(e) {
    painting = false;

    if (document.getElementById("blur_brush").checked) {
        //stackBlurCanvasRGBA("displacement-canvas", 0, 0, displacementCanvas.width, displacementCanvas.height, 50);
        transferCtx.save();
        transferCtx.globalCompositeOperation = "source-in";
        transferCtx.drawImage(displacementCanvas, 0, 0);
    } else if (document.getElementById("undo_brush").checked) {
        transferCtx.save();
        transferCtx.globalCompositeOperation = "source-in";
        transferCtx.drawImage(sourceImage, 0, 0);
    }
    transferCtx.restore();
    transferCtx.closePath();

    ctx.save();
    ctx.drawImage(transferCanvas, 0, 0);
    ctx.globalCompositeOperation = "destination-atop";
    ctx.drawImage(sourceImage, 0, 0);
    ctx.restore();

    transferCtx.clearRect(0, 0, transferCanvas.width, transferCanvas.height);
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect(),
        scaleX = canvas.width / rect.width,
        scaleY = canvas.height / rect.height;

    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    }
}

function getTouchPos(canvas, evt) {
    var touch = evt.touches[0];
    var rect = canvas.getBoundingClientRect(),
        scaleX = canvas.width / rect.width,
        scaleY = canvas.height / rect.height;

    return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
    }
}

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function angleDiff(p1, p2) {
    return Math.atan2( p2.x - p1.x, p2.y - p1.y );
}