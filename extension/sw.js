// @ts-check
'use strict';


/**
 * Possibly get the base URL of the current tab
 */
async function getCssBaseUrl()
{
	// Get current tab
	const currentTab = (await chrome.tabs.query({
		active: true,
		currentWindow: true
	})).pop();
	if (!currentTab || !currentTab.url)
		return null;

	// Get the base URL
	const baseUrlPattern = /^https?:\/\/(www.)?(.+?[^\/:])(?=[?\/]|$)/;
	const baseUrl = currentTab.url.match(baseUrlPattern);
	if (!baseUrl)
		return null;

	// Append 'css:' to the beginning
	return `css:${baseUrl[2]}`;
}


/**
 * Handle the 'bigOptionsEditSite' command
 */
async function bigOptionsEditSite()
{
	// Remember the URL currently being edited
	const cssBaseUrl = await getCssBaseUrl();
	if (cssBaseUrl)
		await chrome.storage.local.set({ url: cssBaseUrl });

	// Open options pagee
	chrome.runtime.openOptionsPage();
}


/**
 * Main function of the service worker in the background
 */
function main()
{
	// Handle the commands
	const commands = {
		bigOptions: chrome.runtime.openOptionsPage,
		bigOptionsEditSite: bigOptionsEditSite,
	};
	chrome.commands.onCommand.addListener(command => {
		commands[command]();
	});
}


main();
