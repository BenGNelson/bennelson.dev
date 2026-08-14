/* Pre-paint mode restore. Loaded synchronously in <head> so the page never
   flashes the wrong mode. Modes expire after 7 days — a recruiter on a shared
   machine gets Professional, not Comic Sans. */
(function () {
	'use strict';
	var mode = 'pro';
	try {
		var s = JSON.parse(localStorage.getItem('bennelson.mode') || '{}');
		var WEEK = 6048e5;
		if (s && s.m === 'frog' && s.t && Date.now() - s.t < WEEK) {
			mode = s.m;
		}
	} catch (e) {}
	document.documentElement.dataset.mode = mode;
})();
