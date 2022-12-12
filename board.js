class Board{
    constructor(ctx, ctxNext, ctxHold) {
        this.ctx = ctx;
        this.ctxNext = ctxNext;
        this.ctxHold = ctxHold;
        this.init();
    }

    init(){
        // need to intialize the size of the canvas
        // best to store the col, row & block sizes as constants

        const COLS = 10
        const ROWS = 20
        const BLOCK_SIZE = 10

         this.ctx.canvas.width = COLS * BLOCK_SIZE
    }
}
