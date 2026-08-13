/* Mounts the vendored froggy-bird module on /froggy-bird/. External file
   because the CSP allows no inline scripts anywhere on this site. */
(function () {
	'use strict';
	document.addEventListener('DOMContentLoaded', function () {
		if (window.FroggyBird) {
			window.FroggyBird.init(document.getElementById('game'));
		}
	});
})();
