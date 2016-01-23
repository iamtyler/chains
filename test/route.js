"use strict";

var route = require("../route");

var router = new route.Router();

router.get("/", () => console.log("root handler"));
router.get("/test", () => console.log("test handler"));
router.get("/test/two", () => console.log("test two handler"));

router.get("/test/:var/echo",
    (state) => console.log("test echo handler:", state.params.var)
);

router.get("/chain",
    (state, next) => { console.log("chain 1"); next(); },
    (state, next) => { console.log("chain 2"); next(); },
    [
        (state, next) => { console.log("chain 3"); next(); },
        (state, next) => { console.log("chain 4"); next(); },
    ],
    (state, next) => { console.log("chain 5"); next(); }
);

router.get("/early",
    (state, next) => console.log("early 1"),
    () => console.log("early 2")
);

function execute (method, path) {
    console.log("execute:", method, path);
    var handler = router.route(method, path);
    if (handler) {
        console.log("FOUND:", handler.method, handler.path);
        handler.execute();
    }
    else {
        console.log("NOT FOUND");
    }
    console.log();
}

execute("GET", "/");
execute("GET", "/test");
execute("GET", "/nothing");
execute("GET", "/test/two");
execute("GET", "/test/yep/echo");
execute("GET", "/test/yep");
execute("GET", "/chain");
execute("GET", "/early");


