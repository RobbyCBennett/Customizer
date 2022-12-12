// Keys
const TAB   = 9;
const ENTER = 13;



// Links

// Main click, other click, and keypress
function clickAndKeypress(el, fn) {
	el.onclick = fn;
	el.onauxclick = fn;
	el.onkeypress = fn;
}

// Link: Big options page
function bigOptions(e) {
	// Skip other keys or right click
	if ((e.keyCode && e.keyCode != ENTER) || e.button == 2) {
		return;
	}

	// Create tab
	chrome.runtime.openOptionsPage();
}
const bigOptionsLink = document.getElementById('bigOptions');
clickAndKeypress(bigOptionsLink, bigOptions);
if (location.hash != '#popup') {
	bigOptionsLink.className = 'hidden';
}



// Textarea

function insertTab(textarea) {
	const cursor = textarea.selectionStart;
	textarea.setRangeText('\t', cursor, cursor, 'end');
}

// Key pressed: prevent changing focus
function preventDefaultTab(e) {
	if (e.keyCode == TAB) {
		e.preventDefault();
		insertTab(e.target);
		codeChanged(e);
	}
}

// Code changed: auto indent
const indent = /^[\t ]/;
const block = /{$/;
function codeChanged(e) {
	// Enter pressed
	if (e.inputType == 'insertLineBreak' || e.inputType == 'insertText' && !e.data) {
		// Get text of previous line
		const cursor = e.target.selectionStart;
		const untilCursor = e.target.value.slice(0, cursor);
		const prevLine = untilCursor.match(/(.*)\n$/)[1];

		// See if the new line should be indented
		if (indent.test(prevLine) || block.test(prevLine))
			insertTab(e.target);
	}

	saveSite(e);
}




// Site rules

// Add site
async function addSite(e) {
	if (e.key != 'Enter' || !e.target.value)
		return;

	const url = e.target.value.toLowerCase();
	e.target.value = '';
	const key = `css:${url}`;
	await chrome.storage.local.set({[key]: ''});
	loadSites(key);
}
document.getElementById('addSite').onkeydown = addSite;

// Search sites
function searchSites(e) {
	const query = e.target.value.toLowerCase();
	const sites = document.getElementsByClassName('site');
	for (site of sites) {
		if (site.dataset.url.includes(query))
			site.classList.remove('hidden');
		else
			site.classList.add('hidden');
	}
}
document.getElementById('searchSites').oninput = searchSites;

// Save site rule
function saveSite(e) {
	const key = e.target.dataset.key;
	const rule = e.target.value;

	if (rule)
		chrome.storage.local.set({[key]: rule});
	else
		chrome.storage.local.remove(key);
}

// Load site rules
async function loadSites(keyToSelect=null) {
	// Get all rules
	const rules = await chrome.storage.local.get();
	const removing = [];

	// Make fields for each rule
	const container = document.getElementById('sites');
	container.innerHTML = '';
	for (const key in rules) {
		// Remove unused rules
		if (key != keyToSelect && !rules[key]) {
			removing.push(key);
			continue;
		}

		// Get URL
		const match = key.match(/^css:(.*)/);
		if (!match)
			continue;
		const url = match[1];

		// Create collapsible container
		const details = document.createElement('details');
		details.className = 'site';
		details.dataset.url = url;
		details.ontoggle = focusSiteRules;
		container.appendChild(details);

		// Create summary to open/close
		const summary = document.createElement('summary');
		summary.className = 'option';
		summary.innerHTML = url;
		details.appendChild(summary);

		// Create textarea field for rule
		const textarea = document.createElement('textarea');
		textarea.dataset.key = key;
		textarea.value = rules[key];
		textarea.oninput = codeChanged;
		textarea.onkeydown = preventDefaultTab;
		details.appendChild(textarea);

		// Focus on textarea
		if (key == keyToSelect) {
			details.open = true;
			textarea.focus();
		}
	}

	if (removing.length)
		chrome.storage.local.remove(removing);
}
loadSites();

// Focus site rules textarea
function focusSiteRules(e) {
	if (!e.target.open)
		return;

	const textarea = e.target.getElementsByTagName('textarea')[0];
	textarea.focus();
}
