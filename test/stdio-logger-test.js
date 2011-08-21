var buster = require("buster");
var assert = buster.assert;
var stdioLogger = require("./../lib/stdio-logger");

buster.testCase("stdio logger", {
    setUp: function () {
        var self = this;
        this.stdout = "";
        this.stderr = "";
        var join = function (arr, sep) { return [].join.call(arr, sep); };

        this.logger = stdioLogger(
            { write: function () { self.stdout += join(arguments, " "); } },
            { write: function () { self.stderr += join(arguments, " "); } }
        );
    },

    "should write debug messages to stdout": function () {
        this.logger.d("Hey");
        this.logger.d("There");

        assert.equals(this.stdout, "Hey\nThere\n");
    },

    "should write info messages to stdout": function () {
        this.logger.info("Hey");
        this.logger.i("There");

        assert.equals(this.stdout, "Hey\nThere\n");
    },

    "should write log messages to stdout": function () {
        this.logger.log("Hey");
        this.logger.l("There");

        assert.equals(this.stdout, "Hey\nThere\n");
    },

    "should write warning messages to stderr": function () {
        this.logger.warn("Hey");
        this.logger.w("There");

        assert.equals(this.stderr, "Hey\nThere\n");
    },

    "should write error messages to stderr": function () {
        this.logger.error("Hey");
        this.logger.e("There");

        assert.equals(this.stderr, "Hey\nThere\n");
    },

    "should prefix with log level when being verbose": function () {
        this.logger.verbose = true;

        this.logger.d("Hey");
        this.logger.i("There");
        this.logger.l("Fella");
        this.logger.w("Woops");
        this.logger.e("Game over");

        assert.equals(this.stdout, "[DEBUG] Hey\n[INFO] There\n[LOG] Fella\n");
        assert.equals(this.stderr, "[WARN] Woops\n[ERROR] Game over\n");
    },

    "default io": {
        setUp: function () {
            var self = this;
            this.pout = process.stdout;
            this.perr = process.stderr;
            process.stdout = { write: function (str) { self.stdout += str; } };
            process.stderr = { write: function (str) { self.stderr += str; } };
        },

        tearDown: function () {
            process.stdout = this.pout;
            process.stderr = this.perr;
        },

        "should default to console for stdio": function () {
            var logger = stdioLogger();

            logger.i("Hey");
            logger.e("Game over");

            assert.equals(this.stdout, "Hey\n");
            assert.equals(this.stderr, "Game over\n");
        }
    },

    "should print inline message without line-break": function () {
        this.logger.inline.l("Hey there");

        assert.equals(this.stdout, "Hey there");
    },

    "should print inline message with long method name": function () {
        this.logger.inline.debug("Hey there");

        assert.equals(this.stdout, "Hey there");
    },

    "inline logger should inherit level from logger": function () {
        this.logger.level = "warn";
        this.logger.inline.debug("Hey there");
        this.logger.inline.warn("Watch out!");

        assert.equals(this.stdout, "");
        assert.equals(this.stderr, "Watch out!");
    },

    "logger as stream": {
        "should return a stream that logs at level 'log'": function () {
            var logStream = this.logger.streamForLevel("log");
            var infoStream = this.logger.streamForLevel("info");

            logStream.write("Hey");
            infoStream.write("Yo");

            assert.equals(this.stdout, "Hey");
        }
    }
});
