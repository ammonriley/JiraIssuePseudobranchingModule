// ==UserScript==
// @name         JiraIssuePseudobranchingModule
// @namespace    http://github.com/ammonriley/JiraIssuePseudobranchingModule
// @version      0.2
// @description  Add a module to jira issues to display information about clones like the branching module does.
// @author       Ammon Riley
// @include      https://jira.harmonicinc.com/*
// @grant        none
// ==/UserScript==

(function() {
    "use strict";

    var seenKeys = [];

    function issueUrl(key) {
        return "/rest/api/2/issue/"+key+"?fields=status,summary,customfield_10857,customfield_10858,customfield_12242,customfield_10042,resolution,status,priority,issuelinks,customfield_10450,customfield_10447,customfield_10841,customfield_10843";
    }

    function setParentCell(cell) {
        cell.addClass("multiBranchParentIcon");
        var icon = $("<img>");
        icon.attr("width", 16).attr("height", 16);
        icon.attr("border", 0);
        icon.attr("align", "absmiddle");
        icon.attr("title", "Pseudo-branch Parent");
        icon.attr("alt", "Pseudo-branch Parent");
        icon.attr("src", "/download/resources/com.harmonic.cm.jira.hlit-cm-jira-v2plugin:multiBranchWebResource/mb-images/multi_branch_parent_issue.png");
        cell.append(icon);
    }

    function getIcon(text, url) {
        var icon = $("<img>");
        icon.attr("width", 16).attr("height", 16).attr("border", 0).attr("align", "absmiddle");
        icon.attr("title", text).attr("alt", text).attr("src", url);
        return icon;
    }

    function populateLinkRow(linkRow, key, fields) {
        var parentCell = $("<td></td>");
        linkRow.append(parentCell);

        var keyCell = $("<td class=\"issuekey\"></td>");
        linkRow.append(keyCell);

        var keyLink = $("<a class=\"issue-link\">"+key+"</a>");
        keyLink.attr("title", fields.summary);
        keyLink.attr("data-issue-key", key);
        keyLink.attr("href", "/browse/"+key);
        keyCell.append(keyLink);

        var affectsCell = $("<td class=\"affects\"></td>");
        linkRow.append(affectsCell);
        if (fields.customfield_10857)
            affectsCell.append(fields.customfield_10857.name);

        var fixCell = $("<td class=\"fix\"></td>");
        linkRow.append(fixCell);
        if (fields.customfield_10858)
            fixCell.append(fields.customfield_10858.name);

        var fixBuildCell = $("<td class=\"fixInBuild\"></td>");
        linkRow.append(fixBuildCell);
        if (fields.customfield_12242 !== null && fields.customfield_12242.length > 0)
            fixBuildCell.append(fields.customfield_12242[0]);

        var verifiedBuildCell = $("<td class=\"verifiedInBuild\"></td>");
        linkRow.append(verifiedBuildCell);
        if (fields.customfield_10042 !== null)
            verifiedBuildCell.append(fields.customfield_10042);

        var resolutionCell = $("<td class=\"resolutionNoStyleThx\"></td>");
        linkRow.append(resolutionCell);
        if (fields.resolution !== null)
            resolutionCell.append(fields.resolution.name);

        var status = $("<td class=\"statusName\"></td>");
        linkRow.append(status);

        var statusSpan = $("<span>"+fields.status.name+"</span>");
        statusSpan.addClass("jira-issue-status-lozenge aui-lozenge jira-issue-status-lozenge-max-width-short");
        if (fields.status.name == "Resolved" || fields.status.name == "Closed")
            statusSpan.addClass("jira-issue-status-lozenge-green jira-issue-status-lozenge-done");
        else if (fields.status.name == "In Progress")
            statusSpan.addClass("jira-issue-status-lozenge-yellow jira-issue-status-lozenge-done");
        else if (fields.status.name == "Awaiting Triage")
            statusSpan.addClass("jira-issue-status-lozenge-new aui-lozenge-subtle jira-issue-status-lozenge-blue-gray");
        else
            statusSpan.addClass("jira-issue-status-lozenge-blue-gray");
        status.append(statusSpan);

        var priority = $("<td class=\"priority\"></td>");
        priority.append(getIcon(fields.priority.name, fields.priority.iconUrl));
        linkRow.append(priority);

        var rnCell = $("<td class=\"includeThisIssueInTheReleaseNotesIcon\"></td>");
        linkRow.append(rnCell);
        if ("customfield_10447" in fields && fields.customfield_10447 !== null && fields.customfield_10447.length > 0 && fields.customfield_10447[0].value == "Yes")
            rnCell.append(getIcon("Include this issue in the Release Notes?", "/images/icons/accept.png"));
        else
            rnCell.append(getIcon("Include this issue in the Release Notes?", "/images/icons/cancel.png"));

        var docCell = $("<td class=\"includeThisIssueInTheDocumentationIcon\"></td>");
        linkRow.append(docCell);
        if ("customfield_10841" in fields && fields.customfield_10841 !== null && fields.customfield_10841.length > 0 && fields.customfield_10841[0].value == "Yes")
            docCell.append(getIcon("Include this issue in Documentation?", "/images/icons/accept.png"));
        else
            docCell.append(getIcon("Include this issue in Documentation?", "/images/icons/cancel.png"));

        var incRNCell = $("<td class=\"incorporatedInRelaseNotesIcon\"></td>");
        linkRow.append(incRNCell);
        if ("customfield_10450" in fields && fields.customfield_10450 !== null && fields.customfield_10450.length > 0 && fields.customfield_10450[0].value == "Yes")
            incRNCell.append(getIcon("Incorporated in Release Notes?", "/images/icons/accept.png"));
        else
            incRNCell.append(getIcon("Incorporated in Release Notes?", "/images/icons/cancel.png"));

        var incDocCell = $("<td class=\"incorporatedInDocumentationIcon\"></td>");
        linkRow.append(incDocCell);
        if ("customfield_10843" in fields && fields.customfield_10843 !== null && fields.customfield_10843.length > 0 && fields.customfield_10843[0].value == "Yes")
            incDocCell.append(getIcon("Incorporated in Documentation?", "/images/icons/accept.png"));
        else
            incDocCell.append(getIcon("Incorporated in Documentation?", "/images/icons/cancel.png"));

        return parentCell;
    }

    function addIssue(issueId, displayIssueSummary, linkTableBody, thisIsParent) {
        if (seenKeys.indexOf(issueId) != -1)
            return;

        seenKeys.push(issueId);

        $.getJSON(issueUrl(issueId), function(data) {
            var link = $("<tr></tr>");
            var parentCell = populateLinkRow(link, issueId, data.fields);
            linkTableBody.append(link);
            $(linkTableBody).find("tr").sort(function (a, b) {
                return $(a).find(".affects").text() > $(b).find(".affects").text();
            }).appendTo(linkTableBody);

            if (data.fields.issuelinks === null) {
                setParentCell(parentCell);
                return;
            }

            $.each(data.fields.issuelinks, function(idx, val) {
                if (val.type.name == "Branch") {
                    if ("inwardIssue" in val) {
                        // val.inwardIssue.key is the parent.
                        if (val.inwardIssue.fields.summary == displayIssueSummary) {
                            addIssue(val.inwardIssue.key, displayIssueSummary, linkTableBody, true);
                            thisIsParent = false;
                        }
                    } else {
                        if (val.outwardIssue.fields.summary == displayIssueSummary)
                            addIssue(val.outwardIssue.key, displayIssueSummary, linkTableBody, false);
                    }
                } else if (val.type.name == "Cloners") {
                    if ("inwardIssue" in val) {
                        if (val.inwardIssue.fields.summary == displayIssueSummary)
                            addIssue(val.inwardIssue.key, displayIssueSummary, linkTableBody, false);
                    } else {
                        // Parent is somewhere up the chain.
                        if (val.outwardIssue.fields.summary == displayIssueSummary) {
                            addIssue(val.outwardIssue.key, displayIssueSummary, linkTableBody, true);
                            thisIsParent = false;
                        }
                    }
                }
            });

            if (thisIsParent)
                setParentCell(parentCell);
        });
    }

    function addPseudoBranchingModule() {
        var existingModule = $("#pseudobranchingmodule");
        if (existingModule)
            existingModule.remove();
        seenKeys.length = 0;

        var cloneModuleDiv = $("<div id=\"pseudobranchingmodule\" class=\"module toggle-wrap\"></div>");
        var cloneModuleHeaderDiv = $("<div class=\"mod-header\"></div>");
        cloneModuleDiv.append(cloneModuleHeaderDiv);
        var cloneModuleTitle = $("<h3 class=\"toggle-title\">Clone/Branch Issues</h3>");
        cloneModuleHeaderDiv.append(cloneModuleTitle);

        var cloneModuleContentDiv = $("<div class=\"mod-content\" style=\"overflow-x:auto;-ms-overflow-y:auto\"></div>");
        cloneModuleDiv.append(cloneModuleContentDiv);

        var linkTable = $("<table class=\"aui issue-links links-outward aui-table-rowhover\"></table>");
        cloneModuleContentDiv.append(linkTable);

        var linkTableHead = $("<thead></thead>");
        linkTable.append(linkTableHead);

        var linkTableHeadText = $("<tr><td colspan=5>This issue has the following <strong>pseudo-branch issues</strong>:</td></tr>");
        linkTableHead.append(linkTableHeadText);

        var columnHeaders = $("<tr></tr>");
        columnHeaders.append($("<td>&nbsp</td>"));
        columnHeaders.append($("<td>Issue Key</td>"));
        columnHeaders.append($("<td>Affects Version</td>"));
        columnHeaders.append($("<td>Fix Version</td>"));
        columnHeaders.append($("<td>Fix in Build</td>"));
        columnHeaders.append($("<td>Verified in Build</td>"));
        columnHeaders.append($("<td>Resolution</td>"));
        columnHeaders.append($("<td>Status</td>"));
        columnHeaders.append($("<td>P</td>"));
        columnHeaders.append($("<td>RN?</td>"));
        columnHeaders.append($("<td>Doc?</td>"));
        columnHeaders.append($("<td>Inc RN</td>"));
        columnHeaders.append($("<td>Inc Doc</td>"));
        linkTableHead.append(columnHeaders);

        var linkTableBody = $("<tbody></tbody>");
        linkTable.append(linkTableBody);

        var displayIssueId = $("#key-val").attr("data-issue-key");
        var displayIssueSummary = $("#summary-val").text();

        addIssue(displayIssueId, displayIssueSummary, linkTableBody, true);

        var branchingModule = $("#branchingmodule");
        cloneModuleDiv.insertAfter(branchingModule);
        branchingModule.hide();

        var content = $("#issue-content").parent();
        var observer = new MutationObserver(function(mutations) {
            $.each(mutations, function(i, m) {
                if (m.oldValue.includes("loading") && !$(m.target).hasClass("loading")) {
                    addPseudoBranchingModule();
                    return false;
                }
            });
        });
        var config = { attributes: true, attributeOldValue: true, attributeFilter: ["class"]};
        observer.observe(content[0], config);
    }

    var jira = $('#jira');
    var jiraObserver = new MutationObserver(function(mutations) {
        $.each(mutations, function(i, m) {
            if (!m.oldValue.includes("navigator-issue-only") && $(m.target).hasClass("navigator-issue-only")) {
                addPseudoBranchingModule();
                return false;
            }
        });
    });
    var config = { attributes: true, attributeOldValue: true, attributeFilter: ["class"]};
    jiraObserver.observe(jira[0], config);

    if (jira.hasClass('navigator-issue-only'))
        addPseudoBranchingModule();
})();
