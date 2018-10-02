const state = {
	canvas_painting: null, // the actual drawing canvas
	canvas_grid: null, // the grid to make painting on easier
	canvas_tools: null, // the canvas used by tools
	recent_colors: [], // recently used colors
	palette_colors: [],
	current_color: "#000000",
	num_cells_x: 32,
	num_cells_y: 32,
	cell_size: 20,
	color_picker: null,
	drew: false, // set to true if something was drawn
	undo_list: [],
	just_drew: [], // cells drawn between mousedown and mouseup
	pixelcount: 0, // amount of pixels colored in
	current_tool: "brush",
	current_picker_color: "#000000",
	resize_start: null,
	resize_timer: null,
	image_picker_visible: false,
	images: {},
	loaded_image: null,
	loaded_image_filename: null,
	changed: false, // true if image changed since last save
	move_start: null,
	move_end: null,
	move_grid: null,
	last_pixel_drawn: null,
	mouseX: 0,
	mouseY: 0,
	rectangle_start: null,
	rectangle_end: null,
	rectangle_pixels: null,
	current_canvas: "painting",
	line_start: null,
	line_end: null,
	line_pixels: null,
	circle_start: null,
	circle_end: null,
	circle_pixels: null,
	settings: null,
	scrollbar_width: 0,
	erasing: false,
	pixel_colors: null,
}

function loadPixels() {
	state.pixel_colors = canvas_image.getImageData(0, 0, state.num_cells_x, state.num_cells_y);
}

function replacePixels() {
	canvas_image.putImageData(state.pixel_colors, 0, 0);
}

function getPixel(x, y, imagedata) {
	let index = (x + y * state.pixel_colors.width) * 4;

	if(imagedata) {
		return [imagedata[index],
				imagedata[index+1],
				imagedata[index+2],
				imagedata[index+3]];
	} else {
		return [state.pixel_colors.data[index],
				state.pixel_colors.data[index+1],
				state.pixel_colors.data[index+2],
				state.pixel_colors.data[index+3]];
	}
}

function getPixelHex(x, y, imagedata) {
	let index = (x + y * state.pixel_colors.width) * 4;

	if(imagedata) {
		if(imagedata[index+3] != 0) {
			return rgb2hex(
				imagedata[index],
				imagedata[index+1],
				imagedata[index+2]
			);
		} else {
			return null;
		}
	} else {
		if(state.pixel_colors.data[index+3] != 0) {
			return rgb2hex(
				state.pixel_colors.data[index],
				state.pixel_colors.data[index+1],
				state.pixel_colors.data[index+2]
			);
		} else {
			return null;
		}
	}
}

function setPixel(x, y, rgb) {
	if(rgb.length === 3)
		rgb.push(255);
	let index = (x + y * state.pixel_colors.width) * 4;
	state.pixel_colors.data[index] = rgb[0];
	state.pixel_colors.data[index+1] = rgb[1];
	state.pixel_colors.data[index+2] = rgb[2];
	state.pixel_colors.data[index+3] = rgb[3];
}

function calculateScrollBarWidth() {
	$("body").append('<div id="calculatescrollouter" style="width: 100px; height: 100px; overflow-y: scroll; position: absolute; top: -150px; left: -150px;"><div id="calculatescrollinner" style="width: 100%; height: 100%;"></div></div>');
	state.scrollbar_width = 100 - $("#calculatescrollinner").innerWidth();
	$("#calculatescrollouter").remove();
	return state.scrollbar_width;
}

function resizeViewport(width, height) {
	window.resizeTo(width, height);
	setTimeout(function() {
		window.resizeBy(width - window.innerWidth, height - window.innerHeight);
	}, 500);
}

function changeCellNum(width, height) {
	state.num_cells_x = width;
	state.num_cells_y = height;
	document.getElementById("canvas-preview").width = width;
	document.getElementById("canvas-preview").height = height;
	document.getElementById("canvas-image").width = width;
	document.getElementById("canvas-image").height = height;
	loadPixels();
	$("#size").text("" + width + "x" + height);
}

async function loadDatArchive() {
	if (state.settings.daturl) {
		state.datarchive = await DatArchive.load(state.settings.daturl);
	} else {
		try {
			state.datarchive = await DatArchive.create({
				title: 'My Dat Pixel Editor images',
				description: 'All of my images created with Dat Pixel Editor are stored here',
				prompt: false
			});
			state.settings.daturl = state.datarchive.url;
			saveSettings();
		} catch(error) {
			console.log(error);
			alert(error);
			return;
		}
	}
	try {
		await state.datarchive.mkdir("/images");
	} catch(error) {
		// folder already exists
	}
}

function loadSettings() {
	if(localStorage.settings) {
		state.settings = JSON.parse(localStorage.getItem("settings"));
	} else {
		state.settings = {
		};
		saveSettings();
	}
}

function saveSettings() {
	localStorage.setItem("settings", JSON.stringify(state.settings));
}
function setSetting(key, value) {
	state.settings[key] = value;
	saveSettings();
}
function getSetting(key) {
	return state.settings[key];
}

let shortcuts = function(e) {
	if(e.ctrlKey) {
		switch(e.keyCode) {
		case 90:
			if(e.shiftKey)
				singleUndo();
			else
				undo();
			break;
		case 83:
			save();
			return false;
			break;
		}
	} else {
		switch(e.keyCode) {
		case 66:
			brush();
			break;
		case 69:
			eraser();
			break;
		case 70:
			fillbucket();
			break;
		case 77:
			move();
			break;
		case 82:
			rectangleTool();
			break;
		case 76:
			lineTool();
			break;
		case 67:
			circleTool();
			break;
		case 80:
			if(state.color_picker.ColorPickerIsVisible()) {
				state.color_picker.ColorPickerHide();
			} else {
				state.color_picker.ColorPickerShowAt(state.mouseX, state.mouseY);
			}
			break;
		}
	}
}

function enableShortcuts() {
	$(document).unbind("keydown", shortcuts);
	$(document).keydown(shortcuts);
}

function disableShortcuts() {
	$(document).unbind("keydown", shortcuts);
}

function showDisabler(message, callback) {
	$("#disabler").show();
	$("#disabler-message").html(message);
	$("#disabler-message-wrapper").show();
	disableShortcuts();
	if(callback) {
		$("#disablerclose").unbind("click");
		$("#disablerclose").show();
		$("#disablerclose").click(function() {
			hideDisabler();
			callback.call(this);
		});
	} else {
		$("#disablerclose").hide();
	}
}

function hideDisabler() {
	$("#disabler").hide();
	$("#disabler-message-wrapper").hide();
	enableShortcuts();
}

function resizeImg(imgid, width, height) {
	let img = document.getElementById(imgid);
	let size = {width: img.width, height: img.height};
	let ratio = Math.min(width/size.width, height/size.height);
	if(ratio < 1.0) {
		size.width = Math.round(size.width * ratio);
		size.height = Math.round(size.height * ratio);
	}
	let x = 0;
	let y = 0;
	if(size.width < width)
		x = (width - size.width) / 2;
	if(size.height < height)
		y = (height - size.height) / 2;
	let ipicker = document.createElement("canvas");
	ipicker.width = width;
	ipicker.height = height;
	let ctx = ipicker.getContext("2d");
	ctx.clearRect(0, 0, width, height);
	ctx.drawImage(img, x, y, size.width, size.height);
	let data = ipicker.toDataURL();
	img.src = data;
	$(ipicker).remove();
}

function filesafe(what) {
	return what.replace(/[^a-z0-9 \-]/gi, '_');
}

function enableSelection() {
	// enable text selection
	$(document).unbind("selectstart"); // Webkit
	document.body.onmousedown = "return true"; // Opera
}
function disableSelection() {
	// disable text selection on buttons
	$(document).bind("selectstart", function() {return false;}); // Webkit
	document.body.onmousedown = "return false"; // Opera
}

// Event handlers
let mousemovehandler = function(e) {
    // e.offsetX & e.offsetY are the X Y values the user clicked on in relation to the element
    let gridpos = posToGrid(offsetX(e), offsetY(e));
    if(state.last_pixel_drawn != null) {
    	let difference;
    	if(state.last_pixel_drawn.x === gridpos.x) {
    		difference = Math.abs(state.last_pixel_drawn.y - gridpos.y);
    		if(difference > 1) {
    			if(state.last_pixel_drawn.y > gridpos.y) {
    				for(let i=1; i<difference; i++) {
						drawPixel(state.last_pixel_drawn.x, state.last_pixel_drawn.y - i, {callback: function(cell) {
							state.just_drew.push(cell);
						}});
					}
    			} else {
    				for(let i=1; i<difference; i++) {
						drawPixel(state.last_pixel_drawn.x, state.last_pixel_drawn.y + i, {callback: function(cell) {
							state.just_drew.push(cell);
						}});
					}
    			}
    		}
    	} else if(state.last_pixel_drawn.y === gridpos.y) {
    		difference = Math.abs(state.last_pixel_drawn.x - gridpos.x);
    		if(difference > 1) {
    			if(state.last_pixel_drawn.x > gridpos.x) {
    				for(let i=1; i<difference; i++) {
						drawPixel(state.last_pixel_drawn.x - i, state.last_pixel_drawn.y, {callback: function(cell) {
							state.just_drew.push(cell);
						}});
					}
    			} else {
    				for(let i=1; i<difference; i++) {
						drawPixel(state.last_pixel_drawn.x + i, state.last_pixel_drawn.y, {callback: function(cell) {
							state.just_drew.push(cell);
						}});
					}
    			}
    		}
    	}
    }
    state.last_pixel_drawn = gridpos;
    drawPixel(gridpos.x, gridpos.y, {callback: function(cell) {
		state.just_drew.push(cell);
	}});
};

let move_mousemovehandler = function(e) {
	let gridpos = posToGrid(offsetX(e), offsetY(e));
	if(state.move_end.x != gridpos.x || state.move_end.y != gridpos.y) {
		state.move_end = gridpos;
		let move_x, move_y;
		
		move_x = state.move_end.x - state.move_start.x;
		move_y = state.move_end.y - state.move_start.y;
		
		initializeGrid();

		for(let y=0; y<state.num_cells_y; y++) {
			for(let x=0; x<state.num_cells_x; x++) {
				if(x + move_x < state.num_cells_x && x + move_x >= 0 && y + move_y < state.num_cells_y && y + move_y >= 0) {
					let frompixel = getPixel(x, y, state.move_grid);
					let fromcolor = null;
					if(frompixel[3] != 0)
						fromcolor = rgb2hex(frompixel[0], frompixel[1], frompixel[2]);

					if(fromcolor === null)
						setPixel(x + move_x, y + move_y, [255, 255, 255, 0]);
					else
						setPixel(x + move_x, y + move_y, hex2rgb(fromcolor));
				}
			}
		}
		restoreGrid();
	}
}

let rectangle_mousemovehandler = function(e) {
	let gridpos = posToGrid(offsetX(e), offsetY(e));
	
	if(state.rectangle_end.x != gridpos.x || state.rectangle_end.y != gridpos.y) {
		state.rectangle_end = gridpos;
		
		let diff_x = state.rectangle_end.x - state.rectangle_start.x;
		let diff_y = state.rectangle_end.y - state.rectangle_start.y;
		
		let t_element = document.getElementById("canvas-tools");
		state.canvas_tools.clearRect(0, 0, t_element.width, t_element.height);
		rectangle(state.rectangle_start.x, state.rectangle_start.y, state.rectangle_start.x + diff_x, state.rectangle_start.y + diff_y);
	}
}

let line_mousemovehandler = function(e) {
	let gridpos = posToGrid(offsetX(e), offsetY(e));
	
	if(state.line_end.x != gridpos.x || state.line_end.y != gridpos.y) {
		state.line_end = gridpos;
		
		let diff_x = state.line_end.x - state.line_start.x;
		let diff_y = state.line_end.y - state.line_start.y;
		
		let t_element = document.getElementById("canvas-tools");
		state.canvas_tools.clearRect(0, 0, t_element.width, t_element.height);
		line(state.line_start.x, state.line_start.y, state.line_start.x + diff_x, state.line_start.y + diff_y);
	}
}

let circle_mousemovehandler = function(e) {
	let gridpos = posToGrid(offsetX(e), offsetY(e));
	
	if(state.circle_end.x != gridpos.x || state.circle_end.y != gridpos.y) {
		state.circle_end = gridpos;
		
		let distance = Math.floor(Math.sqrt(Math.pow(state.circle_end.x - state.circle_start.x, 2) + Math.pow(state.circle_end.y - state.circle_start.y, 2)));
		
		let t_element = document.getElementById("canvas-tools");
		state.canvas_tools.clearRect(0, 0, t_element.width, t_element.height);
		circle(state.circle_start.x, state.circle_start.y, distance);
	}
}

window.benchmarkStarted = null;
function startBenchmark() {
	window.benchmarkStarted = new Date().getTime();
}
function stopBenchmark() {
	console.log("Benchmark: " + (new Date().getTime() - window.benchmarkStarted));
}

function posToGrid(x, y) {
    let gridx = Math.floor(x / state.cell_size);
    let gridy = Math.floor(y / state.cell_size);
    return {x: gridx, y: gridy};
}

function offsetX(event) {
	return event.pageX - parseInt($("#wrapper").css("left")) + $("#wrapper").scrollLeft();
}

function offsetY(event) {
	return event.pageY - parseInt($("#wrapper").css("top")) + $("#wrapper").scrollTop();
}

function undo() {
	if(state.undo_list.length === 0)
		return;
	
	let undo_item = state.undo_list.pop().reverse();
	$.each(undo_item, function(index, value) {
		if(value.oldcolor === undefined || value.oldcolor === null) {
			drawTransparentPixel(value.x, value.y);
			setPixel(value.x, value.y, [0, 0, 0, 0]);
		} else {
			drawPixel(value.x, value.y, {color: value.oldcolor});
			setPixel(value.x, value.y, hex2rgb(value.oldcolor));
		}
	});
	replacePixels();
	updatePalette();
	updatePreview();
}

function singleUndo() {
	if(state.undo_list.length === 0)
		return;
	
	let undo_item;
	if(state.undo_list[state.undo_list.length-1].length > 1)
		undo_item = state.undo_list[state.undo_list.length-1].pop();
	else
		undo_item = state.undo_list.pop()[0];
	
	if(undo_item.oldcolor === undefined || undo_item.oldcolor === null) {
		drawTransparentPixel(undo_item.x, undo_item.y);
		setPixel(undo_item.x, undo_item.y, [0, 0, 0, 0]);
	} else {
		drawPixel(undo_item.x, undo_item.y, {color: undo_item.oldcolor});
		setPixel(undo_item.x, undo_item.y, hex2rgb(undo_item.oldcolor));
	}
	replacePixels();
	updatePalette();
	updatePreview();
}

function drawTransparentPixel(x, y) {
	let half_cell = state.cell_size/2;
	// top left
	state.canvas_painting.fillStyle = "#e6e6e6";
	state.canvas_painting.fillRect(x*state.cell_size, y*state.cell_size, half_cell+1, half_cell+1);
	// top right
	state.canvas_painting.fillStyle = "#b8b8b8";
	state.canvas_painting.fillRect(x*state.cell_size + half_cell, y*state.cell_size, half_cell+1, half_cell+1);
	// bottom left
	state.canvas_painting.fillStyle = "#b8b8b8";
	state.canvas_painting.fillRect(x*state.cell_size, y*state.cell_size + half_cell, half_cell+1, half_cell+1);
	// bottom right
	state.canvas_painting.fillStyle = "#e6e6e6";
	state.canvas_painting.fillRect(x*state.cell_size + half_cell, y*state.cell_size + half_cell, half_cell+1, half_cell+1);
}

function drawPixel(x, y, options) {
	if(typeof(options) === 'undefined') options = {};
	if(typeof(options.color) === 'undefined') {
		if(state.erasing)
			options.color = null;
		else
			options.color = state.current_color;
	}
	let repaint = options.repaint || false;

	if(state.current_canvas === "tools") {
		state.canvas_tools.fillStyle = options.color;
		state.canvas_tools.fillRect(x*state.cell_size, y*state.cell_size, state.cell_size+1, state.cell_size+1);
		return;
	}

	if(options.onlydraw) {
		state.canvas_painting.fillStyle = options.color;
		state.canvas_painting.fillRect(x*state.cell_size, y*state.cell_size, state.cell_size+1, state.cell_size+1);
		return;
	}

	if(state.current_canvas === "painting") {
		let pixel = getPixel(x, y);
		let color = null;
		if(pixel[3] != 0)
			color = rgb2hex(pixel[0], pixel[1], pixel[2]);
		
		if(color != options.color || repaint === true) {
			let oldcolor = color || null;		
			
			if(options.color === null) {
				setPixel(x, y, [0, 0, 0, 0]);
				drawTransparentPixel(x, y);
			} else {
				setPixel(x, y, hex2rgb(options.color));
				state.canvas_painting.fillStyle = options.color;
				state.canvas_painting.fillRect(x*state.cell_size, y*state.cell_size, state.cell_size+1, state.cell_size+1);
			}
			
			if(typeof(options.callback) != 'undefined') {
				options.callback.call(this, {x: x, y: y, oldcolor: oldcolor, newcolor: options.color});
			}
		}
	}
}

function addToArrayWithLimit(array, item, limit) {
	if(array.length > (limit - 1)) {
		array.shift();
	}
	array.push(item);
}

function updatePalette() {
	let palette = $("#palette")
	palette.empty();
	
	state.palette_colors = [];
	for(let y=0; y<state.num_cells_y; y++) {
		for(let x=0; x<state.num_cells_x; x++) {
			let pixel = getPixel(x, y);
			let color = rgb2hex(pixel[0], pixel[1], pixel[2]);
			if(pixel[3] != 0) {
				if(state.palette_colors.indexOf(color) === -1) {
					state.palette_colors.push(color);
				}
			}
		}
	}
	let palette_html = '';
	$.each(state.palette_colors, function(index, value) {
			palette_html += '<div class="pcolorbutton" style="background-color: ' + value + ';" id="pcol-' + index + '"></div>';
	});
	palette.append(palette_html);
	$(".pcolorbutton").click(function(e) {
		state.current_color = state.palette_colors[parseInt($(this).attr("id").split("-")[1])];
		state.current_picker_color = state.current_color;
		$("#colorpicker").css("background", state.current_color);
		state.color_picker.ColorPickerSetColor(state.current_color);
	});
	// fix for Safari
	palette.append("&nbsp;");
}

function updateRecentColors() {
	let rcols = $("#recent-colors")
	rcols.empty();
	$.each(state.recent_colors, function(index, value) {
		rcols.prepend('<div class="rcolorbutton" id="rcol-' + index + '"></div>');
		$("#rcol-" + index).css("background", value);
	});
	$(".rcolorbutton").click(function(e) {
		state.current_color = state.recent_colors[parseInt($(this).attr("id").split("-")[1])];
		state.current_picker_color = state.current_color;
		$("#colorpicker").css("background", state.current_color);
		state.color_picker.ColorPickerSetColor(state.current_color);
	});
}

function initializeGrid() {
	for(let i=0; i<state.pixel_colors.data.length; i++) {
		state.pixel_colors.data[i] = 0;
	}
}

function hex2rgb(hex) {
	let r,g,b;
	hex = (hex.charAt(0) === "#") ? hex.substring(1, 7) : hex;
	r = parseInt(hex.substring(0,2), 16);
	g = parseInt(hex.substring(2,4), 16);
	b = parseInt(hex.substring(4,6), 16);
	return [r, g, b];
}

function setPixelData(pixeldata, x, y, color, alpha) {
	let index = (x + y * pixeldata.width) * 4;
    pixeldata.data[index+0] = color[0];
    pixeldata.data[index+1] = color[1];
    pixeldata.data[index+2] = color[2];
    pixeldata.data[index+3] = alpha;
}

function updatePreview() {
	let pixelcount = 0;
	for(let y=0; y<state.num_cells_y; y++) {
		for(let x=0; x<state.num_cells_x; x++) {
			let pixel = getPixel(x, y);
			if(pixel[3] != 0) {
				pixelcount += 1;
			}
		}
	}
	let data = document.getElementById("canvas-image").toDataURL();
	document.getElementById("preview").src = data;
	$("#pixelcount").html(pixelcount + " pixels");
}

function padWithZeroes(value, n) {
	value = value.toString();
	if(value.length < n)
		return new Array(n+1 - value.length).join("0") + value;
	return value;
}

function rgb2hex(red, green, blue) {
	red = padWithZeroes(red.toString(16), 2);
	green = padWithZeroes(green.toString(16), 2);
	blue = padWithZeroes(blue.toString(16), 2);
	
	return "#" + red + green + blue;
}

function currentImageToDataUrl() {
	return document.getElementById("canvas-image").toDataURL();
}

function dataUrlToPixels(dataurl, callback) {
	let image = new Image();
	image.onload = function() {
		let canvas = document.getElementById('canvas-dataurl');
		canvas.width = image.width;
		canvas.height = image.height;
		let ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, image.width, image.height);
		ctx.drawImage(image, 0, 0);
		
		let imagedata = ctx.getImageData(0, 0, image.width, image.height);

		callback.call(this, imagedata, image.width, image.height);
	};
	image.src = dataurl;
}

function dataUrlToGrid(dataurl, callback) {
	let image = new Image();
	image.onload = function() {
		let canvas = document.getElementById('canvas-dataurl');
		canvas.width = image.width;
		canvas.height = image.height;
		let ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, image.width, image.height);
		ctx.drawImage(image, 0, 0);
		
		let newgrid = new Array(image.height);
		for(let i=0; i<image.height; i++) {
			newgrid[i] = new Array(image.width);
		}
		
		let imagedata = ctx.getImageData(0, 0, image.width, image.height);
		
		for(let y=0; y<image.height; y++) {
			for(let x=0; x<image.width; x++) {
				let index = (x + y * image.width) * 4;
				let red = imagedata.data[index];
				let green = imagedata.data[index+1];
				let blue = imagedata.data[index+2];
				let alpha = imagedata.data[index+3];
				if(alpha != 0)
					newgrid[y][x] = rgb2hex(red, green, blue);
			}
		}

		callback.call(this, newgrid, image.width, image.height);
	};
	image.src = dataurl;
}

function restoreGrid() {
	let canvas =  document.getElementById("canvas-painting");
	state.canvas_painting.clearRect(0, 0, canvas.width, canvas.height);
	replacePixels();
	for(let y=0; y<state.num_cells_y; y++) {
		for(let x=0; x<state.num_cells_x; x++) {
			let pixel = getPixel(x, y);
			let color = rgb2hex(pixel[0], pixel[1], pixel[2]);
			if(pixel[3] != 0)
				drawPixel(x, y, {color: color, onlydraw: true});
			else
				drawTransparentPixel(x, y);
		}
	}
	updatePreview();
}

function floodFill(x, y, target, replacement) {
	state.just_drew = [];
	let queue = [];
	if(getPixelHex(x, y) != target)
		return;

	queue.push([y, x]);
	while(queue.length > 0) {
		let n = queue.pop();
		let nx = n[1];
		let ny = n[0];
		if(getPixelHex(nx, ny) === target) {
			drawPixel(nx, ny, {color: replacement, callback: function(cell) {
				state.just_drew.push(cell);
			}});
			setPixel(nx, ny, hex2rgb(replacement));

			if(nx > 0) {
				queue.push([ny, nx-1]);
			}
			if(nx < (state.num_cells_x-1)) {
				queue.push([ny, nx+1]);
			}
			if(ny > 0) {
				queue.push([ny-1, nx]);
			}
			if(ny < (state.num_cells_y-1)) {
				queue.push([ny+1, nx]);
			}
		}
	}
	addToArrayWithLimit(state.undo_list, state.just_drew, 100);
}

function resizeGrid() {
	let w_width = $(window).width();
	let w_height = $(window).height();
	
	let topheight = 55 + 15 + 10;
	if(state.image_picker_visible)
		topheight = topheight + 75;
	
	let sidesheight = 224 + 202 + 10;

	state.cell_size = Math.min((w_height - topheight) / state.num_cells_y, (w_width - sidesheight) / state.num_cells_x);

	if(state.cell_size < 20) {
		state.cell_size = 20;
	}

	let canvas_width = state.cell_size * state.num_cells_x;
	let canvas_height = state.cell_size * state.num_cells_y;

	let ws = Math.min(w_width - sidesheight, canvas_width + state.scrollbar_width);
	let hs = Math.min(w_height - topheight, canvas_height + state.scrollbar_width);
	$("#wrapper").width(ws);
	$("#wrapper").height(hs);

	if(ws === canvas_width + state.scrollbar_width) {
		$("#wrapper").css("overflow-x", "hidden");
	} else {
		$("#wrapper").css("overflow-x", "auto");
	}
	if(hs === canvas_height + state.scrollbar_width) {
		$("#wrapper").css("overflow-y", "hidden");
	} else {
		$("#wrapper").css("overflow-y", "auto");
	}

	// reposition the rightbox
	$("#rightbox").css("right", w_width - ws - sidesheight);
	
	let p_element = document.getElementById("canvas-painting");
	let g_element = document.getElementById("canvas-grid");
	
	state.canvas_painting.clearRect(0, 0, p_element.width, p_element.height);
	state.canvas_grid.clearRect(0, 0, g_element.width, g_element.height);
	
	p_element.width = canvas_width;
	p_element.height = canvas_height;
	g_element.width = canvas_width;
	g_element.height = canvas_height;
	
	// resize the tools canvas
	let t_element = document.getElementById("canvas-tools");
	t_element.width = canvas_width;
	t_element.height = canvas_height;

	state.canvas_grid.strokeStyle = "#555";
	state.canvas_grid.lineWidth = 2;
	for(let x=0; x<state.num_cells_x;x++) {
		state.canvas_grid.beginPath();
		state.canvas_grid.moveTo(state.cell_size*x, 0);
		state.canvas_grid.lineTo(state.cell_size*x, g_element.height);
		state.canvas_grid.stroke();
	}
	for(let y=0; y<state.num_cells_y; y++) {
		state.canvas_grid.beginPath();
		state.canvas_grid.moveTo(0, state.cell_size*y);
		state.canvas_grid.lineTo(g_element.width, state.cell_size*y);
		state.canvas_grid.stroke();
	}
	restoreGrid();
}

function withoutExtension(filename) {
	return filename.slice(0, filename.lastIndexOf("."));
}

function openImageWithId(imageid) {
	state.loaded_image = imageid;
	let image_entry = state.images[state.loaded_image];
	dataUrlToPixels(image_entry.image, function(imagedata, width, height) {
		changeCellNum(width, height);
		state.pixel_colors = imagedata;
		resizeGrid();
		updatePreview();
		updatePalette();
		$("#wrapper").scrollTop(0);
		$("#wrapper").scrollLeft(0);
	});
	
	$("#info-saved").text(formatTime(image_entry.saved));
	state.loaded_image_filename = state.images[state.loaded_image].filename || null;
	$("#filename").text(state.loaded_image_filename || "Unnamed");
	state.undo_list = [];
	state.changed = false;
	$("#delete").show();
	$("#duplicate").show();
	$("#filename").show();
	$("#sizetr").hide();
	$("#size").show();
	$(".pickerselected").removeClass("pickerselected");
	$("img#" + imageid).parent().addClass("pickerselected");
}

function appendToImagePicker(key) {
	let image = new Image();
	image.id = key;
	image.onload = function() {
		image.onload = null;
		resizeImg(key, 32, 32);
	};
	image.src = state.images[key].image;
	let span = $('<span></span>');
	span.append(image);
	$("#imagepicker").prepend(span);

	$(image).click(function() {
		if(!state.changed || confirm("Loading this picture will delete your unsaved changes")) {
			let imageid = $(this).attr("id");
			let entry = getAnEntry(imageid);
			openImageWithId(imageid);
		}
	});
}

async function reloadImagePicker() {
	$("#imagepicker").empty();
	state.images = {};

	let images = [];
	let files = await state.datarchive.readdir("/images");

	for(let i=0; i<files.length; i++) {
		let key = files[i];
		if(key.endsWith(".png")) {
			let image_info = await state.datarchive.stat("images/" + key);
			let image = await state.datarchive.readFile("images/" + key, "base64");
			image = baseToDataUrl(image);
			images.push({
				imageid: "image-" + UUID.generate(),
				saved: image_info.mtime,
				filename: withoutExtension(key),
				image:image
			});
		}
	}

	images.sort(function(a, b) {
		return a.saved - b.saved;
	});

	$.each(images, function(index, value) {
		state.images[value.imageid] = {
			saved: value.saved,
			filename: value.filename,
			image: value.image
		}
		appendToImagePicker(value.imageid);
	});
}

function displayMessage(text) {
	$("#message").queue(function() {$("#message span").text(text); $(this).dequeue();}).slideDown(250).delay(2000).slideUp(250);

}

function formatTime(mstime) {
	let time = new Date(mstime);
	return $.timeago(new Date(mstime));
}

// tools
function brush() {
	state.current_tool = "brush";
	state.current_color = state.current_picker_color;
	state.erasing = false;
	
	$("#tools span").removeClass("highlighted");
	$("span#brush").addClass("highlighted");
}

function eraser() {
	state.current_tool = "brush";
	state.erasing = true;
	
	$("#tools span").removeClass("highlighted");
	$("span#remove").addClass("highlighted");
}

function fillbucket() {
	state.current_tool = "bucket";
	state.current_color = state.current_picker_color;
	state.erasing = false;
	
	$("#tools span").removeClass("highlighted");
	$("span#bucket").addClass("highlighted");
}

function move() {
	state.current_tool = "move";
	state.erasing = false;
		
	$("#tools span").removeClass("highlighted");
	$("span#move").addClass("highlighted");
}

function rectangleTool() {
	state.current_tool = "rectangle";
	state.current_color = state.current_picker_color;
	state.erasing = false;
		
	$("#tools span").removeClass("highlighted");
	$("span#rectangle").addClass("highlighted");
}

function lineTool() {
	state.current_tool = "line";
	state.current_color = state.current_picker_color;
	state.erasing = false;
		
	$("#tools span").removeClass("highlighted");
	$("span#line").addClass("highlighted");
}

function circleTool() {
	state.current_tool = "circle";
	state.current_color = state.current_picker_color;
	state.erasing = false;
		
	$("#tools span").removeClass("highlighted");
	$("span#circle").addClass("highlighted");
}

function getAnEntry(targetid) {
	return state.images[targetid];
}

function getEntry() {
	return getAnEntry(state.loaded_image);
}

function updateAnEntryWithValues(targetid, values) {
	let entry = getAnEntry(targetid);
	$.each(values, function(key, value) {
		entry[key] = value;
	});
}

function updateAnEntry(targetid, key, value) {
	let entry = getAnEntry(targetid);
	entry[key] = value;
}

function updateEntry(key, value) {
	updateAnEntry(state.loaded_image, key, value);
}

function updateEntryWithValues(values) {
	updateAnEntryWithValues(state.loaded_image, values);
}

function baseToDataUrl(base) {
	return "data:image/png;base64," + base;
}

function dataUrlToBase(dataurl) {
	return dataurl.split(",")[1];
}

async function save() {
	if(state.loaded_image === null) {
		state.loaded_image = "image-" + UUID.generate();
		state.loaded_image_filename = "image_" + UUID.generate().replace(/-/g, "");
	} else {
		$("#imagepicker img#" + state.loaded_image).parent().remove();
	}
	
	let saved = new Date().getTime();
	state.images[state.loaded_image] = {
		saved: saved,
		filename: state.loaded_image_filename,
		image: currentImageToDataUrl()
	}
	await state.datarchive.writeFile("images/" + state.loaded_image_filename + ".png", dataUrlToBase(state.images[state.loaded_image].image), "base64");
	appendToImagePicker(state.loaded_image);

	$("#info-saved").text(formatTime(saved));
	displayMessage("Image saved!");
	state.changed = false;
	$("#delete").show();
	$("#duplicate").show();
	$("#filename").show();
	$("#filename").text(state.loaded_image_filename);
	$("#sizetr").hide();
	$("#size").show();
	$("#imagepicker img#" + state.loaded_image).parent().addClass("pickerselected");
}

function checkForRecentColor() {
	if(state.current_color != null) {
		let found = false;
		$.each(state.recent_colors, function(index, value) {
			if(value === state.current_color) found = true;
		});
		if(!found) {
			addToArrayWithLimit(state.recent_colors, state.current_color, 15);
			updateRecentColors();
		}
	}
}

// Bresenham line algorithm
function line(x1, y1, x2, y2){
	let dx = Math.abs(x2 - x1);
	let dy = Math.abs(y2 - y1);
	let sx = (x1 < x2) ? 1 : -1;
	let sy = (y1 < y2) ? 1 : -1;
	let err = dx - dy;

	let pixels = [];
	state.line_pixels = [];
	while(true){
		pixels.push({x: x1, y: y1});
	
		if (x1 === x2 && y1 === y2) break;
		
		let e2 = 2 * err;
		if (e2 > -dy){
			err -= dy;
			x1 += sx;
		}
		if (e2 < dx){
			err += dx;
			y1 += sy;
		}
	}
	
	$.each(pixels, function(index, value) {
		if(value.x < state.num_cells_x && value.x > -1 && value.y < state.num_cells_y && value.y > -1) {
			drawPixel(value.x, value.y);
			state.line_pixels.push(value);
		}
	});
	return state.line_pixels;
}

function rectangle(x1, y1, x2, y2) {
	state.rectangle_pixels = line(x1, y1, x2, y1);
	state.rectangle_pixels = state.rectangle_pixels.concat(line(x1, y1, x1, y2));
	state.rectangle_pixels = state.rectangle_pixels.concat(line(x2, y1, x2, y2));
	state.rectangle_pixels = state.rectangle_pixels.concat(line(x1, y2, x2, y2));
}

// Midpoint circle algorithm
function circle(x_center, y_center, radius) {
	let x = radius;
	let y = 0;
	let x_change = 1 - 2*radius;
	let y_change = 1;
	let radius_error = 0;
	
	let pixels = [];
	state.circle_pixels = [];
	while(x >= y) {
		pixels.push({x: x_center+x, y: y_center+y});
		pixels.push({x: x_center-x, y: y_center+y});
		pixels.push({x: x_center-x, y: y_center-y});
		pixels.push({x: x_center+x, y: y_center-y});
		pixels.push({x: x_center+y, y: y_center+x});
		pixels.push({x: x_center-y, y: y_center+x});
		pixels.push({x: x_center-y, y: y_center-x});
		pixels.push({x: x_center+y, y: y_center-x});
		
		y += 1;
		radius_error += y_change;
		y_change += 2;
		if(2*radius_error + x_change > 0) {
			x -= 1;
			radius_error += x_change;
			x_change += 2;
		}
	}
	
	$.each(pixels, function(index, value) {
		if(value.x < state.num_cells_x && value.x > -1 && value.y < state.num_cells_y && value.y > -1) {
			drawPixel(value.x, value.y);
			state.circle_pixels.push(value);
		}
	});
}

async function loadImages() {
	await loadDatArchive();
	await reloadImagePicker();
}

// Document Ready
$(document).ready(function() {
	calculateScrollBarWidth();
	state.canvas_painting = document.getElementById("canvas-painting").getContext("2d");
	state.canvas_grid = document.getElementById("canvas-grid").getContext("2d");
	state.canvas_tools = document.getElementById("canvas-tools").getContext("2d");
	canvas_image = document.getElementById("canvas-image").getContext("2d");
	
	loadPixels();
	
	// Hide the delete and duplicate buttons
	$("#delete").hide();
	$("#duplicate").hide();
	
	// Initialize and draw the grid array
	initializeGrid();
	resizeGrid();
	
	// Set up event handlers on the grid
	$("#canvas-grid").click(function(e) {
		$("#sizetr").hide();
		$("#size").show();
		let gridpos = posToGrid(offsetX(e), offsetY(e));
		if(state.current_tool === "bucket") {
			let targetColor = getPixelHex(gridpos.x, gridpos.y);
			if(targetColor != state.current_color) {
				floodFill(gridpos.x, gridpos.y, targetColor, state.current_color);
				replacePixels();
				updatePreview();
				updatePalette();
				state.changed = true;
				checkForRecentColor();
			}
		}
	});
	$("#canvas-grid").mousedown(function(e) {
		if(state.current_tool === "brush")
		{
			state.drew = true;
			state.just_drew = [];
			let gridpos = posToGrid(offsetX(e), offsetY(e));
			drawPixel(gridpos.x, gridpos.y, {callback: function(cell) {
				state.just_drew.push(cell);
			}});
			$("#canvas-grid").mousemove(mousemovehandler);
		}
		
		if(state.current_tool === "move") {
			state.move_start = posToGrid(offsetX(e), offsetY(e));
			state.move_end = state.move_start;
			state.move_grid = [];
			for(let i=0; i<state.pixel_colors.data.length; i++) {
				state.move_grid.push(state.pixel_colors.data[i]);
			}
			$(document).mousemove(move_mousemovehandler);
		}
		
		if(state.current_tool === "rectangle") {
			state.rectangle_start = posToGrid(offsetX(e), offsetY(e));
			state.rectangle_end = state.rectangle_start;
			state.current_canvas = "tools";
			$(document).mousemove(rectangle_mousemovehandler);
		}
		
		if(state.current_tool === "line") {
			state.line_start = posToGrid(offsetX(e), offsetY(e));
			state.line_end = state.line_start;
			state.current_canvas = "tools";
			$(document).mousemove(line_mousemovehandler);
		}
		
		if(state.current_tool === "circle") {
			state.circle_start = posToGrid(offsetX(e), offsetY(e));
			state.circle_end = state.circle_start;
			state.current_canvas = "tools";
			$(document).mousemove(circle_mousemovehandler);
		}
		
		return false;
	});
	$(window).mouseup(function() {	
		$("#canvas-grid").unbind("mousemove");
		
		if(state.current_tool === "move" &&  state.move_end != null) {
			$(document).unbind("mousemove", move_mousemovehandler);
			if(state.move_end.x != state.move_start.x || state.move_end.y != state.move_start.y) {
				state.changed = true;
				updatePreview();
				updatePalette();
				
				// add move action to undo list
				let undo_item = [];
				for(let y=0; y<state.num_cells_y; y++) {
					for(let x=0; x<state.num_cells_x; x++) {
						let pixel = getPixel(x, y);
						let color = null;
						if(pixel[3] != 0)
							color = rgb2hex(pixel[0], pixel[1], pixel[2]);

						let frompixel = getPixel(x, y, state.move_grid);
						let fromcolor = null;
						if(frompixel[3] != 0)
							fromcolor = rgb2hex(frompixel[0], frompixel[1], frompixel[2]);
						undo_item.push({x: x, y: y, oldcolor: fromcolor, newcolor: color});
					}
				}
				addToArrayWithLimit(state.undo_list, undo_item, 100);
			}
			state.move_start = null;
			state.move_end = null;
			delete state.move_grid;
			state.move_grid = null;
		}
		
		if(state.current_tool === "rectangle" && state.rectangle_end != null) {
			$(document).unbind("mousemove", rectangle_mousemovehandler);
			state.current_canvas = "painting";
			if(state.rectangle_end.x != state.rectangle_start.x || state.rectangle_end.y != state.rectangle_start.y) {
				state.changed = true;
				
				state.canvas_tools.clearRect(0, 0, state.num_cells_x * state.cell_size, state.num_cells_y * state.cell_size);
				let undo_item = [];
				$.each(state.rectangle_pixels, function(index, value) {
					let pixel = getPixel(value.x, value.y);
					let color = null;
					if(pixel[3] != 0)
						color = rgb2hex(pixel[0], pixel[1], pixel[2]);
					undo_item.push({x: value.x, y: value.y, oldcolor: color, newcolor: state.current_color});
					setPixel(value.x, value.y, hex2rgb(state.current_color));
				});
				addToArrayWithLimit(state.undo_list, undo_item, 100);
				restoreGrid();
				checkForRecentColor();
			}
			
			state.rectangle_start = null;
			state.rectangle_end = null;
		}
		
		if(state.current_tool === "line" && state.line_end != null) {
			$(document).unbind("mousemove", line_mousemovehandler);
			state.current_canvas = "painting";
			if(state.line_end.x != state.line_start.x || state.line_end.y != state.line_start.y) {
				state.changed = true;

				state.canvas_tools.clearRect(0, 0, state.num_cells_x * state.cell_size, state.num_cells_y * state.cell_size);
				let undo_item = [];
				$.each(state.line_pixels, function(index, value) {
					let pixel = getPixel(value.x, value.y);
					let color = null;
					if(pixel[3] != 0)
						color = rgb2hex(pixel[0], pixel[1], pixel[2]);
					undo_item.push({x: value.x, y: value.y, oldcolor: color, newcolor: state.current_color});
					setPixel(value.x, value.y, hex2rgb(state.current_color));
				});
				addToArrayWithLimit(state.undo_list, undo_item, 100);
				restoreGrid();
				checkForRecentColor();
			}
			
			state.line_start = null;
			state.line_end = null;
		}
		
		if(state.current_tool === "circle" && state.circle_end != null) {
			$(document).unbind("mousemove", circle_mousemovehandler);
			state.current_canvas = "painting";
			if(state.circle_end.x != state.circle_start.x || state.circle_end.y != state.circle_start.y) {
				if(state.circle_pixels.length > 0) {
					state.changed = true;
					
					state.canvas_tools.clearRect(0, 0, state.num_cells_x * state.cell_size, state.num_cells_y * state.cell_size);
					let undo_item = [];
					$.each(state.circle_pixels, function(index, value) {
						let pixel = getPixel(value.x, value.y);
						let color = null;
						if(pixel[3] != 0)
							color = rgb2hex(pixel[0], pixel[1], pixel[2]);
						undo_item.push({x: value.x, y: value.y, oldcolor: color, newcolor: state.current_color});
						setPixel(value.x, value.y, hex2rgb(state.current_color));
					});
					addToArrayWithLimit(state.undo_list, undo_item, 100);
					restoreGrid();
					checkForRecentColor();
				}
			}
			
			state.circle_start = null;
			state.circle_end = null;
		}
		
		if(state.drew) {
			replacePixels();
			updatePreview();
			updatePalette();
			checkForRecentColor();
			// add undo item
			addToArrayWithLimit(state.undo_list, state.just_drew, 100);
			state.drew = false;
			state.changed = true;
			state.last_pixel_drawn = null;
		}
		
		// clear the tools canvas
		let t_element = document.getElementById("canvas-tools");
		state.canvas_tools.clearRect(0, 0, t_element.width, t_element.height);
	});
	
	// Set up undo event handlers
	$("span#undo").click(function(e) {
		undo();
	});
	$("span#single-undo").click(function() {
		singleUndo();
	});
	
	// Set up remove tool handler
	$("span#remove").click(eraser);
	// Set up bucket tool handler
	$("span#bucket").click(fillbucket);
	// Set up brush tool handler
	$("span#brush").click(brush);
	// Set up move tool handler
	$("span#move").click(move);
	// Set up rectangle tool handler
	$("span#rectangle").click(rectangleTool);
	// Set up line tool handler
	$("span#line").click(lineTool);
	// Set up circle tool handler
	$("span#circle").click(circleTool);
	
	// Set up info delete handler
	$("#info span#delete").click(function() {
		if(confirm("You are about to delete the current image")) {
			changeCellNum(32, 32);
			initializeGrid();
			resizeGrid();
			$("#wrapper").scrollTop(0);
			$("#wrapper").scrollLeft(0);
			
			state.datarchive.unlink("images/" + state.loaded_image_filename + ".png");
			$("#imagepicker img#" + state.loaded_image).parent().remove();
			$("#info-saved").text("never");
			displayMessage("Image deleted!");
			state.loaded_image = null;
			state.changed = false;
			$("#delete").hide();
			$("#duplicate").hide();
			$("#filename").hide();
		}
	});
	
	// Set up info duplicate handler
	$("#info span#duplicate").click(function() {
		if(state.loaded_image != null) {
			$("#info-saved").text("never");
			displayMessage("Image duplicated!");
			state.loaded_image = null;
			state.loaded_image_filename = null;
			state.changed = true;
			$("#delete").hide();
			$("#duplicate").hide();
			$("#filename").hide();
			$("#sizetr").hide();
			$("#size").show();
			$("#filename").text("Unnamed");
			$(".pickerselected").removeClass("pickerselected");
		}
	});
	
	// Set up new handler
	$("span#new").click(function() {
		if(!state.changed || confirm("Creating a new image will delete your unsaved changes")) {
			changeCellNum(32, 32);
			initializeGrid();
			resizeGrid();
			$("#wrapper").scrollTop(0);
			$("#wrapper").scrollLeft(0);
			state.undo_list = [];
			$("#info-saved").text("never");
			state.loaded_image = null;
			state.loaded_image_filename = null;
			displayMessage("New image created!");
			state.changed = false;
			$("#delete").hide();
			$("#duplicate").hide();
			$("#filename").hide();
			$("#filename").text("Unnamed");
			$(".pickerselected").removeClass("pickerselected");
		}
	});
	
	// Set up load handler
	$("span#load").click(function() {
		if(state.image_picker_visible) {
			$("#imagepicker-scroller").hide();
			$("#leftbox").css("top", "65px");
			$("#wrapper").css("top", "65px");
			$("#rightbox").css("top", "65px");
			state.image_picker_visible = false;
		} else {
			$("#imagepicker-scroller").show();
			$("#leftbox").css("top", "140px");
			$("#wrapper").css("top", "140px");
			$("#rightbox").css("top", "140px");
			state.image_picker_visible = true;
		}
		resizeGrid();
	});
	
	// Set up save handler
	$("span#save").click(function() {
		save();
	});
	
	// Set up event handlers on the ColorPicker
	state.color_picker = $("#colorpicker").ColorPicker(
		{
			onChange: function(hsb, hex, rgb) {
				$("#colorpicker").css("background", "#" + hex);
				state.current_color = "#" + hex;
				state.current_picker_color = "#" + hex;
			},
			onHide: function() {
				checkForRecentColor();
			}
		}
	);
	
	// visual indicator for selected brush
	$("#tools span#brush").addClass("highlighted");
	
	// fit toolbar width
	$("#toolbar").width($(window).width()-10);
	$(window).resize(function() {
		$("#toolbar").width($(window).width()-10);
		resizeGrid();
	});
	
	// store the mouse position on mousemove
	$(document).mousemove(function(e) {
			state.mouseX = e.pageX;
			state.mouseY = e.pageY;
	});
	
	// keyboard shortcuts
	enableShortcuts();
	
	// disable text selection on buttons
	disableSelection();
	
	// check if there are unsaved changes on close
	$(window).bind("beforeunload", function(e) {
			if(state.changed)
				return "There are unsaved changes. Reloading or closing the app will discard these changes.";
	});

	$("#info-filename input").hide();
	$("#cancelrename").hide();
	$("#filename").hide();
	$("#filename").click(function() {
		let fname = state.loaded_image_filename;
		$("#info-filename input").val(fname);
		$("#filename").hide();
		$("#info-filename input").show();
		$("#info-filename input").focus();
		$("#cancelrename").show();
		disableShortcuts();
		enableSelection();
	});
	$("#cancelrename").click(function() {
		$("#info-filename input").hide();
		$("#cancelrename").hide();
		$("#filename").show();
		enableShortcuts();
		disableSelection();
	});
	$("#info-filename input").keypress(function(e) {
		if(e.which === 13) {
			e.preventDefault();
			$("#info-filename input").hide();
			$("#cancelrename").hide();
			$("#filename").show();
			let new_filename = $("#info-filename input").val();
			if(new_filename != state.loaded_image_filename) {
				state.datarchive.rename("images/" + state.loaded_image_filename + ".png", "images/" + new_filename + ".png").then(() => {
					state.loaded_image_filename = new_filename;
					updateEntry("filename", new_filename);
					$("#filename").text(new_filename);
				}).catch((error) => {
					alert(error);
				});
				
			}
			enableShortcuts();
			disableSelection();
			return false;
		}
	});

	// size
	$("#sizetr").hide();
	$("#size").click(function() {
		if(state.loaded_image || state.changed) {
			alert("You can only set the size of new images.");
			return;
		}
		$("#sizetr").show();
		$("#size").hide();
		$("#sizetr input[type=text]").eq(0).val(state.num_cells_x);
		$("#sizetr input[type=text]").eq(1).val(state.num_cells_y);
	});
	$("#cancelsize").click(function() {
		$("#sizetr").hide();
		$("#size").show();
	});
	$("#setsize").click(function() {
		let width = parseInt($("#sizetr input[type=text]").eq(0).val());
		let height = parseInt($("#sizetr input[type=text]").eq(1).val());
		if(width && width > 0 && height && height > 0) {
			changeCellNum(width, height);
			initializeGrid();
			resizeGrid();
			$("#sizetr").hide();
			$("#size").show();
		} else {
			alert("Sorry, but that's not a valid size.");
		}
		
	});

	loadSettings();

	loadImages();
});
