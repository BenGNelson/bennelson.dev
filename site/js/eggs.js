/* ============================================================
   eggs.js — the parts nobody is told about.
   Konami code → straight to frog mode, with an achievement.
   Plus a console note for the kind of person who opens consoles.
   ============================================================ */

(function () {
	'use strict';

	// ── Konami ────────────────────────────────────────────────
	var SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
		'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
	var at = 0;

	document.addEventListener('keydown', function (e) {
		at = e.code === SEQ[at] ? at + 1 : (e.code === SEQ[0] ? 1 : 0);
		if (at === SEQ.length) {
			at = 0;
			if (window.Mode) {
				window.Mode.set('frog', { via: 'konami' });
				window.Mode.toast('🏆 ACHIEVEMENT UNLOCKED: zero professionalism');
			}
		}
	});

	// ── Console note ──────────────────────────────────────────
	try {
		console.log(
			'%cben@bennelson.dev:~$ %cwhoami',
			'color:#3fb950;font-family:monospace',
			'color:#d7dee6;font-family:monospace',
		);
		console.log(
			'%cA person who self-hosts things. You opened the console, so you should\n' +
			'know: the Professional Mode toggle in the header goes further than one\n' +
			'click. And a certain 1986 cheat code still works.',
			'color:#7f8d9b;font-family:monospace;line-height:1.6',
		);
	} catch (e) {}
})();
