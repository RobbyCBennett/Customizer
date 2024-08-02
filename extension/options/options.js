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

// Link: Keyboard shortcuts
async function keyboardShortcuts(e) {
	// Skip other keys or right click
	if ((e.code && e.code != 'Enter') || e.button == 2)
		return;

	// Tab createData
	const url = 'chrome://extensions/shortcuts';
	const middleClick = e.button == 1;
	const newWindow = e.shiftKey && ! e.ctrlKey && ! middleClick;

	// New window
	if (newWindow)
		// Create tab in new window
		chrome.windows.create({ url: url });

	// Same window
	else {
		// Query the current tab in order to create a new adjacent tab
		const tabs = await chrome.tabs.query({active: true});
		const index = tabs[0].index + 1;

		// Tab createData
		const active = (! middleClick && ! (e.ctrlKey ^ e.shiftKey)) || (middleClick && e.shiftKey);

		// Create tab
		chrome.tabs.create({ url: url, index: index, active: active });
	}
}
clickAndKeypress(document.getElementById('keyboardShortcuts'), keyboardShortcuts);

// Link: Big options page
function bigOptions(e) {
	// Skip other keys or right click
	if ((e.keyCode && e.keyCode != ENTER) || e.button == 2)
		return;

	// Create tab
	chrome.runtime.openOptionsPage();
}
const bigOptionsLink = document.getElementById('bigOptions');
if (location.hash == '#popup')
	clickAndKeypress(bigOptionsLink, bigOptions);
else
	bigOptionsLink.remove();



// Options

// Save changed option
let autoSaveTimestamp = 0;
let optionsToSet      = {};
let optionsToRemove   = {};
function saveOption(key, value, autoSaveDelay=0) {
	// Start timestamp
	autoSaveTimestamp = Date.now();

	// Remember all the options to set/remove
	if (value) {
		optionsToSet[key] = value;
		delete optionsToRemove[key];
	}
	else {
		optionsToRemove[key] = true;
		delete optionsToSet[key];
	}

	// Wait a bit and see if the user stops
	setTimeout(() => {
		// Return if the user didn't stop
		if (autoSaveTimestamp + autoSaveDelay > Date.now())
			return;

		// Set/remove options
		chrome.storage.sync.set(optionsToSet);
		chrome.storage.sync.remove(Object.keys(optionsToRemove));

		// Forget options to set/remove
		optionsToSet    = {};
		optionsToRemove = {};
	}, autoSaveDelay);
}



// Textarea

// Textarea text insertion & cursor movement
function insertText(text, field=null, move=0) {
	// Insert text
	document.execCommand('insertText', false, text);

	// Move before the selection
	if (move) {
		const cursor = field.selectionStart + move;
		field.setSelectionRange(cursor, cursor);
	}
}

// Textarea code changed: update max length because of variable-byte characters
const twoBytes = /[\t\n"\\]/;
async function updateMaxlength(textarea) {
	const maxBytes = chrome.storage.sync.QUOTA_BYTES_PER_ITEM;

	// Count the bytes
	const padding = 2;
	let i, bytes = textarea.dataset.key.length + padding;
	for (i = 0; i < textarea.value.length; i++) {
		// Increment the bytes
		if (twoBytes.test(textarea.value[i]))
			bytes += 2;
		else if (textarea.value[i] == '<')
			bytes += 6;
		else
			bytes += 1;

		// Not enough space
		if (bytes > maxBytes) {
			textarea.value = textarea.value.slice(0, i);
			textarea.maxLength = i - 1;
			return;
		}
	}

	// Enough space
	textarea.maxLength = i + maxBytes - bytes;
}

// Textarea code changed: filter chars, auto indent, and save
const indentAtStart     = /^[\t ]/;      // Tab/space at start
const blockStartAtEnd   = /{$/;          // Block starting with { at end
const notPrintableAscii = /[^\t\n -~]/g; // ASCII characters 9, 10, 32-126
let enterFromUser = true;
function codeChanged(e) {
	const textarea = e.target;

	// Remove characters not allowed
	if (notPrintableAscii.test(textarea.value))
		textarea.value = textarea.value.replaceAll(notPrintableAscii, '');

	// Asynchronously adjust maxlength according to bytes
	updateMaxlength(textarea);

	// Enter pressed
	if (e.inputType == 'insertLineBreak' || e.inputType == 'insertText' && !e.data) {
		if (enterFromUser) {
			// Get text of previous line
			const cursor = textarea.selectionStart;
			const untilCursor = textarea.value.slice(0, cursor);
			const afterCursor = textarea.value.slice(cursor, cursor+1)
			const prevLineMatch = untilCursor.match(/(.*)\n$/);
			if (! prevLineMatch) return;
			const prevLine = prevLineMatch[1];
			untilCursor.match(/(.*)\n$/)

			// See if } should be on a new line
			if (afterCursor == '}') {
				insertText('\t');
				enterFromUser = false;
				insertText('\n', textarea, -1);
				enterFromUser = true;
			}

			// See if the new line should be indented
			else if (indentAtStart.test(prevLine) || blockStartAtEnd.test(prevLine))
				insertText('\t');
		}
	}

	// { pressed
	else if (e.inputType == 'insertText' && e.data == '{')
		insertText('}', textarea, -1);

	// Set/delete value with a delay
	saveOption(textarea.dataset.key, textarea.value, 250);
}



// URL

// Get the current URL
const baseUrlPattern = /^https?:\/\/(www.)?(.+?[^\/:])(?=[?\/]|$)/;
async function getBaseUrl() {
	// Get current tab
	const currentTab = (await chrome.tabs.query({
		active: true,
		currentWindow: true
	})).pop();
	if (! currentTab)
		return;

	// Get the base URL
	const baseUrl = currentTab.url.match(baseUrlPattern);
	if (! baseUrl)
		return;

	return baseUrl[2];
}



// Site rules

// Add site
const addSiteField = document.getElementById('addSiteField');
async function addSite(e) {
	// Return for keys besides enter and if there's no value
	if (e.key && e.key != 'Enter' || !addSiteField.value)
		return;

	// Get the key for the URL
	const url = addSiteField.value.toLowerCase();
	addSiteField.value = '';
	const key = `css:${url}`;

	// Load the UI
	loadSites(key);
}
addSiteField.onkeydown = addSite;
document.getElementById('addSiteButton').onclick = addSite;

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

// Load site rules
async function loadSites(keyToAdd=null) {
	// Get all rules
	const rules = await chrome.storage.sync.get();

	// Skip and warning if if there's not enough space
	if (Object.keys(rules).length + (keyToAdd ? 1 : 0) >= chrome.storage.sync.MAX_ITEMS) {
		keyToAdd = null;
		alert(`Only ${chrome.storage.sync.MAX_ITEMS} entries allowed by the browser`);
	}

	// Add the current page
	const addingPage = keyToAdd && !(keyToAdd in rules);
	if (addingPage)
		rules[keyToAdd] = '';

	// Get the keys, which may already be sorted
	const keys = addingPage ? Object.keys(rules).sort() : Object.keys(rules);

	// Make fields for each rule
	const container = document.getElementById('sites');
	container.innerHTML = '';
	for (const key of keys) {
		// Skip unused rules
		if (key != keyToAdd && !rules[key])
			continue;

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
		textarea.spellcheck = false;
		updateMaxlength(textarea);
		details.appendChild(textarea);

		// Open details and focus on textarea
		if (key == keyToAdd)
			details.open = true;
	}
}

// Focus site rules textarea
function focusSiteRules(e) {
	if (!e.target.open)
		return;

	const textarea = e.target.getElementsByTagName('textarea')[0];
	textarea.focus();
}

// Reload the site CSS rules
let firstTimeLoading = true;
async function reloadSiteRules() {
	// Get current URL being edited
	let key;
	// In the popup
	if (location.hash == '#popup') {
		const baseUrl = await getBaseUrl();
		key = baseUrl ? `css:${baseUrl}` : null;
	}
	// Not in the popup
	else
		key = (await chrome.storage.local.get('url')).url;

	// Only load sites at start
	if (firstTimeLoading || key)
		loadSites(key);

	// Forget the URL being edited
	chrome.storage.local.remove('url');

	firstTimeLoading = false;
}
reloadSiteRules();
window.onfocus = reloadSiteRules;

// Save options on window closed
function optionsOnClose() {
	// Forget the URL being edited
	chrome.storage.local.remove('url');

	// Skip if there are no options to set
	if (!Object.keys(optionsToSet).length && !Object.keys(optionsToRemove).length)
		return null;

	// Sync options
	return Promise.all([
		chrome.storage.sync.set(optionsToSet),
		chrome.storage.sync.remove(Object.keys(optionsToRemove)),
	]);
}
window.onbeforeunload = optionsOnClose;
