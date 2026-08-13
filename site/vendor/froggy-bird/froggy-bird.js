/* froggy-bird v1.0.0 — vendored, do not edit; run scripts/sync-froggy.sh */
/* ============================================================
   froggy-bird.js — the Anuran Field Simulator, as a module
   Pilot a specimen along the wetland observation transect. Each
   reed (or fly) cleared logs one observation-hour. Endless, with
   field stations (environments), a heron hazard, collectible
   flies, data-gap events, certification ranks, and unlockable
   specimen skins. Vanilla canvas, no dependencies, no rasters.

   API:
     window.FroggyBird.init(el, opts?) → instance
     window.FroggyBird.pause()          pauses the active instance
     window.FroggyBird.destroy()        tears the active instance down

   One active instance per page. init() replaces any prior one.

   opts (all optional):
     storageKeys      { best, skin }  localStorage keys
     environments     replaces the ENVIRONMENTS array wholesale
     environmentLines [str] overrides just each environment's
                      intercom line, by index (colors untouched)
     skins            replaces the SKINS array wholesale
     ranks            replaces the RANKS array wholesale
     strings          shallow-merged over the default UI strings

   Styling: froggy-bird.css. Hosts theme it by setting --fb-*
   custom properties on any ancestor of the mount element.
   ============================================================ */

(function () {
	'use strict';

	// Field stations — the environments the transect cycles through. Add
	// more freely; `name`/`line` feed the intercom banner, the colours
	// re-tint the scene. `night` draws a moon + stars; `fog` hazes the view.
	const ENVIRONMENTS = [
		{ name: 'Reedmarsh', line: 'Conditions nominal. Observation continues.',
		  sky: ['#cfe8d6', '#8fc6a2'], reed: '#2f7d4a', edge: '#1a5230', pad: '#3a9159',
		  ground: 'rgba(26,107,58,0.10)', hud: 'rgba(14,38,24,0.88)' },
		{ name: 'Dusk Bog', line: 'Ambient light waning. Log accordingly.',
		  sky: ['#f2d7ac', '#9c7196'], reed: '#5a4a6e', edge: '#332844', pad: '#7a6690',
		  ground: 'rgba(51,40,68,0.16)', hud: 'rgba(40,28,54,0.9)' },
		{ name: 'Night Watch', line: 'Passive night monitoring engaged.',
		  sky: ['#12233a', '#0a1626'], reed: '#1c3a56', edge: '#0d1f30', pad: '#2b5578',
		  ground: 'rgba(10,22,38,0.5)', hud: '#bcd6ef', night: true },
		{ name: 'Fog Bank', line: 'Signal interference expected. Data integrity: nominal-ish.',
		  sky: ['#d8e0dc', '#aeb8b2'], reed: '#5f6f64', edge: '#3d4a41', pad: '#79897d',
		  ground: 'rgba(61,74,65,0.14)', hud: 'rgba(42,51,44,0.9)', fog: true },
		{ name: 'Frozen Fen', line: 'Cutaneous hydration: freezing. Observation continues.',
		  sky: ['#dff0f6', '#a7cfe0'], reed: '#6fa8c4', edge: '#3f7593', pad: '#8fc0d6',
		  ground: 'rgba(63,117,147,0.14)', hud: 'rgba(23,48,64,0.9)' },
	];
	const NIGHT_STARS = [[40, 40], [110, 24], [180, 60], [250, 30], [300, 70],
		[360, 36], [420, 58], [200, 100], [80, 90], [440, 100]];

	// Specimen skins — drawn (not emoji) so colour = identity. Unlock by best.
	const SKINS = [
		{ id: '7B', name: '7-B', body: '#3a9e57', belly: '#c6ebd0', desc: 'Marsh green (standard issue)', unlock: 0 },
		{ id: '12A', name: '12-A', body: '#3f7fd4', belly: '#d3e3ff', desc: 'Dendrobatid blue', unlock: 15 },
		{ id: '9D', name: '9-D', body: '#8a8f88', belly: '#dbdfd9', desc: 'Torpor grey', unlock: 30 },
		{ id: '1F', name: '1-F', body: '#d9a833', belly: '#f6e6b0', desc: 'Golden (rare)', unlock: 50 },
	];

	// Certification ranks — best score → in-character title.
	const RANKS = [
		{ min: 0, title: 'Trainee' },
		{ min: 10, title: 'Junior Field Observer' },
		{ min: 25, title: 'Senior Field Observer' },
		{ min: 45, title: 'Lead Observer' },
		{ min: 70, title: 'Director' },
	];

	const STRINGS = {
		unit: 'observation-hours',
		unitShort: 'hr',
		scoreLabel: 'OBSERVATION-HOURS',
		stationLabel: 'STATION',
		rankLabel: 'Certification',
		bestLabel: 'Personal best',
		specimenLabel: 'Specimen',
		begin: 'BEGIN SIMULATION',
		flap: 'FLAP',
		resume: 'RESUME',
		again: 'RUN AGAIN',
		readyTitle: 'ANURAN FIELD SIMULATOR',
		readySub: 'Flap to begin · clear the reeds',
		pausedTitle: 'OBSERVATION PAUSED',
		pausedSub: 'Flap to resume the transect',
		overHeron: 'ACQUIRED BY HERON',
		overFloor: 'SPECIMEN GROUNDED',
		overReed: 'SPECIMEN DOWN',
		dataGap: '▓ DATA GAP — RECONSTRUCTING FEED ▓',
		canvasLabel: 'Anuran Field Simulator — flap the specimen to clear the reeds',
	};

	function buildInstance(el, opts) {
		const cfg = {
			environments: opts.environments || ENVIRONMENTS.map((e) => ({ ...e })),
			skins: opts.skins || SKINS,
			ranks: opts.ranks || RANKS,
			strings: { ...STRINGS, ...(opts.strings || {}) },
			storageKeys: {
				best: 'froggy-bird-best',
				skin: 'froggy-bird-skin',
				...(opts.storageKeys || {}),
			},
		};
		if (opts.environmentLines) {
			opts.environmentLines.forEach((line, i) => {
				if (cfg.environments[i] && typeof line === 'string')
					cfg.environments[i].line = line;
			});
		}
		const S = cfg.strings;

		// ── Mount ─────────────────────────────────────────────────
		el.innerHTML = `
      <div class="fb-root">
        <div class="fb-stage">
          <canvas class="fb-canvas" width="480" height="360"></canvas>
        </div>
        <div class="fb-meta">
          <button type="button" class="fb-btn"></button>
          <div class="fb-stats">
            <span>${S.rankLabel}: <strong class="fb-rank"></strong></span>
            <span>${S.bestLabel}: <strong class="fb-best">0</strong> ${S.unit}</span>
          </div>
        </div>
        <div class="fb-skins"></div>
      </div>
    `;
		const root = el.querySelector('.fb-root');
		const canvas = el.querySelector('.fb-canvas');
		const btn = el.querySelector('.fb-btn');
		const bestEl = el.querySelector('.fb-best');
		const rankEl = el.querySelector('.fb-rank');
		const skinsEl = el.querySelector('.fb-skins');
		canvas.setAttribute('aria-label', S.canvasLabel);
		const ctx = canvas.getContext('2d');

		// Logical play-field; upscale for crisp rendering on HiDPI.
		const W = 480,
			H = 360;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = W * dpr;
		canvas.height = H * dpr;
		ctx.scale(dpr, dpr);

		// Physics (logical px / 60fps-frame; dt-normalized in the loop).
		const FX = 100, // frog x (fixed)
			R = 13, // frog collision radius
			G = 0.42, // gravity
			FLAP = -6.7, // flap impulse (velocity set)
			RW = 54, // reed width
			GAP = 138, // vertical gap
			SPACING = 220, // horizontal spacing between reeds
			MARGIN = 46, // min gap distance from top/bottom
			GAP_SHIFT = 96, // max vertical move between consecutive gaps
			STATION_LEN = 6; // observation-hours per field station

		const rankFor = (n) => {
			let t = cfg.ranks[0].title;
			for (const r of cfg.ranks) if (n >= r.min) t = r.title;
			return t;
		};

		let best = 0,
			skinId = cfg.skins[0].id;
		try {
			best = parseInt(localStorage.getItem(cfg.storageKeys.best), 10) || 0;
			skinId = localStorage.getItem(cfg.storageKeys.skin) || skinId;
		} catch (e) {}

		const skinById = (id) => cfg.skins.find((s) => s.id === id) || cfg.skins[0];
		// Selected skin only applies if it's unlocked at the current best.
		const currentSkin = () => {
			const s = skinById(skinId);
			return s.unlock <= best ? s : cfg.skins[0];
		};

		let state = 'ready'; // ready | running | paused | over
		let fy, vy, reeds, score, speed, station, deadBy;
		let heron, heronCd, fly, flyCd, flyPop, dataGapTtl, dataGapCd, bannerTtl, bannerText;
		let raf = null,
			last = 0;

		const env = () => cfg.environments[(station - 1) % cfg.environments.length];

		// Next gap is randomised but constrained to stay within a reachable
		// vertical shift of the previous one — a big fast swing between
		// far-apart gaps is what made the run unbeatable past ~11.
		const gapLo = MARGIN,
			gapHi = H - GAP - MARGIN;
		const nextGap = (prev) => {
			if (prev == null) return (H - GAP) / 2; // first gap centred: fair start
			const lo = Math.max(gapLo, prev - GAP_SHIFT);
			const hi = Math.min(gapHi, prev + GAP_SHIFT);
			return lo + Math.random() * (hi - lo);
		};

		const reset = () => {
			fy = H * 0.42;
			vy = 0;
			score = 0;
			speed = 2.2;
			station = 1;
			reeds = [{ x: W + 30, gap: nextGap(null), passed: false }];
			heron = null;
			heronCd = 300;
			fly = null;
			flyCd = 240;
			flyPop = null;
			dataGapTtl = 0;
			dataGapCd = 520;
			bannerTtl = 0;
			bannerText = '';
		};
		reset();

		// One observation-hour banked (reed cleared or fly caught). Bumps speed
		// and advances the field station, firing the intercom banner on change.
		const award = () => {
			score++;
			speed = Math.min(4.2, 2.2 + score * 0.09);
			const ns = Math.floor(score / STATION_LEN) + 1;
			if (ns !== station) {
				station = ns;
				const e = env();
				bannerText = S.stationLabel + ' ' + station + ' — ' + e.name.toUpperCase();
				bannerTtl = 150;
			}
		};

		// ── UI: rank, best, skin picker ───────────────────────────
		const updateStats = () => {
			if (bestEl) bestEl.textContent = best;
			if (rankEl) rankEl.textContent = rankFor(best);
		};

		const renderSkins = () => {
			if (!skinsEl) return;
			skinsEl.innerHTML =
				'<span class="fb-skins-label">' + S.specimenLabel + '</span>';
			cfg.skins.forEach((s) => {
				const unlocked = s.unlock <= best;
				const b = document.createElement('button');
				b.type = 'button';
				b.className =
					'fb-skin' +
					(unlocked && s.id === skinId ? ' fb-skin-on' : '') +
					(unlocked ? '' : ' fb-skin-locked');
				b.disabled = !unlocked;
				b.title = unlocked
					? s.desc
					: 'Unlocks at ' + s.unlock + ' best ' + S.unit;
				b.innerHTML =
					'<span class="fb-swatch" style="background:' + s.body + '"></span>' +
					s.name +
					(unlocked ? '' : ' <span class="fb-lock">🔒 ' + s.unlock + '</span>');
				if (unlocked)
					b.addEventListener('click', () => {
						skinId = s.id;
						try {
							localStorage.setItem(cfg.storageKeys.skin, skinId);
						} catch (e) {}
						renderSkins();
						draw();
					});
				skinsEl.appendChild(b);
			});
		};

		const setBtn = () => {
			if (!btn) return;
			btn.textContent =
				state === 'over'
					? S.again
					: state === 'paused'
						? S.resume
						: state === 'running'
							? S.flap
							: S.begin;
		};

		// ── Loop control ──────────────────────────────────────────
		const startLoop = () => {
			if (raf) return;
			last = 0;
			raf = requestAnimationFrame(loop);
		};
		const stopLoop = () => {
			if (raf) cancelAnimationFrame(raf);
			raf = null;
		};

		const flap = () => {
			if (state === 'ready' || state === 'over') {
				reset();
				state = 'running';
				vy = FLAP;
				startLoop();
			} else if (state === 'paused') {
				state = 'running';
				startLoop();
			} else if (state === 'running') {
				vy = FLAP;
			}
			setBtn();
		};

		const pause = () => {
			if (state === 'running') {
				state = 'paused';
				stopLoop();
				draw();
				setBtn();
			}
		};

		const gameOver = (cause) => {
			deadBy = cause;
			state = 'over';
			if (score > best) {
				best = score;
				try {
					localStorage.setItem(cfg.storageKeys.best, best);
				} catch (e) {}
				updateStats();
				renderSkins(); // a new best may unlock a specimen
			}
			stopLoop();
			draw();
			setBtn();
		};

		// ── Collision ─────────────────────────────────────────────
		const hitReed = (rd) => {
			if (FX + R < rd.x || FX - R > rd.x + RW) return false;
			return fy - R < rd.gap || fy + R > rd.gap + GAP;
		};
		const heronY = () => heron.y + Math.sin(heron.phase) * heron.bob;

		// ── Simulation step ───────────────────────────────────────
		const update = (dt) => {
			vy += G * dt;
			fy += vy * dt;
			if (fy - R < 0) {
				fy = R; // ceiling clamps, doesn't kill
				vy = 0;
			}
			if (fy + R > H) {
				fy = H - R; // the marsh floor, however, is fatal
				gameOver('floor');
				return;
			}

			// Reeds: move, spawn, score, collide, cull.
			for (const rd of reeds) rd.x -= speed * dt;
			const lastReed = reeds[reeds.length - 1];
			if (lastReed.x < W - SPACING)
				reeds.push({ x: W, gap: nextGap(lastReed.gap), passed: false });
			for (const rd of reeds) {
				if (!rd.passed && rd.x + RW < FX) {
					rd.passed = true;
					award();
				}
				if (hitReed(rd)) {
					gameOver('reed');
					return;
				}
			}
			reeds = reeds.filter((rd) => rd.x + RW > -10);

			// Intercom banner countdown.
			if (bannerTtl > 0) bannerTtl -= dt;

			// Heron hazard — enters from station 2 on. "heron."
			if (heron) {
				heron.x += heron.vx * dt;
				heron.phase += 0.1 * dt;
				if (Math.hypot(FX - heron.x, fy - heronY()) < R + 13) {
					gameOver('heron');
					return;
				}
				if (heron.x < -60) heron = null;
			} else if (station >= 2) {
				// Only tick the cooldown once herons are in play, so the first
				// one appears a fair interval AFTER reaching station 2 (rather
				// than instantly, from a counter that ran down during station 1).
				heronCd -= dt;
				if (heronCd <= 0) {
					heron = {
						x: W + 50,
						y: MARGIN + 20 + Math.random() * (H - 2 * MARGIN - 70),
						vx: -(speed * 1.5 + 1.0),
						phase: Math.random() * 6.28,
						bob: 5 + Math.random() * 6,
					};
					heronCd = 380 + Math.random() * 340;
				}
			}

			// Flies — collectible bonus observation-hours, riding a reed gap.
			if (fly) {
				fly.x -= speed * dt;
				if (Math.hypot(FX - fly.x, fy - fly.y) < R + 9) {
					award();
					flyPop = { x: fly.x, y: fly.y, ttl: 28 };
					fly = null;
					flyCd = 260 + Math.random() * 260;
				} else if (fly.x < -14) {
					fly = null;
					flyCd = 200 + Math.random() * 200;
				}
			} else {
				flyCd -= dt;
				if (flyCd <= 0 && reeds.length) {
					const near = reeds[reeds.length - 1];
					fly = { x: W + 20, y: near.gap + GAP / 2 + (Math.random() * 40 - 20) };
				}
			}
			if (flyPop) {
				flyPop.ttl -= dt;
				flyPop.y -= 0.6 * dt;
				if (flyPop.ttl <= 0) flyPop = null; // else it re-brightens + drifts forever
			}

			// Data-gap events — from station 3 on, the feed briefly drops.
			// Cooldown only ticks once eligible, so the first gap doesn't fire
			// the instant station 3 begins.
			if (dataGapTtl > 0) dataGapTtl -= dt;
			else if (station >= 3) {
				dataGapCd -= dt;
				if (dataGapCd <= 0) {
					dataGapTtl = 78;
					dataGapCd = 560 + Math.random() * 380;
				}
			}
		};

		// ── Rendering ─────────────────────────────────────────────
		const drawBg = (e) => {
			// Build the sky gradient once per environment, then reuse it (was
			// re-allocated ~60×/s, avoidable GC churn on low-end devices).
			if (!e._grad) {
				const g = ctx.createLinearGradient(0, 0, 0, H);
				g.addColorStop(0, e.sky[0]);
				g.addColorStop(1, e.sky[1]);
				e._grad = g;
			}
			ctx.fillStyle = e._grad;
			ctx.fillRect(0, 0, W, H);
			if (e.night) {
				ctx.fillStyle = 'rgba(255,255,255,0.9)';
				ctx.beginPath();
				ctx.arc(W - 62, 56, 15, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = 'rgba(255,255,255,0.4)';
				for (const [sx, sy] of NIGHT_STARS) ctx.fillRect(sx, sy, 2, 2);
			}
			ctx.fillStyle = e.ground;
			ctx.fillRect(0, H - 26, W, 26);
		};

		const drawReed = (rd, e, alpha) => {
			ctx.globalAlpha = alpha;
			ctx.fillStyle = e.reed;
			ctx.strokeStyle = e.edge;
			ctx.lineWidth = 2;
			ctx.fillRect(rd.x, 0, RW, rd.gap);
			ctx.strokeRect(rd.x, 0, RW, rd.gap);
			ctx.fillRect(rd.x, rd.gap + GAP, RW, H - rd.gap - GAP);
			ctx.strokeRect(rd.x, rd.gap + GAP, RW, H - rd.gap - GAP);
			ctx.fillStyle = e.pad;
			ctx.beginPath();
			ctx.ellipse(rd.x + RW / 2, rd.gap, RW / 2 + 4, 9, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.ellipse(rd.x + RW / 2, rd.gap + GAP, RW / 2 + 4, 9, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalAlpha = 1;
		};

		const drawFly = (fx2, fy2) => {
			ctx.font = '16px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('🪰', fx2, fy2);
		};

		const drawHeron = (hx, hy) => {
			ctx.save();
			ctx.translate(hx, hy);
			ctx.strokeStyle = '#5c666d';
			ctx.lineWidth = 1.5;
			// body
			ctx.fillStyle = '#8a97a0';
			ctx.beginPath();
			ctx.ellipse(0, 0, 20, 9, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			// wing
			ctx.fillStyle = '#6f7c85';
			ctx.beginPath();
			ctx.moveTo(4, -2);
			ctx.lineTo(-14, -15);
			ctx.lineTo(-6, 2);
			ctx.closePath();
			ctx.fill();
			// neck + head (facing left, the way it's flying)
			ctx.strokeStyle = '#8a97a0';
			ctx.lineWidth = 4;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(-15, -2);
			ctx.lineTo(-24, -12);
			ctx.stroke();
			ctx.fillStyle = '#8a97a0';
			ctx.beginPath();
			ctx.arc(-25, -13, 4, 0, Math.PI * 2);
			ctx.fill();
			// beak
			ctx.fillStyle = '#e0b23a';
			ctx.beginPath();
			ctx.moveTo(-28, -14);
			ctx.lineTo(-39, -11);
			ctx.lineTo(-28, -10);
			ctx.closePath();
			ctx.fill();
			// trailing legs
			ctx.strokeStyle = '#e0b23a';
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(14, 4);
			ctx.lineTo(27, 12);
			ctx.moveTo(16, 5);
			ctx.lineTo(29, 9);
			ctx.stroke();
			ctx.restore();
		};

		const drawFrog = () => {
			const s = currentSkin();
			const tilt = Math.max(-0.4, Math.min(0.9, vy * 0.05));
			ctx.save();
			ctx.translate(FX, fy);
			ctx.rotate(tilt);
			ctx.strokeStyle = 'rgba(0,0,0,0.28)';
			ctx.lineWidth = 1.5;
			// body
			ctx.fillStyle = s.body;
			ctx.beginPath();
			ctx.ellipse(0, 2, 15, 12, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			// belly
			ctx.fillStyle = s.belly;
			ctx.beginPath();
			ctx.ellipse(0, 6, 9, 6, 0, 0, Math.PI * 2);
			ctx.fill();
			// eyes (two bumps up top)
			for (const ex of [-7, 7]) {
				ctx.fillStyle = s.body;
				ctx.beginPath();
				ctx.arc(ex, -9, 5, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = '#fff';
				ctx.beginPath();
				ctx.arc(ex, -9, 3, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = '#111';
				ctx.beginPath();
				ctx.arc(ex + 1, -9, 1.6, 0, Math.PI * 2);
				ctx.fill();
			}
			// smile
			ctx.strokeStyle = 'rgba(0,0,0,0.35)';
			ctx.lineWidth = 1.2;
			ctx.beginPath();
			ctx.arc(0, 3, 6, 0.15 * Math.PI, 0.85 * Math.PI);
			ctx.stroke();
			ctx.restore();
		};

		const overlay = (title, sub) => {
			ctx.fillStyle = 'rgba(9,26,16,0.6)';
			ctx.fillRect(0, H / 2 - 46, W, 92);
			ctx.textAlign = 'center';
			ctx.fillStyle = '#eafff0';
			ctx.font = 'bold 22px Georgia, serif';
			ctx.fillText(title, W / 2, H / 2 - 8);
			ctx.font = '12px Arial, sans-serif';
			ctx.fillStyle = 'rgba(234,255,240,0.85)';
			ctx.fillText(sub, W / 2, H / 2 + 20);
		};

		const drawBanner = (e) => {
			const a = Math.min(1, bannerTtl / 30);
			ctx.globalAlpha = a;
			const bw = Math.min(W - 40, 360),
				bh = 42,
				bx = (W - bw) / 2,
				by = 56;
			ctx.fillStyle = 'rgba(9,26,16,0.85)';
			ctx.fillRect(bx, by, bw, bh);
			ctx.textAlign = 'center';
			ctx.fillStyle = '#eafff0';
			ctx.font = 'bold 12px Arial, sans-serif';
			ctx.fillText('◈ ' + bannerText, W / 2, by + 17);
			ctx.fillStyle = 'rgba(234,255,240,0.85)';
			ctx.font = '11px Arial, sans-serif';
			ctx.fillText(e.line, W / 2, by + 32);
			ctx.globalAlpha = 1;
		};

		const draw = () => {
			const e = env();
			drawBg(e);

			const reedAlpha = dataGapTtl > 0 ? 0.2 : 1;
			for (const rd of reeds) drawReed(rd, e, reedAlpha);
			if (fly) drawFly(fly.x, fly.y);
			if (heron) drawHeron(heron.x, heronY());
			drawFrog();
			if (flyPop) {
				ctx.globalAlpha = Math.min(1, flyPop.ttl / 20);
				ctx.fillStyle = '#155e2e';
				ctx.font = 'bold 13px Arial, sans-serif';
				ctx.textAlign = 'center';
				ctx.fillText('+1 ' + S.unitShort, flyPop.x, flyPop.y);
				ctx.globalAlpha = 1;
			}
			if (e.fog) {
				ctx.fillStyle = 'rgba(222,229,225,0.3)';
				ctx.fillRect(0, 0, W, H);
			}

			// HUD.
			ctx.fillStyle = e.hud;
			ctx.font = 'bold 14px Arial, sans-serif';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'alphabetic';
			ctx.fillText(S.scoreLabel + ': ' + score, 12, 24);
			ctx.font = '11px Arial, sans-serif';
			ctx.fillText(S.stationLabel + ' ' + station + ' · ' + e.name.toUpperCase(), 12, 40);

			if (dataGapTtl > 0) {
				ctx.textAlign = 'center';
				ctx.fillStyle = e.night ? '#ffd27a' : '#a5341f';
				ctx.font = 'bold 12px Arial, sans-serif';
				ctx.fillText(S.dataGap, W / 2, 20);
			}

			if (bannerTtl > 0) drawBanner(e);

			if (state === 'ready') overlay(S.readyTitle, S.readySub);
			else if (state === 'paused') overlay(S.pausedTitle, S.pausedSub);
			else if (state === 'over') {
				const t =
					deadBy === 'heron'
						? S.overHeron
						: deadBy === 'floor'
							? S.overFloor
							: S.overReed;
				overlay(
					t,
					'Logged ' + score + ' ' + S.unitShort + ' · best ' + best + ' · ' + rankFor(best) + ' · flap to retry',
				);
			}
		};

		const loop = (now) => {
			if (state !== 'running') {
				raf = null;
				return;
			}
			if (!last) last = now;
			let dt = (now - last) / 16.667;
			last = now;
			if (dt > 3) dt = 3; // clamp big gaps (e.g. returning to the tab)
			// Integrate in ≤1-frame sub-steps so a slow/janky frame can't lurch
			// the frog a whole reed's width in one hop (collision tunnelling /
			// unavoidable deaths). update() is displacement- and flag-based, so
			// N sub-steps of dt/N are equivalent to one step for a smooth frame.
			let remaining = dt;
			while (remaining > 0 && state === 'running') {
				const step = Math.min(remaining, 1);
				update(step);
				remaining -= step;
			}
			if (state === 'running') {
				draw();
				raf = requestAnimationFrame(loop);
			} else {
				raf = null;
			}
		};

		// ── Input ─────────────────────────────────────────────────
		// Document-level listeners are tracked so destroy() can remove them.
		const onPointer = (e) => {
			e.preventDefault();
			flap();
		};
		const onKey = (e) => {
			if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
			// Only flap while the game is actually visible (a hidden host —
			// e.g. an inactive tab-panel — has no offsetParent).
			if (!root.isConnected || root.offsetParent === null) return;
			// Don't hijack Space/ArrowUp when a real control is focused (a tab
			// button, link, or form field) — let it activate/scroll normally.
			const t = e.target;
			if (t && typeof t.closest === 'function' &&
				t.closest('button, a, input, select, textarea')) return;
			e.preventDefault();
			flap();
		};
		const onVisibility = () => {
			if (document.hidden) pause();
		};

		canvas.addEventListener('pointerdown', onPointer);
		if (btn) btn.addEventListener('click', () => flap());
		document.addEventListener('keydown', onKey);
		document.addEventListener('visibilitychange', onVisibility);

		const destroy = () => {
			stopLoop();
			state = 'over';
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('visibilitychange', onVisibility);
			el.innerHTML = '';
		};

		updateStats();
		renderSkins();
		draw();
		setBtn();

		return { pause, destroy };
	}

	let active = null;

	window.FroggyBird = {
		init(el, opts) {
			if (!el) return null;
			if (active) this.destroy();
			active = buildInstance(el, opts || {});
			return active;
		},
		pause() {
			if (active) active.pause();
		},
		destroy() {
			if (active) {
				active.destroy();
				active = null;
			}
		},
	};
})();
