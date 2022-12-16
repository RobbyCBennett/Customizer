const baseUrlPattern = /^https?:\/\/(www.)?(.+?[^\/:])(?=[?\/]|$)/;

async function editThisSite() {
	// Get current tab
	const currentTab = (await chrome.tabs.query({
		active: true,
		currentWindow: true
	})).pop();

	// No valid current tab
	if (! currentTab) {
		chrome.runtime.openOptionsPage();
		return;
	}

	// Get the base URL
	const baseUrl = currentTab.url.match(baseUrlPattern);

	// Not a valid URL
	if (! baseUrl) {
		chrome.runtime.openOptionsPage();
		return;
	}

	// Append 'css:' to the beginning
	const cssBaseUrl = `css:${baseUrl[2]}`;

	// Remember the URL currently being edited
	await chrome.storage.local.set({ url: cssBaseUrl });

	// Open options pagee
	chrome.runtime.openOptionsPage();
}

const commands = {
	bigOptions: chrome.runtime.openOptionsPage,
	editThisSite: editThisSite,
};

chrome.commands.onCommand.addListener(command => {
	commands[command]();
});
