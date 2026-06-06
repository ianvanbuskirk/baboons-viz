
var lengthScale = 8;
var lengthScales = [ 8, 12]; // 2, 4, 16
var timeScale = 2;
var timeScales = [1, 2 ]; // .5, .25, 8 , 6, 4
var dayData;
var hexes;

var baboons;
var baboonHexes = {};
var baboonMoved = {};
var baboonSectors = {};
var baboonColors = {};

var controls = {

  eventIndex: 100,
  eventIndexMin: 1,
  eventIndexMax: 1,
  eventIndexStep: 1,

  whichDay: 1,
  whichDayMin: 1,
  whichDayMax: 8,
  whichDayStep: 1,

  lengthScale: lengthScales,
  // lengthScaleMin: 1,
  // lengthScaleMax: 13,
  // lengthScaleStep: 1,

  timeScale: timeScales,
  // timeScaleMin: ,
  // timeScaleMax: ,
  // timeScaleStep: ,

  // runSpeed: 58,
  // runSpeedMin: 1,
  // runSpeedMax: 58,
  // runSpeedStep: 3,
  showHex: false,
  run: false
};

var currentDay = controls['whichDay'];

var gui;
var sectors = {};
var hexSectors = {};

var hexMapCenter;
var hexMapWidth;
var stateGraphCenter;
var stateGraphWidth;

var pressedKeys = {};
window.onkeyup = function(e) { pressedKeys[e.key] = false; }
window.onkeydown = function(e) { pressedKeys[e.key] = true; }

var dayLens = {};
var daySettings = {};
var coarseGrainings = Object.fromEntries(controls['lengthScale'].map(l => [l, {}]))

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}


function preload(){
  for (l = 0; l < controls['lengthScale'].length; l++){
    for (t = 0; t < controls['timeScale'].length; t++){
      dayData = loadJSON('static/data_v2/states_length_'+
                        Number.parseFloat(controls['lengthScale'][l]).toFixed(3)+
                        '_time_'+Number.parseFloat(controls['lengthScale'][l]*controls['timeScale'][t]).toFixed(0).toString()+'.json')
      coarseGrainings[controls['lengthScale'][l]][controls['timeScale'][t]] = dayData

      console.log(controls['lengthScale'][l],controls['timeScale'][t])
      // sleep(500);
      

    }
  }
  generateSectors()
  

}

function setup() {
  div = createCanvas(windowWidth, windowHeight - 40);
  div.position(0, 40);
  frameRate(30);
  dayData = coarseGrainings[8][2];
  

  // drawHexagons();
  dayLens = Object.fromEntries(Object.keys(dayData).map( d => [d,dayData[d]["state_dicts"].length - 1]));
  controls['eventIndexMax'] = Math.min(dayLens[controls['whichDay']], Math.max(1000, Math.ceil(dayLens[controls['whichDay']]/3)))

  // controls['windowMax'] = Math.ceil(controls['eventIndexMax'])+10
  
  // updateBaboonHexes()
  colorMode(HSB,360,100,100,1);

  baboons =  Object.keys(dayData[1]['states']);
  for (var h = 0; h < baboons.length; h++){
    // console.log(h*360/baboons.length)
    // baboonColors[baboons[h]] = color(h*360/baboons.length,50+Math.random()*50,50+Math.random()*50,1)
    baboonColors[baboons[h]] = color(h*360/baboons.length,70+(h%3)*10,45+(h%3)*22.5,1)
  }
  baboonSectors = Object.fromEntries(baboons.map( x => [x, -1]));
  baboonMoved = Object.fromEntries(baboons.map( x => [x, false]));
  hexSectors =  Object.fromEntries(Object.keys(dayData[controls['whichDay']]['hexes']).map( x => [x, [...Array(16).keys()]]));
  baboonHexes = dayData[controls['whichDay']]['state_dicts'][0];

  daySettings = Object.fromEntries(Object.keys(dayData).map( d => [d,setDaySettings(d)]));
  updateBaboonHexes();
  

  // var gui = new dat.gui.GUI();
  // gui.add(controls, "day").min(1).max(13).step(1);
  // gui.add(controls, "run");
  // gui.add(controls, "event").min(0).max(eventIndexMax).step(1).listen();

  gui = createGui('Controls');

  // dropdowns (added first so they appear at top)
  gui.prototype.addDropDown('lengthScale', lengthScales, function(v) { controls['lengthScale'] = v.value; });
  gui.prototype.addDropDown('timeScale',   timeScales,   function(v) { controls['timeScale']   = v.value; });

  // sliders in requested order
  gui.prototype.addRange('Day',         1, 8,                          1,                       1, function(v) { controls['whichDay']       = Number(v); });
  gui.prototype.addRange('windowStart', 1, controls['eventIndexMax'],   controls['eventIndexMin'],1, function(v) {
    controls['eventIndexMin'] = Math.min(Number(v), controls['eventIndex']);
  });
  gui.prototype.addRange('windowEnd',   1, dayLens[controls['whichDay']],controls['eventIndexMax'],1, function(v) {
    controls['eventIndexMax'] = Math.max(Number(v), controls['eventIndex']);
  });
  gui.prototype.addRange('Transition',  1, controls['eventIndexMax'],   1,                       1, function(v) { controls['eventIndex']    = Number(v); });

  // checkboxes
  gui.prototype.addBoolean('Play',    false, function(v) { controls['run']     = v ? 1 : 0; });
  gui.prototype._controls.Play.container.querySelector('.qs_checkbox_label').style.fontWeight = 'bold';
  // gui.prototype.addBoolean('showHex', false, function(v) { controls['showHex'] = v; });

  // initial dropdown values
  gui.prototype._controls.lengthScale.setValue({index: lengthScales.indexOf(8), label:'8', value: 8});
  gui.prototype._controls.timeScale.setValue({index: timeScales.indexOf(2), label:'2', value: 2});
  controls['lengthScale'] = 8;
  controls['timeScale'] = 2;

  // initial range values
  gui.prototype._controls.Transition.control.min = 1;
  gui.prototype._controls.Transition.control.max = controls['eventIndexMax'];
  gui.prototype._controls.Transition.setValue(100);

  // side-by-side: lengthScale + timeScale
  var lsEl = gui.prototype._controls.lengthScale.container;
  var tsEl = gui.prototype._controls.timeScale.container;
  var topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;';
  lsEl.parentNode.insertBefore(topRow, lsEl);
  topRow.appendChild(lsEl); topRow.appendChild(tsEl);
  lsEl.style.flex = '1'; tsEl.style.flex = '1';

  // same row: whichDay (stretches) + run checkbox (right)
  var wdEl  = gui.prototype._controls.Day.container;
  var runEl = gui.prototype._controls.Play.container;
  var dayRunRow = document.createElement('div');
  dayRunRow.style.cssText = 'display:flex;align-items:center;';
  wdEl.parentNode.insertBefore(dayRunRow, wdEl);
  dayRunRow.appendChild(wdEl); dayRunRow.appendChild(runEl);
  wdEl.style.cssText = 'flex:0 0 62%;';
  runEl.style.flex = '1';

  // side-by-side: windowStart + windowEnd
  var wsEl = gui.prototype._controls.windowStart.container;
  var weEl = gui.prototype._controls.windowEnd.container;
  var midRow = document.createElement('div');
  midRow.style.cssText = 'display:flex;';
  wsEl.parentNode.insertBefore(midRow, wsEl);
  midRow.appendChild(wsEl); midRow.appendChild(weEl);
  wsEl.style.flex = '1'; weEl.style.flex = '1';

  // side-by-side: run + showHex
  // var runEl = gui.prototype._controls.Play.container;
  // var shEl  = gui.prototype._controls.showHex.container;
  // var botRow = document.createElement('div');
  // botRow.style.cssText = 'display:flex;';
  // runEl.parentNode.insertBefore(botRow, runEl);
  // botRow.appendChild(runEl); botRow.appendChild(shEl);
  // runEl.style.flex = '1'; shEl.style.flex = '1';

  gui.prototype.setWidth(270);
  gui.prototype._panel.style.zIndex = '1001';

  // tighten panel spacing
  var panelStyle = document.createElement('style');
  panelStyle.textContent = '.qs_container{margin:1px 5px !important;padding:2px 4px !important;}.qs_label{margin-bottom:1px !important;}';
  document.head.appendChild(panelStyle);

  // restructure run container: "run" label on top, checkbox below
  var runLabel = document.createElement('div');
  runLabel.textContent = 'Play';
  runLabel.style.cssText = 'font:bold 12px sans-serif;margin-bottom:2px;';
  runEl.insertBefore(runLabel, runEl.firstChild);
  var existingLabel = runEl.querySelector('.qs_label');
  if (existingLabel) existingLabel.style.display = 'none';
  var existingCheckLabel = runEl.querySelector('.qs_checkbox_label');
  if (existingCheckLabel) existingCheckLabel.style.display = 'none';

  hexMapCenter = .5*width;
  hexMapWidth = .97*width;
  stateGraphWidth = width - 305;
  stateGraphCenter = 25 + stateGraphWidth / 2;
  gui.setPosition(width - 278, 40 + Math.floor(.635 * height));
  

}

function saveDaySettings(){
  var settings = {'eventIndexMin':controls['eventIndexMin'],
                 'eventIndex':controls['eventIndex'],
                 'eventIndexMax': controls['eventIndexMax'],
                 'baboonSectors': baboonSectors,
                 'baboonMoved':baboonMoved,
                 'hexSectors':hexSectors,
                  }
  return(settings)

}
function setDaySettings(d){
  var settings = {'eventIndexMin':1,
                 'eventIndex':100,
                 'eventIndexMax': Math.min(dayLens[d], Math.max(1000, Math.ceil(dayLens[d]/3))),
                 'baboonSectors': Object.fromEntries(baboons.map( x => [x, -1])),
                 'baboonMoved':Object.fromEntries(baboons.map( x => [x, false])),
                 'hexSectors':Object.fromEntries(Object.keys(dayData[d]['hexes']).map( x => [x, [...Array(16).keys()]])),
                  }
  return(settings)
}

async function loadCoarseGraining(){
  lengthScale = controls['lengthScale']
  timeScale = controls['timeScale']
  const newData = await new Promise((resolve) => setTimeout(() => resolve(
                        loadJSON('static/data_v2/states_length_'+
                        Number.parseFloat(controls['lengthScale']).toFixed(3)+
                        '_time_'+Number.parseFloat(controls['lengthScale']*controls['timeScale']).toFixed(0).toString()+'.json')
                        ),0))
  return(newData)

}

function findNewEvent(d,newData,time){
  // console.log(newData)
  let arr = (newData[d]["grouped_states"].slice(1).map(x => Math.abs(x[0][2] - time)))
  return (arr.indexOf(Math.min(...arr))+1)
}

function setNewCoarseGrainingSettings(d,newData){
  let oldSettings = daySettings[d]
  let minTime;
  let time ;
  let maxTime;
  if (d == controls['whichDay']){
    minTime = dayData[d]['grouped_states'][controls['eventIndexMin']][0][2]
    time = dayData[d]['grouped_states'][controls['eventIndex']][0][2]
    maxTime = dayData[d]['grouped_states'][controls['eventIndexMax']][0][2]
    // console.log(minTime)
  }
  else{
    minTime = dayData[d]['grouped_states'][oldSettings['eventIndexMin']][0][2]
    if (oldSettings['eventIndex'] == 0){
      time = 0
    } else{
      time = dayData[d]['grouped_states'][oldSettings['eventIndex']][0][2]
    }
    maxTime = dayData[d]['grouped_states'][oldSettings['eventIndexMax']][0][2]
  }
  
  let newMin = Math.max(findNewEvent(d,newData,minTime),1)
  let newTime = time == 0 ?0 :findNewEvent(d,newData,time)
  let newMax = findNewEvent(d,newData,maxTime)


  var settings = {'eventIndexMin':newMin,
                 'eventIndex':newTime,
                 'eventIndexMax': newMax,
                 'baboonSectors': Object.fromEntries(baboons.map( x => [x, -1])),
                 'baboonMoved':Object.fromEntries(baboons.map( x => [x, false])),
                 'hexSectors':Object.fromEntries(Object.keys(newData[d]['hexes']).map( x => [x, [...Array(16).keys()]])),
                  }
  return(settings)
}

function newCoarseGraining(newData){
  lengthScale = controls['lengthScale']
  timeScale = controls['timeScale']
  gui.prototype._controls.Play.setValue(false)
  currentDay = controls['whichDay']
  
  dayLens = Object.fromEntries(Object.keys(newData).map( d => [d,newData[d]["state_dicts"].length - 1]));
  // console.log(newData)
  daySettings = Object.fromEntries(Object.keys(dayData).map( d => [d,setNewCoarseGrainingSettings(d,newData)]));
  dayData = newData
  // console.log(hexSectors)
  for (d = 0; d < Object.keys(dayData).length; d++){
    if (Object.keys(dayData)[d] != currentDay){
      var settings = daySettings[Object.keys(dayData)[d]]
      controls['whichDay'] = Object.keys(dayData)[d]
      // console.log(settings['hexSectors'])
      // console.log(d)
      controls['eventIndex'] = 0
      baboonSectors = settings['baboonSectors']
      baboonMoved = settings['baboonMoved']
      hexSectors =  settings['hexSectors']
      baboonHexes = dayData[controls['whichDay']]['state_dicts'][controls['eventIndex']];
      updateBaboonHexes();
      controls['eventIndex'] = Math.max(settings['eventIndex'] - 1,0)
      if (controls['eventIndex'] !== 0){
        updateBaboonHexes();
      }
    }
  }

  var settings = daySettings[currentDay]
  controls['whichDay'] = currentDay
  // console.log(settings['hexSectors'])
  controls['eventIndex'] = 0
  baboonSectors = settings['baboonSectors']
  baboonMoved = settings['baboonMoved']
  hexSectors =  settings['hexSectors']
  baboonHexes = dayData[controls['whichDay']]['state_dicts'][controls['eventIndex']];
  updateBaboonHexes();
  controls['eventIndex'] = Math.max(settings['eventIndex'] - 1,0)
  if (controls['eventIndex'] !== 0){
    updateBaboonHexes();
  }

  controls['eventIndexMin'] = settings['eventIndexMin']
  gui.prototype._controls.Transition.control.min = controls['eventIndexMin']

  controls['eventIndex'] = Math.max(settings['eventIndex'],1)
  gui.prototype._controls.Transition.setValue(controls['eventIndex'])
  // gui.prototype._controls.offset.setValue(0)
  
  controls['eventIndexMax'] = settings['eventIndexMax']
  gui.prototype._controls.Transition.control.max = controls['eventIndexMax']
  

  // updateBaboonHexes();
  
  // baboonSectors = settings['baboonSectors']
  // baboonMoved = settings['baboonMoved']
  // hexSectors =  settings['hexSectors']
  // baboonHexes = dayData[controls['whichDay']]['state_dicts'][controls['eventIndex']];
  

  
  // if (controls['eventIndex'] == 0){
  //   controls['eventIndex'] = 1
  //   gui.prototype._controls.Transition.setValue(controls['eventIndex'])
  // }

}



function newDay(){
  gui.prototype._controls.Play.setValue(false)
  daySettings[currentDay] = saveDaySettings()
  currentDay = controls['whichDay']

  var settings = daySettings[currentDay]

  controls['eventIndexMin'] = settings['eventIndexMin']
  gui.prototype._controls.Transition.control.min = controls['eventIndexMin']

  controls['eventIndex'] = settings['eventIndex']
  gui.prototype._controls.Transition.setValue(controls['eventIndex'])
  // gui.prototype._controls.offset.setValue(0)
  
  controls['eventIndexMax'] = settings['eventIndexMax']
  gui.prototype._controls.Transition.control.max = controls['eventIndexMax']

  // controls['windowMax'] = Math.ceil(controls['eventIndexMax'])+10
  // gui.prototype._controls.window.control.max = (controls['windowMax'])
  // gui.prototype._controls.window.setValue(controls['windowMax'])
  
  baboonMoved = settings['baboonMoved']
  baboonSectors = Object.fromEntries(baboons.map(x => [x, -1]));
  hexSectors = Object.fromEntries(Object.keys(dayData[controls['whichDay']]['hexes']).map(x => [x, [...Array(16).keys()]]));
  var targetIndex = Math.max(1, controls['eventIndex']);
  baboonHexes = dayData[controls['whichDay']]['state_dicts'][0];
  for (var i = 1; i <= targetIndex; i++) {
    controls['eventIndex'] = i;
    updateBaboonHexes();
  }
  controls['eventIndex'] = targetIndex;
  gui.prototype._controls.Transition.setValue(controls['eventIndex']);
  // gui.prototype._controls.Transition.setValue(1)
  // gui.prototype._controls.Transition.control.min = 1
  // gui.prototype._controls.offset.control.max = Math.min(controls['eventIndexMax'],controls['window'])

  // var element = document.getElementById("qs_1");
  // element.addEventListener('click', function(e) {
  //   console.log(controls['eventIndex'])
  // })
  // console.log(element)

}

function checkKeys(){
  // if (pressedKeys["a"] == true){
  //   gui.prototype._controls.Transition.control.min = Math.max(1,controls['eventIndexMin']-10)
  // }
  var smallStep = Math.ceil(dayLens[controls['whichDay']]/100)
  var step = smallStep
  if (pressedKeys[" "] == true){
    step = Math.ceil(dayLens[controls['whichDay']]/10)
  }
  if (pressedKeys["a"] == true){
    controls['eventIndexMin'] =  Math.max(1,controls['eventIndexMin']-step)
    gui.prototype._controls.Transition.control.min = controls['eventIndexMin']
    // console.log(controls['eventIndexMin'])
  }
  if (pressedKeys["s"] == true){
    controls['eventIndexMin'] = Math.min(controls['eventIndexMin']+step,controls['eventIndexMax']-smallStep)
    gui.prototype._controls.Transition.control.min = controls['eventIndexMin']
    // console.log(controls['eventIndexMin'])

    if (controls['eventIndex'] < controls['eventIndexMin']){
      controls['eventIndex'] = controls['eventIndexMin']
      gui.prototype._controls.Transition.setValue(controls['eventIndex'])
    }
  }

  if (pressedKeys["d"] == true){
    controls['eventIndexMax'] =  Math.max(controls['eventIndexMin']+smallStep,controls['eventIndexMax']-step)
    gui.prototype._controls.Transition.control.max = controls['eventIndexMax']
    // console.log(controls['eventIndexMax'])

    if (controls['eventIndex'] > controls['eventIndexMax']){
      controls['eventIndex'] = controls['eventIndexMax']
      gui.prototype._controls.Transition.setValue(controls['eventIndex'])
    }
  }
  if (pressedKeys["f"] == true){
    controls['eventIndexMax'] = Math.min(dayData[controls['whichDay']]["state_dicts"].length - 1,
                                         controls['eventIndexMax']+step)
    gui.prototype._controls.Transition.control.max = controls['eventIndexMax']
    // console.log(controls['eventIndexMax'])
  }


  if (pressedKeys["["] == true){
    controls['eventIndexMin'] = Math.min(controls['eventIndex'],controls['eventIndexMax']-smallStep)
    gui.prototype._controls.Transition.control.min = controls['eventIndexMin']
  }
  if (pressedKeys["]"] == true){
    controls['eventIndexMax'] = Math.max(controls['eventIndex'],controls['eventIndexMin']+smallStep)
    gui.prototype._controls.Transition.control.max = controls['eventIndexMax']
  }
}


function draw(){
  clear();
  background(95);
  // frameRate(controls['runSpeed']);
  // console.log(pressedKeys)
  checkKeys();


  // dayData = coarseGrainings[controls['lengthScale']][controls['timeScale']]
  if (lengthScale != controls['lengthScale'] | timeScale != controls['timeScale']){
    // console.log(lengthScale,timeScale,controls['lengthScale'],controls['timeScale'])
    var newData = coarseGrainings[controls['lengthScale']][controls['timeScale']]
    // console.log(newData)
    setTimeout(() => newCoarseGraining(newData),0);

    // loadCoarseGraining().then((newData) => setTimeout(() => newCoarseGraining(newData),2000));

    
  }
  
  if (currentDay != controls['whichDay']){newDay()};
  
  // if (controls['offset'] > controls['window']){
  //   gui.prototype._controls.offset.setValue(controls['window'])
  // }
  // console.log('error')
  updateBaboonHexes();
  // console.log('passed')
  drawHexagons(); // calls drawBaboons();

  if (controls['run'] == 1){
    if (controls['eventIndex'] < controls['eventIndexMax']){
      controls['eventIndex'] ++;
      gui.prototype._controls.Transition.setValue(controls['eventIndex'])
    } else{
      controls['run'] = 0
      gui.prototype._controls.Play.setValue(false)
    }
  }

  // keep all sliders in sync with controls state
  var _ws = gui.prototype._controls.windowStart, _we = gui.prototype._controls.windowEnd;
  var _ei = gui.prototype._controls.Transition;
  if (_ws && _we) {
    _ws.control.max = controls['eventIndex'];
    if (_ws.control.value != controls['eventIndexMin']) { _ws.setValue(controls['eventIndexMin']); }
    _we.control.min = controls['eventIndex'];
    _we.control.max = dayLens[controls['whichDay']];
    if (_we.control.value != controls['eventIndexMax']) { _we.setValue(controls['eventIndexMax']); }
  }
  if (_ei) {
    _ei.control.min = controls['eventIndexMin'];
    _ei.control.max = controls['eventIndexMax'];
    var clamped = Math.min(Math.max(controls['eventIndex'], controls['eventIndexMin']), controls['eventIndexMax']);
    if (clamped !== controls['eventIndex']) controls['eventIndex'] = clamped;
    if (_ei.control.value != controls['eventIndex']) { _ei.setValue(controls['eventIndex']); }
  }
}

function updateBaboonHexes(){
  var newHexes = dayData[controls['whichDay']]['state_dicts'][controls['eventIndex']]
  baboonMoved = Object.fromEntries(baboons.map( x => [x, baboonHexes[x] != newHexes[x]]));
  // console.log(newHexes,baboonMoved,controls['eventIndex'])
  for (var b = 0; b < baboons.length; b++){
    if (baboonSectors[baboons[b]] != -1 & baboonMoved[baboons[b]] == true){
      hexSectors[baboonHexes[baboons[b]]].push(baboonSectors[baboons[b]])
    }
  }

  for (var b = 0; b < baboons.length; b++){
    if (baboonMoved[baboons[b]] == true){
      if (newHexes[baboons[b]] == 'null'){
        baboonSectors[baboons[b]] = -1;

      }else{
        // console.log(newHexes[baboons[b]])
        // console.log(hexSectors)
        var min = Math.min(...hexSectors[newHexes[baboons[b]]]);
        baboonSectors[baboons[b]] = min;
        hexSectors[newHexes[baboons[b]]] = hexSectors[newHexes[baboons[b]]].filter(s => s != min);
      }
    }
  }

  baboonHexes = newHexes
  // dayData[controls['whichDay']]['grouped_states'][controls['eventIndex']].map(x => baboonHexes[x[0]] = x[2])
}

function collectStartHexes(){
  Object.entries(dayData[d]['hexes']).filter(([key,[x,y]]) => Math.sqrt(x*x + y*y) < 100).map(x => x[1])
}

// functions to draw Hexagonal tiles
function drawHexagons(){
  var baboonStates = drawEventGraph()
  noFill();
  stroke('#000000');

  // hexes = [...new Set(baboonStates.map(x => x[2]))].map(x => dayData[controls['whichDay']]["hexes"][x])
  var hexLocs = [...new Set(baboonStates.map(x => x[4]).concat(Object.values(dayData[controls['whichDay']]['state_dicts'][controls["eventIndexMin"]])))].map(x => dayData[controls['whichDay']]["hexes"][x]).filter(x => x[0] != null)//.map(key => hexes[key])

  if (controls['showHex'] == true){
    var earlyHex = Array.from(new Set(Object.keys(dayData).map(d => Object.entries(dayData[d]['hexes']).filter(([key,[x,y]]) => Math.sqrt(x*x + y*y) < 150).map(x => x[1])).flat().map(JSON.stringify)), JSON.parse)
    hexLocs = Array.from(new Set(hexLocs.concat(earlyHex).map(JSON.stringify)), JSON.parse)
  }
  var xLocs = hexLocs.map(x => x[0])
  var yLocs = hexLocs.map(y => y[1])
  var xBounds = [Math.min(...xLocs),Math.max(...xLocs)]
  var yBounds = [Math.min(...yLocs),Math.max(...yLocs)]

  var xMid = (xBounds[1] + xBounds[0])/2
  var yMid = (yBounds[1] + yBounds[0])/2
  var xWidth = (xBounds[1] - xBounds[0])+lengthScale
  var yHeight = (yBounds[1] - yBounds[0])+lengthScale*1.2
  
  

  var xScale = hexMapWidth/xWidth
  var yScale = .6*height/yHeight
  var reScale = Math.min(xScale,yScale)

  rectMode('center')
  rect(hexMapCenter,.31*height,
    hexMapWidth,
    .6*height)

  hexLocs.map(x => polygon(xScale*(x[0]- xMid)+hexMapCenter,
                           yScale*(yMid - x[1]) + .31*height,
                           lengthScale*.5*reScale));

  drawBaboons(xMid,yMid,xScale,yScale,reScale);
  // drawEventGraph()

}

function drawEventGraph(){
  noFill();
  stroke('#000000');
  rectMode('center')
  var graphHeight = .33*height
  rect(stateGraphCenter,.80*height,
    stateGraphWidth,
    graphHeight)
  // var allStates = dayData[controls['whichDay']]["all_states"]
  // [...Array(2*10+1).keys()].map(x => x-10+Math.max(10,92)).map(x => x - Math.max(0,10 + 92-100)).filter(x => x < 100).filter(x => x > -1)

  // var w = controls['window'];
  // var numStates = dayData[controls['whichDay']]["grouped_states"].length
  // var usedStates = [...Array(2*w+1).keys()].map(x => x-w+Math.max(w,
  //                   controls['eventIndex'])).map(x => x - Math.max(0,
  //                   w + controls['eventIndex']-numStates)).filter(x => x < numStates).filter(x => x > -1)
  // var usedStates = [...Array(w+1).keys()].map(x => x+
  //                   controls['eventIndex']).map(x => x - Math.max(0,
  //                   w + controls['eventIndex']-numStates)).filter(x => x < numStates).filter(x => x > -1)
  var usedStates = [...Array(1+controls['eventIndexMax']-controls['eventIndexMin']).keys()].map(x => x+controls['eventIndexMin'])
  
  var baboonStates = usedStates.flatMap(e => dayData[controls['whichDay']]["grouped_states"][e])
  // console.log(baboonStates)
  var firstState = baboonStates[0][2]
  var lastState = baboonStates[baboonStates["length"]-1][2]
  var xStep = (stateGraphWidth-10)/(lastState-firstState)
  
  textAlign(CENTER,CENTER);
  stroke('#000000');
  fill('#000000');
  if (controls['eventIndex'] > 0){
    var x = dayData[controls['whichDay']]["grouped_states"][controls['eventIndex']][0][2] 
    text(x,5+stateGraphCenter - stateGraphWidth/2 + (x - firstState)*xStep-.5, .80*height - graphHeight/2 - 10);
    line(5+stateGraphCenter - stateGraphWidth/2 + (x - firstState)*xStep-.5,
         .80*height + graphHeight/2,
         5+stateGraphCenter - stateGraphWidth/2 + (x - firstState)*xStep-.5,
         .80*height - graphHeight/2);
  }
  // console.log(baboonStates)
  var baboonYs = Object.fromEntries([...baboons.keys()].map( b => [baboons[b], .80*height + graphHeight/2 - (b+.5)*(graphHeight/baboons.length)]));
  baboonStates.map(e => drawEvent(baboonColors[e[0]],
                                  e[1],
                                  5+stateGraphCenter - stateGraphWidth/2 + (e[2]-firstState)*xStep,
                                  5+stateGraphCenter - stateGraphWidth/2 + (e[3]-firstState)*xStep,
                                  5+stateGraphCenter - stateGraphWidth/2 + (lastState-firstState)*xStep,
                                  baboonYs[e[0]],Math.min(Math.max(xStep,2),6)));
  
  textAlign(CENTER,CENTER);
  stroke('#000000');
  fill('#000000');
  for (var i = 0;i < 11;i++){
    text(firstState+Math.ceil(i*.1*(lastState-firstState)),5+stateGraphCenter - stateGraphWidth/2 + (Math.ceil(i*.1*(lastState-firstState))*xStep) , .80*height + graphHeight/2 + 12);
  }

  for (var b = 0;b < baboons.length;b++){
    stroke(baboonColors[baboons[b]]);
    fill(baboonColors[baboons[b]]);
    text(baboons[b],stateGraphCenter - stateGraphWidth/2 - 10, baboonYs[baboons[b]]);
  }


  return baboonStates;

}

function drawEvent(c,s,x1,x2,end,y,r){
  stroke(c);
  fill(c);
  rectMode(CENTER,CENTER);
  if (s == 0){
    line(x1-r/2-.5, y-r/2-.5, x1+r/2-.5, y+r/2-.5);
    line(x1-r/2-.5, y+r/2-.5, x1+r/2-.5, y-r/2-.5);

  } else if(s == 2){
    rect(x1-.5, y-.5, r,r);
    // square(x1,y,r*2);

  } else {
    ellipse(x1,y,r);
    line(x1-.5, y-.5, Math.min(x2,end)-.5, y-.5);
  }

}


//functions to draw Baboons on Hexagonal tiles
function drawBaboons(xMid,yMid,xScale,yScale,reScale){
  // var baboonIDs = Object.keys(baboonHexes);
  var baboonHEXs = Object.values(baboonHexes);
  // var hexCnts = Object.fromEntries(baboonHEXs.map( x => [x, 0]));

  for (var b = 0; b < baboons.length; b++){
    if (!isNaN(baboonHEXs[b])){
      stroke(baboonColors[baboons[b]]);
      fill(baboonColors[baboons[b]]);

      var locs = dayData[controls['whichDay']]['hexes'][baboonHEXs[b]]
      // console.log(b,locs)
      if (locs[0] != null){
        var x = xScale*(locs[0]- xMid)+hexMapCenter
        var y = yScale*(yMid - locs[1]) + .31*height 
        var sector = sectors[baboonSectors[baboons[b]]]
        // console.log(sectors,baboonSectors[baboons[b]])
        ellipse(x + lengthScale*.5*reScale*sector[0],
                y + lengthScale*.5*reScale*sector[1],
                lengthScale*.5*reScale*sector[2]);

        // textAlign(CENTER,CENTER);
        // stroke('#000000');
        // fill('#000000');
        // textSize(6)
        // // strokeWeight(.2);
        // text(baboons[b],x + lengthScale*.5*reScale*sector[0],
        //                 y + lengthScale*.5*reScale*sector[1])
        // textSize(12)

      }
      
      // hexCnts[baboonHEXs[b]]++;
    }
  }
}

function generateSectors(){
  var cnt = 0;
  sectors[cnt] = [0,0,.6];
  cnt++

  for (let a =  TWO_PI/12 ; a < TWO_PI; a += TWO_PI/6) {
    sectors[cnt] = [cos(a) * .6,sin(a) * .6,.6];
    cnt++
  }
  for (let a =  0 ; a < TWO_PI; a += TWO_PI/6) {
    sectors[cnt] = [cos(a) * .45,sin(a) * .45,.45];
    cnt++
  }

  for (let a =  0 ; a < TWO_PI; a += TWO_PI/6) {
    sectors[cnt] = [cos(a) * .7,sin(a) * .7,.25];
    cnt++
  }
}

function polygon(x, y, radius, npoints = 6) {
  let angle = TWO_PI / npoints;
  beginShape();
  for (let a = TWO_PI / 12 ; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius;
    let sy = y + sin(a) * radius;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}