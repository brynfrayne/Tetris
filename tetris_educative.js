const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = ['cyan', 'blue', 'orange', 'yellow', 'green', 'purple', 'red'];
const SHAPES = [
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
  [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
  [[4, 4], [4, 4]],
  [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
  [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
  [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
];
const POINTS = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  SOFT_DROP: 1,
  HARD_DROP: 2
}
Object.freeze(POINTS);

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
Object.freeze(LEVEL);

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const canvasNext = document.getElementById('next');
const ctxNext = canvasNext.getContext('2d');

// Calculate size of canvas from constants.
ctx.canvas.width = COLS * BLOCK_SIZE;
ctx.canvas.height = ROWS * BLOCK_SIZE;

// Size canvas for four blocks.
ctxNext.canvas.width = 4 * BLOCK_SIZE;
ctxNext.canvas.height = 4 * BLOCK_SIZE;

// Scale blocks
ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
ctxNext.scale(BLOCK_SIZE, BLOCK_SIZE);

const KEY = {
  SPACE: 32,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40
}
Object.freeze(KEY);

let accountValues = {
  score: 0,
  lines: 0,
  level: 0
}

function updateAccount(key, value) {
  let element = document.getElementById(key);
  if (element) {
    element.textContent = value;
  }
}

let account = new Proxy(accountValues, {
  set: (target, key, value) => {
    target[key] = value;
    updateAccount(key, value);
    return true;
  }
});

const moves = {
  [KEY.LEFT]:  (p) => ({ ...p, x: p.x - 1 }),
  [KEY.RIGHT]: (p) => ({ ...p, x: p.x + 1 }),
  [KEY.DOWN]:  (p) => ({ ...p, y: p.y + 1 }),
  [KEY.UP]:    (p) => board.rotate(p),
  [KEY.SPACE]:  (p) => ({ ...p, y: p.y + 1 }),
};

let requestId = null;
let board = null;

class Board {
  constructor(ctx, ctxNext) {
    this.ctx = ctx;
    this.ctxNext = ctxNext;
    this.grid = this.getEmptyBoard();
    this.setNextPiece();
    this.setCurrentPiece();
  }

  // Get matrix filled with zeros.
  getEmptyBoard() {
    return Array.from(
      {length: ROWS}, () => Array(COLS).fill(0)
    );
  }

  rotate(piece){
    // Clone with JSON
    let p = JSON.parse(JSON.stringify(piece));

    // Transpose matrix, p is the Piece
    for (let y = 0; y < p.shape.length; ++y) {
      for (let x = 0; x < y; ++x) {
        [p.shape[x][y], p.shape[y][x]] =
        [p.shape[y][x], p.shape[x][y]];
      }
    }

    // Reverse the order of the columns.
    p.shape.forEach(row => row.reverse());

    return p;
  }

  valid(p) {
    return p.shape.every((row, dy) => {
      return row.every((value, dx) => {
        let x = p.x + dx;
        let y = p.y + dy;
        return value === 0 || (this.isInsideWalls(x, y) && this.isNotOccupied(x, y));
      });
    });
  }

  isNotOccupied(x, y) {
    return this.grid[y] && this.grid[y][x] === 0;
  }

  isInsideWalls(x, y) {
    return (
      x >= 0 && // Left wall
      x < COLS && // Right wall
      y < ROWS // Bottom wall
    );
  }

  drop() {
    let p = moves[KEY.DOWN](this.piece);

    if (this.valid(p)) {
      this.piece.move(p);
    } else {
      this.freeze();
      this.clearLines();
      if (this.piece.y === 0) { // Game over
        return false;
      }
      this.setCurrentPiece();
    }
    return true;
  }

  setNextPiece() {
    const { width, height } = this.ctxNext.canvas;
    this.nextPiece = new Piece(this.ctxNext);
    this.ctxNext.clearRect(0, 0, width, height);
    this.nextPiece.draw();
  }

  setCurrentPiece() {
    this.piece = this.nextPiece;
    this.piece.ctx = this.ctx;
    this.piece.x = 3;
    this.setNextPiece();
  }

  freeze() {
    this.piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          this.grid[y + this.piece.y][x + this.piece.x] = value;
        }
      });
   });
  }

  draw() {
    this.grid.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          this.ctx.fillStyle = COLORS[value-1];
          this.ctx.fillRect(x, y, 1, 1);
        }
      });
    });
  }

  clearLines() {
    let lines = 0;
    this.grid.forEach((row, y) => {
      // If every value is greater than zero then we have a full row.
      if (row.every(value => value > 0)) {
        lines++; // Increase for cleared line

        this.grid.splice(y, 1); // Remove the row.

        // Add zero filled row at the top.
        this.grid.unshift(Array(COLS).fill(0));

        if (lines > 0) {
          // Add points if we cleared some lines
          account.score += this.getLineClearPoints(lines);
          account.lines += lines

          // If we have reached the lines for next level
          if (account.lines >= LINES_PER_LEVEL) {
            // Goto next level
            account.level++;

            // Remove lines so we start working for the next level
            account.lines -= LINES_PER_LEVEL;

            // Increase speed of game
            time.level = LEVEL[account.level];
          }
        }
      }
    });
  }

  getLineClearPoints(lines) {
    const lineClearPoints =
      lines === 1 ? POINTS.SINGLE :
      lines === 2 ? POINTS.DOUBLE :
      lines === 3 ? POINTS.TRIPLE :
      lines === 4 ? POINTS.TETRIS :
      0;

    return (account.level + 1) * lineClearPoints;
  }
}

class Piece {
  constructor(ctx) {
    this.ctx = ctx;

    const typeId = this.randomizeTetrominoType(COLORS.length);
    this.shape = SHAPES[typeId];
    this.color = COLORS[typeId];

    this.x = 0;
    this.y = 0;
  }

  draw() {
    this.ctx.fillStyle = this.color;
    this.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          this.ctx.fillRect(this.x + x, this.y + y, 1, 1);
        }
      });
    });
  }

  move(p) {
    this.x = p.x;
    this.y = p.y;
    this.shape = p.shape;
  }

  randomizeTetrominoType(noOfTypes) {
    return Math.floor(Math.random() * noOfTypes);
  }
}

function handleKeyPress(event) {
  // Stop the event from bubbling.
  event.preventDefault();

  if (moves[event.keyCode]) {
    // Get new state of piece
    let p = moves[event.keyCode](board.piece);

    if (event.keyCode === KEY.SPACE) {
      // Hard drop
      while (board.valid(p)) {
        board.piece.move(p);
        account.score += POINTS.HARD_DROP;
        p = moves[KEY.SPACE](board.piece);
      }
    }

    if (board.valid(p)) {
      board.piece.move(p);
      if (event.keyCode === KEY.DOWN) {
        account.score += POINTS.SOFT_DROP;
      }
    }
  }
}

function addEventListener() {
  document.removeEventListener('keydown', handleKeyPress);
  document.addEventListener('keydown', handleKeyPress);
}

function draw() {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);

  board.draw();
  board.piece.draw();
}

function resetGame() {
  account.score = 0;
  account.lines = 0;
  account.level = 0;
  board = new Board(ctx, ctxNext);
  time = { start: performance.now(), elapsed: 0, level: LEVEL[0] };
}

function play() {
  resetGame();
  addEventListener();

  // If we have an old game running then cancel it
  if (requestId) {
    cancelAnimationFrame(requestId);
  }
  time.start = performance.now();
  animate();
}

time = { start: 0, elapsed: 0, level: 1000 };

function animate(now = 0) {
  // Update elapsed time.
  time.elapsed = now - time.start;

  // If elapsed time has passed time for current level
  if (time.elapsed > time.level) {
    // Restart counting from now
    time.start = now;

    if (!board.drop()) {
      gameOver();
      return;
    }
  }

  draw();
  requestId = requestAnimationFrame(animate);
}

function gameOver() {
  cancelAnimationFrame(requestId);
  ctx.fillStyle = 'black';
  ctx.fillRect(1, 3, 8, 1.2);
  ctx.font = '1px Arial';
  ctx.fillStyle = 'red';
  ctx.fillText('GAME OVER', 1.8, 4);
}
