import {buildMaze} from './lib/main.js';
import {shapes} from './lib/shapes.js';
import {drawingSurfaces} from './lib/drawingSurfaces.js';
import {algorithms} from './lib/algorithms.js';
import {buildRandom} from './lib/random.js';
import {
    ALGORITHM_NONE, METADATA_MASKED, METADATA_END_CELL, METADATA_START_CELL, EVENT_CLICK, EXITS_NONE, EXITS_HARDEST, EXITS_HORIZONTAL, EXITS_VERTICAL,
    METADATA_PLAYER_CURRENT, METADATA_PLAYER_VISITED, METADATA_PATH, METADATA_VISITED,
    DIRECTION_NORTH, DIRECTION_SOUTH, DIRECTION_EAST, DIRECTION_WEST, DIRECTION_NORTH_WEST, DIRECTION_NORTH_EAST, DIRECTION_SOUTH_WEST, DIRECTION_SOUTH_EAST,
    DIRECTION_CLOCKWISE, DIRECTION_ANTICLOCKWISE, DIRECTION_INWARDS, DIRECTION_OUTWARDS,
    SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE
} from './lib/constants.js';

function buildModel() {
    const model = {
        shape: 'square',
        algorithm: 'recursiveBacktrack',
        randomSeed: '',
        mask: {},
        exitConfig: 'horizontal',
        algorithmDelay: 0,
    };

    return model;
}

export function BuildCustomMaze(){
    console.log("start on windows load");

    const model = buildModel();

    if (model.maze) {
        model.maze.dispose();
    }

    const SVG_SIZE = 500,
        elSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    elSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    elSvg.setAttribute('width', SVG_SIZE);
    elSvg.setAttribute('height', SVG_SIZE);

    model.size = {};
    model.size['width'] = 10;
    model.size['height'] = 10;
    model.size['layers'] = 10;

    const grid = Object.assign({'cellShape': model.shape}, model.size);

    const maze = buildMaze({
        grid,
        'algorithm':  model.algorithm,
        'randomSeed' : model.randomSeed,
        'element': elSvg,
        'mask': [],
        'exitConfig': model.exitConfig
    });

    model.maze = maze;

    maze.runAlgorithm.toCompletion();
    //maze.render();

    function getSvgString(svgEl) {
        const svgData = svgEl.outerHTML;
        return svgData;
    }

    const svgDrawingSurface = drawingSurfaces.svg({el: elSvg}),
        fileName = `maze_${model.shape}_${Object.values(model.size).join('_')}_${model.randomSeed}.svg`;
    model.maze.render(svgDrawingSurface);

    const svgString = getSvgString(elSvg);
    return svgString
}

window.onload = () => {

    console.log(BuildCustomMaze());
    return Promise.resolve();
}