// constants
let requestId;
const COLS = 10;
const ROWS = 40;
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
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // cyan
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]], // blue
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]], // orange
    [[4, 4], [4, 4]], // yellow
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // green
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]], // purple
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]] // red
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
let gameStarted = false;
const key_input = {
    esc: 27, // gameover
    space: 32, // hard drop
    left: 37, // left
    up: 38, // rotate 90° clockwise
    right: 39, // right
    down: 40, // down
    p: 80, // ppause
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

// background music
const audioElement = document.querySelector('audio');

// audio files
const clear = new Audio('./assets/audio/se_game_single.wav'); // implemented
const rotate = new Audio('./assets/audio/se_game_rotate.wav'); // implemented
const end = new Audio('./assets/audio/end.wav'); // implemented
const hardDrop = new Audio('./assets/audio/se_game_harddrop.wav'); // implemented
const hold = new Audio('./assets/audio/se_game_hold.wav'); // implemented
const softdrop = new Audio('./assets/audio/se_game_softdrop.wav'); // implemented
const pause = new Audio('./assets/audio/se_game_pause.wav');
const move = new Audio('./assets/audio/se_game_move.wav');
const fall = new Audio('./assets/audio/se_game_fixa.wav');

// Size canvas for main board
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
    [key_input.up]: (p) => ({...p, shape: board.rotate(p, 'right').shape}),
    [key_input.ctrl]: (p) => ({...p, shape: board.rotate(p, 'left').shape}),
    [key_input.z]: (p) => ({...p, shape: board.rotate(p, 'left').shape}),
    [key_input.space]: (p) => ({...p, y: p.y + 1 }),
    [key_input.p]: () => isRunning = !isRunning,
    [key_input.f1]: () => isRunning = !isRunning,
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
        this.ctx.translate(0, -20);

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
            if(this.piece.y === 20) {
                return false;
            }
            this.setCurrentPiece();
        }
        return true;
    }

    rotate(piece, direction) {
        // Clone with JSON for immutability.
        let p = JSON.parse(JSON.stringify(piece));
        console.log(piece)
        if (!piece.hardDropped) {
          // Transpose matrix
          for (let y = 0; y < p.shape.length; y++) {
            for (let x = 0; x < y; x++) {
              [p.shape[x][y], p.shape[y][x]] = [p.shape[y][x], p.shape[x][y]];
            }
          }
          // Reverse the order of the columns.
          if (direction === 'right') {
            p.shape.forEach((row) => row.reverse());
            rotate.play();
          } else if (direction === 'left') {
            p.shape.reverse();
            rotate.play();
          }
        }
        return p;
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
        console.log('were freezing')
        this.piece.shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell > 0) {
                    this.grid[y + this.piece.y][x + this.piece.x] = cell;
                }
            })
        })
    }

    checkLines() {
        let lines = 0;
        this.grid.forEach((row, y) => {
            if (row.every(cell => cell > 0)) {
                clear.play();
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

        while (this.validPosition(this.piece) && this.piece.y <= ROWS){
            this.piece.y ++;
        }
        let temp = this.piece.y - 1;
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
        this.hardDropped = false;

        if (this.shape === SHAPES[3]) {
            this.x = 4;
            this.y = 20;
        } else if (this.shape === SHAPES[0]){
            this.x = 3;
            this.y = 19;
        } else {
            this.x = 3;
            this.y = 20;
        }
    }

    drawCurrentPiece() {

        this.ctx.fillStyle = this.color;
        this.ctx.globalAlpha = 0.5;
        this.shape.forEach((row,y) => {
            row.forEach((cell, x) => {
                if (cell > 0) {
                    this.ctx.lineWidth = .06375
                    this.ctx.strokeStyle = 'black';
                    this.ctx.strokeRect(this.x + x, this.y + y,1,1)
                    this.ctx.fillRect(this.x + x, this.y + y, 1, 1);

                    // below is trying to add depth to the pieces
                    this.ctx.save();
                    this.ctx.translate(this.x + x, this.y + y);
                    this.ctx.restore();
                    this.ctx.fillRect(this.x + x, this.y + y, 1, 1);
                }
            })
        })
        this.ctx.globalAlpha = 1;
    }
    drawNextPiece() {
        this.ctx.fillStyle = this.color;
        this.ctx.globalAlpha = 0.5;
        this.shape.forEach((row,y) => {
            row.forEach((cell, x) => {
                if (cell > 0) {
                    this.ctx.lineWidth = .06375
                    this.ctx.strokeStyle = 'black';
                    this.ctx.strokeRect(x, y,1,1)
                    this.ctx.fillRect(x, y, 1, 1);

                    // below is trying to add depth to the pieces
                    this.ctx.save();
                    this.ctx.translate(this.x + x, this.y + y);
                    this.ctx.restore();
                    this.ctx.fillRect(x, y, 1, 1);
                }
            })
        })
    }
    drawLookAhead(aheadY) {
        this.ctx.globalAlpha = 0.5;

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

                    // below is trying to add depth to the pieces
                    this.ctx.save();
                    this.ctx.translate(this.x + x, this.y + y);
                    this.ctx.restore();
                    this.ctx.fillRect(this.x + x, this.y + y, 1, 1);
                }
            })
        })
        this.y = prevY;
    }

    move(piece) {
    if (!this.hardDropped) {
        this.x = piece.x;
        this.y = piece.y;
    }
    this.shape = piece.shape;
    }

    hardDrop() {
        this.hardDropped = true;
    }
}
function handleKeyPress(event) {

    // p for pause
    if (event.keyCode === key_input.p && isRunning) {
        isRunning = false;
        audioElement.pause();
        pause.play();
        return;
    }
    if (event.keyCode === key_input.p && !isRunning){
        isRunning = true;
        return countdown(animate, 20);
    }

    // esc for end game
    if (event.keyCode === key_input.esc) {
      audioElement.pause();
      audioElement.currrentTime = 0;
      end.play();
      gameOver();


    } else if (moves[event.keyCode]) {
      event.preventDefault();

      // Get new state
      let p = moves[event.keyCode](board.piece);
      console.log(p)

      if (event.keyCode === key_input.shift) {
        return;
      }

      if (event.keyCode === key_input.space) {

        // Hard drop
        while (board.validPosition(p)) {
            board.piece.move(p);
            board.accountValues.score += POINTS.HARD_DROP;
            updateScore();
            p = moves[key_input.down](board.piece);
        }
        hardDrop.play();
        board.piece.hardDrop();

        // every other input thats valid
    } else if (board.validPosition(p)) {
        board.piece.move(p);
        if (event.keyCode === key_input.down) {
            softdrop.play();
            board.accountValues.score += POINTS.SOFT_DROP;
            updateScore();
        }
        move.play();

      } else {

        fall.play();
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
        ctx.fillRect(1,23,8,1.2);
        ctx.font = '1px monospace';
        ctx.fillStyle = 'yellow';
        ctx.fillText('PAUSED....',1.8, 24);
        return
    }
    audioElement.play();

    draw();
    requestId = requestAnimationFrame(animate);
}

function countdown(callbackFunc, y) {
    return new Promise((resolve) => {
    let timer = 3;
    let counter = 0;
    ctx.font = "4px monospace";
    ctx.fillStyle = "black";

        counter = setInterval(() => {
            if (timer === 0) {
                callbackFunc();
                clearInterval(counter);
                resolve();
                return;
            }
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillText(timer, 4, 10 + y);
            hold.play();
            timer--;
        }, 1000)
    })
}

function play() {

    const playButton = document.getElementById('play-button');

    playButton.innerHTML = 'Restart';
    if (gameStarted) {
        board.ctx.translate(0,20)
    }
    gameStarted = true;
    isRunning = true;
    board = new Board(ctx, nextCtx, holdCtx);
    updateScore();
    updateLevels();
    updateScore();
    addEventListener();

    if (requestId) {
        cancelAnimationFrame(requestId);
    }


    countdown(animate, 20).then(() => {
        time.start = performance.now();
        animate();
    })
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
    hold.play();
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
    isRunning = false;

    audioElement.pause()
    setTimeout(function() {
        end.play();
    }, 1000);

    ctx.fillStyle = 'black';
    ctx.fillRect(1,23,8,1.2);
    ctx.font = '1px monospace';
    ctx.fillStyle = 'yellow';
    ctx.fillText('GAME OVER....',1.8, 24);
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

function cancelGame() {
    isRunning = false;

    board.clearBoard();
    cancelAnimationFrame(requestId);

    audioElement.pause()
    setTimeout(function() {
        end.play();
    }, 1000);


    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    nextCtx.clearRect(0, 0,nextCtx.canvas.width,nextCtx.canvas.height);
    holdCtx.clearRect(0, 0,nextCtx.canvas.width,nextCtx.canvas.height);

    ctx.fillStyle = 'black';
    ctx.fillRect(1,23,8,1.2);
    ctx.font = '1px monospace';
    ctx.fillStyle = 'yellow';
    ctx.fillText('GAME OVER',1.9, 24);

    setTimeout(() => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(1,23,8,1.2);
        ctx.font = '1px monospace';
        ctx.fillStyle = 'yellow';
        ctx.fillText('PLAY AGAIN',1.8, 24);
    }
    , 3000);
}














