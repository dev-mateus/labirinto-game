// MAZE GAME - Aplicacao Principal (Minimalista)

const canvas = document.getElementById('labirinto-canvas');
const ctx = canvas?.getContext('2d');
const tempoJogo = document.getElementById('tempo-jogo');
const btnInstalar = document.getElementById('btn-instalar');
const btnTema = document.getElementById('btn-tema');
const mazeIdSpan = document.querySelector('#maze-id span');
const gameStatus = document.getElementById('game-status');

let labirinto = [];
let jogador = { x: 1, y: 1 };
let destino = { x: 14, y: 14 };
let inicioTempo = null;
let timerInterval = null;
let deferredPrompt = null;
let isDrawing = false;

// GERENCIADOR DE TEMA
const TemaManager = {
	salvo: localStorage.getItem('labirinto-tema'),
	
	init() {
		if (this.salvo) document.documentElement.setAttribute('data-tema', this.salvo);
		btnTema?.addEventListener('click', () => this.alternar());
	},
	
	alternar() {
		const atual = document.documentElement.getAttribute('data-tema');
		const novo = atual === 'escuro' ? 'claro' : 'escuro';
		document.documentElement.setAttribute('data-tema', novo);
		localStorage.setItem('labirinto-tema', novo);
	}
};

// ============================================================
// 3. GERENCIADOR DE PWA
// ============================================================

// GERENCIADOR DE PWA
const PWAManager = {
	init() {
		this.registrarServiceWorker();
		this.configurarInstalacao();
	},
	
	registrarServiceWorker() {
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', () => {
				navigator.serviceWorker.register('/service-worker.js')
					.then(() => console.log('Service Worker OK'))
					.catch(err => console.warn('SW erro:', err));
			});
		}
	},
	
	configurarInstalacao() {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			btnInstalar && (btnInstalar.style.display = 'flex');
		});
		btnInstalar?.addEventListener('click', () => this.instalar());
	},
	
	instalar() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		deferredPrompt.userChoice.then(({ outcome }) => {
			if (outcome === 'accepted') {
				document.getElementById('info-pwa').textContent = 'App instalado!';
				setTimeout(() => {
					document.getElementById('info-pwa').textContent = '';
				}, 3000);
			}
			deferredPrompt = null;
			btnInstalar && (btnInstalar.style.display = 'none');
		});
	}
};

// GERENCIADOR DO JOGO
const LabirintoGame = {
	TAMANHO: 16,
	
	gerarLabirinto(seed = null) {
		const tamanho = this.TAMANHO;
		let s = seed || Math.random();
		
		const rand = () => {
			s = Math.sin(s) * 10000;
			return s - Math.floor(s);
		};
		
		const matriz = Array.from({ length: tamanho }, () => Array(tamanho).fill(1));
		const dentro = (x, y) => x > 0 && y > 0 && x < tamanho - 1 && y < tamanho - 1;
		
		const embaralhar = (arr) => {
			for (let i = arr.length - 1; i > 0; i--) {
				const j = Math.floor(rand() * (i + 1));
				[arr[i], arr[j]] = [arr[j], arr[i]];
			}
			return arr;
		};
		
		const dfs = (x, y) => {
			matriz[y][x] = 0;
			embaralhar([[0, -2], [0, 2], [2, 0], [-2, 0]]).forEach(([dx, dy]) => {
				const nx = x + dx, ny = y + dy;
				if (dentro(nx, ny) && matriz[ny][nx] === 1) {
					matriz[y + dy / 2][x + dx / 2] = 0;
					dfs(nx, ny);
				}
			});
		};
		
		dfs(1, 1);
		matriz[1][1] = 0;
		matriz[tamanho - 2][tamanho - 2] = 0;
		return matriz;
	},
	
	obterSeedDiaria() {
		const d = new Date();
		return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
	},
	
	obterIdMaze() {
		const seed = this.obterSeedDiaria();
		return String(seed).padStart(5, '0');
	},
	
	iniciar() {
		labirinto = this.gerarLabirinto(this.obterSeedDiaria());
		jogador = { x: 1, y: 1 };
		destino = { x: this.TAMANHO - 2, y: this.TAMANHO - 2 };
		inicioTempo = Date.now();
		gameStatus.textContent = '';
		this.atualizarTempo();
		this.desenhar();
		timerInterval = setInterval(() => this.atualizarTempo(), 100);
		if (mazeIdSpan) mazeIdSpan.textContent = this.obterIdMaze();
	},
	
	parar() {
		clearInterval(timerInterval);
	},
	
	atualizarTempo() {
		if (!inicioTempo) return;
		const tempo = ((Date.now() - inicioTempo) / 1000).toFixed(1);
		tempoJogo.textContent = tempo + 's';
	},
	
	desenhar() {
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const tamanho = labirinto.length;
		const celula = canvas.width / tamanho;
		
		const style = document.documentElement.getAttribute('data-tema') === 'escuro' ? '#0a0a0a' : '#1a1a1a';
		ctx.fillStyle = style;
		labirinto.forEach((linha, y) => {
			linha.forEach((celh, x) => {
				if (celh === 1) ctx.fillRect(x * celula, y * celula, celula, celula);
			});
		});
		
		ctx.fillStyle = '#00c6fb';
		ctx.beginPath();
		ctx.arc((jogador.x + 0.5) * celula, (jogador.y + 0.5) * celula, celula / 2.5, 0, 2 * Math.PI);
		ctx.fill();
		
		ctx.fillStyle = '#43e97b';
		ctx.fillRect(destino.x * celula + celula * 0.2, destino.y * celula + celula * 0.2, celula * 0.6, celula * 0.6);
	},
	
	mover(dx, dy) {
		const nx = jogador.x + dx;
		const ny = jogador.y + dy;
		if (labirinto[ny] && labirinto[ny][nx] === 0) {
			jogador.x = nx;
			jogador.y = ny;
			this.desenhar();
			this.checarVitoria();
		}
	},
	
	checarVitoria() {
		if (jogador.x === destino.x && jogador.y === destino.y) {
			const tempoFinal = ((Date.now() - inicioTempo) / 1000).toFixed(1);
			gameStatus.textContent = 'Concluido em ' + tempoFinal + 's!';
			HistoricoManager.salvar(tempoFinal);
			this.parar();
		}
	}
};

// GERENCIADOR DE CONTROLES
const ControlesManager = {
	init() {
		this.configurarTeclado();
		this.configurarMouse();
		this.configurarToque();
	},
	
	configurarTeclado() {
		document.addEventListener('keydown', (e) => {
			const movimentos = {
				'ArrowUp': [0, -1], 'ArrowDown': [0, 1],
				'ArrowLeft': [-1, 0], 'ArrowRight': [1, 0],
				'w': [0, -1], 's': [0, 1],
				'a': [-1, 0], 'd': [1, 0]
			};
			if (movimentos[e.key]) {
				e.preventDefault();
				LabirintoGame.mover(...movimentos[e.key]);
			}
		});
	},
	
	configurarMouse() {
		canvas?.addEventListener('mousedown', (e) => {
			isDrawing = true;
			this.procesarMovimento(e);
		});
		
		canvas?.addEventListener('mousemove', (e) => {
			if (isDrawing) this.procesarMovimento(e);
		});
		
		document.addEventListener('mouseup', () => {
			isDrawing = false;
		});
		
		canvas?.addEventListener('mouseleave', () => {
			isDrawing = false;
		});
	},
	
	configurarToque() {
		canvas?.addEventListener('touchstart', (e) => {
			isDrawing = true;
			if (e.touches[0]) this.procesarMovimento(e.touches[0]);
		});
		
		canvas?.addEventListener('touchmove', (e) => {
			if (isDrawing && e.touches[0]) {
				e.preventDefault();
				this.procesarMovimento(e.touches[0]);
			}
		});
		
		document.addEventListener('touchend', () => {
			isDrawing = false;
		});
	},
	
	procesarMovimento(e) {
		if (!canvas || !isDrawing) return;
		
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		
		const tamanho = LabirintoGame.TAMANHO;
		const celula = canvas.width / tamanho;
		
		const cellX = Math.floor(x / celula);
		const cellY = Math.floor(y / celula);
		
		const diffX = cellX - jogador.x;
		const diffY = cellY - jogador.y;
		
		if (Math.abs(diffX) > Math.abs(diffY)) {
			if (diffX > 0) LabirintoGame.mover(1, 0);
			else if (diffX < 0) LabirintoGame.mover(-1, 0);
		} else if (Math.abs(diffY) > 0) {
			if (diffY > 0) LabirintoGame.mover(0, 1);
			else if (diffY < 0) LabirintoGame.mover(0, -1);
		}
	}
};

// GERENCIADOR DE HISTORICO
const HistoricoManager = {
	chave: 'labirinto-historico',
	max: 10,
	
	salvar(tempo) {
		let historico = JSON.parse(localStorage.getItem(this.chave) || '[]');
		historico.unshift({ tempo: Number(tempo), data: new Date().toLocaleDateString() });
		historico = historico.slice(0, this.max);
		localStorage.setItem(this.chave, JSON.stringify(historico));
	}
};

// INICIALIZACAO
document.addEventListener('DOMContentLoaded', () => {
	TemaManager.init();
	PWAManager.init();
	ControlesManager.init();
	LabirintoGame.iniciar();
});
