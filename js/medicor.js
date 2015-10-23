/* Thanks to https://github.com/ragamufin/nodedump */
function jsondump(aURI) {
    var that = window.event.target.parentNode,
        xhr  = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState === 4 && this.status == 200) {
            that.innerHTML = nodedump(JSON.parse(xhr.responseText));
        }
    };
    xhr.open('GET', aURI, true);
    xhr.send();
}