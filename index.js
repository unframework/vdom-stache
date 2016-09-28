var Mustache = require('mustache');

var clickCount = 0;

document.onclick = function () {
    clickCount += 1;

    render();
};

var container = document.createElement('div');
document.body.appendChild(container);

function render() {
    container.innerHTML = Mustache.render("click count: {{ clickCount }}", {
        clickCount: clickCount
    });
}

render();
