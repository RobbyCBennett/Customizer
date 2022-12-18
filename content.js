async function applyCSS() {
	const hostname = window.location.hostname.replace(/^www\./, '');
	const hostnameParts = hostname.split('.');

	// Get keys for rules
	// ['css:*', 'css:url.org', 'css:*.org', 'css:*.url.org']
	const keys = ['css:*', `css:${hostname}`];
	for (let i = hostnameParts.length - 1; i >= 0; i--) {
		const wildcardParts = ['*'];
		for (let j = i; j < hostnameParts.length; j++)
			wildcardParts.push(hostnameParts[j]);
		keys.push(`css:${wildcardParts.join('.')}`);
	}

	// Get rules
	const rules = await chrome.storage.sync.get(keys);
	if (!Object.keys(rules)) return;

	// Append stylesheet to body
	const newStyleSheet = document.createElement('style');
	document.head.appendChild(newStyleSheet);
	for (const key in rules)
		newStyleSheet.sheet.insertRule(rules[key]);
}
applyCSS();
