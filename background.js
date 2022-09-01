chrome.runtime.onInstalled.addListener(function initialization(){
	turnFilteringOff();

	chrome.storage.sync.set({'blockingMethod': "close_tab"});
	let timerData = { isTimerEnabled: false, blockUntilMilliseconds: 0};
	chrome.storage.sync.set({'timerData': timerData});
	
	chrome.storage.sync.get('blockedSites', function(data) {
		blockedSites = data.blockedSites;
		if(typeof blockedSites != "undefined" && blockedSites != null 
			&& blockedSites.length != null && blockedSites.length > 0){
			var defaultListConfirm = confirm("We have detected that our extension" 
				+ " was once installed on this device.\nDo you want to load your old filter list?");
			if (defaultListConfirm) {
				console.log("User confirmed keeping a previous filter list");
			} 
			else {
				console.log("User cancelled loading a previous filter list.");
				addDefaultFilters();
			}
		} 
		else {
			console.log("User didn't have any previous filters");
			addDefaultFilters();
		}
	});
});

function addDefaultFilters(){
	var blockedSites = [
		"://www.facebook.com",
		"://www.twitter.com",
		"://www.instagram.com",
		"://www.youtube.com",
		"://www.reddit.com",
		"://www.goldandblack.com",
		"://purdue.rivals.com",
		"://www.espn.com",
		"://phoenix.craigslist.org",
		"://www.offerup.com",
		"://www.ebay.com",
		"://www.bing.com",
		"://www.ultimate-guitar.com",
		"://www.printables.com",
		"://www.thingiverse.com",
		"://www.washingtonpost.com/crossword-puzzles/",
		"://www.puzzle-masyu.com",
		"://www.puzzle-lits.com",
		"://www.puzzle-nonograms.com",
	];

	chrome.storage.sync.set({'blockedSites': blockedSites}, function() {
		console.log('Default blocked sites have been loaded.');
	});
};

chrome.runtime.onStartup.addListener(function() {
	chrome.storage.sync.get('isEnabled', function (data) {
		if(data.isEnabled){
			icon = 'on.png';
		}
		else if(!data.isEnabled){
			icon = 'off.png';
		}else{
			icon = 'icon.png';
		}
		chrome.browserAction.setIcon({path:{"16": icon}});
	});
});

chrome.browserAction.onClicked.addListener(function toggleBlocking(){
	chrome.storage.sync.get('timerData', function (data) {
		if(!data.timerData.isTimerEnabled){
			console.log('timer not enabled')
			chrome.storage.sync.get('isEnabled', function(data){
				if(data.isEnabled){
					turnFilteringOff();
				}
				else{
					turnFilteringOn();
				}
			});
		}
		else{
			console.log('timer enabled')
			if(!updateTimer(data.timerData)){
				var now = new Date().getTime();
				var timeLeft = data.timerData.blockUntilMilliseconds - now;
				var hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
				var minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
				var seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
				alert("Timer mode enabled! " + hours + " hours "+ minutes + " minutes " + seconds + " seconds left.");
			}
		}
	});
});

// background process that run every minute and checks if the sites are still blocked.
// updates icon if currentTime > blockUntil timerData value


/**
 * This function, given timerData, checks if the time of Timer mode is up. 
 * If it is, it switched the Mode and filtering off. Else it returns false.
 *
 * @param {Object} 'timerData' from chrome.storage.sync.get.
 *
 * @return {boolean} true if the time is up and filtering was turned off
 *				   				    false it time is not up yet
 */
function updateTimer(timerData){
	console.log('updating timer')
	let timeLeft = timerData.blockUntilMilliseconds - Date.now();
	if (timeLeft <= 0){  //unblock
		console.log('past time. unblocking')
		timerData.isTimerEnabled = false;
		chrome.storage.sync.set({'timerData': timerData}, function() {
			turnFilteringOff();
		});
		return true;
	}
	return false;
}

chrome.tabs.onUpdated.addListener(function blockIfEnabled(tabId, info, tab) {
	chrome.storage.sync.get('isEnabled', function (data) {
		if (data.isEnabled) {
			chrome.storage.sync.get('timerData', function (data) {
				if(data.timerData.isTimerEnabled){
					if(!updateTimer(data.timerData)){
						runPageThroughFilter(tab);
					}
				}
				else{
					runPageThroughFilter(tab);
				}
			});
		}
	});
});

chrome.runtime.onMessage.addListener(function(request, sender, callback) {
	const { type } = request
	if (type === 'SET_TIMER') {
			enableTimerMode()
			callback(true);
	} else if (type === 'STOP_TIMER') {
		stopTimer()
		callback(true)
	}
 })

function runPageThroughFilter(tab){
	chrome.storage.sync.get('blockedSites', function (data) {
		data.blockedSites.forEach(function (site) {
			if (tab.url.includes(site)) {
				denyPage(tab.id);
			}
		});
	});
};

chrome.contextMenus.create({
	  id: "baFilterListMenu",
      title: "Show filter list",
      contexts: ["browser_action"]
});

chrome.contextMenus.create({
	  id: "baAddToFilterList",
      title: "Block this:",
      contexts: ["browser_action"]
});

chrome.contextMenus.create({
	  parentId: "baAddToFilterList",
	  id: "baAddSiteToFilterList",
      title: "Page",
      contexts: ["browser_action"]
});

chrome.contextMenus.create({
	  parentId: "baAddToFilterList",
	  id: "baAddDomainToFilterList",
      title: "Domain",
      contexts: ["browser_action"]
});

chrome.contextMenus.create({
	  id: "baTimerMode",
      title: "Timer mode setup",
      contexts: ["browser_action"]
});

chrome.contextMenus.create({
	  id: "pgAddToFilterList",
      title: "Block this:",
      contexts: ["page"]
});

chrome.contextMenus.create({
	  parentId: "pgAddToFilterList",
	  id: "pgAddSiteToFilterList",
      title: "Page",
      contexts: ["page"]
});

chrome.contextMenus.create({
	  parentId: "pgAddToFilterList",
	  id: "pgAddDomainToFilterList",
      title: "Domain",
      contexts: ["page"]
});

var timeLeftMenu = chrome.contextMenus.create({
	id: "timeLeftDisplay",
    title: "Not currently blocked",
    contexts: ["all"],
});

chrome.contextMenus.onClicked.addListener(function contextMenuHandler(info, tab) {
		switch(info.menuItemId) {
			case "baFilterListMenu":
				chrome.tabs.create({ url: '/filterList.html'});
				break;
			case "baTimerMode":
				chrome.tabs.create({ url: '/timerModeSetup.html'});
				break;
			case "baAddSiteToFilterList":
			case "pgAddSiteToFilterList":
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					let urls = tabs.map(x => x.url);
					addUrlToBlockedSites(urls[0], tab);
				});
				break;
			case "baAddDomainToFilterList":
			case "pgAddDomainToFilterList":
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					let urls = tabs.map(x => x.url);
					var domain = urls[0].match(/^[\w]+:\/{2}([\w\.:-]+)/)[1];
					addUrlToBlockedSites(domain, tab);
				});
				break;
		}
});

function addUrlToBlockedSites(url, tab){
	chrome.storage.sync.get('blockedSites', function (data){
		data.blockedSites.push(url); // urls.hostname
		chrome.storage.sync.set({'blockedSites':data.blockedSites}, function(data){
			console.log(url + ' added to blocked sites');
			chrome.storage.sync.get('isEnabled', function(data) {
				if(data.isEnabled){
					denyPage(tab.id);
				}
			});
		});
	});	
}

function updateBlockedSitesFromDb(urls, tab){
	// get 
	chrome.storage.sync.get('blockedSites', function (data){
		data.blockedSites.push(url); // urls.hostname
		chrome.storage.sync.set({'blockedSites':data.blockedSites}, function(data){
			console.log(url + ' added to blocked sites');
			chrome.storage.sync.get('isEnabled', function(data) {
				if(data.isEnabled){
					denyPage(tab.id);
				}
			});
		});
	});	
}

function updateIcon() {
	chrome.storage.sync.get('timerData')
}

function enableTimerMode(){
	chrome.storage.sync.get('timerData', function (data) {
		if(!data.timerData.isTimerEnabled){
			turnFilteringOn(function(ret) {
				if (ret) {
					setTimer();
				}
			})
		}
		else{
			var now = new Date().getTime();
			var timeLeft = data.timerData.blockUntilMilliseconds - now;
			var hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
			var minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
			var seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
			alert("Timer mode enabled! You can't reset it untill time is up. " + hours + " hours " 
					+ minutes + " minutes " + seconds + " seconds left.");
		}
	});
}

function setTimer(){
	let currentDateMilliseconds = Date.now();
	// TODO: Change pomodoro time here!
	let durationMilliseconds = 25 * 60 * 1000;
	let blockUntil = currentDateMilliseconds + durationMilliseconds;
	let timerData = { isTimerEnabled: true, blockUntilMilliseconds: blockUntil};
	chrome.storage.sync.set({'timerData': timerData}, function() {
		console.log('Time set to ' + blockUntil);
		timer();
		// return; <- commented on "feature/instant_block_after_enabling"
 	});
}

function stopTimer() {
	chrome.storage.sync.get('timerData', function (data) {
		chrome.contextMenus.update(timeLeftMenu, {
			title: "Not currently blocked",
			contexts: ["all"],
		})
		data.timerData.isTimerEnabled = false;
		chrome.storage.sync.set({'timerData': data.timerData}, function() {
			console.log('turning filtering off')
			turnFilteringOff();
		});
	})
}

function timer(){
	chrome.storage.sync.get('timerData', function (data) {
		if(data.timerData.isTimerEnabled == true){
			let timerInterval = setInterval(function() {
				let now = new Date().getTime();
				let timeLeft = data.timerData.blockUntilMilliseconds - now;
				console.log('timeLeft', timeLeft)
				let hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
				let minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
				let seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
				const timeLeftMessage = hours + "h " + minutes + "m " + seconds + "s left"
				chrome.contextMenus.update(timeLeftMenu, {
					title: timeLeftMessage,
					contexts: ["all"],
				})
				
				if (timeLeft < 0) {
					clearInterval(timerInterval);
					stopTimer()
				}
			}, 1000);
		}
	});
}