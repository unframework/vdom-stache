
var clickCount = 0;

document.onclick = function () {
    clickCount += 1;

    render();
};

function render() {
    console.log('click count:', clickCount);
}

render();
