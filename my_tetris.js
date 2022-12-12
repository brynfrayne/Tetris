// constants
let requestId;
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const LINES_PER_LEVEL = 10;
const LEVEL = {
    0: 800,
    1: 720,
    2: 630,
    3: 550,
    4: 470,
    5: 380,
    6: 300,
    7: 220,
    8: 130,
    9: 100,
    10: 80,
    11: 80,
    12: 80,
    13: 70,
    14: 70,
    15: 70,
    16: 50,
    17: 50,
    18: 50,
    19: 30,
    20: 30,
    // 29+ is 20ms
  }
const COLORS_obj = [
    {'I':'cyan'},
    {'J':'blue'},
    {'L':'orange'},
    {'O':'yellow'},
    {'S':'green'},
    {'T':'purple'},
    {'Z':'red'}
  ];
const COLORS = ['cyan', 'blue', 'orange', 'yellow', 'green', 'purple', 'red'];
const SHAPES = [
[[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // straight line
[[2, 0, 0], [2, 2, 2], [0, 0, 0]], // j line
[[0, 0, 3], [3, 3, 3], [0, 0, 0]], // l line
[[4, 4], [4, 4]], // o line(square)
[[0, 5, 5], [5, 5, 0], [0, 0, 0]], // s line
[[0, 6, 0], [6, 6, 6], [0, 0, 0]], // T line
[[7, 7, 0], [0, 7, 7], [0, 0, 0]] // z line
];
const POINTS = {
    SINGLE: 100,
    DOUBLE: 300,
    TRIPLE: 500,
    TETRIS: 800,
    SOFT_DROP: 1,
    HARD_DROP: 2
  }
const originalPieces = ['I', 'J','L','O','S','T','Z'];
const sortedPieces = ['I', 'J','L','O','S','T','Z'];
let isRunning = false;
const key_input = {
    esc: 27, // pause
    space: 32, // hard drop
    left: 37, // left
    up: 38, // rotate 90° clockwise
    right: 39, // right
    down: 40, // down
    p: 80, // dont thing p is anyting
    q: 81, // q not sure if its anyting
    c: 67, // hold
    x: 88, // rotate 90° clockwise
    shift: 16, // hold
    ctrl: 17, // rotate 90° counterclockwise
    z: 90, // rotate 90° counterclockwise
    f1: 112 // pause
}

// canvas for game board
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
// canvas for next piece
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
// canvas for hold piece
const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas.getContext('2d');

// Size canvas for main board
ctx.canvas.width = COLS * BLOCK_SIZE;
ctx.canvas.height = ROWS * BLOCK_SIZE;
ctx.scale(BLOCK_SIZE, BLOCK_SIZE);

// Size canvas for four blocks.
nextCtx.canvas.width = 4 * BLOCK_SIZE;
nextCtx.canvas.height = 4 * BLOCK_SIZE;
nextCtx.scale(BLOCK_SIZE, BLOCK_SIZE);

// Size canvas for four blocks.
holdCtx.canvas.width = 4 * BLOCK_SIZE;
holdCtx.canvas.height = 4 * BLOCK_SIZE;
holdCtx.scale(BLOCK_SIZE, BLOCK_SIZE);

const gameScore = document.getElementById('score');
const gameLines = document.getElementById('lines');
const gameLevel = document.getElementById('level');


const moves = {
    [key_input.left]: (p) => ({...p, x: p.x - 1}),
    [key_input.right]: (p) => ({...p, x: p.x + 1}),
    [key_input.down]: (p) => ({...p, y: p.y + 1}),
    [key_input.up]: (p) => board.rotate(p, 'right'),
    [key_input.q]: (p) => board.rotate(p, 'left'),
    [key_input.space]: (p) => ({...p, y: p.y + 1 }),
    [key_input.p]: () => isRunning = !isRunning,
    [key_input.esc]: () => cancelGame(),
    [key_input.shift]: () => holdPiece(),
    [key_input.c]: () => holdPiece()
};
let nextPiecesId = sevenBagGenerator();

let time = { start:0, elapsed: 0, level: 1000};

// board class
class Board{
    constructor(ctx, nextCtx, holdCtx) {
        this.ctx = ctx;
        this.nextCtx = nextCtx;
        this.holdCtx = holdCtx;
        this.grid = this.clearBoard();
        this.nextPieces = [];
        this.setNextPiece();
        this.setCurrentPiece();
        this.lookAhead = this.calculateLookAhead();
        this.accountValues = {
            score: 0,
            lines: 0,
            level: 1
          }
    }

    clearBoard() {
        return Array.from(
            {length: ROWS}, () => Array(COLS).fill(0)
        )
    }

    setNextPiece() {
        const { width, height } = this.nextCtx.canvas;
        this.nextPiece = new Piece(this.nextCtx);
        this.nextCtx.clearRect(0, 0, width, height);
        this.nextPiece.drawNextPiece();
    }

    setCurrentPiece() {
        this.piece = this.nextPiece;
        this.piece.ctx = this.ctx;
        this.piece.x = 3;
        this.setNextPiece();
    }

    setNewHoldPiece() {
        this.holdPiece = new Piece(holdCtx);
        const { width, height } = this.holdCtx.canvas;
        this.holdPiece.shape = this.piece.shape;
        this.holdPiece.color = this.piece.color;
        this.holdCtx.clearRect(0, 0, width, height);
    }

    swapCurrentAndHoldPiece() {
        let temp = this.holdPiece;
        this.holdPiece = new Piece(holdCtx);
        const { width, height } = this.holdCtx.canvas;
        this.holdPiece.shape = this.piece.shape;
        this.holdPiece.color = this.piece.color;
        this.holdCtx.clearRect(0, 0, width, height);

        this.piece  = temp;
        this.piece.ctx = this.ctx;
        this.piece.x = 3;
        this.piece.drawCurrentPiece();
    }

    draw() {
        this.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                this.ctx.lineWidth = .06375;
                this.ctx.strokeStyle = 'black';
                this.ctx.strokeRect(x,y,BLOCK_SIZE, BLOCK_SIZE)
                if (cell > 0) {
                    this.ctx.fillStyle = COLORS[cell -1]
                    this.ctx.fillRect(x, y, 1, 1);
                }
            })
        })
    }

    drop() {
        let p = moves[key_input.down](board.piece);
        if (this.validPosition(p)) {
            this.piece.move(p);
        } else {
            this.freeze();
            this.checkLines();
            if(this.piece.y === 0) {
                return false;
            }
            this.setCurrentPiece();
        }
        return true;
    }

    rotate(piece, direction) {
        console.log('were rotating')
        if (direction == 'right') {
            this.rotateRight(piece)
        }
        if (direction == 'left') {
            this.rotateLeft(piece);
        }
    }

    rotateRight(arr) {
        let resultArr = [];
        let i = 0;
        console.log(arr.shape)
        while (i < arr.shape[0].length){
            let newArr = [];
            resultArr.push(newArr);
            i++;
            }

        for (let row = arr.shape.length-1; row >= 0; row--){
            for (let column = 0; column < arr.shape[0].length; column++){
                resultArr[column].push(arr.shape[row][column])
            }
        }
        console.log(resultArr);
        arr.shape = resultArr;
        console.log(arr)
        return arr;
        }

    rotateLeft(arr) {
        let resultArr = [];
        let i = 0;
        while (i < arr.shape[0].length){
            let newArr = [];
            resultArr.push(newArr);
            i++;
            }

        for (let row = 0; row < arr.shape.length; row++){
            const reversedRow = arr.shape[row].reverse();
            for (let column = 0; column < arr.shape[0].length; column++){
                resultArr[column].push(reversedRow[column])
            }
        }
        arr.shape = resultArr;
        return arr;
        }

    validPosition(piece) {
        return piece.shape.every((row, dy) => {
            return row.every((cell, dx) => {
                let x = piece.x + dx
                let y = piece.y + dy

                return cell === 0 || this.inBoard(x, y) && this.isNotOccupied(x, y)
            })
        })
    }

    inBoard(x,y) {
        return (
            x >= 0 &&
            x < COLS &&
            y < ROWS
        )
    }

    isNotOccupied(x, y) {
        if (this.grid[y] && this.grid[y][x] === 0){
            return true
        }
        return false
    }

    freeze() {
        this.piece.shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell > 0) {
                    this.grid[y + this.piece.y][x + this.piece.x] = cell;
                    // index value y & x + the pieces coordinate equaling the cell's value work because this.piece is a fixed coordinate which corresponds to the top left coordinaet of the piece grid & so it adds x & y to that point for each piece block

                }
            })
        })
    }

    checkLines() {
        let lines = 0;
        this.grid.forEach((row, y) => {
            if (row.every(cell => cell > 0)) {
                lines ++;
                this.accountValues.lines ++;
                updateLevels();
                updateLines();
                // remove the row
                this.grid.splice(y, 1);
                // add zero filled row at th top
                this.grid.unshift(Array(COLS).fill(0));
            }
            if (lines > 0) {
                this.accountValues.score += this.getLineClearPoints(lines);
            }
        })
    }

    getLineClearPoints(lines) {
        const lineClearPoints =  lines === 1 ? POINTS.SINGLE :
               lines === 2 ? POINTS.DOUBLE :
               lines === 3 ? POINTS.TRIPLE :
               lines === 4 ? POINTS.TETRIS :
               0;
        return (this.accountValues.level) * lineClearPoints;
    }

    calculateLookAhead() {
        let initial_y = this.piece.y;
        this.piece.y = ROWS - 1;

        while (!this.validPosition(this.piece) && this.piece.y >= 0){
            this.piece.y --;
        }
        let temp = this.piece.y;
        this.piece.y = initial_y;
        return temp
    }
}

// tetromino class
class Piece {
    constructor(ctx) {
        this.ctx = ctx;
        let pieceId;
        if (nextPiecesId.length > 1) {
            pieceId = nextPiecesId.shift();
        } else {
            nextPiecesId = sevenBagGenerator();
            pieceId = nextPiecesId.shift();
        }
        this.shape = SHAPES[pieceId];
        this.color = COLORS[pieceId];
        this.holdCounter = 0;

        // starting position
        this.x = 3;
        this.y = 0;
    }

    drawCurrentPiece() {

        this.ctx.fillStyle = this.color;
        this.shape.forEach((row,y) => {
            row.forEach((cell, x) => {
                if (cell > 0) {
                    this.ctx.lineWidth = .06375
                    this.ctx.strokeStyle = 'black';
                    this.ctx.strokeRect(this.x + x, this.y + y,1,1)
                    this.ctx.fillRect(this.x + x, this.y + y, 1, 1);
                }
            })
        })
    }
    drawNextPiece() {
        this.ctx.fillStyle = this.color;
        this.shape.forEach((row,y) => {
            row.forEach((cell, x) => {
                if (cell > 0) {
                    this.ctx.lineWidth = .06375
                    this.ctx.strokeStyle = 'black';
                    this.ctx.strokeRect(x, y,1,1)
                    this.ctx.fillRect(x, y, 1, 1);
                }
            })
        })
    }
    drawLookAhead(aheadY) {
        const prevY = this.y;
        this.y = aheadY;
        this.shape.forEach((row, y) =>{
            row.forEach((cell, x) => {
                if (cell > 0) {
                    this.ctx.fillStyle = "#C0C0C0";
                    this.ctx.fillRect((this.x + x) * 1, (this.y + y ) * 1, 1, 1);
                    this.ctx.lineWidth = .06375;
                    this.ctx.strokeStyle = 'black';
                    this.ctx.strokeRect((this.x + x) * 1, (this.y + y ) * 1,1,1);
                }
            })
        })
        this.y = prevY;
    }

    move(piece_coordinate) {
        this.x = piece_coordinate.x;
        this.y = piece_coordinate.y;
    }


    randomizePieceType(numOfPieces) {
        return Math.floor(Math.random()* numOfPieces);
    }
}



function handleKeyPress(event) {
    event.preventDefault();
    if (moves[event.keyCode]) {
        let p = moves[event.keyCode](board.piece);
        if (event.keyCode === 37 || event.keyCode === 39 || event.keyCode === 40){
            if (board.validPosition(p)){
                board.piece.move(p);
                if (event.keyCode === 40) {
                    board.accountValues.score += POINTS.SOFT_DROP;
                    updateScore();
                }
            }
        }
        if (event.keyCode === 32) {
            while(board.validPosition(p)){
                board.piece.move(p);
                board.accountValues.score += POINTS.HARD_DROP;
                updateScore();
                p = moves[key_input.space](board.piece);
            }
        }
        if ((event.keyCode === 80 && isRunning) || (event.keyCode ===  key_input[f1] && isRunning)){
            isRunning = false;
        }
        if ((event.keyCode === 80 && !isRunning) || (event.keyCode ===  key_input[f1] && !isRunning)){
            isRunning = true;
            // animate();
            countdown(animate);
        }
        // console.log('end game keycode works without the following below?')
        // if (event.keyCode === 27) {
        //     console.log('game over')
        //     board.clearBoard();
        //     cancelAnimationFrame(requestId);
        //     ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        //     nextCtx.clearRect(0, 0,nextCtx.canvas.width,nextCtx.canvas.height);
        // }
        else {
            if (board.validPosition(board.piece)){
                board.piece.move(board.piece);
            }
        }
    }
}

function addEventListener() {
    document.removeEventListener('keydown',handleKeyPress);
    document.addEventListener('keydown',handleKeyPress);
}

function animate(now = 0) {
    time.elapsed = now - time.start;

    if (time.elapsed > time.level) {
        time.start = now;

        if (!board.drop()) {
            gameOver();
            return
        }
    }

    if (!isRunning) {
        ctx.fillStyle = 'black';
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillRect(1,3,8,1.2);
        ctx.font = '1px monospace';
        ctx.fillStyle = 'yellow';
        ctx.fillText('PAUSED....',1.8, 4);
        return
    }
    draw();
    requestId = requestAnimationFrame(animate);
}

function countdown(callbackFunc) {
    let timer = 3;
    let counter = 0;
    ctx.font = "4px monospace";
    ctx.fillStyle = "black";
     if (timer > 0) {
        counter = setInterval(() => {
            if (timer === 0) {
                callbackFunc();
                clearInterval(counter);
                return;
            }
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillText(timer, 4, 10);
            timer--;
        }, 1000)
    }
}

function play() {
    isRunning = true;
    board = new Board(ctx, nextCtx, holdCtx);
    updateScore();
    updateLevels();
    updateScore();
    addEventListener();

    // if we have an old game running hten cancel it
    if (requestId) {
        cancelAnimationFrame(requestId);
    }

    time.start = performance.now();
    animate();
}

function holdPiece() {

    // first check if the piece has already been swapped this iteration
    if (board.piece.holdCounter > 0){
        return;
    }
    console.log(board.piece.holdCounter)
    if (!board.holdPiece) {
        board.setNewHoldPiece();
        board.setCurrentPiece();
        board.piece.holdCounter ++;
        return;
    }

    board.swapCurrentAndHoldPiece();
    board.piece.holdCounter ++;

}

function updateScore() {
    gameScore.innerHTML = board.accountValues.score;
}

function updateLines() {
    gameLines.innerHTML = board.accountValues.lines;
}

function updateLevels() {
    if (board.accountValues.lines > LINES_PER_LEVEL) {
        board.accountValues.level ++;
        board.accountValues.lines -= LINES_PER_LEVEL;
        time.level = LEVEL[board.accountValues.level];
    }
    gameLevel.innerHTML = board.accountValues.level;
}

function gameOver() {
    cancelAnimationFrame(requestId);

    ctx.fillStyle = 'black';
    ctx.fillRect(1,3,8,1.2);
    ctx.font = '1px monospace';
    ctx.fillStyle = 'yellow';
    ctx.fillText('GAME OVER....',1.8, 4);
}

function draw() {

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    nextCtx.clearRect(0, 0,nextCtx.canvas.width,nextCtx.canvas.height);
    holdCtx.clearRect(0, 0,nextCtx.canvas.width,nextCtx.canvas.height);

    board.draw();
    board.piece.drawLookAhead(board.calculateLookAhead());
    board.piece.drawCurrentPiece();
    board.nextPiece.drawNextPiece();
    if (board.holdPiece) {
        board.holdPiece.drawNextPiece();
    }
}

function sevenBagGenerator() {
    let bag = [0,1,2,3,4,5,6];
    let result = [];
    while (bag.length > 0) {
        let randomIndex = Math.floor(Math.random() * bag.length);
        result.push(bag[randomIndex]);
        bag.splice(randomIndex, 1);
    }
    return result;
}



















// 7 bag randomizer
function randomSort() {
    return Math.random() > .5 ? -1 : 1;
}

// function sevenBagGenerator() {
//     // if current bag gets small enough, add the next bag to it, and pull a new next bag
//     console.log('were in the generator....')
//     let nextBag = sortedPieces.slice(0).sort(randomSort);
//     let currentBag = sortedPieces.slice(0).sort(randomSort);
//     console.log(nextBag)
//     console.log(currentBag)
//     currentPiece = currentBag[0];
//     currentBag.splice(0,1);

//     if (currentBag.length < 3) {
//         for (let i = 0; i < nextBag.length; i++ ) {
//             currentBag.push(nextBag[i]);
//         }
//     }
//     nextBag = sortedPieces.sort(randomSort);
//     return currentBag[0];
// }
function cancelGame() {
    // console.log("cancel the game!")
    console.log('game over')
    board.clearBoard();
    cancelAnimationFrame(requestId);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    nextCtx.clearRect(0, 0,nextCtx.canvas.width,nextCtx.canvas.height);
    holdCtx.clearRect(0, 0,nextCtx.canvas.width,nextCtx.canvas.height);
}



function pause() {
    // if (!requestId) {
    //     ctx.paused = true;
    //     timer();
    // }
    // cancelAnimationFrame(requestId);
    // requestId = null;

    // ctx.fillStyle = 'black';
    // ctx.fillRect(1, 3, 8, 1.2);
    // ctx.font = '1px Arial';
    // ctx.fillStyle = 'yellow';
    // ctx.fillText('PAUSED', 3, 4);
    // ctx.paused = true;
}
// const timer = document.getElementById('timer');

// function timer(e) {
//     if (requestId) {
//         pause();
//     } else {
//         let isPaused = ctx.paused;
//         if (!isPaused) {

//         }
//         let count = 3;
//         timer = count;
//         countdown();
//     }
// }

// function countdown() {
//     count --;
//     timer = count;
//     if (count <= 0) {
//         clearInterval(counter)
//         if (!isPaused) {
//             play();
//         } else {
//             ctx.paused = false;
//             timer = '';
//             animate();
//             return;
//         }
//         animate();
//         return;
//     }
// }

// !!!! ive implemented a pause feature and a game over feature
// !!!! the pause feature works but only if i include the f1 statement which draws an error????
// !!!! i could get the game over feature to work but only by creating a cancel game function and passing it in to the moves object

// !!!! next look at the qwasar mockup and continue implementing all key functionality!

