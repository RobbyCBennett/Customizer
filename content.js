async function applyCSS() {
	const hostname = window.location.hostname.replace(/^www\./, '');
	const hostnameParts = hostname.split('.');

	// Get keys for sheets
	// ['css:*', 'css:url.org', 'css:*.org', 'css:*.url.org']
	const keys = ['css:*', `css:${hostname}`];
	for (let i = hostnameParts.length - 1; i >= 0; i--) {
		const wildcardParts = ['*'];
		for (let j = i; j < hostnameParts.length; j++)
			wildcardParts.push(hostnameParts[j]);
		keys.push(`css:${wildcardParts.join('.')}`);
	}

	// Get sheets
	const sheets = await chrome.storage.sync.get(keys);
	if (!Object.keys(sheets)) return;

	// Append stylesheet to body
	const style = document.createElement('style');
	document.head.appendChild(style);
	style.innerHTML = Object.values(sheets).join('');
}
applyCSS();
