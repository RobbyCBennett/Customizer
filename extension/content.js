// @ts-check
'use strict';


/**
 * Create a style element for HTML pages or event XML pages
 * @returns {HTMLStyleElement}
 */
function createStyleElement()
{
	const namespace = document.documentElement.getAttribute('xmlns');
	if (typeof namespace === 'string')
		// @ts-ignore
		return document.createElementNS(namespace, 'style');
	else
		return document.createElement('style');
}


/**
 * Main function of a tab
 */
async function main()
{
	// Skip SVG
	if (document.documentElement.tagName === 'svg')
		return;

	const hostname = window.location.host.replace(/^www\./, '');
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

	// Get sheets or stop
	const sheets = await chrome.storage.sync.get(keys);
	if (Object.keys(sheets).length == 0)
		return;

	// Append stylesheet to head
	const style = createStyleElement();
	document.head.appendChild(style);
	style.innerHTML = Object.values(sheets).join('');
}


main();
