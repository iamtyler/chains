/****************************************************************************
*
*   route.js
*   chains
*
***/

"use strict";


/****************************************************************************
*
*   Handler
*
***/

function Handler (method, path, chain, params) {
    this.method = method;
    this.path = path;
    this.chain = chain;
    this.params = params;
    this.args = undefined;
}

//===========================================================================
Handler.prototype.execute = function (req, res) {
    var params = {},
        il = this.params.length;
    for (let i = 0; i < il; ++i) {
        params[this.params[i]] = this.args[i];
    }

    var state = {
            req : req,
            res : res,
            params : params,
            query : req.url.query || {},
        },
        chain = this.chain,
        next = function () {
            var fn = chain.shift();
            if (fn) {
                fn(state, next);
            }
        };

    next();
}

//===========================================================================
Handler.prototype.bind = function (args) {
    var handler = new Handler(
        this.method,
        this.path,
        this.chain,
        this.params
    );
    handler.args = args;
    return handler;
}


/****************************************************************************
*
*   Node
*
***/

function Node () {
    this.methods = {};
    this.values = {};
    this.variable = undefined;
}

//===========================================================================
Node.prototype.register = function (method, path, parts, chain, params) {
    if (parts.length === 0) {
        this.methods[method] = new Handler(method, path, chain, params);
        return true;
    }

    var part = parts.shift(),
        node;

    if (part.startsWith(":")) {
        node = this.variable || (this.variable = new Node());
        params.push(part.substring(1));
    }
    else {
        node = this.values[part] || (this.values[part] = new Node());
    }

    return node.register(method, path, parts, chain, params);
}

//===========================================================================
Node.prototype.match = function (method, parts, args) {
    if (parts.length === 0) {
        var handler = this.methods[method];
        return handler && handler.bind(args);
    }

    var part = parts.shift(),
        node = this.values[part];

    if (!node && this.variable) {
        node = this.variable;
        args.push(part);
    }

    if (!node) {
        return undefined;
    }

    return node.match(method, parts, args);
}


/****************************************************************************
*
*   Router
*
***/

function Router () {
    this.root = new Node();
    this.prefixes = [];
    this.prefix = [];
}

//===========================================================================
Router.prototype.prefix = function (prefix, callback) {
    if (!prefix.startsWith("/")) {
        prefix = "/" + prefix;
    }
    if (prefix.endsWith("/")) {
        prefix = prefix.substring(0, prefix.length - 1);
    }

    this.prefixes.push(this.prefix);
    Array.prototype.push.call(this.prefix, splitPath(prefix));
    callback(this);
    this.prefix = this.prefixes.pop();
}

//===========================================================================
Router.prototype.add = function (method, path) {
    var parts = this.prefix.concat(splitPath(path)),
        array = Array.prototype.slice.call(arguments, 2);

    return this.root.register(method, path, parts, flattenArray(array), []);
}

//===========================================================================
Router.prototype.get = function (path) {
    this.add("GET", path, Array.prototype.slice.call(arguments, 1));
}

//===========================================================================
Router.prototype.put = function (path) {
    this.add("PUT", path, Array.prototype.slice.call(arguments, 1));
}

//===========================================================================
Router.prototype.post = function (path) {
    this.add("POST", path, Array.prototype.slice.call(arguments, 1));
}

//===========================================================================
Router.prototype.delete = function (path) {
    this.add("DELETE", path, Array.prototype.slice.call(arguments, 1));
}

//===========================================================================
Router.prototype.route = function (method, path) {
    var parts = splitPath(path);
    if (parts === null) {
        return null;
    }

    return this.root.match(method, parts, []);
}


/****************************************************************************
*
*   Functions
*
***/

//===========================================================================
function splitPath (path) {
    if (path === "/") {
        return [];
    }

    if (path.startsWith("/")) {
        path = path.substring(1);
    }
    if (path.endsWith("/")) {
        path = path.substring(0, path.length - 1);
    }

    return path.split("/");
}

//===========================================================================
function flattenArray (array) {
    if (!(array instanceof Array)) {
        return [ array ];
    }

    var result = [];
    for (let fn of array) {
        if (fn instanceof Array) {
            Array.prototype.push.apply(result, flattenArray(fn));
        }
        else {
            result.push(fn);
        }
    }

    return result;
}


/****************************************************************************
*
*   Exports
*
***/

exports.Router = Router;
