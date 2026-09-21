(function () {
	'use strict';

	var MOD_ID = 'nerdy info mod';
	var TARGET_VERSION = 2.053;
	var MAX_PREDICTIONS = 20;
	var DRAW_INTERVAL = 10;
	var FREEBIE_LIMIT = 15;
	var state = {
		button: null,
		freebiesButton: null,
		nerdCookieButton: null,
		scrollWheelButton: null,
		scrollWheelElement: null,
		scrollWheelHandler: null,
		lastDraw: -1,
		lastSnapshotKey: '',
		style: null,
		cookieTexture: 'vanilla',
	};
	var nerdCookieEnabled = false;
	var scrollWheelClickEnabled = false;

	function getElement(id) {
		return document.getElementById(id);
	}

	function getModAssetUrl(filename) {
		var mod = Game.mods && Game.mods[MOD_ID];
		var directory = mod && mod.dir;
		if (!directory) return filename;
		return directory.replace(/\\/g, '/').replace(/\/+$/, '') + '/' + filename;
	}

	function updateBigCookieTexture() {
		if (!Game.Loader || !Game.Loader.Replace) return;

		var desiredTexture = nerdCookieEnabled ? 'nerd' : 'vanilla';
		if (state.cookieTexture === desiredTexture) return;

		var textureUrl = nerdCookieEnabled
			? getModAssetUrl('nerd-cookie.png')
			: Game.resPath + 'img/perfectCookie.png';
		Game.Loader.Replace('perfectCookie.png', textureUrl);
		state.cookieTexture = desiredTexture;
	}

	function updateBigCookie() {
		var bigCookie = getElement('bigCookie');
		if (!bigCookie) return;

		if (nerdCookieEnabled) {
			// The visible cookie is drawn by Cookie Clicker's background canvas.
			// Keep this button visually empty so it remains only the vanilla hitbox.
			bigCookie.style.backgroundImage = 'url(' + Game.resPath + 'img/empty.png)';
		} else {
			bigCookie.style.backgroundImage = '';
		}

			updateBigCookieTexture();
	}

	function updateNerdCookieButton() {
		if (!state.nerdCookieButton) return;
		state.nerdCookieButton.textContent = 'Nerd cookie ' + (nerdCookieEnabled ? 'ON' : 'OFF');
		state.nerdCookieButton.className = 'smallFancyButton prefButton option' + (nerdCookieEnabled ? '' : ' off');
		state.nerdCookieButton.setAttribute('aria-pressed', nerdCookieEnabled ? 'true' : 'false');
	}

	function toggleNerdCookie() {
		nerdCookieEnabled = !nerdCookieEnabled;
		updateBigCookie();
		updateNerdCookieButton();
		Game.toSave = true;
		PlaySound('snd/tick.mp3');
	}

	function updateScrollWheelButton() {
		if (!state.scrollWheelButton) return;
		state.scrollWheelButton.textContent = 'Scroll wheel clicks ' + (scrollWheelClickEnabled ? 'ON' : 'OFF');
		state.scrollWheelButton.className = 'smallFancyButton prefButton option' + (scrollWheelClickEnabled ? '' : ' off');
		state.scrollWheelButton.setAttribute('aria-pressed', scrollWheelClickEnabled ? 'true' : 'false');
	}

	function removeScrollWheelListener() {
		if (state.scrollWheelElement && state.scrollWheelHandler) {
			state.scrollWheelElement.removeEventListener('wheel', state.scrollWheelHandler);
		}
		state.scrollWheelElement = null;
		state.scrollWheelHandler = null;
	}

	function syncScrollWheelListener() {
		var bigCookie = getElement('bigCookie');
		if (!scrollWheelClickEnabled || !bigCookie || typeof Game.ClickCookie !== 'function') {
			removeScrollWheelListener();
			return;
		}
		if (state.scrollWheelElement === bigCookie) return;

		removeScrollWheelListener();
		state.scrollWheelElement = bigCookie;
		state.scrollWheelHandler = function (event) {
			event.preventDefault();
			Game.lastActivity = Game.time;
			// detail:1 keeps this as a normal single click under the vanilla
			// click-rate guard; the wheel event itself is never replayed.
			Game.ClickCookie({detail: 1, preventDefault: function () {}});
		};
		bigCookie.addEventListener('wheel', state.scrollWheelHandler, {passive: false});
	}

	function toggleScrollWheelClick() {
		scrollWheelClickEnabled = !scrollWheelClickEnabled;
		syncScrollWheelListener();
		updateScrollWheelButton();
		Game.toSave = true;
		PlaySound('snd/tick.mp3');
	}

	function addNerdCookieOption() {
		if (Game.onMenu !== 'prefs') return;
		if (getElement('nerdyInfoNerdCookieOption')) return;

		var menu = getElement('menu');
		if (!menu) return;

		var settingsSubsection = null;
		var titles = menu.querySelectorAll('.subsection .title');
		for (var i = 0; i < titles.length; i++) {
			if (titles[i].textContent.trim() === loc('Settings')) {
				settingsSubsection = titles[i].parentNode;
				break;
			}
		}
		if (!settingsSubsection) return;

		var listing = document.createElement('div');
		listing.id = 'nerdyInfoNerdCookieOption';
		listing.className = 'listing';

		var button = document.createElement('a');
		button.className = 'smallFancyButton prefButton option';
		button.style.cursor = 'pointer';
		button.title = 'Replace the normal big cookie with nerd-cookie.png';
		button.addEventListener('click', toggleNerdCookie);
		listing.appendChild(button);

		var label = document.createElement('label');
		label.textContent = 'nerd cookie hehehe';
		listing.appendChild(label);

		settingsSubsection.appendChild(listing);
		state.nerdCookieButton = button;
		updateNerdCookieButton();

		var scrollListing = document.createElement('div');
		scrollListing.id = 'nerdyInfoScrollWheelOption';
		scrollListing.className = 'listing';

		var scrollButton = document.createElement('a');
		scrollButton.className = 'smallFancyButton prefButton option';
		scrollButton.style.cursor = 'pointer';
		scrollButton.title = 'Click the big cookie once for each mouse-wheel tick';
		scrollButton.addEventListener('click', toggleScrollWheelClick);
		scrollListing.appendChild(scrollButton);

		var scrollLabel = document.createElement('label');
		scrollLabel.textContent = 'one cookie click per scroll tick';
		scrollListing.appendChild(scrollLabel);

		settingsSubsection.appendChild(scrollListing);
		state.scrollWheelButton = scrollButton;
		updateScrollWheelButton();
	}

	/*
	 * Small, side-effect-free implementation of the seedrandom algorithm used by
	 * Cookie Clicker. It intentionally exposes only the seeded random sequence
	 * needed by the predictor and never changes Math.random or Game state.
	 */
	function seededRandomFactory(seed) {
		var width = 256;
		var chunks = 6;
		var digits = 52;
		var startDenom = Math.pow(width, chunks);
		var significance = Math.pow(2, digits);
		var overflow = significance * 2;
		var mask = width - 1;

		function flatten(value, depth) {
			var result = [];
			var type = (typeof value).charAt(0);
			var key;
			if (depth && type === 'o') {
				for (key in value) {
					try { result.push(flatten(value[key], depth - 1)); } catch (ignore) {}
				}
			}
			return result.length ? result : (type === 's' ? value : String(value) + '\0');
		}

		function mix(data, pool) {
			var previous;
			var text = String(data);
			for (var i = 0; i < text.length; i++) {
				pool[i & mask] = mask & ((previous ^= 19 * pool[i & mask]) + text.charCodeAt(i));
			}
			return String.fromCharCode.apply(0, pool);
		}

		function arc4(key) {
			var i;
			var j = 0;
			var s = [];
			for (i = 0; i < width; i++) s[i] = i;
			for (i = 0; i < width; i++) {
				var t = s[i];
				j = mask & (j + key[i % key.length] + t);
				s[i] = s[j];
				s[j] = t;
			}
			this.i = 0;
			this.j = 0;
			this.s = s;
		}

		arc4.prototype.generate = function (count) {
			var r = 0;
			var i = this.i;
			var j = this.j;
			var s = this.s;
			while (count--) {
				var t = s[i = mask & (i + 1)];
				j = mask & (j + t);
				s[i] = s[j];
				s[j] = t;
				r = r * width + s[mask & (s[i] + s[j])];
			}
			this.i = i;
			this.j = j;
			return r;
		};

		var pool = [];
		var keyString = mix(flatten(seed, 3), pool);
		var key = [];
		for (var k = 0; k < keyString.length; k++) key[k] = keyString.charCodeAt(k);
		var generator = new arc4(key.length ? key : [0]);
		generator.generate(width);
		mix(String.fromCharCode.apply(0, generator.s), pool);

		return function () {
			var n = generator.generate(chunks);
			var divisor = startDenom;
			var compensation = 0;
			while (n < significance) {
				n = (n + compensation) * width;
				divisor *= width;
				compensation = generator.generate(1);
			}
			while (n >= overflow) {
				n /= 2;
				divisor /= 2;
				compensation >>>= 1;
			}
			return (n + compensation) / divisor;
		};
	}

	function choose(values, random) {
		return values[Math.floor(random() * values.length)];
	}

	function getBackfireChance(snapshot) {
		var chance = 0.15;
		chance *= 1 + 0.1 * snapshot.supremeIntellect;
		if (snapshot.magicInept) chance *= 5;
		if (snapshot.diminishIneptitude) chance *= 0.1;
		return chance + 0.15 * snapshot.goldenCookiesOnScreen;
	}

	function forcedCookie(random, snapshot, wrath) {
		var choices;
		if (!wrath) {
			choices = ['Frenzy', 'Lucky'];
			if (!snapshot.dragonflight) choices.push('Click frenzy');
			if (random() < 0.1) choices.push('Cookie storm', 'Cookie storm', 'Blab');
			if (snapshot.buildingsOwned >= 10 && random() < 0.25) choices.push('Building special');
			if (random() < 0.15) choices = ['Cookie storm drop'];
			if (random() < 0.0001) choices.push('Free sugar lump');
		} else {
			choices = ['Clot', 'Ruin cookies'];
			if (random() < 0.1) choices.push('Cursed finger', 'Blood frenzy');
			if (random() < 0.003) choices.push('Free sugar lump');
			if (random() < 0.1) choices = ['Blab'];
		}
		return choose(choices, random);
	}

	function predict(snapshot, count) {
		var predictions = [];
		var amount = Math.max(1, Math.min(MAX_PREDICTIONS, count || 10));
		var backfireChance = getBackfireChance(snapshot);

		for (var index = 0; index < amount; index++) {
			var spellIndex = snapshot.spellsCastTotal + index;
			var random = seededRandomFactory(snapshot.seed + '/' + spellIndex);
			var randomSeed = random();
			var backfires = randomSeed >= 1 - backfireChance;
			var effect = forcedCookie(random, snapshot, backfires);
			predictions.push({
				index: index + 1,
				spellIndex: spellIndex,
				backfires: backfires,
				effect: effect,
				randomSeed: randomSeed,
				backfireChance: backfireChance,
			});
		}
		return predictions;
	}

	function snapshotGame() {
		var tower = Game.Objects && Game.Objects['Wizard tower'];
		var grimoire = tower && tower.minigame;
		if (!grimoire || typeof Game.seed !== 'string' || typeof grimoire.spellsCastTotal !== 'number') return null;
		return {
			seed: Game.seed,
			spellsCastTotal: grimoire.spellsCastTotal,
			goldenCookiesOnScreen: Game.shimmerTypes && Game.shimmerTypes.golden ? Game.shimmerTypes.golden.n : 0,
			buildingsOwned: Game.BuildingsOwned || 0,
			dragonflight: !!(Game.hasBuff && Game.hasBuff('Dragonflight')),
			supremeIntellect: Game.auraMult ? (Game.auraMult('Supreme Intellect') || 0) : 0,
			magicInept: !!(Game.hasBuff && Game.hasBuff('Magic inept')),
			diminishIneptitude: !!(Game.hasBuff && Game.hasBuff('Magic adept')),
			version: Game.version,
		};
	}

	function formatChance(chance) {
		return (chance * 100).toFixed(2) + '%';
	}

	function openPlanner() {
		var snapshot = snapshotGame();
		if (!snapshot) {
			Game.Prompt('<id NerdyInfoUnavailable><h3>FtHoF planner</h3><div class="block">The Grimoire state is not available yet. Open the Grimoire once, then try again.</div>', ['Back']);
			return;
		}
		if (Math.abs(parseFloat(Game.version) - TARGET_VERSION) > 0.0001) {
			Game.Prompt('<id NerdyInfoVersion><h3>FtHoF planner</h3><div class="block warning">This planner targets Cookie Clicker ' + TARGET_VERSION + '. The running game reports version ' + Game.version + '. Predictions are disabled until compatibility is verified.</div>', ['Back']);
			return;
		}

		var predictions = predict(snapshot, 10);
		var rows = '';
		for (var i = 0; i < predictions.length; i++) {
			var prediction = predictions[i];
			var color = prediction.backfires ? '#f66' : '#6f6';
			rows += '<div class="listing" style="overflow:hidden;">' +
				'<span style="float:left;width:28px;opacity:0.6;">' + prediction.index + '</span>' +
				'<span style="float:left;width:92px;color:' + color + ';">' + (prediction.backfires ? 'Wrath' : 'Golden') + '</span>' +
				'<b>' + prediction.effect + '</b>' +
				'</div>';
		}

		Game.Prompt('<id NerdyInfoFtHoF>' +
			'<h3>FtHoF planner</h3>' +
			'<div class="block" style="font-size:11px;">' +
				'Seed <b>' + snapshot.seed + '</b> · total spells <b>' + snapshot.spellsCastTotal + '</b><br>' +
				'Backfire chance <b>' + formatChance(getBackfireChance(snapshot)) + '</b> · golden cookies onscreen <b>' + snapshot.goldenCookiesOnScreen + '</b>' +
			'</div>' +
			'<div class="subsection"><div class="title" style="font-size:18px;">Upcoming casts</div>' + rows + '</div>',
			['Back']);
	}

	function openFreebies() {
		var candidates = getFreebieCandidates();
		var rows = '';
		for (var i = 0; i < candidates.length; i++) {
			var achievement = candidates[i].achievement;
			rows += '<div class="listing"><b>' + achievement.dname + '</b><br><small>' + achievement.ddesc + '</small></div>';
		}

		if (!rows) rows = '<div class="listing">No easy unearned achievements were found.</div>';
		Game.Prompt('<id NerdyInfoFreebies>' +
			'<h3>Freebies</h3>' +
			'<div class="block" style="font-size:11px;">The easiest locked achievements estimated from your current game state.</div>' +
			'<div class="subsection"><div class="title">Estimated easiest</div>' + rows + '</div>',
			['Back']);
	}

	function achievementText(achievement) {
		return String(achievement.ddesc || achievement.desc || '').replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').toLowerCase();
	}

	function firstAchievementNumber(text) {
		var match = text.match(/\b(\d[\d,]*)\b/);
		return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
	}

	function estimateAchievementEffort(achievement) {
		var text = achievementText(achievement);
		var score = 120;
		var current = 0;
		var target = firstAchievementNumber(text);
		var totalBaked = (Game.cookiesEarned || 0) + (Game.cookiesReset || 0);

		if (!text) return 1000000;
		if (achievement.clickFunction) score = 1;
		if (text.indexOf("click this achievement's slot") !== -1) score = 1;
		if (text.indexOf('give your bakery a name') !== -1) score = 2;
		if (text.indexOf('click the tiny cookie') !== -1) score = 3;
		if (text.indexOf('dunk the cookie') !== -1) score = 5;

		if (typeof achievement.threshold === 'number') {
			current = text.indexOf('per second') !== -1 ? (Game.cookiesPs || 0) : totalBaked;
			target = achievement.threshold;
		}
		if (text.indexOf('own') !== -1 && text.indexOf('building') !== -1) {
			current = 0;
			if (Game.Objects) for (var building in Game.Objects) current += Game.Objects[building].amount || 0;
		}
		if (text.indexOf('purchase') !== -1 && text.indexOf('upgrade') !== -1) current = Game.UpgradesOwned || 0;
		if (text.indexOf('golden cookie') !== -1) current = Game.goldenClicks || 0;
		if (text.indexOf('ascend') !== -1) current = Game.resets || 0;

		if (target > 0) {
			var ratio = target / Math.max(current, 1);
			if (ratio <= 1) score = Math.min(score, 4);
			else score += Math.log(ratio) * 18;
		}
		if (text.indexOf('burst') !== -1 || text.indexOf('pop ') !== -1) score += 18;
		if (text.indexOf('unlock every') !== -1 || text.indexOf('every ') !== -1) score += 80;
		if (text.indexOf('ascend') !== -1) score += 100;
		if (achievement.pool !== 'normal') score += 50;
		return score;
	}

	function getFreebieCandidates() {
		var candidates = [];
		if (!Game.AchievementsById) return candidates;
		for (var id in Game.AchievementsById) {
			var achievement = Game.AchievementsById[id];
			if (!achievement || achievement.won || achievement.disabled || achievement.pool === 'shadow' || achievement.pool === 'dungeon') continue;
			var score = estimateAchievementEffort(achievement);
			if (score < 1000000) candidates.push({achievement: achievement, score: score});
		}
		candidates.sort(function (a, b) {
			return a.score - b.score || a.achievement.order - b.achievement.order;
		});
		return candidates.slice(0, FREEBIE_LIMIT);
	}

	function addPlannerButton() {
		if (state.button || !document.body) return;
		var button = document.createElement('a');
		button.id = 'nerdyInfoFtHoFButton';
		button.className = 'option smallFancyButton';
		button.textContent = 'FtHoF planner';
		button.title = 'Open the Force the Hand of Fate planner';
		button.style.cssText = 'position:fixed;right:8px;bottom:22px;z-index:1000000;opacity:0.85;';
		button.addEventListener('click', function () {
			PlaySound('snd/tick.mp3');
			openPlanner();
		});
		document.body.appendChild(button);
		state.button = button;
	}

	function addFreebiesButton() {
		if (state.freebiesButton || !document.body) return;
		var button = document.createElement('a');
		button.id = 'nerdyInfoFreebiesButton';
		button.className = 'option smallFancyButton';
		button.textContent = 'Freebies';
		button.title = 'Show simple achievements that are still available';
		button.style.cssText = 'position:fixed;right:8px;bottom:54px;z-index:1000000;opacity:0.85;';
		button.addEventListener('click', function () {
			PlaySound('snd/tick.mp3');
			openFreebies();
		});
		document.body.appendChild(button);
		state.freebiesButton = button;
	}

	function removePlannerButton() {
		if (state.button && state.button.parentNode) state.button.parentNode.removeChild(state.button);
		state.button = null;
	}

	function removeFreebiesButton() {
		if (state.freebiesButton && state.freebiesButton.parentNode) state.freebiesButton.parentNode.removeChild(state.freebiesButton);
		state.freebiesButton = null;
	}

	var NerdyInfoMod = {
		name: 'Nerdy Info Mod',
		init: function () {
			if (!Game || !Game.registerHook) return;
			Game.registerHook('draw', addPlannerButton);
			Game.registerHook('draw', addFreebiesButton);
			Game.registerHook('draw', addNerdCookieOption);
			Game.registerHook('draw', updateBigCookie);
			Game.registerHook('draw', syncScrollWheelListener);
			Game.registerHook('reset', removePlannerButton);
			Game.registerHook('reset', removeFreebiesButton);
			Game.registerHook('reset', updateBigCookie);
			Game.registerHook('reset', removeScrollWheelListener);
			addPlannerButton();
			updateBigCookie();
		},
		save: function () {
			return JSON.stringify({version: 3, nerdCookieEnabled: nerdCookieEnabled, scrollWheelClickEnabled: scrollWheelClickEnabled});
		},
		load: function (data) {
			try {
				var parsed = JSON.parse(data || '{}');
				nerdCookieEnabled = parsed.nerdCookieEnabled === true;
				scrollWheelClickEnabled = parsed.scrollWheelClickEnabled === true;
			} catch (ignore) {
				nerdCookieEnabled = false;
				scrollWheelClickEnabled = false;
			}
			updateBigCookie();
			updateNerdCookieButton();
			syncScrollWheelListener();
			updateScrollWheelButton();
		},
		FtHoF: {
			predict: predict,
			snapshot: snapshotGame,
			getBackfireChance: getBackfireChance,
		},
	};

	if (typeof Game !== 'undefined' && Game.registerMod) Game.registerMod(MOD_ID, NerdyInfoMod);
}());
