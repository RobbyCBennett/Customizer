// @ts-check
'use strict';


/**
 * Try to get the URL of the tab and remember it for the options
 * @param {chrome.tabs.Tab} tab
 */
async function rememberURLForOptions(tab)
{
	// Fail if no tab URL
	if (!tab.url)
		return;

	// Get the base URL or fail
	const baseUrlPattern = /^https?:\/\/(www.)?(.+?[^\/:])(?=[?\/]|$)/;
	const baseUrl = tab.url.match(baseUrlPattern);
	if (!baseUrl)
		return;

	// Remember the URL
	await chrome.storage.local.set({ url: `css:${baseUrl[2]}` });
}


/**
 * Handle a command like clicking a button or a keyboard shortcut
 * @param {string} command
 * @param {chrome.tabs.Tab} tab
 */
async function handleCommand(command, tab)
{
	switch (command) {
		case 'bigOptions':
			break;
		case 'bigOptionsEditSite':
			await rememberURLForOptions(tab);
			break;
		default:
			return;
	}

	chrome.runtime.openOptionsPage();
}


/**
 * Main function of the service worker in the background
 */
function main()
{
	chrome.commands.onCommand.addListener(handleCommand);
}


main();
