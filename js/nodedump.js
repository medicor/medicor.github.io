(function() {
/*
 * Simplified CSS adjustments by Medicor, 2015.
 *
 * @description nodedump - Outputs variables in a visual, easy to read format based on ColdFusion's CFDUMP tag
 * @author Andrew Hewitt <ragamufin@gmail.com>
 * 
 */

/*
 * constants
 */

// Default options
var DEFAULTOPTS = {
	collapse: false
	,dumpFunctionName: 'nodedump'
	,expand: true
	,hide:null
	,hideTypes:null
	,label:null
	,levels: null
	,show:null
	,sortKeys: true
	,top:null
};

// used to figure out the datatype of a variable
var toClass = {}.toString;

// list of simple types
var SIMPLETYPES = ['String','Number','Boolean','Undefined','Null','Date','Math'];

// output related constants
var TABLE = '<table class="nodedump nodedump-%s"><tbody>%s</tbody></table>';
var ROWHEADER = '<tr><th colspan="2" class="nodedump-label nodedump-%s"%s onclick="nodedump.toggleTable(this);">%s</th></tr>';
var ROW = '<tr%s><td class="nodedump-label nodedump-%s"%s onclick="nodedump.toggleRow(this);">%s</td><td class="nodedump-data"%s>%s</td></tr>';
var ROWHEADER1COL = '<tr><th class="nodedump-label nodedump-%s"%s onclick="nodedump.toggleTable(this);">%s</th></tr>';
var ROW1COL = '<tr%s><td class="nodedump-data">%s</td></tr>';
var EMPTY = ' [empty]';
var ROWHEADEREMPTY = '<tr><th class="nodedump-%s">%s%s</th></tr>';
var ROWEMPTY = '<tr><td class="nodedump-%s">%s%s</td></tr>';
var ERRORDATATYPE = 'Error-thrown';
var TITLEEXPANDED = '';
var TITLECOLLAPSED = '';
var TITLEFILTERED = ' [Filtered - %s]';
var TITLEFILTEREDSHOWN = '%d of %d items shown';
var TITLEFILTEREDHIDDEN = '%d of %d items hidden';
var TITLEFILTEREDTOP = 'Top %d of %d items shown';
var TITLEFILTEREDLEVELS = '%d levels shown';
var EXPANDEDLABELSTYLE = ' title="' +  TITLEEXPANDED + '"';
var COLLAPSEDLABELSTYLE = ' style="font-style: italic;" title="' + TITLECOLLAPSED + '"';
var COLLAPSEDSTYLE = ' style="display:none"';
var CIRCULARREFERENCE = 'Circular-Reference';
var CIRCULARSPLITSTRING = ' &raquo; ';
var CIRCULARTOPSTRINGLIMIT = 12;
var TOP = '[TOP]';
var CSS = '<style type="text/css">\n'
+'/* nodedump styles */\n'
+ 'table.nodedump, table.nodedump th, table.nodedump td { border-collapse: separate; border-spacing:2px; width: auto; line-height:normal; }\
table.nodedump { font-size: x-small; background-color: #dddddd; color: #222222; }\
table.nodedump .nodedump-label { cursor:pointer; }\
table.nodedump { background-color: #707000; }\
table.nodedump th { text-align: left; color: white; padding: 5px; background-color: #ADAD00; }\
table.nodedump td { vertical-align : top; padding: 3px; background-color: #FFFF9E; }\
table.nodedump td.nodedump-data { background-color: #ffffff; }\
table.nodedump td.nodedump-data pre { line-height:normal; background-color: #ffffff; border:0; padding:0; }\n\
table.nodedump td.nodedump-data pre code { font-size: small; font-family: Consolas, Menlo, Monaco, Lucida Console, monospace; Courier New, monospace, serif; }\n\
table.nodedump-Null, table.nodedump-Undefined { background-color: #333333; }\
table.nodedump-Null td.nodedump-data, table.nodedump-Undefined td.nodedump-data { color:#ffffff; background-color: #333333; }\
table.nodedump-Error { background-color: #CC3300; }\
table.nodedump-Error th.nodedump-Error { background-color: #CC3300; }\
table.nodedump-'+CIRCULARREFERENCE+', table.nodedump-'+ERRORDATATYPE+' { background-color: #333333; }\
table.nodedump-'+CIRCULARREFERENCE+' td.nodedump-'+CIRCULARREFERENCE+', table.nodedump-'+ERRORDATATYPE+' th.nodedump-'+ERRORDATATYPE+' { background-color: #333333; }\
table.nodedump-'+CIRCULARREFERENCE+' td.nodedump-label { color: #ffffff; }\n\
</style>';

var JS = "<script type=\"text/javascript\">\n\
	// based on CFDump's js\n\
	var nodedump;\n\
	nodedump = (function(){\n\
		var style;\n\
		return {\n\
			toggleRow: function(source){\n\
				var target = (document.all) ? source.parentElement.cells[1] : source.parentNode.lastChild;\n\
				this.toggleTarget(target,this.toggleSource(source));\n\
			} // end toggleRow\n\
\n\
			,toggleSource: function(source){\n\
				if (source.style.fontStyle == 'italic') {\n\
					source.style.fontStyle='normal';\n\
					source.title='" + TITLEEXPANDED + "';\n\
					return 'open';\n\
				} else {\n\
					source.style.fontStyle='italic';\n\
					source.title='" + TITLECOLLAPSED + "';\n\
					return 'closed';\n\
				}\n\
			} // end toggleSource\n\
\n\
			,toggleTable: function(source){\n\
				var switchToState=this.toggleSource(source);\n\
				if(document.all) {\n\
					var table=source.parentElement.parentElement;\n\
					for(var i=1;i<table.rows.length;i++) {\n\
						target=table.rows[i];\n\
						this.toggleTarget(target,switchToState);\n\
					}\n\
				}\n\
				else {\n\
					var table=source.parentNode.parentNode;\n\
					for (var i=1;i<table.childNodes.length;i++) {\n\
						target=table.childNodes[i];\n\
						if(target.style) {\n\
							this.toggleTarget(target,switchToState);\n\
						}\n\
					}\n\
				}\n\
			} // end toggleTable\n\
\n\
			,toggleTarget: function(target,switchToState){\n\
				target.style.display = (switchToState == 'open') ? '' : 'none';\n\
			} // end toggleTarget\n\
		};\n\
\n\
	})();\n\
</script>";

/*
 * Methods for building the output
 */

/*
 * Creates tables
 *
 * @param {string} dataType
 * @param {string} data body for the table
 * @returns the output for the table
 */
function doTable(dataType, data){
    return format(TABLE, dataType, data);
}

/*
 * Builds the style tag for the headers of tables
 * 
 * @param {string} dataType
 * @param {Boolean} expand
 * @returns {String|EXPANDEDLABELSTYLE|COLLAPSEDLABELSTYLE}
 */
function doHeaderStyle(dataType, expand){
	return expand ? EXPANDEDLABELSTYLE : COLLAPSEDLABELSTYLE;
}

/*
 * Builds the style tag for a row
 * 
 * @param {string} dataType
 * @param {Boolean} expand
 * @returns {COLLAPSEDSTYLE|String}
 */
function doRowStyle(dataType, expand){
	return expand ? '' : COLLAPSEDSTYLE;
}

/*
 * Builds the style tag for the label cell
 * 
 * @param {Boolean} expand
 * @returns {String|COLLAPSEDLABELSTYLE|EXPANDEDLABELSTYLE}
 */
function doCellLabelStyle(expand){
	return expand ? EXPANDEDLABELSTYLE : COLLAPSEDLABELSTYLE;
}

/*
 * Builds the style tag for the data cell
 * 
 * @param {Boolean} expand
 * @returns {String|COLLAPSEDSTYLE}
 */
function doCellStyle(expand){
	return expand ? '' : COLLAPSEDSTYLE;
}

/*
 * Builds the header row of a table
 * 
 * @param {string} dataType
 * @param {string} data
 * @param {Boolean} expand
 * @returns {string}
 */
function doRowHeader(dataType, data, expand){
	return format(ROWHEADER, dataType, doHeaderStyle(dataType, expand), data);
}

/*
 * Builds a regular two column row
 * 
 * @param {string} dataType
 * @param {string} key
 * @param {string} data
 * @param {Boolean} expand
 * @param {Boolean} expandCell
 * @returns {string}
 */
function doRow(dataType, key, data, expand, expandCell){
    return format(
		ROW
		, doRowStyle(dataType, expand)
		, dataType
		, doCellLabelStyle(expandCell)
		, key
		, doCellStyle(expandCell)
		, data
	);
}

/*
 * Builds the header row for a 1 column table
 * 
 * @param {string} dataType
 * @param {string} data
 * @param {Boolean} expand
 * @returns {string}
 */
function doRowHeader1Col(dataType, data, expand){
    return format(ROWHEADER1COL, dataType, doHeaderStyle(dataType, expand), data);
}

/*
 * Builds the 1 column row
 * @param {string} dataType
 * @param {string} data
 * @param {Boolean} expand
 * @returns {string}
 */
function doRow1Col(dataType, data, expand){
    return format(ROW1COL, doRowStyle(dataType, expand), data);
}

/*
 * Builds the empty row
 * 
 * @param {string} dataType
 * @param {string} data
 * @returns {string}
 */
function doRowEmpty(dataType, data){
    return format(ROWEMPTY, dataType, data, EMPTY);
}

/*
 * Builds the header row for empty vars
 * 
 * @param {string} dataType
 * @param {string} data
 * @returns {string}
 */
function doRowHeaderEmpty(dataType, data){
    return format(ROWHEADEREMPTY, dataType, data, EMPTY);
}

/*
 * Outputs the initial markup necessary
 * @param {object} options
 * @returns {CSS|JS|String}
 */
function doInitialOutput(options){
    return CSS + JS;
}

/*
 * Encodes HTML strings so they are displayed as such
 * 
 * @param {string} html
 * @returns {string}
 */
function escapeHtml(html){
    return String(html)
			.replace(/&(?!\w+;)/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
};

/*
 * Figures out the datatype of a variable
 * @param {any} obj
 * @returns {string|getDataType.dataType}
 */
function getDataType(obj){
	var dataType = toClass.call( obj );
	dataType = dataType.split(' ')[1];
	dataType = dataType.substring(0, dataType.length-1);

	return dataType;
}

/*
 * Clones variables to avoid pass by reference issues
 * 
 * @param {any} orig
 * @param {optional|string} dataType
 * @returns {clone.newArray|Array|clone.orig}
 */
function clone(orig, dataType){
	if(!dataType)
		dataType = getDataType(orig);

	if(dataType == 'Array'){
		var newArray = [];
		for(var i = 0; i < orig.length; i++)
			newArray.push(orig[i]);

		return newArray;

	} else if(dataType == 'Object') {
		var newObject = {};
		for(var key in orig)
			newObject[key] = clone(orig[key]);

		return newObject;

	} else
		return orig;
}

/*
 * Returns a path to the original variable if the current one is a circular reference
 * 
 * @param {any} obj
 * @param {object} cache
 * @param {array} currentPath
 * @returns {Array}
 */
function getPathToCircularRef(obj, cache, currentPath){
	var circPath = [];
	if(typeof obj != 'object')
		return circPath;

	if(!cache.objects){
		cache.objects = [];
		cache.paths = [];
	}
	var pos = cache.objects.indexOf(obj);
	if(pos >= 0)
		circPath = cache.paths[pos];

	cache.objects.push(obj);
	cache.paths.push(currentPath);

	return circPath;
}

/*
 * Does all the dirty laundry of capturing variable output, recursively
 * 
 * @param {any} obj
 * @param {objects} cache
 * @param {array} currentPath
 * @param {objects} options
 * @returns {string}
 */
function dumpObject(obj, cache, currentPath, options){
	// do this on the first call
	var data = '';
	var dataType = getDataType(obj);
	var isSimpleType = (SIMPLETYPES.indexOf(dataType) >= 0);
	var bFirstCall = (currentPath.length == 0);
	var label = dataType;
	var expand = true;
	var expandCells = true;

	if(bFirstCall){
		var topPath = TOP;
		cache.bFilteredLevel = false;
		if(options.label){
			label = options.label + ' - ' + label;
			/*topPath += ' ' + options.label;
			if(topPath.length > CIRCULARTOPSTRINGLIMIT)
				topPath = topPath.substr(0, CIRCULARTOPSTRINGLIMIT) + '...';
			topPath += ' - ' + dataType;*/
		}
		currentPath = [topPath];
	}

	var bEmpty = false;
	var bHeader = !isSimpleType;

	if(isSimpleType){ // Simple types

		switch(dataType){
			case 'Boolean':
				var val = '<span class="'+(obj ? 'nodedump-yes' : 'nodedump-no')+'">' + obj + '</span>';
				data = doRow(dataType, label, val, expand, expandCells);
			break;
			case 'String':
				if(obj.length === 0)
					bEmpty = true;
				else {
					var val = escapeHtml(obj);
					//var val = '<pre><code class="lang-html">' + hljs.highlight('xml', obj).value + '</code></pre>';
					data = doRow(dataType, label, val, expand, expandCells);
				}
			break;
			case 'Math':
			case 'Undefined':
			case 'Null':
				data = doRow1Col(dataType, label, expand);
			break;
			default:
				data = doRow(dataType, label, obj.toString(), expand, expandCells);
			break;
		}

	} else { // Non-Simple types

		// figure out if it should be expanded/collapsed
		expand = options.expand;
		if(typeof options.expand == 'object'){
			expand = expand.indexOf(dataType) > -1 || expand.indexOf(dataType.toLowerCase()) > -1;
		}
		if(expand){
			if(options.collapse == true || (
					typeof options.collapse == 'object' 
					&& (options.collapse.indexOf(dataType) > -1 || options.collapse.indexOf(dataType.toLowerCase()) > -1)
				)
			)
				expand = false;
		}

		switch(dataType){
			case 'RegExp':
			case 'Error':
				data += doRowHeader1Col(dataType, label, expand);
				data += doRow1Col(dataType, obj.toString(), expand);
			break;
			case 'Function':
				bHeader = true;
				data += doRowHeader1Col(dataType, label, expand);
				var txt = obj.toString();
				if(options.syntaxHighlight){
					var purtyText = hljs.highlight('javascript', txt);
					//var purtyText = hljs.highlightAuto(txt);
					txt = purtyText.value;
				} else {
					var txt = escapeHtml(obj.toString());
				}

				data += doRow1Col(dataType, '<pre><code class="lang-javascript">'+txt+'</code></pre>', expand);
				//data += doRow1Col(dataType, '<pre><code>'+escapeHtml(obj.toString())+'</code></pre>', expand);
			break;
			case 'Array':
			case 'Object':
			default:
				// set keys to collapse if an array of types was passed for expand and the current data-type is one of them
				expandCells = expand;
				if(typeof options.expand == 'object' && expand)
					expandCells = false;

				// check for circular references
				var circPath = getPathToCircularRef(obj, cache, currentPath);
				if(circPath.length > 0){
					dataType = CIRCULARREFERENCE;
					data = doRow(dataType, dataType, circPath.join(CIRCULARSPLITSTRING), expand);
				} else {
					var subPath;
					var loopObj = [];
					for(var key in obj)
						loopObj.push(key);
					if(dataType != 'Array' && options.sortKeys){
						loopObj.sort(function (a, b) {
							return a.toLowerCase().localeCompare(b.toLowerCase());
						});
					}

					cache.level++;
					var filtered = [];
					var bFilteredTop = false;
					var numTotalKeys = loopObj.length;
					var key, val;
					var numKeysShown = 0;
					var numKeysHidden = 0;
					var errThrown;
					for (var i = 0; i < loopObj.length; i++) {
						key = loopObj[i];
						errThrown = '';
						try{
							val = obj[key];
						} catch(err){
							errThrown = err.toString();
						}
						if(bFirstCall){
							if(!(!options.show || (options.show.length && (options.show.indexOf(key) >= 0 || options.show.indexOf(Number(key)) >= 0)))){
								numKeysHidden++;
								continue;
							} else if(options.hide && options.hide.length && (options.hide.indexOf(key) >= 0 || options.hide.indexOf(Number(key)) >= 0)){
								numKeysHidden++;
								continue;
							}
							if(options.top > 0 && numKeysShown === options.top){
								bFilteredTop = true;
								break;
							}
						}
						// skip any data types that should be hidden
						if(options.hideTypes){
							var subDataType = getDataType(val);
							if(options.hideTypes.indexOf(subDataType) > -1 || options.hideTypes.indexOf(subDataType.toLowerCase()) > -1){
								numKeysHidden++;
								continue;
							}
						}

						numKeysShown++;
						if(options.levels !== null && currentPath.length > options.levels){
							cache.bFilteredLevel = true;
							data += doRow(dataType, key, '', true);
							continue;
						}
						
						if(errThrown.length > 0){
							var errorRow = doRowHeader1Col(ERRORDATATYPE, ERRORDATATYPE, true)
											+ doRow1Col(ERRORDATATYPE, '<pre><code class="lang-javascript">'+hljs.highlight('javascript', errThrown).value+'</code></pre>', true);
											//+ doRow1Col(ERRORDATATYPE, errThrown, true);
							data += doRow(dataType, key, doTable(ERRORDATATYPE, errorRow), expandCells);
							continue;
						}
						subPath = clone(currentPath, 'Array');
						subPath.push(key);

						data += doRow(dataType, key, dumpObject(val, cache, subPath, options), expand, expandCells);
					}
					
					if(numTotalKeys === 0)
						bEmpty = true;
					else {
						if(bFirstCall){
							if(numKeysShown !== numTotalKeys){
								if(options.show || options.hideTypes){
									filtered.push(format(TITLEFILTEREDSHOWN, numKeysShown, numTotalKeys));
								} else if(options.hide){
									filtered.push(format(TITLEFILTEREDHIDDEN, numKeysHidden, numTotalKeys));
									numTotalKeys = numTotalKeys - numKeysHidden;
								}
								if(!(options.show || options.hideTypes) && bFilteredTop)
									filtered.push(format(TITLEFILTEREDTOP, numKeysShown, numTotalKeys));
							}
							if(cache.bFilteredLevel)
								filtered.push(format(TITLEFILTEREDLEVELS, options.levels));

						} else if(options.hideTypes && numKeysShown !== numTotalKeys){
							// show the filtered label for types being hidden
							filtered.push(format(TITLEFILTEREDSHOWN, numKeysShown, numTotalKeys));
						}
						if(filtered.length > 0)
							label += format(TITLEFILTERED, filtered.join(', '));

						data = doRowHeader(dataType, label, expand) + data;
					}
				}
			break;
		}

	}

    if(bEmpty)
            data = bHeader ? doRowHeaderEmpty(dataType, label) : doRowEmpty(dataType, label);

    return doTable(dataType, data);
}

/*
 * Function called to start the dump of a variable
 * 
 * @param {object} obj
 * @param {object} currentOptions
 * @returns {JS|CSS|String}
 */
function dump(obj, currentOptions){
	var options = clone(DEFAULTOPTS);
	for(var opt in currentOptions){
		options[opt] = currentOptions[opt];
	}

    return doInitialOutput(options) + dumpObject(obj, {}, [], options);
}

/*
 * Optional initialization of nodedump
 * 
 * @param {object} options
 * @returns {this}
 */
function init(options){
	for(var opt in options){
		DEFAULTOPTS[opt] = options[opt];
	}

	setDumpFunctionName();

	return this;
}

/*
 * Sets the name of the global function that can be used to nodedump vars
 * 
 * @param {string} fnName
  */
function setDumpFunctionName(fnName){
	if(fnName)
		DEFAULTOPTS.dumpFunctionName = fnName;

	global[DEFAULTOPTS.dumpFunctionName] = dump;
}

setDumpFunctionName(); // set the name of the global nodedump function to the default
})();