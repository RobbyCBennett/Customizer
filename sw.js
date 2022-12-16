const baseUrlPattern = /^https?:\/\/(www.)?(.+?[^\/:])(?=[?\/]|$)/;
async function getCssBaseUrl() {
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

	// Append 'css:' to the beginning
	return `css:${baseUrl[2]}`;
}

async function bigOptionsEditSite() {
	const cssBaseUrl = await getCssBaseUrl();

	// Remember the URL currently being edited
	if (cssBaseUrl)
		await chrome.storage.local.set({ url: cssBaseUrl });

	// Open options pagee
	chrome.runtime.openOptionsPage();
}

const commands = {
	bigOptions: chrome.runtime.openOptionsPage,
	bigOptionsEditSite: bigOptionsEditSite,
};

chrome.commands.onCommand.addListener(command => {
	commands[command]();
});
