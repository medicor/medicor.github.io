/* Thanks to https://github.com/ragamufin/nodedump */
function visualize(anElement, aURI) {
    var that = this,
        xhr  = new XMLHttpRequest(),
        ;
    xhr.onreadystatechange = function () {
        if (this.readyState === 4 && this.status == 200) {
            that.parentNode.innerHTML = nodedump(JSON.parse(xhr.responseText));
        }
    }
    xhr.open('GET', aURI, true);
    xhr.send();
}