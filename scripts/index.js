import {
  canvas,
  ctx,
  options,
  session
} from './init.js';

// MAIN FUNCTIONS

const fromRGBtoHEX = (color) => {
  let colors = color.map((el) => {
    el = el.toString(16);
    if (el.length === 1) {
      el = `0${el}`;
    }
    return el;
  });
  return `#${colors[0]}${colors[1]}${colors[2]}`
}

const fromHEXtoRGB = (color) => {
  let arr = [];
  arr[0] = color.substring(1, 3);
  arr[1] = color.substring(3, 5);
  arr[2] = color.substring(5, 7);
  arr = arr.map(el => {
    el = parseInt(el, 16);
    return el;
  });
  return arr;
}

const fromObjToHex = (obj) => {
  return fromRGBtoHEX([obj.r, obj.g, obj.b]);
}

const fromHexToObj = (hex) => {
  let rgb = fromHEXtoRGB(hex);
  const res = {
    r: rgb[0],
    g: rgb[1],
    b: rgb[2]
  };
  return res;
}

const fromHexToObjArr = (arr) => {
  return arr.map(str => {
    str = str.map(el => {
      return fromHexToObj(el)
    });
    return str;
  });
}

const fromObjToHexArr = (arr) => {
  return arr.map(str => {
    str = str.map(el => {
      return fromObjToHex(el)
    });
    return str;
  });
}

const sum = (arr) => {
  let res = 0;
  let length = arr.length;
  for (let i = 0; i < length; i++) {
    res += arr[i];
  };
  return res;
}

const drawsquare = (x, y, color) => {
  let colorer;
  if (color) {
    const isRGB = Array.isArray(color);
    if (isRGB) {
      colorer = fromRGBtoHEX(color);
    } else if (color[0] !== '#') {
      colorer = `#${color}`;
    } else {
      colorer = color;
    }
  } else {
    colorer = session.activeColor;
  }
  session.currentField[x][y] = colorer;
  const size = options.squareSize;
  ctx.fillStyle = colorer;
  ctx.fillRect(x * size, y * size, size, size);
};

const saveCurrentState = () => {
  if ((session.currentField.length > 1) && (session.photo === false)) {
    session.savedFields[options.size] = JSON.parse(JSON.stringify(session.currentField));
  }
};

const changeSize = (size) => {
  options.size = size;
  options.squareSize = options.FIELD_SIZE / options.size;
  session.currentField = new Array(options.size);
  for (let i = 0; i < options.size; i += 1) {
    session.currentField[i] = new Array(options.size);
  }
};

const drawImage = (instructions) => {
  for (let i = 0; i < options.size; i += 1) {
    for (let j = 0; j < options.size; j += 1) {
      drawsquare(i, j, instructions[i][j]);
    }
  }
};



const getMtxFromArr = (arr, length, height) => {
  let z = 0;
  let res = new Array(height);
  for (let i = 0; i < height; i++) {
    res[i] = new Array(length);
  }
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < length; j++, z++) {
      res[j][i] = arr[z];
    }
  }
  return res;
}

const shrinkPxInstructionsMtx = (instructions, pixelSize) => {
  let length = instructions[0].length;
  let nextLength = length / pixelSize;
  let newArr = new Array(nextLength);
  let newPixel = {};
  let line = 0;
  for (let i = 0; i < length; i += pixelSize, line += 1) {
    newArr[line] = [];
    for (let j = 0; j < length; j += pixelSize) {
      newPixel = {
        r: 0,
        g: 0,
        b: 0
      }
      for (let z = 0; z < pixelSize; z++) {
        for (let d = 0; d < pixelSize; d++) {
          newPixel.r += instructions[i + z][j + d].r;
          newPixel.g += instructions[i + z][j + d].g;
          newPixel.b += instructions[i + z][j + d].b;
        }
      }

      const ss = pixelSize * pixelSize;
      newPixel.r = Math.floor(newPixel.r / ss);
      newPixel.g = Math.floor(newPixel.g / ss);
      newPixel.b = Math.floor(newPixel.b / ss);
      newArr[line].push(newPixel);
    }
  }
  return newArr;
}

const getInstructionsFromImg = (img) => {
  let res = [];
  let pixel = {};
  let data = [];
  ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, options.FIELD_SIZE, options.FIELD_SIZE);
  data = ctx.getImageData(0, 0, options.FIELD_SIZE, options.FIELD_SIZE).data;
  for (let i = 0; i < data.length; i += 4) {
    pixel = {
      r: data[i],
      g: data[i + 1],
      b: data[i + 2]
    };
    res.push(pixel);
  }
  return getMtxFromArr(res, options.FIELD_SIZE, options.FIELD_SIZE);
}

const drawPhoto = (fieldSize, photoSource) => {
  if (session.newPhoto === true) {
    const fileSource = photoSource ? photoSource : options.basicInstructions['photo'];
    const img = new Image();
    img.setAttribute('crossOrigin', '');
    let drawData = [];
    let pixeledData = [];
    img.src = `${fileSource}`;
    img.onload = () => {
      pixeledData = getInstructionsFromImg(img);
      drawData = fromObjToHexArr(pixeledData);
      session.savedFields['photo'] = drawData;
      session.newPhoto = false;
      drawPhoto(fieldSize);
      session.pixelSize = 1;
    };
  } else {
    const pixelSize = options.FIELD_SIZE / fieldSize;
    session.pixelSize = pixelSize;
    if (pixelSize === 1) {
      drawImage(session.savedFields['photo']);
    } else {
      let pixeledInstructions = shrinkPxInstructionsMtx(fromHexToObjArr(session.savedFields['photo']), pixelSize);
      drawImage(fromObjToHexArr(pixeledInstructions));
    }
  }
};

const changeField = (value, isPhoto) => {
  if (isPhoto) {
    changeSize(value);
    drawPhoto(value);
  } else {
    saveCurrentState();
    changeSize(value);
    const instructions = session.savedFields[value] ?
      session.savedFields[value] :
      options.basicInstructions[value];
    drawImage(instructions);
  }
};

const bucketIt = (replacedColor, x, y) => {
  
  if (session.currentField[x][y] === replacedColor) {
    if (session.pixelSize > 1) {
      let pxs = session.pixelSize;
      for (let i = 0; i < pxs; i++) {
        for (let j = 0; j < pxs; j++) {
          session.savedFields['photo'][x * pxs + i][y * pxs + j] = session.activeColor;
        }
      }
    }
    session.currentField[x][y] = session.activeColor;
    if (x > 0) {
      bucketIt(replacedColor, x - 1, y);
    }
    if (x < options.size - 1) {
      bucketIt(replacedColor, x + 1, y);
    }
    if (y > 0) {
      bucketIt(replacedColor, x, y - 1);
    }
    if (y < options.size - 1) {
      bucketIt(replacedColor, x, y + 1);
    }
  }
};

const notify = (text) => {
  document.querySelector('.notify-box').classList.add('active');
  clearTimeout(session.notifyTimer);
  document.querySelector('#notifyText').innerHTML = text;
  session.notifyTimer = setTimeout(() => {
    document.querySelector('.notify-box').classList.remove('active');
    document.querySelector('#notifyText').innerHTML = '';
  }, 4000);
};

const onField = (event) => {
  if (!session.drawing) return;
  const x = event.offsetX; // px from canvas
  const y = event.offsetY;
  const sqX = Math.floor(x / options.squareSize); // index of square
  const sqY = Math.floor(y / options.squareSize);
  if (session.pencil) {
    const cond1 = x < session.limits[0][0];
    const cond2 = x > session.limits[0][1];
    const cond3 = y < session.limits[1][0];
    const cond4 = y > session.limits[1][1];
    if (cond1 || cond2 || cond3 || cond4) {
      const X = sqX * options.squareSize;
      const Y = sqY * options.squareSize;
      session.limits[0] = [X, X + options.squareSize];
      session.limits[1] = [Y, Y + options.squareSize];
      drawsquare(sqX, sqY);
        if (session.pixelSize > 1) {
          let pxs = session.pixelSize;
          for (let i = 0; i < pxs; i++) {
            for (let j = 0; j < pxs; j++) {
              session.savedFields['photo'][sqX * pxs + i][sqY * pxs + j] = session.activeColor;
            }
          }
        }
    }
  } else if (session.bucket) {
    const current = session.currentField[sqX][sqY];
    const active = session.activeColor;
    if (current === active) return;

    bucketIt(current, sqX, sqY);
    drawImage(session.currentField);
  } else if (session.colorPicker) {
    session.activeColor = session.currentField[sqX][sqY];
    const span = `<div class="notify-color" style="background-color:${session.activeColor};"></div>`;
    notify(`color ${span} selected`);
  }
};

const initCanvas = () => {
  canvas.width = options.FIELD_SIZE;
  canvas.height = options.FIELD_SIZE;
  changeField(options.size,session.photo);

  canvas.addEventListener('mousemove', onField);
  canvas.addEventListener('mousedown', (e) => {
    session.drawing = true;
    onField(e);
  });
  canvas.addEventListener('mouseup', () => {
    session.drawing = false;
    session.limits = [
      [-1, -1],
      [-1, -1],
    ];
  });
  canvas.addEventListener('mouseout', () => {
    session.drawing = false;
    session.limits = [
      [-1, -1],
      [-1, -1],
    ];
  });
};


// COMMON

const getLines = (idSelector) => [...document.querySelector(idSelector).childNodes].filter((el) => el.tagName === 'DIV');

const clearLines = (lines) => {
  lines.map((el) => el.classList.remove('checked'));
};

// PHOTO SEARCH

async function getNewPhoto(city) {
  const url = `https://api.unsplash.com/photos/random?query=town,${city ? city : 'Minsk'}&client_id=${options.client_id}`;
  let response = await fetch(url);
  let res = await response.json();

  const photoSource = res.urls.small;
  session.newPhoto = true;
  session.grayScaled = false;

  drawPhoto(options.size, photoSource);
}

// SIZES

const sizes = getLines('#size');
sizes.push(...getLines('#photoSize'));

const checkSizeLine = (el, prop, isPhoto) => {
  if (isPhoto) { // photo
    changeField(prop, true);
  } else {
    changeField(prop, false);
  }
  clearLines(sizes);
  el.classList.add('checked');
};

const initSizes = () => {

  sizes.forEach((el) => {
    if (el.classList.contains('static') === false) {
      el.addEventListener('click', () => {
        checkSizeLine(el, el.dataset.num, (el.dataset['photo']));
      });
    }
  });

  const cityInput = document.querySelector('#city');
  const searcher = document.querySelector('#searcher');

  searcher.addEventListener('click', () => {
    getNewPhoto(cityInput.value);
  })
};

// COLORS

const initColors = () => {
  const colors = getLines('#color');
  const inpColors = colors.map((e) => ([...e.childNodes].filter((el) => el.tagName === 'INPUT'))[0]);


  const grayScaling = (arr) => {
    const avg = Math.floor(sum(arr) / arr.length);
    arr = arr.map(el => avg);
    return arr;
  }

  const makeGray = () => {
    if (session.isImage === false) {
    let def = session.currentField;
    let gray = def.map(line => {
      return line.map(el => {
        return fromRGBtoHEX(grayScaling(fromHEXtoRGB(el)));
      })
    })

    session.current = gray;
    
    drawImage(session.current);
    } else {
      let def = session.savedFields['photo'];
      let gray = def.map(line => {
        return line.map(el => {
          return fromRGBtoHEX(grayScaling(fromHEXtoRGB(el)));
        })
      })
      session.savedFields['photo'] = JSON.parse(JSON.stringify(gray));
      drawPhoto(options.size);
    }
  }

  const gray = document.querySelector('#gray');
  gray.addEventListener('click', () => {
    makeGray();
  })

  const setBgColor = (el) => {
    el.style.backgroundColor = el.value;
  };

  const colorPick = (event) => {
    if (event.target === inpColors[0]) {
      inpColors[1].value = session.currentColor;
      setBgColor(inpColors[1]);
      setBgColor(event.target);
      session.previousColor = session.currentColor;
      session.currentColor = event.target.value;
    } else if (event.target === inpColors[1]) {
      setBgColor(event.target);
      session.previousColor = event.target.value;
    } else {
      setBgColor(event.target);
    }
  };

  const setColor = (color) => {
    session.activeColor = color;
  };

  const chooseColor = (el) => {
    clearLines(colors);
    el.classList.add('checked');
    setColor(el.childNodes[1].value);
  };


  inpColors.forEach((el) => {
    setBgColor(el);
    el.addEventListener('change', (e) => {
      colorPick(e);
      setColor(el.value);
    });
  });

  colors.forEach((el) => {
    el.addEventListener('click', () => {
      chooseColor(el);
    });
  });
};


// TOOLS


const initTools = () => {
  const tools = getLines('#tool');
  const save = document.getElementById('save');

  const globalSave = () => {
    saveCurrentState();
    if (!localStorage) {
      localStorage = {};
    }
    localStorage.size = options.size;
    localStorage.currentField = JSON.stringify(session.currentField);
    localStorage.savedFields = JSON.stringify(session.savedFields);
    localStorage.newPhoto = session.newPhoto ? 1 : '';
    localStorage.grayScaled = session.grayScaled ? 1 : '';
    localStorage.pixelSize = session.pixelSize;
    localStorage.photo = session.photo ? 1 : '';
    notify('Saved');
  };

  const deactivateAll = () => {
    session.pencil = false;
    session.bucket = false;
  };

  const checkLine = (el) => {
    deactivateAll();
    clearLines(tools);
    el.classList.add('checked');
  };

  tools.forEach((el) => {
    if (el.id !== 'save') {
      el.addEventListener('click', () => {
        checkLine(el);
        session[el.id] = true;
      });
    }
  });

  document.querySelector('body').addEventListener('keypress', (e) => {
    let selector;
    switch (e.code) {
      case 'KeyB':
        selector = '#bucket';
        break;
      case 'KeyP':
        selector = '#pencil';
        break;
      case 'KeyC':
        selector = '#colorPicker';
        break;
      default:
        break;
    }
    if (selector) {
      const el = document.querySelector(selector);
      checkLine(el);
      session[el.id] = true;
    }
  });

  save.onclick = globalSave;
};


// INIT

const init = () => {
  const loadFromStorage = () => {
    const haveSaves = (localStorage.currentField);
    if (haveSaves) {
      session.savedFields = JSON.parse(localStorage.savedFields);
      session.newPhoto = !!(localStorage.newPhoto);
      session.grayScaled = !!(localStorage.grayScaled);
      session.photo = !!(localStorage.photo);
    }
    options.size = (localStorage.size) ? localStorage.size : 4;
    document.querySelector(`#size${options.size}`).classList.add('checked');
  };
  loadFromStorage();
  initCanvas();
  initSizes();
  initColors();
  initTools();

  const sideController = document.querySelector('.side-control');
  const toolController = document.querySelector('.tool-control');
  const siders = document.querySelectorAll('.side');
  if (session.photo === true){
    siders.forEach(el => {
      el.classList.toggle('hidden');
    });
  }
  const tools = document.querySelector('.tools');
  sideController.addEventListener('click', () => {
    siders.forEach(el => {
      el.classList.toggle('hidden');
      if (el.classList.contains('hidden') === false) {
        let divarr = [...([...el.childNodes].filter(el => el.tagName === 'DIV'))[0].childNodes].filter(el => el.tagName == 'DIV');
        let last = divarr[divarr.length - 1];
        checkSizeLine(last, last.dataset.num, (last.dataset['photo']));
      }
    });
    session.photo = !session.photo;
  });
  toolController.addEventListener('click', () => {
    tools.classList.toggle('hidden');
  })
};

init();