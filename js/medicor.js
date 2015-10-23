/* Thanks to https://github.com/ragamufin/nodedump */
function visualize(aURI) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState === 4 && this.status == 200) {
            this.parentNode.innerHTML = nodedump(JSON.parse(xhr.responseText));
        }
    }
    xhr.open('GET', aURI, true);
    xhr.send();
}