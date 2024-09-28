import {buildMaze} from './lib/main.js';
import {shapes} from './lib/shapes.js';
import {algorithms} from './lib/algorithms.js';
import {buildRandom} from './lib/random.js';
import {
    ALGORITHM_NONE, METADATA_MASKED, METADATA_END_CELL, METADATA_START_CELL, EVENT_CLICK, EXITS_NONE, EXITS_HARDEST, EXITS_HORIZONTAL, EXITS_VERTICAL,
    METADATA_PLAYER_CURRENT, METADATA_PLAYER_VISITED, METADATA_PATH, METADATA_VISITED,
    DIRECTION_NORTH, DIRECTION_SOUTH, DIRECTION_EAST, DIRECTION_WEST, DIRECTION_NORTH_WEST, DIRECTION_NORTH_EAST, DIRECTION_SOUTH_WEST, DIRECTION_SOUTH_EAST,
    DIRECTION_CLOCKWISE, DIRECTION_ANTICLOCKWISE, DIRECTION_INWARDS, DIRECTION_OUTWARDS,
    SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE
} from './lib/constants.js';
import {buildEventTarget} from './lib/utils.js';

// Import jsdom to simulate a browser environment
import { JSDOM } from 'jsdom';

// Set up jsdom to create a DOM-like environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const document = dom.window.document;

export const drawingSurfaces2 = {
    canvas(config) {
        const eventTarget = buildEventTarget('drawingSurfaces.canvas'),
            {el} = config,
            ctx = el.getContext('2d');


        function onClick(event) {
            eventTarget.trigger(EVENT_CLICK, {
                x: invXCoord(event.offsetX),
                y: invYCoord(event.offsetY),
                rawX: event.offsetX,
                rawY: event.offsetY,
                shift: event.shiftKey,
                alt: event.altKey
            });
        }
        el.addEventListener(EVENT_CLICK, onClick);

        let magnification = 1, xOffset, yOffset;
        function xCoord(x) {
            return xOffset + x * magnification;
        }
        function invXCoord(x) {
            return (x - xOffset) / magnification;
        }
        function yCoord(y) {
            return yOffset + y * magnification;
        }
        function invYCoord(y) {
            return (y - yOffset) / magnification;
        }
        function distance(d) {
            return d * magnification;
        }

        return {
            clear() {
                ctx.clearRect(0, 0, el.width, el.height);
            },
            setSpaceRequirements(requiredWidth, requiredHeight, shapeSpecificLineWidthAdjustment = 1) {
                const {width,height} = el,
                    GLOBAL_LINE_WIDTH_ADJUSTMENT = 0.1,
                    verticalLineWidth = height * GLOBAL_LINE_WIDTH_ADJUSTMENT * shapeSpecificLineWidthAdjustment / requiredHeight,
                    horizontalLineWidth = width * GLOBAL_LINE_WIDTH_ADJUSTMENT * shapeSpecificLineWidthAdjustment / requiredWidth,
                    lineWidth = Math.min(verticalLineWidth, horizontalLineWidth);

                magnification = Math.min((width - lineWidth)/requiredWidth, (height - lineWidth)/requiredHeight);
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                xOffset = lineWidth / 2;
                yOffset = lineWidth / 2;
            },
            setColour(colour) {
                ctx.strokeStyle = colour;
                ctx.fillStyle = colour;
            },
            line(x1, y1, x2, y2, existingPath = false) {
                existingPath || ctx.beginPath();
                ctx.moveTo(xCoord(x1), yCoord(y1));
                ctx.lineTo(xCoord(x2), yCoord(y2));
                existingPath || ctx.stroke();
            },
            arc(cx, cy, r, startAngle, endAngle, counterclockwise = false, existingPath = false) {
                existingPath || ctx.beginPath();
                ctx.arc(xCoord(cx), yCoord(cy), distance(r), startAngle - Math.PI / 2, endAngle - Math.PI / 2, counterclockwise);
                existingPath || ctx.stroke();
            },
            fillPolygon(...xyPoints) {
                ctx.beginPath();
                xyPoints.forEach(({x,y}, i) => {
                    if (i) {
                        ctx.lineTo(xCoord(x), yCoord(y));
                    } else {
                        ctx.moveTo(xCoord(x), yCoord(y));
                    }
                });
                ctx.closePath();
                ctx.fill();
            },
            fillSegment(cx, cy, smallR, bigR, startAngle, endAngle) {
                const
                    innerStartX = cx + smallR * Math.sin(startAngle),
                    innerStartY = cy - smallR * Math.cos(startAngle),
                    innerEndX = cx + smallR * Math.sin(endAngle),
                    innerEndY = cy - smallR * Math.cos(endAngle),
                    outerStartX = cx + bigR * Math.sin(startAngle),
                    outerStartY = cy - bigR * Math.cos(startAngle),
                    outerEndX = cx + bigR * Math.sin(endAngle),
                    outerEndY = cy - bigR * Math.cos(endAngle);
                ctx.beginPath();
                this.line(innerStartX, innerStartY, outerStartX, outerStartY, true);
                this.arc(cx, cy, bigR, startAngle, endAngle, false, true);
                this.line(outerEndX, outerEndY, innerEndX, innerEndY, true);
                this.arc(cx, cy, smallR, endAngle, startAngle, true, true);
                ctx.closePath();
                ctx.fill();
            },
            convertCoords(x, y) {
                return [xCoord(x), yCoord(y)];
            },
            on(eventName, handler) {
                eventTarget.on(eventName, handler);
            },
            dispose() {
                eventTarget.off();
                el.removeEventListener(EVENT_CLICK, onClick);
            }
        };
    },
    svg(config) {
        const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
        const eventTarget = buildEventTarget('drawingSurfaces.svg'),
            {el} = config,
            width = Number(el.getAttribute('width')),
            height = Number(el.getAttribute('height'));

        el.addEventListener(EVENT_CLICK, event => {
            eventTarget.trigger(EVENT_CLICK, {
                x: invXCoord(event.offsetX),
                y: invYCoord(event.offsetY),
                shift: event.shiftKey,
                alt: event.altKey
            });
        });

        let magnification = 1, colour='black', lineWidth, xOffset, yOffset;
        function xCoord(x) {
            return xOffset + x * magnification;
        }
        function invXCoord(x) {
            return (x - xOffset) / magnification;
        }
        function yCoord(y) {
            return yOffset + y * magnification;
        }
        function invYCoord(y) {
            return (y - yOffset) / magnification;
        }
        function distance(d) {
            return d * magnification;
        }

        function polarToXy(cx, cy, d, angle) {
            return [xCoord(cx + d * Math.sin(angle)), yCoord(cy - d * Math.cos(angle))];
        }

        return {
            clear() {
                el.innerHTML = '';
            },
            setSpaceRequirements(requiredWidth, requiredHeight, shapeSpecificLineWidthAdjustment = 1) {
                const GLOBAL_LINE_WIDTH_ADJUSTMENT = 0.1,
                    verticalLineWidth = height * GLOBAL_LINE_WIDTH_ADJUSTMENT * shapeSpecificLineWidthAdjustment / requiredHeight,
                    horizontalLineWidth = width * GLOBAL_LINE_WIDTH_ADJUSTMENT * shapeSpecificLineWidthAdjustment / requiredWidth;

                lineWidth = Math.min(verticalLineWidth, horizontalLineWidth);
                magnification = Math.min((width - lineWidth)/requiredWidth, (height - lineWidth)/requiredHeight);
                xOffset = lineWidth / 2;
                yOffset = lineWidth / 2;

            },
            setColour(newColour) {
                colour = newColour;
            },
            line(x1, y1, x2, y2) {
                const elLine = document.createElementNS(SVG_NAMESPACE, 'line');
                elLine.setAttribute('x1', xCoord(x1));
                elLine.setAttribute('y1', yCoord(y1));
                elLine.setAttribute('x2', xCoord(x2));
                elLine.setAttribute('y2', yCoord(y2));
                elLine.setAttribute('stroke', colour);
                elLine.setAttribute('stroke-width', lineWidth);
                elLine.setAttribute('stroke-linecap', 'round');
                el.appendChild(elLine);
            },
            fillPolygon(...xyPoints) {
                const elLine = document.createElementNS(SVG_NAMESPACE, 'polygon'),
                    coordPairs = [];
                xyPoints.forEach(({x,y}, i) => {
                    coordPairs.push(`${xCoord(x)},${yCoord(y)}`);
                });
                elLine.setAttribute('points', coordPairs.join(' '));
                elLine.setAttribute('fill', colour);
                el.appendChild(elLine);
            },
            fillSegment(cx, cy, smallR, bigR, startAngle, endAngle) {
                const isCircle = (endAngle - startAngle === Math.PI * 2);

                if (isCircle) {
                    const elCircle = document.createElementNS(SVG_NAMESPACE, 'circle');
                    elCircle.setAttribute('cx', xCoord(cx));
                    elCircle.setAttribute('cy', yCoord(cy));
                    elCircle.setAttribute('r', distance(bigR - smallR));
                    elCircle.setAttribute('fill', colour);
                    el.appendChild(elCircle);

                } else {
                    const
                        innerStartX = xCoord(cx + smallR * Math.sin(startAngle)),
                        innerStartY = yCoord(cy - smallR * Math.cos(startAngle)),
                        innerEndX = xCoord(cx + smallR * Math.sin(endAngle)),
                        innerEndY = yCoord(cy - smallR * Math.cos(endAngle)),
                        outerStartX = xCoord(cx + bigR * Math.sin(startAngle)),
                        outerStartY = yCoord(cy - bigR * Math.cos(startAngle)),
                        outerEndX = xCoord(cx + bigR * Math.sin(endAngle)),
                        outerEndY = yCoord(cy - bigR * Math.cos(endAngle)),
                        isLargeArc = endAngle - startAngle > Math.PI / 2,
                        elPath = document.createElementNS(SVG_NAMESPACE, 'path'),
                        d = `        
                            M ${innerStartX} ${innerStartY} ${outerStartX} ${outerStartY}
                            A ${distance(bigR)} ${distance(bigR)} 0 ${isLargeArc ? "1" : "0"} 1 ${outerEndX} ${outerEndY}
                            L ${innerEndX} ${innerEndY}
                            A ${distance(smallR)} ${distance(smallR)} 0 ${isLargeArc ? "1" : "0"} 0 ${innerStartX} ${innerStartY}
                        `;
                    elPath.setAttribute('fill', colour);
                    elPath.setAttribute('d', d);
                    el.appendChild(elPath);
                }
            },
            arc(cx, cy, r, startAngle, endAngle) {
                const [startX, startY] = polarToXy(cx, cy, r, startAngle),
                    [endX, endY] = polarToXy(cx, cy, r, endAngle),
                    radius = distance(r),
                    isLargeArc = endAngle - startAngle > Math.PI/2,
                    d = `M ${startX} ${startY} A ${radius} ${radius} 0 ${isLargeArc ? "1" : "0"} 1 ${endX} ${endY}`,
                    elPath = document.createElementNS(SVG_NAMESPACE, 'path');
                elPath.setAttribute('d', d);
                elPath.setAttribute('fill', 'none');
                elPath.setAttribute('stroke', colour);
                elPath.setAttribute('stroke-width', lineWidth);
                elPath.setAttribute('stroke-linecap', 'round');
                el.appendChild(elPath);
            },
            convertCoords(x, y) {
                return [xCoord(x), yCoord(y)];
            },
            on(eventName, handler) {
                eventTarget.on(eventName, handler);
            },
            dispose() {
                eventTarget.off();
            }
        };
    }
}

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

export function BuildCustomMaze(width = 10, height = 10, alo = 'recursiveBacktrack'){
    console.log("start on windows load");

    const model = buildModel();

    if (model.maze) {
        model.maze.dispose();
    }

    const SVG_SIZE = 500;

    const elSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    elSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    elSvg.setAttribute('width', SVG_SIZE);
    elSvg.setAttribute('height', SVG_SIZE)


    model.algorithm = alo;
    model.size = {
        width: width,
        height: height,
        layers: width
    };

    const grid = Object.assign({'cellShape': model.shape}, model.size);

    const maze = buildMaze({
        grid,
        'algorithm':  model.algorithm,
        'randomSeed' : model.randomSeed,
        'element': elSvg,
        'mask': [],
        'exitConfig': model.exitConfig
    });

    maze.runAlgorithm.toCompletion();

    model.maze = maze;

    function getSvgString(svgEl) {
        return svgEl.outerHTML;
    }

    const svgDrawingSurface = drawingSurfaces2.svg({el: elSvg}),
        fileName = `maze_${model.shape}_${Object.values(model.size).join('_')}_${model.randomSeed}.svg`;


        let startCell, endCell;
        model.maze.forEachCell(cell => {
            if (cell.metadata[METADATA_START_CELL]) {
                startCell = cell;
            }
            if (cell.metadata[METADATA_END_CELL]) {
                endCell = cell;
            }
        });

    console.assert(startCell);
    console.assert(endCell);
    model.maze.findPathBetween(startCell.coords, endCell.coords);

    model.maze.render(svgDrawingSurface);

    const svgString = getSvgString(elSvg);
    return svgString
}