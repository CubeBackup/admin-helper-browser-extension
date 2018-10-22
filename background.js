
var currentStage = 'idle'
var projectId = null;
var workTab = null;

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {

        if (request.cmd == 'start') {
            if (currentStage != 'idle') {
                console.warn('start() invalid stage', currentStage);
                return;
            }
            currentStage = 'lock';

            var url = 'https://console.cloud.google.com/apis/dashboard?hl=en';

            // create work tab
            chrome.tabs.create({
                url:url,
                active:true,
            }, function(tab) {
                workTab = tab;
                console.log('create work tab', tab);
                currentStage = 'confirmGoogleAccount';
            });
        }

        if (!sender.tab || !workTab || sender.tab.id != workTab.id) {
            sendResponse(null);
            return;
        }

        console.log('onMessage', request);

        if (request.cmd == 'getStage') {
            sendResponse(currentStage);
            return;
        } else if (request.cmd == 'getProjectId') {
            sendResponse(projectId);
            return;
        } else if(request.cmd == 'projectFound') {
            currentStage = 'enableAPIs';
            // currentStage = 'createServiceAccount';
            projectId = request.projectId;
            sendResponse('ok');
            return;
        } if (request.cmd == 'afterEnableAPIs') {
            currentStage = 'createServiceAccount';
            sendResponse('ok');
            return;
        } else if (request.cmd == 'keySaved') {
            workTab = null;
            projectId = null;
            currentStage = 'idle';
        }
});

chrome.tabs.onRemoved.addListener(function(tabId) {
    if (workTab && tabId == workTab.id) {
        workTab = null;
        projectId = null;
        currentStage = 'idle';
        console.log('work tab closed');
    }
});
