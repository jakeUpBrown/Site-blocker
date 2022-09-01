
const setListenerForPomodoroButtons = () => {
    const startElement = document.getElementById('pomodoro-start-button')
    startElement
    if (startElement && !!!startElement.onclick) {
        console.log('found start element', startElement)
        startElement.onclick = () => {
            console.log('pomodoro button was clicked')
            chrome.runtime.sendMessage({ "type": "SET_TIMER" });
        };
    }
    
    const stopElement = document.getElementById('pomodoro-stop-button')
    if (stopElement && !!!stopElement.onclick) {
        console.log('found stop element', stopElement)
        stopElement.addEventListener('click', function () {
            console.log('pomodoro stop button was clicked')
            chrome.runtime.sendMessage({ "type": "STOP_TIMER" });
        });
        stopElement.onclick = () => {
            console.log('pomodoro stop button was clicked')
            chrome.runtime.sendMessage({ "type": "STOP_TIMER" });
        };
    }
}

const appContainer = document.getElementById('app-container');
if (appContainer) {
    console.log('found appContainer', appContainer)
    // Options for the observer (which mutations to observe)
    const config = { attributes: true, childList: true, subtree: true };
    
    // Callback function to execute when mutations are observed
    const callback = (mutationList, observer) => {
        console.log('appContainer updated', mutationList)
        setListenerForPomodoroButtons()
    };
    
    // Create an observer instance linked to the callback function
    const appContainerObserver = new MutationObserver(callback);
    
    // Start observing the target node for configured mutations
    appContainerObserver.observe(appContainer, config);
}

setListenerForPomodoroButtons()

// Later, you can stop observing
//observer.disconnect();