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

function render() {
    container.innerHTML = Mustache.render(template, {
        clickCount: clickCount
    });
}

render();
