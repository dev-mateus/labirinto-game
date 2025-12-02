// ============================================================
// LABIRINTO GAME - Aplicação Principal
// ============================================================

// ============================================================
// 1. ELEMENTOS DOM & ESTADO GLOBAL
// ============================================================

const canvas = document.getElementById('labirinto-canvas');
const ctx = canvas?.getContext('2d');
const tempoJogo = document.getElementById('tempo-jogo');
const btnInstalar = document.getElementById('btn-instalar');
const btnDownload = document.getElementById('btn-download');
const btnTema = document.getElementById('btn-tema');

let labirinto = [];
let jogador = { x: 1, y: 1 };
let destino = { x: 14, y: 14 };
let inicioTempo = null;
let timerInterval = null;
let deferredPrompt = null;

// ============================================================
// 2. GERENCIADOR DE TEMA
// ============================================================

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

const PWAManager = {
	init() {
		this.registrarServiceWorker();
		this.configurarInstalacao();
	},
	
	registrarServiceWorker() {
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', () => {
				navigator.serviceWorker.register('/service-worker.js')
					.then(() => console.log('✓ Service Worker registrado'))
					.catch(err => console.warn('✗ SW erro:', err));
			});
		}
	},
	
	configurarInstalacao() {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			btnInstalar && (btnInstalar.style.display = 'inline-block');
		});
		btnInstalar?.addEventListener('click', () => this.instalar());
	},
	
	instalar() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		deferredPrompt.userChoice.then(({ outcome }) => {
			const msg = outcome === 'accepted' ? 'App instalado!' : 'Instalação cancelada.';
			document.querySelector('.info-pwa').textContent = msg;
			deferredPrompt = null;
			btnInstalar && (btnInstalar.style.display = 'none');
		});
	}
};

// ============================================================
// 4. GERENCIADOR DO JOGO - LABIRINTO
// ============================================================

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
	
	iniciar() {
		labirinto = this.gerarLabirinto(this.obterSeedDiaria());
		jogador = { x: 1, y: 1 };
		destino = { x: this.TAMANHO - 2, y: this.TAMANHO - 2 };
		inicioTempo = Date.now();
		this.atualizarTempo();
		this.desenhar();
		timerInterval = setInterval(() => this.atualizarTempo(), 100);
	},
	
	parar() {
		clearInterval(timerInterval);
		tempoJogo.textContent = '';
	},
	
	atualizarTempo() {
		if (!inicioTempo) return;
		const tempo = ((Date.now() - inicioTempo) / 1000).toFixed(1);
		tempoJogo.textContent = `Tempo: ${tempo}s`;
	},
	
	desenhar() {
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const tamanho = labirinto.length;
		const celula = canvas.width / tamanho;
		
		// Desenhar paredes
		ctx.fillStyle = '#222';
		labirinto.forEach((linha, y) => {
			linha.forEach((celh, x) => {
				if (celh === 1) ctx.fillRect(x * celula, y * celula, celula, celula);
			});
		});
		
		// Desenhar jogador
		ctx.fillStyle = '#0078d7';
		ctx.beginPath();
		ctx.arc((jogador.x + 0.5) * celula, (jogador.y + 0.5) * celula, celula / 2.5, 0, 2 * Math.PI);
		ctx.fill();
		
		// Desenhar destino
		ctx.fillStyle = '#43d17a';
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
			tempoJogo.textContent = `Parabéns! Tempo: ${tempoFinal}s`;
			HistoricoManager.salvar(tempoFinal);
			this.parar();
		}
	}
};

// ============================================================
// 5. GERENCIADOR DE CONTROLES
// ============================================================

const ControlesManager = {
	botoes: {
		cima: document.getElementById('btn-cima'),
		baixo: document.getElementById('btn-baixo'),
		esquerda: document.getElementById('btn-esquerda'),
		direita: document.getElementById('btn-direita')
	},
	
	init() {
		this.configurarTeclado();
		this.configurarBotoes();
	},
	
	configurarTeclado() {
		document.addEventListener('keydown', (e) => {
			if (!this.jogoAtivo()) return;
			const movimentos = {
				'ArrowUp': [0, -1], 'ArrowDown': [0, 1],
				'ArrowLeft': [-1, 0], 'ArrowRight': [1, 0]
			};
			if (movimentos[e.key]) LabirintoGame.mover(...movimentos[e.key]);
		});
	},
	
	configurarBotoes() {
		const movimentos = { cima: [0, -1], baixo: [0, 1], esquerda: [-1, 0], direita: [1, 0] };
		Object.entries(movimentos).forEach(([dir, [dx, dy]]) => {
			this.botoes[dir]?.addEventListener('click', () => {
				LabirintoGame.mover(dx, dy);
				this.feedback(this.botoes[dir]);
			});
		});
	},
	
	feedback(btn) {
		btn?.classList.add('ativo');
		setTimeout(() => btn?.classList.remove('ativo'), 150);
	},
	
	jogoAtivo() {
		return document.querySelector('.jogo')?.style.display !== 'none';
	}
};

// ============================================================
// 6. GERENCIADOR DE HISTÓRICO
// ============================================================

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

// ============================================================
// 7. GERENCIADOR DE DOWNLOAD
// ============================================================

const DownloadManager = {
	init() {
		btnDownload?.addEventListener('click', () => this.baixarLabirinto());
	},
	
	baixarLabirinto() {
		if (!canvas) return;
		const link = document.createElement('a');
		link.download = `labirinto-${LabirintoGame.obterSeedDiaria()}.png`;
		link.href = canvas.toDataURL('image/png');
		link.click();
	}
};

// ============================================================
// 8. INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
	TemaManager.init();
	PWAManager.init();
	ControlesManager.init();
	DownloadManager.init();
	LabirintoGame.iniciar();
});
