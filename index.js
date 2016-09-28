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

function cacheHandler() {
    return function (text, render) {
        var parentSnippetList = this._renderSnippetList;
        var currentSnippetList = [];

        // render template, collecting cacheable child snippets
        this._renderSnippetList = currentSnippetList;
        var html = render(text);
        this._renderSnippetList = parentSnippetList;

        // instantiate resulting HTML in a staging area
        domStage.innerHTML = html;

        var domSet = Array.apply(null, new Array(domStage.childNodes.length)).map(function (x, index) {
            return domStage.childNodes[index];
        });

        // unlink staged nodes
        domStage.innerHTML = '';

        // stitch together resulting DOM by replacing child snippet markers
        var snippetMarkerNodeList = [];

        domSet.forEach(function (domNode) {
            var walker = document.createTreeWalker(domNode, NodeFilter.SHOW_COMMENT, {
                acceptNode: function (node) {
                    return node.nodeValue === '$cache$' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
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

            snippetMarkerNode.parentNode.removeChild(snippetMarkerNode);
        });

        if (parentSnippetList) {
            // return a stub for later stitching by parent
            parentSnippetList.push(domSet);

            return '<!--$cache$-->';
        } else {
            // top-level result
            cacheHandler.lastRootDomSet = domSet;

            return '<!--$cacheRoot$-->';
        }
    }
}

function render() {
    var textOutput = Mustache.render(template, {
        clickCount: clickCount,

        cache: cacheHandler
    });

    // present the root DOM in the container
    if (textOutput !== '<!--$cacheRoot$-->') {
        throw new Error('cache tag must be top-level');
    }

    container.innerHTML = '';
    cacheHandler.lastRootDomSet.forEach(function (node) {
        container.appendChild(node);
    });
}

render();
