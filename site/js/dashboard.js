/* ============================================================
   dashboard.js — the live bits of the status page.
   Uptime and version are computed from the boot date so nothing
   here goes stale. The version scheme is uptime-semver:
   years.months.days since boot.
   ============================================================ */

(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		var hero = document.querySelector('[data-boot]');
		if (!hero) return;
		var parts = hero.dataset.boot.split('-').map(Number);
		var boot = new Date(parts[0], parts[1] - 1, parts[2]);

		var verEl = document.querySelector('.hero-version');
		var upEl = document.querySelector('.g-uptime');

		function diffParts(now) {
			var y = now.getFullYear() - boot.getFullYear();
			var m = now.getMonth() - boot.getMonth();
			var d = now.getDate() - boot.getDate();
			if (d < 0) {
				m -= 1;
				d += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
			}
			if (m < 0) {
				y -= 1;
				m += 12;
			}
			return { y: y, m: m, d: d };
		}

		function pad(n) {
			return (n < 10 ? '0' : '') + n;
		}

		function render() {
			var now = new Date();
			var p = diffParts(now);
			if (verEl) verEl.textContent = 'v' + p.y + '.' + p.m + '.' + p.d;
			if (upEl) {
				var days = Math.floor((now - boot) / 864e5);
				upEl.textContent =
					days + 'd ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
			}
		}

		render();
		setInterval(render, 1000);
	});
})();
