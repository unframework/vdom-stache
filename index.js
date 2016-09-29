var fs = require('fs');
var Mustache = require('mustache');

var template = fs.readFileSync(__dirname + '/index.html.mustache', 'utf8');

var clickCount = 0;

document.onclick = function () {
    clickCount += 1;

    render();
};

var container = document.createElement('div');
document.body.appendChild(container);

var domStage = document.createElement('div');

function createDOM(html) {
    // instantiate HTML in a staging area
    domStage.innerHTML = html;

    var domSet = Array.apply(null, new Array(domStage.childNodes.length)).map(function (x, index) {
        return domStage.childNodes[index];
    });

    // unlink staged nodes
    domStage.innerHTML = '';

    return domSet;
}

function stitchDOM(domSet, currentSnippetList, markerCommentValue) {
    var snippetMarkerNodeList = [];

    domSet.forEach(function (domNode) {
        var walker = document.createTreeWalker(domNode, NodeFilter.SHOW_COMMENT, {
            acceptNode: function (node) {
                return node.nodeValue === markerCommentValue ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        }, false);

        while(walker.nextNode()) {
            snippetMarkerNodeList.push(walker.currentNode);
        }
    });

    snippetMarkerNodeList.forEach(function (snippetMarkerNode, index) {
        currentSnippetList[index].forEach(function (contentNode) {
            snippetMarkerNode.parentNode.insertBefore(contentNode, snippetMarkerNode);
        });
    });
}

var domCache = Object.create(null);

function cacheHandler() {
    return function (text, render) {
        var parentId = this._renderId;
        var parentSnippetList = this._renderSnippetList;
        var currentId = parentId ? parentId + '/' + parentSnippetList.length : 'root';
        var currentSnippetList = [];

        // render template, collecting cacheable child snippets
        this._renderId = currentId;
        this._renderSnippetList = currentSnippetList;
        var html = render(text);
        this._renderId = parentId;
        this._renderSnippetList = parentSnippetList;

        var cacheInfo = domCache[currentId];

        if (!cacheInfo) {
            cacheInfo = domCache[currentId] = [ '', null ];
        }

        if (cacheInfo[0] !== html) {
            // keep reference to old DOM, if any
            var oldDomSet = cacheInfo[1];

            // instantiate resulting HTML
            var domSet = createDOM(html);

            // ensure we have at least some marker DOM
            if (domSet.length === 0) {
                domSet = [ document.createComment('') ];
            }

            // stitch together resulting DOM by replacing child snippet markers
            stitchDOM(domSet, currentSnippetList, '$cache$');

            cacheInfo[0] = html;
            cacheInfo[1] = domSet;

            // replace old DOM if we are part of the tree already
            if (oldDomSet !== null) {
                domSet.forEach(function (newContentNode) {
                    oldDomSet[0].parentNode.insertBefore(newContentNode, oldDomSet[0]);
                })

                oldDomSet.forEach(function (domNode) {
                    domNode.parentNode.removeChild(domNode);
                });
            }
        }

        if (parentSnippetList) {
            // return a stub for later stitching by parent
            parentSnippetList.push(cacheInfo[1]);

            return '<!--$cache$-->';
        } else {
            // top-level result
            cacheHandler.lastRootDomSet = cacheInfo[1];

            return '<!--$cacheRoot$-->';
        }
    }
}

function render() {
    var oldDomSet = cacheHandler.lastRootDomSet;

    var textOutput = Mustache.render(template, {
        clickCount: clickCount,

        cache: cacheHandler
    });

    // present the root DOM in the container
    if (textOutput !== '<!--$cacheRoot$-->') {
        throw new Error('cache tag must be top-level');
    }

    if (cacheHandler.lastRootDomSet !== oldDomSet) {
        container.innerHTML = '';
        cacheHandler.lastRootDomSet.forEach(function (node) {
            container.appendChild(node);
        });
    }
}

render();
