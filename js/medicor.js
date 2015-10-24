/* Thanks to https://github.com/ragamufin/nodedump */
function jsondump(anEvent, aURI) {
    var that = anEvent.parentNode,
        xhr  = window.XDomainRequest ? new XDomainRequest() : new XMLHttpRequest();
        
    xhr.onreadystatechange = xhr.onload = function () {
        if (!this.readyState || this.readyState === 4) {
             that.innerHTML = nodedump(JSON.parse(xhr.responseText));
        }
    };
    xhr.open('GET', aURI, true);
    xhr.send();
}