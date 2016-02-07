/****************************************************************************
*
*   app.js
*   hyper-chain
*
***/

"use strict";

var http = require("http"),
    url = require("url"),
    merge = require("merge"),
    path = require("path"),

    route = require("./route");


/****************************************************************************
*
*   Request
*
***/

function Request (raw) {
    this.raw = raw;

    this.method = raw.method;
    this.headers = raw.headers;
    this.url = url.parse(raw.url, true);
    this.stream = raw;

    this.body = undefined;
    this.form = undefined;
}

//===========================================================================
Request.prototype.readBody = function (callback) {
    this.stream.on("data", (chunk) => {
        if (chunk instanceof String) {
            if (this.body === undefined) {
                this.body = new String(chunk);
            }
            else {
                this.body += chunk;
            }
        }
        else {
            if (this.body === undefined) {
                this.body = new Buffer(chunk);
            }
            else {
                this.body = Buffer.concat(
                    [ this.body, chunk ],
                    this.body.length + chunk.length
                );
            }
        }
    });
    this.stream.on("end", callback);
};

//===========================================================================
Request.prototype.parseForm = function (callback) {
}


/****************************************************************************
*
*   Response
*
***/

function Response (raw, req, app) {
    this.raw = raw;
    this.req = req;
    this.app = app;

    this.code = 404;
    this.headers = {};
    this.body = undefined;
}

//===========================================================================
Response.prototype.code = function (code) {
    this.code = code;
    return this;
};

//===========================================================================
Response.prototype.body = function (body) {
    this.body = body;
    return this;
};

//===========================================================================
Response.prototype.type = function (type) {
    if (type === undefined) {
        delete this.header["Content-Type"];
    }
    else {
        this.headers["Content-Type"] = type;
    }
    return this;
};

//===========================================================================
Response.prototype.ok = function (body, type) {
    return this.code(200).body(body).type(type);
};

//===========================================================================
Response.prototype.notFound = function (body, type) {
    return this.code(404).body(body).type(type);
};

//===========================================================================
Response.prototype.send = function () {
    var filter = this.app.codes[this.code];

    if (typeof filter === "function") {
        this.send = undefined;
        filter(this.req, this);
    }

    // TODO: actually send the response
};

//===========================================================================
Response.prototype.pipe = function (stream) {
    // TODO: set chunked encoding and pipe the stream
};

//===========================================================================
Response.prototype.pipeFile = function (path) {
    // TODO: open the file and pipe its stream
};


/****************************************************************************
*
*   Application
*
***/

function Application (opts) {
    opts = merge(Application.DEFAULTS, opts || {});

    if (opts.static !== false && opts.static instanceof String) {
        this.static = path.resolve(opts.static);
    }
    this.host = opts.host;
    this.port = opts.port;

    this.router = new route.Router();
    this.codes = {};
}

Application.DEFAULTS = {
    staticPath : "./static",
    port : 3000,
    host : "0.0.0.0",
};

//===========================================================================
Application.prototype.run = function () {
    var app = this;

    this.server = http.createServer(function (reqRaw, resRaw) {
        var req = new Request(reqRaw),
            res = new Response(resRaw, req, app),
            urlPath = req.url.pathname,
            handler;

        handler = app.router.route(req.method, urlPath);
        if (handler) {
            handler.execute(req, res);
        }
        else if (app.static) {
            res.pipeFile(path.join(
                app.static,
                resolveStaticPath(urlPath)
            ));
        }
        else {
            res.notFound().send();
        }
    });
};

//===========================================================================
Application.prototype.on = function (code, callback) {
    if (callback === undefined) {
        delete this.codes[code];
    }
    else {
        this.codes[code] = callback;
    }
};


/****************************************************************************
*
*   Local functions
*
***/

//===========================================================================
function resolveStaticPath (path) {
    return "/".join(path.split("/").filter(
        (value) => value.length > 0
    ).every(
        (value, i, parts) => {
            if (value === "..") {
                parts[i] = "";
                if (i > 0) {
                    parts[i - 1] = "";
                }
            }
            return true;
        }
    ).filter(
        (value) => value.length > 0
    ));
}


/****************************************************************************
*
*   Exports
*
***/

exports.Application = Application;
