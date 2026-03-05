const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const SQ = 45; // Размер клетки
canvas.width = SQ * 7 + 100;
canvas.height = SQ * 14;

// Карта доски: 1 - поле, 0 - пустота (вне игры)
const boardLayout = Array(14).fill().map(() => Array(7).fill(0));
// Центральное поле 7x6
for(let r=4; r<10; r++) for(let c=0; c<7; c++) boardLayout[r][c] = 1;
// Крепости 3x3 и ворота
for(let r=0; r<4; r++) for(let c=2; c<5; c++) boardLayout[r][c] = 1;
for(let r=10; r<14; r++) for(let c=2; c<5; c++) boardLayout[r][c] = 1;

let pieces = []; // Массив объектов {r, c, type, color}

function initPieces() {
    // Начальная расстановка пешек (шатра) и вождей (бий)
    for(let c=0; c<7; c++) {
        pieces.push({r: 4, c, type: 'shatra', color: 'black'});
        pieces.push({r: 9, c, type: 'shatra', color: 'white'});
    }
    // Бий (Король) в крепостях
    pieces.push({r: 0, c: 3, type: 'biy', color: 'black'});
    pieces.push({r: 13, c: 3, type: 'biy', color: 'white'});
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(let r=0; r<14; r++) {
        for(let c=0; c<7; c++) {
            if(boardLayout[r][c] === 1) {
                ctx.fillStyle = (r + c) % 2 === 0 ? '#DDB88E' : '#A67049';
                ctx.fillRect(c*SQ + 50, r*SQ, SQ, SQ);
            }
        }
    }
    pieces.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.c*SQ + 50 + SQ/2, p.r*SQ + SQ/2, SQ/3, 0, Math.PI*2);
        ctx.fillStyle = p.color === 'white' ? '#fff' : '#333';
        ctx.fill();
        if(p.type === 'biy') { // Король с золотой каемкой
            ctx.strokeStyle = 'gold'; ctx.lineWidth = 3; ctx.stroke();
        }
    });
}

initPieces();
draw();
// Инициализация Telegram Web App
window.Telegram.WebApp.ready();
