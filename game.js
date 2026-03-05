const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const SQ = 50; 
canvas.width = SQ * 14; 
canvas.height = SQ * 7;

const COLORS = {
    boardLight: '#bdc3c7', boardDark: '#2c3e50',
    whitePiece: '#ecf0f1', blackPiece: '#1a1a1a',
    highlight: 'rgba(46, 204, 113, 0.6)', 
    mustHit: 'rgba(231, 76, 60, 0.6)', // Красный для обязательного боя
    selected: 'rgba(241, 196, 15, 0.7)'
};

let boardLayout = Array(7).fill().map(() => Array(14).fill(0));
let pieces = [];
let selectedPiece = null;
let validMoves = [];
let turn = 'white';

function setupBoard() {
    for(let r = 0; r < 7; r++) {
        for(let c = 4; c <= 9; c++) boardLayout[r][c] = 1;
    }
    for(let r = 2; r <= 4; r++) {
        for(let c = 0; c <= 3; c++) boardLayout[r][c] = 1;
        for(let c = 10; c <= 13; c++) boardLayout[r][c] = 1;
    }
}

function initPieces() {
    pieces = [];
    // Черные (Слева)
    for(let r = 2; r <= 4; r++) for(let c = 0; c <= 2; c++) pieces.push({r, c, color: 'black', type: 'shatra'});
    pieces.push({r: 3, c: 3, color: 'black', type: 'biy'});
    for(let r = 0; r < 7; r++) for(let c = 4; c <= 5; c++) pieces.push({r, c, color: 'black', type: 'shatra'});

    // Белые (Справа)
    for(let r = 2; r <= 4; r++) for(let c = 11; c <= 13; c++) pieces.push({r, c, color: 'white', type: 'shatra'});
    pieces.push({r: 3, c: 10, color: 'white', type: 'biy'});
    for(let r = 0; r < 7; r++) for(let c = 8; c <= 9; c++) pieces.push({r, c, color: 'white', type: 'shatra'});
}

function getPieceAt(r, c) { return pieces.find(p => p.r === r && p.c === c); }

function hasShatraInFortress(color) {
    return pieces.some(p => p.color === color && p.type === 'shatra' && (color === 'black' ? p.c <= 2 : p.c >= 11));
}

// РАЗДЕЛЕНИЕ ХОДОВ: тихие и боевые
function getMovesForPiece(piece, forceCaptureOnly = false) {
    let moves = [];
    let captures = [];
    const {r, c, type, color} = piece;
    const isReserve = (color === 'black' && c <= 2) || (color === 'white' && c >= 11);

    // Логика боя (для всех типов фигур)
    const dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
    
    if (type === 'shatra' || type === 'biy') {
        dirs.forEach(([dr, dc]) => {
            let nr = r + dr, nc = c + dc;
            let capR = r + dr*2, capC = c + dc*2;
            let mid = getPieceAt(nr, nc);
            if (mid && mid.color !== color && !getPieceAt(capR, capC) && boardLayout[capR]?.[capC] === 1) {
                captures.push({r: capR, c: capC, type: 'capture', mid});
            }
        });
    } else if (type === 'batyr') {
        dirs.forEach(([dr, dc]) => {
            for(let i = 1; i < 14; i++) {
                let nr = r + dr*i, nc = c + dc*i;
                if (boardLayout[nr]?.[nc] !== 1) break;
                let target = getPieceAt(nr, nc);
                if (target) {
                    if (target.color !== color) {
                        let capR = nr + dr, capC = nc + dc;
                        if (boardLayout[capR]?.[capC] === 1 && !getPieceAt(capR, capC)) {
                            captures.push({r: capR, c: capC, type: 'capture', mid: target});
                        }
                    }
                    break;
                }
            }
        });
    }

    if (forceCaptureOnly) return captures;

    // Тихие ходы (если боя нет)
    if (captures.length === 0) {
        if (type === 'shatra' && isReserve) {
            const startCol = (color === 'black') ? 4 : 7;
            const endCol = (color === 'black') ? 6 : 9;
            for(let tr = 0; tr < 7; tr++) for(let tc = startCol; tc <= endCol; tc++) {
                if (!getPieceAt(tr, tc)) moves.push({r: tr, c: tc, type: 'move'});
            }
        } else if (type === 'shatra') {
            dirs.forEach(([dr, dc]) => {
                const isForward = (color === 'black' && dc >= 0) || (color === 'white' && dc <= 0);
                if (isForward && boardLayout[r+dr]?.[c+dc] === 1 && !getPieceAt(r+dr, c+dc)) {
                    moves.push({r: r+dr, c: c+dc, type: 'move'});
                }
            });
        } else if (type === 'biy' || type === 'batyr') {
            const limit = (type === 'biy') ? 2 : 14;
            dirs.forEach(([dr, dc]) => {
                for(let i = 1; i < limit; i++) {
                    let nr = r + dr*i, nc = c + dc*i;
                    if (boardLayout[nr]?.[nc] !== 1 || getPieceAt(nr, nc)) break;
                    if (( (color === 'black' && nc <= 2) || (color === 'white' && nc >= 11) ) && hasShatraInFortress(color)) break;
                    moves.push({r: nr, c: nc, type: 'move'});
                }
            });
        }
    }

    return captures.length > 0 ? captures : moves;
}

// Проверка: обязан ли текущий игрок рубить кем-либо?
function checkGlobalCapture(color) {
    return pieces.some(p => p.color === color && getMovesForPiece(p, true).length > 0);
}

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / SQ);
    const r = Math.floor((e.clientY - rect.top) / SQ);

    const mustHit = checkGlobalCapture(turn);
    const move = validMoves.find(m => m.r === r && m.c === c);

    if (move) {
        if (move.type === 'capture') pieces = pieces.filter(p => p !== move.mid);
        selectedPiece.r = r;
        selectedPiece.c = c;

        // Превращение в Батыра
        if (selectedPiece.type === 'shatra') {
            if ((selectedPiece.color === 'black' && c === 13) || (selectedPiece.color === 'white' && c === 0)) {
                selectedPiece.type = 'batyr';
            }
        }
        
        // После хода проверяем, может ли ТА ЖЕ фигура рубить дальше (серия)
        const chainCapture = getMovesForPiece(selectedPiece, true);
        if (move.type === 'capture' && chainCapture.length > 0) {
            validMoves = chainCapture;
            // Ход не переходит
        } else {
            selectedPiece = null;
            validMoves = [];
            turn = (turn === 'white') ? 'black' : 'white';
        }
    } else {
        const piece = getPieceAt(r, c);
        if (piece && piece.color === turn) {
            const pieceCaptures = getMovesForPiece(piece, true);
            if (mustHit) {
                if (pieceCaptures.length > 0) {
                    selectedPiece = piece;
                    validMoves = pieceCaptures;
                } else {
                    // Игнорируем выбор, так как эта фигура не может рубить
                    selectedPiece = null;
                    validMoves = [];
                }
            } else {
                selectedPiece = piece;
                validMoves = getMovesForPiece(piece);
            }
        }
    }
    draw();
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(let r = 0; r < 7; r++) for(let c = 0; c < 14; c++) {
        if(boardLayout[r][c] === 1) {
            ctx.fillStyle = (r + c) % 2 === 0 ? COLORS.boardLight : COLORS.boardDark;
            ctx.fillRect(c*SQ, r*SQ, SQ, SQ);
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.strokeRect(c*SQ, r*SQ, SQ, SQ);
        }
    }

    validMoves.forEach(m => {
        ctx.fillStyle = m.type === 'capture' ? COLORS.mustHit : COLORS.highlight;
        ctx.beginPath();
        ctx.arc(m.c*SQ + SQ/2, m.r*SQ + SQ/2, 8, 0, Math.PI*2);
        ctx.fill();
    });

    pieces.forEach(p => {
        const x = p.c * SQ + SQ/2, y = p.r * SQ + SQ/2;
        if (selectedPiece === p) {
            ctx.fillStyle = COLORS.selected;
            ctx.fillRect(p.c*SQ, p.r*SQ, SQ, SQ);
        }
        ctx.beginPath();
        ctx.arc(x, y, SQ/2.4, 0, Math.PI*2);
        ctx.fillStyle = p.color === 'white' ? COLORS.whitePiece : COLORS.blackPiece;
        ctx.fill();
        ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 1; ctx.stroke();

        ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (p.type === 'biy') {
            ctx.fillStyle = p.color === 'white' ? 'black' : 'white';
            ctx.fillText("♕", x, y);
        } else if (p.type === 'batyr') {
            ctx.fillStyle = p.color === 'white' ? 'black' : 'white';
            ctx.fillText("⚔", x, y);
        }
    });
}

setupBoard();
initPieces();
draw();

