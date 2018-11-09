const ProjectName = 'CubeBackup project';
const ServiceName = 'CubeBackup service';

function showMessage(msg) {
    var container = $('#cubebackup-admin-helper-message');
    if (!container.length) {
        container = $('<div id="cubebackup-admin-helper-message"></div>').appendTo(document.body);
    }
    container.removeClass('error').html(msg);
}

function showError(msg) {
    var container = $('#cubebackup-admin-helper-message');
    if (!container.length) {
        container = $('<div id="cubebackup-admin-helper-message"></div>').appendTo(document.body);
    }
    container.addClass('error').html(msg);
}

function createMask() {
    if (!$('#cubebackup-admin-helper-mask').length) {
        $('<div id="cubebackup-admin-helper-mask"></div>').appendTo(document.body);
    }
}

function removeMask() {
    $('#cubebackup-admin-helper-mask').remove();
}

function getQueryParam(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function addAuthUserParam(url) {
    if (url.indexOf('?') == -1) {
        url += '?';
    }

    var authuser = getQueryParam('authuser');
    if (authuser) {
        url += '&authuser=' + authuser;
    }

    if (!getQueryParam('hl', url)) {
        url += '&hl=en';
    }

    return url;
}

function waitElementLoad(selector, successCb, timeoutCb) {
    var c = 0;
    var tm = setInterval(function() {
        if (++c > 10) {
            clearInterval(tm);
            timeoutCb(selector);
            return;
        }

        var el = $(selector)
        if ($(selector).length > 0) {
            clearInterval(tm);
            successCb(el);
        }
    }, 1000);
}

function createProject() {

    function createNewProject() {
        showMessage('Create new backup project.');

        waitElementLoad('proj-name-id-input', function(el) {
            var nameInput = el.find('input');
            if (!nameInput.length) {
                showError('createNewProject() can\'t find project name input element');
                return;
            }

            nameInput.val(ProjectName);

            // sync value with angularjs
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent("input", false, true);
            nameInput[0].dispatchEvent(evt);

            setTimeout(function() {
                var submitButton = $('button.projtest-create-form-submit');
                if (!submitButton.length) {
                    showError('createNewProject() can\'t find submit button');
                    return;
                }

                console.log('click submit button', submitButton[0]);
                submitButton[0].click();

                showMessage('Waiting for project create complete.');
                setTimeout(function() {
                    checkIfProjectExsit();
                }, 10 * 1000);
            }, 2000);
        }, function(selector) {
            showError('createNewProject() can\'t find ' + selector);
        });
    }

    function checkIfProjectExsit() {
        showMessage('Check if backup project already exsited.');

        // wait project swicher in top nav
        waitElementLoad('button[data-prober=cloud-console-core-functions-project-switcher]', function(projectSwicher) {
            console.log('click project switcher', projectSwicher[0]);
            projectSwicher[0].click();

            // wait project dialog
            waitElementLoad('mat-dialog-container div.mat-tab-label-content', function(tabs) {
                var allTab = tabs.filter(function() {
                    var text = $.trim($(this).text()).toLowerCase();
                    return text == 'all';
                }).parent();

                if (!allTab.length) {
                    showError('createProject() can\'t find all projects tab');
                    return;
                }

                console.log('click all project tab', allTab[0]);
                allTab[0].click();

                // wait project list
                setTimeout(function() {
                    var projectIndex = -1;
                    var projectLinks = $('mat-dialog-container table td:nth-child(1) a.ng-star-inserted');
                    projectLinks.each(function(i) {
                        var text = $.trim($(this).text());
                        if (text == ProjectName) {
                            projectIndex = i;
                        }
                    });

                    if (projectIndex > -1) {
                        var projectIds = $('mat-dialog-container table td:nth-child(2) span.ng-star-inserted');
                        if (!projectIds[projectIndex]) {
                            showError('can\'t find project id');
                            return;
                        }
                        var projectId = $.trim($(projectIds[projectIndex]).text());
                        console.log('project founded', projectId);
                        chrome.runtime.sendMessage({
                            cmd: "projectFound",
                            projectId:projectId
                        }, function() {
                            // goto enable drive API
                            var url = addAuthUserParam('https://console.cloud.google.com/apis/library/drive.googleapis.com?project=' + projectId);
                            // var url = addAuthUserParam('https://console.cloud.google.com/iam-admin/serviceaccounts?project=' + projectId);
                            console.log('goto', url);
                            window.location.href = url;
                        });
                    } else {
                        console.log('project not found');
                        // click the create project button
                        var createProjectButton = $('button.purview-picker-create-project-button');
                        if (!createProjectButton.length) {
                            showError('can\'t find create project button');
                            return;
                        }
                        console.log('click create project button', createProjectButton[0]);
                        createProjectButton[0].click();

                        setTimeout(createNewProject, 1000);
                    }
                }, 5000);
            }, function() {
                showError('can\'t find project list dialog');
            });
        }, function() {
            showError('can\'t find project switcher');
        });
    };

    checkIfProjectExsit();
}

function enableAPIs() {
    showMessage('Enable APIs.');

    var matches = window.location.pathname.match(new RegExp('^/apis/library/(.+)$'));
    if (!matches) {
        showError('enableAPIs() invalid url ' + window.location.href);
        return;
    }

    var apiIds = ['drive.googleapis.com',
        'gmail.googleapis.com',
        'calendar-json.googleapis.com',
        'people.googleapis.com',
        'admin.googleapis.com'];

    var nameMap = {
        'drive.googleapis.com':'Drive',
        'gmail.googleapis.com':'Gmail',
        'calendar-json.googleapis.com':'Calendar',
        'people.googleapis.com':'People',
        'admin.googleapis.com':'Admin'
    };

    var apiId = matches[1];
    var apiIdIndex = -1;
    for (var i = 0; i < apiIds.length; i ++) {
        if (apiIds[i] == apiId) {
            apiIdIndex = i;
            break;
        }
    }

    if (apiIdIndex == -1) {
        showError('enableAPIs() invalid api ' + apiId);
        return;
    }

    showMessage('Enable ' + nameMap[apiId] + ' API.');

    chrome.runtime.sendMessage({cmd: "getProjectId"}, function(projectId){
        if (getQueryParam('project') != projectId) {
            showError('enableAPIs() invalid project id ' + getQueryParam('project') + '!=' + projectId);
            return;
        }

        function nextAPI() {
            var nextApiId = apiIdIndex + 1;
            if (apiIds[nextApiId]) {
                var url = 'https://console.cloud.google.com/apis/library/' + apiIds[nextApiId] + '?project=' + projectId;
                url = addAuthUserParam(url);
                console.log('goto', url);
                window.location.href = url;
            } else {
                chrome.runtime.sendMessage({
                    cmd: "afterEnableAPIs"
                }, function() {
                    // goto create service account
                    var url = addAuthUserParam('https://console.cloud.google.com/iam-admin/serviceaccounts?project=' + projectId);
                    console.log('goto', url);
                    window.location.href = url;
                });
            }
        }

        var c1 = 0;
        var tm1 = setInterval(function() {
            if (++c1 > 20) {
                clearInterval(tm1);
                showError('enableAPIs() can\'t find ENABLE or MANAGE button');
                return;
            }

            var tryAPIButton = $('.md-button').filter(function() {
                var id = $(this).attr('id');
                return id && id.indexOf('try-api-in-api-explorer-button') !== -1;
            });

            // wait button loaded
            if (!tryAPIButton.length) {
                return;
            }
            clearInterval(tm1);

            var enableAPIButton = $('.md-button').filter(function() {
                var id = $(this).attr('id');
                return id && id.indexOf('enable-api-button') !== -1;
            });

            var manageAPIButton = $('.md-button').filter(function() {
                var id = $(this).attr('id');
                return id && id.indexOf('manage-api-button') !== -1;
            });


            if (manageAPIButton.length) {
                console.log(apiId, 'already enabled');
                nextAPI();
                return;
            }

            if (!enableAPIButton.length) {
                showError('enableAPIs() can\'t find ENABLE button');
                return;
            }

            console.log('click ENABLE button', enableAPIButton[0]);
            enableAPIButton[0].click();

            waitElementLoad('.chart', function() {
                console.log(apiId, 'enabled');
                nextAPI();
            }, function() {
                showError('enableAPIs() timeout:' + apiId);
            });
        }, 1000);
    });
}

function createServiceAccount() {
    showMessage('Create service account.');

    function step1() {
        showMessage('Create service account.');

        // wait step 1 ui ready
        waitElementLoad('input[formcontrolname="displayName"]', function(nameInput) {
            nameInput.val(ServiceName);
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent("input", false, true);
            nameInput[0].dispatchEvent(evt);

            var descInput = $('input[formcontrolname="description"]');
            if (!nameInput.length) {
                showError('createServiceAccount() step1 can\'t find service account description input element');
                return;
            }
            descInput.val('Service account for CubeBackup');
            descInput[0].dispatchEvent(evt);

            setTimeout(function() {
                var submitButton = $('cfc-stepper-step').find('button[type=submit]');
                if (!submitButton.length) {
                    showError('createServiceAccount() step1 can\'t find submit button');
                    return;
                }

                console.log('click submit button', submitButton[0]);
                submitButton[0].click();

                setTimeout(step2, 3000);
            }, 3000);
        }, function() {
            showError('can\'t find service account name input element');
        });
    }

    function step2() {
        showMessage('Grant service account access to project.');

        // wait step 2 ui ready
        waitElementLoad('cfc-select-dual-column[name=selectedRole]', function(el) {
            var selectRoleButton = el.parent().find('label');
            if (!selectRoleButton.length) {
                showError('createServiceAccount() step2 can\'t find Select a role button');
                return;
            }

            console.log('click Select a role button', selectRoleButton[0]);
            selectRoleButton[0].click();
            setTimeout(selectRole, 500);
        }, function(selector) {
            showError('createServiceAccount() step2 can\'t find ' + selector);
        });

        function selectRole() {
            var projectItem = $('div[role=menu]').first()
                .find('span.mat-option-text')
                .filter(function() {
                    var text = $.trim($(this).text()).toLowerCase();
                    return text == 'project';
                });

            if (!projectItem.length) {
                showError('createServiceAccount() step2 can\'t find Project item');
                return;
            }
            console.log('click Project item', projectItem[0]);
            projectItem[0].click();


            var ownerItem = $('div[role=menu]').last()
                .find('span.mat-option-text')
                .filter(function() {
                    var text = $.trim($(this).text()).toLowerCase();
                    return text == 'owner';
                });

            if (!ownerItem.length) {
                showError('createServiceAccount() step2 can\'t find Owner item');
                return;
            }
            console.log('click Owner item', ownerItem[0]);
            ownerItem[0].click();

            setTimeout(function() {
                var continueButton = $('cfc-stepper-step').find('button[type=submit]');
                if (!continueButton.length) {
                    showError('createServiceAccount() step2 can\'t find CONTINUE button');
                    return;
                }
                console.log('click CONTINUE button', continueButton[0]);
                continueButton[0].click();

                setTimeout(step3, 3000);
            }, 3000);
        }
    }

    function step3() {
        waitElementLoad('cfc-progress-button', function(el) {
            var doneButton = el.find('button');
            if (!doneButton.length) {
                showError('createServiceAccount() step3 can\'t find DONE button');
                return;
            }
            console.log('click DONE button', doneButton[0]);
            doneButton[0].click();

            setTimeout(checkIfServiceAccountExist, 1000);
        }, function(selector) {
            showError('createServiceAccount() step3 can\'t find ' + selector);
        });
    }

    function createKeyFile() {
        showMessage('Create service account key file.');

        // wait ui ready
        waitElementLoad('cfc-create-service-account-key-dialog', function(el) {
            var createKeyButton = $('cfc-progress-button button');
            if (!createKeyButton.length) {
                showError('createKeyFile() can\'t find CREATE KEY button');
                return;
            }
            console.log('click CREATE KEY button', createKeyButton[0]);
            createKeyButton[0].click();

            // wait key download dialog
            waitElementLoad('cfc-service-account-private-key-dialog', function() {
                removeMask();
                showMessage('Service account key file saved to your computer.');
                chrome.runtime.sendMessage({cmd: "keySaved"});
            }, function() {
                showError('createKeyFile() create key timeout');
            });
        }, function(selector) {
            showError('createKeyFile() can\'t find ' + selector);
        });
    }

    function enableDomainWideDelegation() {
        showMessage('Enable domain-wide delegation.');

        waitElementLoad('cfc-expand-button', function(el) {
            var expandButton = el.find('button');
            if (!expandButton.length) {
                showError('enableDomainWideDelegation() can\'t find expand button');
                return;
            }
            console.log('click expand button', expandButton[0]);
            expandButton[0].click();

            var label = $('mat-checkbox[formcontrolname="domainWideDelegationCtrl"]').find('label');
            if (!label.length) {
                showError('enableDomainWideDelegation() can\'t find label');
                return;
            }
            console.log('click label', label[0]);
            label[0].click();

            // wait product name
            setTimeout(function() {
                var productNameInput = $('input[formcontrolname=brandDisplayNameCtrl]');
                if (productNameInput.length) {
                    productNameInput.val('CubeBackup');

                    var evt = document.createEvent("HTMLEvents");
                    evt.initEvent("input", false, true);
                    productNameInput[0].dispatchEvent(evt);
                }

                setTimeout(function() {
                    var saveButton = $('cfc-progress-button').find('button');
                    if (!saveButton.length) {
                        showError('enableDomainWideDelegation() can\'t find save button');
                        return;
                    }

                    console.log('click save button', saveButton[0]);
                    saveButton[0].click();

                    setTimeout(checkIfServiceAccountExist, 1000);
                }, 1000);
            }, 5000);
        }, function() {
            showError('enableDomainWideDelegation() can\'t find expand button');
        });
    }

    function checkIfServiceAccountExist() {
        if (window.location.href.indexOf('https://console.cloud.google.com/iam-admin/serviceaccounts') !== 0) {
            showError('createServiceAccount() invalid url ' + window.location.href);
            return;
        }

        chrome.runtime.sendMessage({cmd: "getProjectId"}, function(projectId){
            if (getQueryParam('project') != projectId) {
                showError('createServiceAccount() invalid project id ' + getQueryParam('project'));
                return;
            }

            waitElementLoad('cfc-table', function() {
                var serviceAccountIndex = -1;
                var table = $('cfc-table').filter(function() {
                    var id = $(this).attr('id');
                    return id && id.indexOf('service-accounts-table') !== -1;
                });

                if (!table.length) {
                    showError('createServiceAccount() can\'t find service account list table');
                    return;
                }

                var nameTdIndex = -1;
                var actionTdIndex = -1;
                var domainWideTdIndex = -1;

                table.find('th').each(function(i) {
                    var text = $.trim($(this).text()).toLowerCase();
                    if (text == 'name') {
                        nameTdIndex = i;
                    } else if (text == 'actions') {
                        actionTdIndex = i;
                    } else if (text.indexOf('domain wide') !== -1) {
                        domainWideTdIndex = i;
                    }
                });

                if (nameTdIndex === -1) {
                    showError('createServiceAccount() can\'t find nameTdIndex');
                    return;
                }

                if (actionTdIndex === -1) {
                    showError('createServiceAccount() can\'t find actionTdIndex');
                    return;
                }

                var serviceNameTds = table.find('tr td:nth-child(' + (nameTdIndex+1) + ')');
                serviceNameTds.each(function(i) {
                    var name = $.trim($(this).text());
                    if (name == ServiceName) {
                        serviceAccountIndex = i;
                        return false;
                    }
                });

                console.log('serviceAccountIndex', serviceAccountIndex);

                // service account already exist
                if (serviceAccountIndex > -1) {
                    var domainWideEnabled = false;

                    if (domainWideTdIndex !== -1) {
                        var domainWideTds = table.find('tr td:nth-child(' + (domainWideTdIndex+1) + ')');
                        var text = $(domainWideTds[serviceAccountIndex]).text().toLowerCase();
                        if (text.indexOf('enabled') !== -1) {
                            domainWideEnabled = true;
                        }
                    }

                    var actionsTds = table.find('tr td:nth-child(' + (actionTdIndex+1) + ')');
                    if (!actionsTds[serviceAccountIndex]) {
                        showError('createServiceAccount() can\'t find action td');
                        return;
                    }

                    var actionButton = $(actionsTds[serviceAccountIndex]).find('button');
                    if (!actionButton.length) {
                        showError('createServiceAccount() can\'t find action button');
                        return;
                    }

                    console.log('click action button', actionButton[0]);
                    actionButton[0].click();

                    setTimeout(function() {
                        if (domainWideEnabled) {
                            var createKeyLink = $('cfc-menu-item[label="Create key"]').find('a');
                            if (!createKeyLink.length) {
                                showError('createServiceAccount() can\'t find create key link');
                                return;
                            }

                            console.log('click create key link', createKeyLink[0]);
                            createKeyLink[0].click();

                            setTimeout(createKeyFile, 1000);
                        } else {
                            var editLink = $('cfc-menu-item[label=Edit]').find('a');
                            if (!editLink.length) {
                                showError('createServiceAccount() can\'t find service account edit link');
                                return;
                            }

                            console.log('click service account edit link', editLink[0]);
                            editLink[0].click();

                            setTimeout(enableDomainWideDelegation, 1000);
                        }
                    }, 500);

                    return;
                }

                var createButton = $('button[ve=IamServiceAccountsCreateButton]');
                if (!createButton.length) {
                    showError('createServiceAccount() can\'t find CREATE SERVICE ACCOUNT button');
                    return;
                }

                console.log('click CREATE SERVICE ACCOUNT button', createButton[0]);
                createButton[0].click();

                setTimeout(step1, 3000);
            }, function() {
                showError('createServiceAccount() can\'t find SERVICE ACCOUNT list table');
            });
        });
    }

    checkIfServiceAccountExist();
}

function confirmGoogleAccount() {
    waitElementLoad('cfc-account-chooser button', function(dropMenuButton) {
        console.log('click drop menu button', dropMenuButton[0]);
        dropMenuButton[0].click();

        setTimeout(function() {
            $('div.cdk-overlay-connected-position-bounding-box').on('mouseover', 'a', function() {
                var a = $(this);
                if (a.attr('target') == '_blank') {
                    a.attr('target', '_self');
                    console.log('change target', a[0]);
                }
            });

            removeMask();
            var backdrop = $('div.cdk-overlay-backdrop');
            if (!backdrop.length) {
                showError('confirmGoogleAccount() can\'t find the backdrop');
                return;
            }

            backdrop.css({'background-color':'rgba(0,0,0,0.32)', 'opacity':'1'});

            var detail = $('div.cfc-accountchooser-details');
            if (!detail.length) {
                showError('confirmGoogleAccount() can\'t find the account detail');
                return;
            }

            var html = '';
            html += '<div class="cubebackup-arrow-container">';
            html += '<div class="cubebackup-arrow-box" style="left:-770px;width:450px;">';
            html += '<h3 style="color:#fff;">';
            html += 'Please confirm the current Google account, <br />';
            html += 'if it\'s not the account what you wanted, you can select or add another account.';
            html += '</h3>';
            html += '<p><button>Generate Google service account key file</button></p>';
            html += '</div>';
            html += '</div>';

            var con = $(html);
            con.find('button').click(function() {
                backdrop[0].click();
                createMask();
                createProject();
            });
            con.appendTo(detail);
        }, 500);
    }, function() {
        showError('confirmGoogleAccount() can\'t find the account drop menu button');
    });
}

function recoverStage() {
    chrome.runtime.sendMessage({cmd: 'getStage'}, function(stage){
        if (!stage) {
            return;
        }
        console.log('getStage', stage);

        createMask();

        if (stage == 'confirmGoogleAccount') {
            confirmGoogleAccount();
        } else if (stage == 'enableAPIs') {
            enableAPIs();
        } else if (stage == 'createServiceAccount') {
            createServiceAccount();
        }
    });
}

$(function() {
    recoverStage();
});
