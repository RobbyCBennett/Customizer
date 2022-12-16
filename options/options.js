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
	if (newWindow) {
		// Create tab in new window
		chrome.windows.create({ url: url });
	}
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
	if ((e.keyCode && e.keyCode != ENTER) || e.button == 2) {
		return;
	}

	// Create tab
	chrome.runtime.openOptionsPage();
}
const bigOptionsLink = document.getElementById('bigOptions');
clickAndKeypress(bigOptionsLink, bigOptions);
if (location.hash != '#popup')
	bigOptionsLink.remove();



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

// Textarea code changed: auto indent
const indent = /^[\t ]/;
const block = /{$/;
let enterFromUser = true;
function codeChanged(e) {
	const field = e.target;

	// Enter pressed
	if (e.inputType == 'insertLineBreak' || e.inputType == 'insertText' && !e.data) {
		if (enterFromUser) {
			// Get text of previous line
			const cursor = field.selectionStart;
			const untilCursor = field.value.slice(0, cursor);
			const afterCursor = field.value.slice(cursor, cursor+1)
			const prevLine = untilCursor.match(/(.*)\n$/)[1];

			// See if } should be on a new line
			if (afterCursor == '}') {
				insertText('\t');
				enterFromUser = false;
				insertText('\n', field, -1);
				enterFromUser = true;
			}

			// See if the new line should be indented
			else if (indent.test(prevLine) || block.test(prevLine))
				insertText('\t');
		}
	}

	// { pressed
	else if (e.inputType == 'insertText' && e.data == '{')
		insertText('}', field, -1);

	saveSite(e);
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

	// Forget URL being edited
	prevUrlEditing = null;

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
async function loadSites(keyToAdd=null) {
	// Get all rules
	const rules = await chrome.storage.local.get();
	const removing = [];

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
		// Skip unused rules and mark for removal
		if (key != keyToAdd && !rules[key]) {
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
		details.appendChild(textarea);

		// Open details and focus on textarea
		if (key == keyToAdd)
			details.open = true;
	}

	// Remove unused keys
	if (removing.length)
		chrome.storage.local.remove(removing);
}

// Focus site rules textarea
function focusSiteRules(e) {
	if (!e.target.open)
		return;

	const textarea = e.target.getElementsByTagName('textarea')[0];
	textarea.focus();
}



// URL

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



// Main

let prevUrlEditing = null;
async function main() {
	// Get current URL being edited
	let currUrlEditing;
	// Popup
	if (location.hash == '#popup') {
		const baseUrl = await getBaseUrl();
		currUrlEditing = baseUrl ? `css:${baseUrl}` : null;
	}
	// Not popup
	else
		currUrlEditing = (await chrome.storage.local.get('url')).url;

	// Skip if the URL being edited is the same
	if (currUrlEditing && currUrlEditing == prevUrlEditing)
		return;
	prevUrlEditing = currUrlEditing;

	// Load the UI to edit CSS for the sites
	loadSites(currUrlEditing);

	// Forget the URL being edited
	window.onbeforeunload = () => {
		chrome.storage.local.remove('url');
	};
}
main();
window.onfocus = main;
