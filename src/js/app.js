// Arquivo principal JS do Labirinto Game
// Estrutura inicial, lógica será adicionada nas próximas etapas

// Elementos principais
const btnJogar = document.getElementById('btn-jogar');
const secJogo = document.querySelector('.jogo');
const secHero = document.querySelector('.hero');
const btnVoltar = document.getElementById('btn-voltar');
const canvas = document.getElementById('labirinto-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const tempoJogo = document.getElementById('tempo-jogo');

// Estado do jogo
let labirinto = [];
let jogador = { x: 1, y: 1 };
let destino = { x: 14, y: 14 };
let inicioTempo = null;
let timerInterval = null;

// Função para mostrar/ocultar seções
function mostrarJogo() {
	secHero.style.display = 'none';
	secJogo.style.display = 'block';
	iniciarJogo();
}
function voltarLanding() {
	secJogo.style.display = 'none';
	secHero.style.display = 'block';
	pararTimer();
}

if (btnJogar) btnJogar.addEventListener('click', mostrarJogo);
if (btnVoltar) btnVoltar.addEventListener('click', voltarLanding);

// Geração simples de labirinto (placeholder)
function gerarLabirinto(tamanho = 16) {
	// 0 = caminho, 1 = parede
	const matriz = [];
	for (let y = 0; y < tamanho; y++) {
		matriz[y] = [];
		for (let x = 0; x < tamanho; x++) {
			matriz[y][x] = (x === 0 || y === 0 || x === tamanho-1 || y === tamanho-1) ? 1 : (Math.random() < 0.2 ? 1 : 0);
		}
	}
	matriz[1][1] = 0; // início
	matriz[tamanho-2][tamanho-2] = 0; // destino
	return matriz;
}

function desenharLabirinto() {
	if (!ctx) return;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const tamanho = labirinto.length;
	const celula = canvas.width / tamanho;
	for (let y = 0; y < tamanho; y++) {
		for (let x = 0; x < tamanho; x++) {
			if (labirinto[y][x] === 1) {
				ctx.fillStyle = '#222';
				ctx.fillRect(x * celula, y * celula, celula, celula);
			}
		}
	}
	// Jogador
	ctx.fillStyle = '#0078d7';
	ctx.beginPath();
	ctx.arc((jogador.x+0.5)*celula, (jogador.y+0.5)*celula, celula/2.5, 0, 2*Math.PI);
	ctx.fill();
	// Destino
	ctx.fillStyle = '#43d17a';
	ctx.fillRect((destino.x)*celula+celula*0.2, (destino.y)*celula+celula*0.2, celula*0.6, celula*0.6);
}

function iniciarJogo() {
	labirinto = gerarLabirinto();
	jogador = { x: 1, y: 1 };
	destino = { x: labirinto.length-2, y: labirinto.length-2 };
	inicioTempo = Date.now();
	atualizarTempo();
	desenharLabirinto();
	if (timerInterval) clearInterval(timerInterval);
	timerInterval = setInterval(atualizarTempo, 100);
}

function pararTimer() {
	if (timerInterval) clearInterval(timerInterval);
	tempoJogo.textContent = '';
}

function atualizarTempo() {
	if (!inicioTempo) return;
	const t = ((Date.now() - inicioTempo)/1000).toFixed(1);
	tempoJogo.textContent = `Tempo: ${t}s`;
}

// Movimentação
function mover(dx, dy) {
	const nx = jogador.x + dx;
	const ny = jogador.y + dy;
	if (labirinto[ny] && labirinto[ny][nx] === 0) {
		jogador.x = nx;
		jogador.y = ny;
		desenharLabirinto();
		checarVitoria();
	}
}

document.addEventListener('keydown', e => {
	if (secJogo.style.display !== 'block') return;
	if (e.key === 'ArrowUp') mover(0, -1);
	if (e.key === 'ArrowDown') mover(0, 1);
	if (e.key === 'ArrowLeft') mover(-1, 0);
	if (e.key === 'ArrowRight') mover(1, 0);
});

// Botões mobile
document.getElementById('btn-cima')?.addEventListener('click', () => mover(0, -1));
document.getElementById('btn-baixo')?.addEventListener('click', () => mover(0, 1));
document.getElementById('btn-esquerda')?.addEventListener('click', () => mover(-1, 0));
document.getElementById('btn-direita')?.addEventListener('click', () => mover(1, 0));

function checarVitoria() {
	if (jogador.x === destino.x && jogador.y === destino.y) {
		const tempoFinal = ((Date.now() - inicioTempo)/1000).toFixed(1);
		tempoJogo.textContent = `Parabéns! Tempo: ${tempoFinal}s`;
		salvarHistorico(tempoFinal);
		pararTimer();
	}
}

// Histórico LocalStorage
function salvarHistorico(tempo) {
	let historico = JSON.parse(localStorage.getItem('labirinto-historico') || '[]');
	historico.unshift({ tempo: Number(tempo), data: new Date().toLocaleDateString() });
	historico = historico.slice(0, 10);
	localStorage.setItem('labirinto-historico', JSON.stringify(historico));
	renderHistorico();
}

function renderHistorico() {
	const lista = document.getElementById('lista-historico');
	if (!lista) return;
	let historico = JSON.parse(localStorage.getItem('labirinto-historico') || '[]');
	lista.innerHTML = '';
	historico.forEach((item, i) => {
		const li = document.createElement('li');
		li.textContent = `${item.tempo}s (${item.data})`;
		lista.appendChild(li);
	});
}

renderHistorico();
