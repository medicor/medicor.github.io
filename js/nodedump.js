(function(global) {
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var formatRegExp = /%[sdj%]/g;
	var format = function(f) {
		if (!isString(f)) {
			var objects = [];
			for (var i = 0; i < arguments.length; i++) {
				objects.push(inspect(arguments[i]));
			}
			return objects.join(' ');
		}

		i = 1;
		var args = arguments;
		var len = args.length;
		var str = String(f).replace(formatRegExp, function(x) {
			if (x === '%%') return '%';
			if (i >= len) return x;
			switch (x) {
				case '%s':
					return String(args[i++]);
				case '%d':
					return Number(args[i++]);
				case '%j':
					try {
						return JSON.stringify(args[i++]);
					}
					catch (_) {
						return '[Circular]';
					}
				default:
					return x;
			}
		});
		for (var x = args[i]; i < len; x = args[++i]) {
			if (isNull(x) || !isObject(x)) {
				str += ' ' + x;
			}
			else {
				str += ' ' + inspect(x);
			}
		}
		return str;
	};


	/**
	 * Echos the value of a value. Trys to print the value out
	 * in the best way possible given the different types.
	 *
	 * @param {Object} obj The object to print out.
	 * @param {Object} opts Optional options object that alters the output.
	 */
	/* legacy: obj, showHidden, depth, colors*/
	function inspect(obj, opts) {
		// default options
		var ctx = {
			seen: [],
			stylize: stylizeNoColor
		};
		// legacy...
		if (arguments.length >= 3) ctx.depth = arguments[2];
		if (arguments.length >= 4) ctx.colors = arguments[3];
		if (isBoolean(opts)) {
			// legacy...
			ctx.showHidden = opts;
		}
		else if (opts) {
			// got an "options" object
			_extend(ctx, opts);
		}
		// set default options
		if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
		if (isUndefined(ctx.depth)) ctx.depth = 2;
		if (isUndefined(ctx.colors)) ctx.colors = false;
		if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
		if (ctx.colors) ctx.stylize = stylizeWithColor;
		return formatValue(ctx, obj, ctx.depth);
	}


	// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
	inspect.colors = {
		'bold': [1, 22],
		'italic': [3, 23],
		'underline': [4, 24],
		'inverse': [7, 27],
		'white': [37, 39],
		'grey': [90, 39],
		'black': [30, 39],
		'blue': [34, 39],
		'cyan': [36, 39],
		'green': [32, 39],
		'magenta': [35, 39],
		'red': [31, 39],
		'yellow': [33, 39]
	};

	// Don't use 'blue' not visible on cmd.exe
	inspect.styles = {
		'special': 'cyan',
		'number': 'yellow',
		'boolean': 'yellow',
		'undefined': 'grey',
		'null': 'bold',
		'string': 'green',
		'date': 'magenta',
		// "name": intentionally not styling
		'regexp': 'red'
	};


	function stylizeWithColor(str, styleType) {
		var style = inspect.styles[styleType];

		if (style) {
			return '\u001b[' + inspect.colors[style][0] + 'm' + str +
				'\u001b[' + inspect.colors[style][1] + 'm';
		}
		else {
			return str;
		}
	}


	function stylizeNoColor(str, styleType) {
		return str;
	}


	function arrayToHash(array) {
		var hash = {};

		array.forEach(function(val, idx) {
			hash[val] = true;
		});

		return hash;
	}


	function formatValue(ctx, value, recurseTimes) {
		// Provide a hook for user-specified inspect functions.
		// Check that value is an object with an inspect function on it
		if (ctx.customInspect &&
			value &&
			isFunction(value.inspect) &&
			// Filter out the util module, it's inspect function is special
			value.inspect !== inspect &&
			// Also filter out any prototype objects using the circular check.
			!(value.constructor && value.constructor.prototype === value)) {
			var ret = value.inspect(recurseTimes, ctx);
			if (!isString(ret)) {
				ret = formatValue(ctx, ret, recurseTimes);
			}
			return ret;
		}

		// Primitive types cannot have properties
		var primitive = formatPrimitive(ctx, value);
		if (primitive) {
			return primitive;
		}

		// Look up the keys of the object.
		var keys = Object.keys(value);
		var visibleKeys = arrayToHash(keys);

		if (ctx.showHidden) {
			keys = Object.getOwnPropertyNames(value);
		}

		// IE doesn't make error fields non-enumerable
		// http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
		if (isError(value) && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
			return formatError(value);
		}

		// Some type of object without properties can be shortcutted.
		if (keys.length === 0) {
			if (isFunction(value)) {
				var name = value.name ? ': ' + value.name : '';
				return ctx.stylize('[Function' + name + ']', 'special');
			}
			if (isRegExp(value)) {
				return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
			}
			if (isDate(value)) {
				return ctx.stylize(Date.prototype.toString.call(value), 'date');
			}
			if (isError(value)) {
				return formatError(value);
			}
		}

		var base = '',
			array = false,
			braces = ['{', '}'];

		// Make Array say that they are Array
		if (isArray(value)) {
			array = true;
			braces = ['[', ']'];
		}

		// Make functions say that they are functions
		if (isFunction(value)) {
			var n = value.name ? ': ' + value.name : '';
			base = ' [Function' + n + ']';
		}

		// Make RegExps say that they are RegExps
		if (isRegExp(value)) {
			base = ' ' + RegExp.prototype.toString.call(value);
		}

		// Make dates with properties first say the date
		if (isDate(value)) {
			base = ' ' + Date.prototype.toUTCString.call(value);
		}

		// Make error with message first say the error
		if (isError(value)) {
			base = ' ' + formatError(value);
		}

		if (keys.length === 0 && (!array || value.length == 0)) {
			return braces[0] + base + braces[1];
		}

		if (recurseTimes < 0) {
			if (isRegExp(value)) {
				return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
			}
			else {
				return ctx.stylize('[Object]', 'special');
			}
		}

		ctx.seen.push(value);

		var output;
		if (array) {
			output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
		}
		else {
			output = keys.map(function(key) {
				return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
			});
		}

		ctx.seen.pop();

		return reduceToSingleString(output, base, braces);
	}


	function formatPrimitive(ctx, value) {
		if (isUndefined(value))
			return ctx.stylize('undefined', 'undefined');
		if (isString(value)) {
			var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
				.replace(/'/g, "\\'")
				.replace(/\\"/g, '"') + '\'';
			return ctx.stylize(simple, 'string');
		}
		if (isNumber(value))
			return ctx.stylize('' + value, 'number');
		if (isBoolean(value))
			return ctx.stylize('' + value, 'boolean');
		// For some reason typeof null is "object", so special case here.
		if (isNull(value))
			return ctx.stylize('null', 'null');
	}


	function formatError(value) {
		return '[' + Error.prototype.toString.call(value) + ']';
	}


	function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
		var output = [];
		for (var i = 0, l = value.length; i < l; ++i) {
			if (hasOwnProperty(value, String(i))) {
				output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
					String(i), true));
			}
			else {
				output.push('');
			}
		}
		keys.forEach(function(key) {
			if (!key.match(/^\d+$/)) {
				output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
					key, true));
			}
		});
		return output;
	}


	function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
		var name, str, desc;
		desc = Object.getOwnPropertyDescriptor(value, key) || {
			value: value[key]
		};
		if (desc.get) {
			if (desc.set) {
				str = ctx.stylize('[Getter/Setter]', 'special');
			}
			else {
				str = ctx.stylize('[Getter]', 'special');
			}
		}
		else {
			if (desc.set) {
				str = ctx.stylize('[Setter]', 'special');
			}
		}
		if (!hasOwnProperty(visibleKeys, key)) {
			name = '[' + key + ']';
		}
		if (!str) {
			if (ctx.seen.indexOf(desc.value) < 0) {
				if (isNull(recurseTimes)) {
					str = formatValue(ctx, desc.value, null);
				}
				else {
					str = formatValue(ctx, desc.value, recurseTimes - 1);
				}
				if (str.indexOf('\n') > -1) {
					if (array) {
						str = str.split('\n').map(function(line) {
							return '  ' + line;
						}).join('\n').substr(2);
					}
					else {
						str = '\n' + str.split('\n').map(function(line) {
							return '   ' + line;
						}).join('\n');
					}
				}
			}
			else {
				str = ctx.stylize('[Circular]', 'special');
			}
		}
		if (isUndefined(name)) {
			if (array && key.match(/^\d+$/)) {
				return str;
			}
			name = JSON.stringify('' + key);
			if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
				name = name.substr(1, name.length - 2);
				name = ctx.stylize(name, 'name');
			}
			else {
				name = name.replace(/'/g, "\\'")
					.replace(/\\"/g, '"')
					.replace(/(^"|"$)/g, "'");
				name = ctx.stylize(name, 'string');
			}
		}

		return name + ': ' + str;
	}


	function reduceToSingleString(output, base, braces) {
		var numLinesEst = 0;
		var length = output.reduce(function(prev, cur) {
			numLinesEst++;
			if (cur.indexOf('\n') >= 0) numLinesEst++;
			return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
		}, 0);

		if (length > 60) {
			return braces[0] +
				(base === '' ? '' : base + '\n ') +
				' ' +
				output.join(',\n  ') +
				' ' +
				braces[1];
		}

		return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	}


	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
		return Array.isArray(ar);
	}

	function isBoolean(arg) {
		return typeof arg === 'boolean';
	}

	function isNull(arg) {
		return arg === null;
	}

	function isNumber(arg) {
		return typeof arg === 'number';
	}

	function isString(arg) {
		return typeof arg === 'string';
	}

	function isUndefined(arg) {
		return arg === void 0;
	}

	function isRegExp(re) {
		return isObject(re) && objectToString(re) === '[object RegExp]';
	}

	function isObject(arg) {
		return typeof arg === 'object' && arg !== null;
	}

	function isDate(d) {
		return isObject(d) && objectToString(d) === '[object Date]';
	}

	function isError(e) {
		return isObject(e) &&
			(objectToString(e) === '[object Error]' || e instanceof Error);
	}

	function isFunction(arg) {
		return typeof arg === 'function';
	}

	function objectToString(o) {
		return Object.prototype.toString.call(o);
	}


	/**
	 * Inherit the prototype methods from one constructor into another.
	 *
	 * The Function.prototype.inherits from lang.js rewritten as a standalone
	 * function (not on Function.prototype). NOTE: If this file is to be loaded
	 * during bootstrapping this function needs to be rewritten using some native
	 * functions as prototype setup using normal JavaScript does not work as
	 * expected during bootstrapping (see mirror.js in r114903).
	 *
	 * @param {function} ctor Constructor function which needs to inherit the
	 *     prototype.
	 * @param {function} superCtor Constructor function to inherit prototype from.
	 */

	var _extend = function(origin, add) {
		// Don't do anything if add isn't an object
		if (!add || !isObject(add)) return origin;

		var keys = Object.keys(add);
		var i = keys.length;
		while (i--) {
			origin[keys[i]] = add[keys[i]];
		}
		return origin;
	};

	function hasOwnProperty(obj, prop) {
		return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	/*
	 * @description nodedump - Outputs variables in a visual, easy to read format based on ColdFusion's CFDUMP tag
	 * @author Andrew Hewitt <ragamufin@gmail.com>
	 * 
	 */

	/*
	 * constants
	 */

	// Default options
	var DEFAULTOPTS = {
		collapse: false,
		dumpFunctionName: 'nodedump',
		expand: true,
		hide: null,
		hideTypes: null,
		label: null,
		levels: null,
		show: null,
		sortKeys: true,
		top: null
	};

	// used to figure out the datatype of a variable
	var toClass = {}.toString;

	// list of simple types
	var SIMPLETYPES = ['String', 'Number', 'Boolean', 'Undefined', 'Null', 'Date', 'Math'];

	// output related constants
	var TABLE = '<table class="nodedump nodedump-%s"><tbody>%s</tbody></table>';
	var ROWHEADER = '<tr><th colspan="2" class="nodedump-label nodedump-%s"%s onclick="nodedumphelper.toggleTable(this);">%s</th></tr>';
	var ROW = '<tr%s><td class="nodedump-label nodedump-%s"%s onclick="nodedumphelper.toggleRow(this);">%s</td><td class="nodedump-data"%s>%s</td></tr>';
	var ROWHEADER1COL = '<tr><th class="nodedump-label nodedump-%s"%s onclick="nodedumphelper.toggleTable(this);">%s</th></tr>';
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
	var EXPANDEDLABELSTYLE = ' title="' + TITLEEXPANDED + '"';
	var COLLAPSEDLABELSTYLE = ' style="font-style: italic;" title="' + TITLECOLLAPSED + '"';
	var COLLAPSEDSTYLE = ' style="display:none"';
	var CIRCULARREFERENCE = 'Circular-Reference';
	var CIRCULARSPLITSTRING = ' &raquo; ';
	var CIRCULARTOPSTRINGLIMIT = 12;
	var TOP = '[TOP]';
	
	var CSS = '<style type="text/css">\n' + 
	'/* nodedump styles */\n' + 
	'table.nodedump, table.nodedump th, table.nodedump td { border-collapse: separate; border: 1px dotted #CFD8DC; }\
	table.nodedump { font-size: small; }\
	table.nodedump .nodedump-label { cursor:pointer; }\
	table.nodedump { }\
	table.nodedump th { text-align: left; color: white; padding: 2px 6px; background-color: #607D8B; }\
	table.nodedump td { vertical-align : top; padding: 2px 6px; background-color: #ECEFF1; }\
	table.nodedump td.nodedump-data { background-color: #ffffff; }\
	table.nodedump td.nodedump-data pre { line-height:normal; background-color: #ffffff; border:0; padding:0; }\n\
	table.nodedump td.nodedump-data pre code { font-size: small; font-family: Consolas, Menlo, Monaco, Lucida Console, monospace; Courier New, monospace, serif; }\n\
	table.nodedump-Null, table.nodedump-Undefined { background-color: #37474F; }\
	table.nodedump-Null td.nodedump-data, table.nodedump-Undefined td.nodedump-data { color:#ffffff; background-color: #37474F; }\
	table.nodedump-Error { background-color: #CC3300; }\
	table.nodedump-Error th.nodedump-Error { background-color: #CC3300; }\
	</style>';

	var JS = "<script type=\"text/javascript\">\n\
	// based on CFDump's js\n\
	var nodedumphelper = (function(){\n\
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
	function doTable(dataType, data) {
		return format(TABLE, dataType, data);
	}

	/*
	 * Builds the style tag for the headers of tables
	 * 
	 * @param {string} dataType
	 * @param {Boolean} expand
	 * @returns {String|EXPANDEDLABELSTYLE|COLLAPSEDLABELSTYLE}
	 */
	function doHeaderStyle(dataType, expand) {
		return expand ? EXPANDEDLABELSTYLE : COLLAPSEDLABELSTYLE;
	}

	/*
	 * Builds the style tag for a row
	 * 
	 * @param {string} dataType
	 * @param {Boolean} expand
	 * @returns {COLLAPSEDSTYLE|String}
	 */
	function doRowStyle(dataType, expand) {
		return expand ? '' : COLLAPSEDSTYLE;
	}

	/*
	 * Builds the style tag for the label cell
	 * 
	 * @param {Boolean} expand
	 * @returns {String|COLLAPSEDLABELSTYLE|EXPANDEDLABELSTYLE}
	 */
	function doCellLabelStyle(expand) {
		return expand ? EXPANDEDLABELSTYLE : COLLAPSEDLABELSTYLE;
	}

	/*
	 * Builds the style tag for the data cell
	 * 
	 * @param {Boolean} expand
	 * @returns {String|COLLAPSEDSTYLE}
	 */
	function doCellStyle(expand) {
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
	function doRowHeader(dataType, data, expand) {
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
	function doRow(dataType, key, data, expand, expandCell) {
		return format(
			ROW, doRowStyle(dataType, expand), dataType, doCellLabelStyle(expandCell), key, doCellStyle(expandCell), data
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
	function doRowHeader1Col(dataType, data, expand) {
		return format(ROWHEADER1COL, dataType, doHeaderStyle(dataType, expand), data);
	}

	/*
	 * Builds the 1 column row
	 * @param {string} dataType
	 * @param {string} data
	 * @param {Boolean} expand
	 * @returns {string}
	 */
	function doRow1Col(dataType, data, expand) {
		return format(ROW1COL, doRowStyle(dataType, expand), data);
	}

	/*
	 * Builds the empty row
	 * 
	 * @param {string} dataType
	 * @param {string} data
	 * @returns {string}
	 */
	function doRowEmpty(dataType, data) {
		return format(ROWEMPTY, dataType, data, EMPTY);
	}

	/*
	 * Builds the header row for empty vars
	 * 
	 * @param {string} dataType
	 * @param {string} data
	 * @returns {string}
	 */
	function doRowHeaderEmpty(dataType, data) {
		return format(ROWHEADEREMPTY, dataType, data, EMPTY);
	}

	/*
	 * Outputs the initial markup necessary
	 * @param {object} options
	 * @returns {CSS|JS|SYNTAXHIGHLIGHTCSS|String}
	 */
	function doInitialOutput() {
		return CSS + JS;
	}

	/*
	 * Encodes HTML strings so they are displayed as such
	 * 
	 * @param {string} html
	 * @returns {string}
	 */
	function escapeHtml(html) {
		return String(html)
			.replace(/&(?!\w+;)/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	/*
	 * Figures out the datatype of a variable
	 * @param {any} obj
	 * @returns {string|getDataType.dataType}
	 */
	function getDataType(obj) {
		var dataType = toClass.call(obj);
		dataType = dataType.split(' ')[1];
		dataType = dataType.substring(0, dataType.length - 1);

		return dataType;
	}

	/*
	 * Clones variables to avoid pass by reference issues
	 * 
	 * @param {any} orig
	 * @param {optional|string} dataType
	 * @returns {clone.newArray|Array|clone.orig}
	 */
	function clone(orig, dataType) {
		if (!dataType)
			dataType = getDataType(orig);

		if (dataType == 'Array') {
			var newArray = [];
			for (var i = 0; i < orig.length; i++)
				newArray.push(orig[i]);

			return newArray;

		}
		else if (dataType == 'Object') {
			var newObject = {};
			for (var key in orig)
				newObject[key] = clone(orig[key]);

			return newObject;

		}
		else
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
	function getPathToCircularRef(obj, cache, currentPath) {
		var circPath = [];
		if (typeof obj != 'object')
			return circPath;

		if (!cache.objects) {
			cache.objects = [];
			cache.paths = [];
		}
		var pos = cache.objects.indexOf(obj);
		if (pos >= 0)
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
	function dumpObject(obj, cache, currentPath, options) {
		// do this on the first call
		var data = '';
		var dataType = getDataType(obj);
		var isSimpleType = (SIMPLETYPES.indexOf(dataType) >= 0);
		var bFirstCall = (currentPath.length == 0);
		var label = dataType;
		var expand = true;
		var expandCells = true;

		if (bFirstCall) {
			var topPath = TOP;
			cache.bFilteredLevel = false;
			if (options.label) {
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

		if (isSimpleType) { // Simple types

			switch (dataType) {
				case 'Boolean':
					var val = '<span class="' + (obj ? 'nodedump-yes' : 'nodedump-no') + '">' + obj + '</span>';
					data = doRow(dataType, label, val, expand, expandCells);
					break;
				case 'String':
					if (obj.length === 0)
						bEmpty = true;
					else {
						val = escapeHtml(obj);
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

		}
		else { // Non-Simple types

			// figure out if it should be expanded/collapsed
			expand = options.expand;
			if (typeof options.expand == 'object') {
				expand = expand.indexOf(dataType) > -1 || expand.indexOf(dataType.toLowerCase()) > -1;
			}
			if (expand) {
				if (options.collapse == true || (
						typeof options.collapse == 'object' && (options.collapse.indexOf(dataType) > -1 || options.collapse.indexOf(dataType.toLowerCase()) > -1)
					))
					expand = false;
			}

			switch (dataType) {
				case 'RegExp':
				case 'Error':
					data += doRowHeader1Col(dataType, label, expand);
					data += doRow1Col(dataType, obj.toString(), expand);
					break;
				case 'Function':
					bHeader = true;
					data += doRowHeader1Col(dataType, label, expand);
					var txt = escapeHtml(obj.toString());
					data += doRow1Col(dataType, '<pre><code class="lang-javascript">' + txt + '</code></pre>', expand);
					//data += doRow1Col(dataType, '<pre><code>'+escapeHtml(obj.toString())+'</code></pre>', expand);
					break;
				case 'Array':
				case 'Object':
				default:
					// set keys to collapse if an array of types was passed for expand and the current data-type is one of them
					expandCells = expand;
					if (typeof options.expand == 'object' && expand)
						expandCells = false;

					// check for circular references
					var circPath = getPathToCircularRef(obj, cache, currentPath);
					if (circPath.length > 0) {
						dataType = CIRCULARREFERENCE;
						data = doRow(dataType, dataType, circPath.join(CIRCULARSPLITSTRING), expand);
					}
					else {
						var subPath;
						var loopObj = [];
						for (var key in obj)
							loopObj.push(key);
						if (dataType != 'Array' && options.sortKeys) {
							loopObj.sort(function(a, b) {
								return a.toLowerCase().localeCompare(b.toLowerCase());
							});
						}

						cache.level++;
						var filtered = [];
						var bFilteredTop = false;
						var numTotalKeys = loopObj.length;
						var numKeysShown = 0;
						var numKeysHidden = 0;
						var errThrown;
						for (var i = 0; i < loopObj.length; i++) {
							key = loopObj[i];
							errThrown = '';
							try {
								val = obj[key];
							}
							catch (err) {
								errThrown = err.toString();
							}
							if (bFirstCall) {
								if (!(!options.show || (options.show.length && (options.show.indexOf(key) >= 0 || options.show.indexOf(Number(key)) >= 0)))) {
									numKeysHidden++;
									continue;
								}
								else if (options.hide && options.hide.length && (options.hide.indexOf(key) >= 0 || options.hide.indexOf(Number(key)) >= 0)) {
									numKeysHidden++;
									continue;
								}
								if (options.top > 0 && numKeysShown === options.top) {
									bFilteredTop = true;
									break;
								}
							}
							// skip any data types that should be hidden
							if (options.hideTypes) {
								var subDataType = getDataType(val);
								if (options.hideTypes.indexOf(subDataType) > -1 || options.hideTypes.indexOf(subDataType.toLowerCase()) > -1) {
									numKeysHidden++;
									continue;
								}
							}

							numKeysShown++;
							if (options.levels !== null && currentPath.length > options.levels) {
								cache.bFilteredLevel = true;
								data += doRow(dataType, key, '', true);
								continue;
							}

							if (errThrown.length > 0) {
								var errorRow = doRowHeader1Col(ERRORDATATYPE, ERRORDATATYPE, true) + doRow1Col(ERRORDATATYPE, '<pre><code class="lang-javascript">' + errThrown + '</code></pre>', true);
								//+ doRow1Col(ERRORDATATYPE, errThrown, true);
								data += doRow(dataType, key, doTable(ERRORDATATYPE, errorRow), expandCells);
								continue;
							}
							subPath = clone(currentPath, 'Array');
							subPath.push(key);

							data += doRow(dataType, key, dumpObject(val, cache, subPath, options), expand, expandCells);
						}

						if (numTotalKeys === 0)
							bEmpty = true;
						else {
							if (bFirstCall) {
								if (numKeysShown !== numTotalKeys) {
									if (options.show || options.hideTypes) {
										filtered.push(format(TITLEFILTEREDSHOWN, numKeysShown, numTotalKeys));
									}
									else if (options.hide) {
										filtered.push(format(TITLEFILTEREDHIDDEN, numKeysHidden, numTotalKeys));
										numTotalKeys = numTotalKeys - numKeysHidden;
									}
									if (!(options.show || options.hideTypes) && bFilteredTop)
										filtered.push(format(TITLEFILTEREDTOP, numKeysShown, numTotalKeys));
								}
								if (cache.bFilteredLevel)
									filtered.push(format(TITLEFILTEREDLEVELS, options.levels));

							}
							else if (options.hideTypes && numKeysShown !== numTotalKeys) {
								// show the filtered label for types being hidden
								filtered.push(format(TITLEFILTEREDSHOWN, numKeysShown, numTotalKeys));
							}
							if (filtered.length > 0)
								label += format(TITLEFILTERED, filtered.join(', '));

							data = doRowHeader(dataType, label, expand) + data;
						}
					}
					break;
			}

		}

		if (bEmpty)
			data = bHeader ? doRowHeaderEmpty(dataType, label) : doRowEmpty(dataType, label);

		return doTable(dataType, data);
	}

	/*
	 * Function called to start the dump of a variable
	 * 
	 * @param {object} obj
	 * @param {object} currentOptions
	 * @returns {JS|CSS|SYNTAXHIGHLIGHTCSS|String}
	 */
	function dump(obj, currentOptions) {
		var options = clone(DEFAULTOPTS);
		for (var opt in currentOptions) {
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
	function init(options) {
		for (var opt in options) {
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
	function setDumpFunctionName(fnName) {
		if (fnName)
			DEFAULTOPTS.dumpFunctionName = fnName;

		global[DEFAULTOPTS.dumpFunctionName] = dump;
	}

	setDumpFunctionName(); // set the name of the global nodedump function to the default
	
})(window);
