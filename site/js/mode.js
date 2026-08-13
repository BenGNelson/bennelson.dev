/* ============================================================
   mode.js — the Professional Mode machine.
   Three tiers on <html data-mode>:
     pro    — default. Employer-safe. The toggle reads ON.
     casual — toggle OFF. Honest metrics, warm palette.
     frog   — toggle EXTREMELY OFF. Comic Sans. Frog rain.
   Copy swaps live in the HTML as data-casual / data-frog
   attributes so the markup stays the single source of text.
   Persistence: one localStorage key, 7-day expiry (mode-boot.js
   enforces the expiry before first paint).
   ============================================================ */

(function () {
	'use strict';

	var KEY = 'bennelson.mode';
	var ORDER = ['pro', 'casual', 'frog'];
	var STATE_LABEL = { pro: 'ON', casual: 'OFF', frog: 'EXTREMELY OFF' };

	function current() {
		return document.documentElement.dataset.mode || 'pro';
	}

	function persist(mode) {
		try {
			localStorage.setItem(KEY, JSON.stringify({ m: mode, t: Date.now() }));
		} catch (e) {}
	}

	// Swap every element carrying data-casual/data-frog. The pro text is
	// captured from the markup on first use so cycling is lossless.
	function applyCopy(mode) {
		var els = document.querySelectorAll('[data-casual], [data-frog]');
		for (var i = 0; i < els.length; i++) {
			var el = els[i];
			if (el.dataset.pro === undefined) el.dataset.pro = el.textContent;
			var text =
				mode === 'frog'
					? (el.dataset.frog || el.dataset.casual || el.dataset.pro)
					: mode === 'casual'
						? (el.dataset.casual || el.dataset.pro)
						: el.dataset.pro;
			el.textContent = text;
		}
	}

	function applyToggleUI(mode) {
		var state = document.querySelector('.mode-state');
		if (state) state.textContent = STATE_LABEL[mode];
		var btn = document.querySelector('.mode-toggle');
		if (btn) {
			btn.setAttribute('aria-pressed', mode === 'pro' ? 'true' : 'false');
			btn.setAttribute(
				'aria-label',
				'Professional Mode: ' + STATE_LABEL[mode] + ' — activate to change',
			);
		}
	}

	function set(mode, opts) {
		document.documentElement.dataset.mode = mode;
		persist(mode);
		applyCopy(mode);
		applyToggleUI(mode);
		if (mode === 'frog') startRain();
		else stopRain();
		document.dispatchEvent(
			new CustomEvent('modechange', { detail: { mode: mode, via: (opts && opts.via) || 'toggle' } }),
		);
	}

	function cycle() {
		set(ORDER[(ORDER.indexOf(current()) + 1) % ORDER.length]);
	}

	// ── Frog rain ─────────────────────────────────────────────
	// A fixed canvas overlay of small drawn frogs. Frog mode only;
	// disabled entirely under prefers-reduced-motion.
	var rain = null;

	function drawTinyFrog(ctx, size) {
		ctx.strokeStyle = 'rgba(0,0,0,0.28)';
		ctx.lineWidth = 1;
		ctx.fillStyle = '#3a9e57';
		ctx.beginPath();
		ctx.ellipse(0, size * 0.08, size * 0.58, size * 0.46, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#c6ebd0';
		ctx.beginPath();
		ctx.ellipse(0, size * 0.22, size * 0.34, size * 0.23, 0, 0, Math.PI * 2);
		ctx.fill();
		for (var s = -1; s <= 1; s += 2) {
			ctx.fillStyle = '#3a9e57';
			ctx.beginPath();
			ctx.arc(s * size * 0.27, -size * 0.34, size * 0.19, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = '#fff';
			ctx.beginPath();
			ctx.arc(s * size * 0.27, -size * 0.34, size * 0.11, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#111';
			ctx.beginPath();
			ctx.arc(s * size * 0.27 + 1, -size * 0.34, size * 0.055, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	function startRain() {
		if (rain) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		var canvas = document.querySelector('.frog-rain');
		if (!canvas) {
			canvas = document.createElement('canvas');
			canvas.className = 'frog-rain';
			canvas.setAttribute('aria-hidden', 'true');
			document.body.appendChild(canvas);
		}
		var ctx = canvas.getContext('2d');
		var frogs = [];
		var raf = null;

		function size() {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
		size();

		for (var i = 0; i < 18; i++) {
			frogs.push({
				x: Math.random() * canvas.width,
				y: -Math.random() * canvas.height,
				v: 0.7 + Math.random() * 1.6,
				s: 12 + Math.random() * 14,
				r: Math.random() * Math.PI * 2,
				vr: (Math.random() - 0.5) * 0.04,
			});
		}

		function tick() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			for (var i = 0; i < frogs.length; i++) {
				var f = frogs[i];
				f.y += f.v;
				f.r += f.vr;
				if (f.y - f.s > canvas.height) {
					f.y = -f.s * 2;
					f.x = Math.random() * canvas.width;
				}
				ctx.save();
				ctx.translate(f.x, f.y);
				ctx.rotate(f.r);
				drawTinyFrog(ctx, f.s);
				ctx.restore();
			}
			raf = requestAnimationFrame(tick);
		}
		raf = requestAnimationFrame(tick);

		window.addEventListener('resize', size);
		rain = {
			stop: function () {
				cancelAnimationFrame(raf);
				window.removeEventListener('resize', size);
				ctx.clearRect(0, 0, canvas.width, canvas.height);
			},
		};
	}

	function stopRain() {
		if (rain) {
			rain.stop();
			rain = null;
		}
	}

	// ── Toast (shared with eggs.js) ───────────────────────────
	var toastTimer = null;
	function toast(msg) {
		var el = document.querySelector('.toast');
		if (!el) {
			el = document.createElement('div');
			el.className = 'toast';
			el.setAttribute('role', 'status');
			document.body.appendChild(el);
		}
		el.textContent = msg;
		requestAnimationFrame(function () {
			el.classList.add('toast-show');
		});
		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () {
			el.classList.remove('toast-show');
		}, 3200);
	}

	// ── Wire up ───────────────────────────────────────────────
	document.addEventListener('DOMContentLoaded', function () {
		var btn = document.querySelector('.mode-toggle');
		if (btn) btn.addEventListener('click', cycle);
		// mode-boot set data-mode pre-paint; finish the job on the DOM.
		applyCopy(current());
		applyToggleUI(current());
		if (current() === 'frog') startRain();
	});

	window.Mode = { set: set, cycle: cycle, current: current, toast: toast };
})();
