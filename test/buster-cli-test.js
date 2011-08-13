var buster = require("buster");
var busterEventedLogger = require("buster-evented-logger")
var assert = buster.assert;
var refute = buster.refute;
var busterCli = require("./../lib/buster-cli");
var stdioLogger = require("./../lib/stdio-logger");

function mockLogger(context) {
    context.stdout = "";
    context.stderr = "";
    var j = Array.prototype.join;
    context.cli.logger = stdioLogger.create(
        {puts: function () { context.stdout += j.call(arguments, " ") + "\n"; }},
        {puts: function () { context.stderr += j.call(arguments, " ") + "\n"; }}
    )
}

buster.testCase("buster-cli", {
    setUp: function () {
        this.cli = Object.create(busterCli);
    },

    "should have logger": function () {
        assert(busterEventedLogger.isPrototypeOf(this.cli.logger));
    },

    "should run without callback": function () {
        mockLogger(this);
        this.cli.run(["--help"]);
        assert(true);
    },

    "generic help output": {
        setUp: function () {
            mockLogger(this);
        },

        "should include mission statement": function (done) {
            var self = this;
            var statement = "A small CLI that only lives in the test suite.";
            this.cli.missionStatement = statement;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, statement);
                done();
            });
        },

        "should include description": function (done) {
            var self = this;
            var desc = "How about that.";
            this.cli.description = desc;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, desc);
                done();
            });
        },

        "should list help output for all options, including --help": function (done) {
            var self = this;
            var portOpt = this.cli.opt("-p", "--port", "Help text is here.");

            this.cli.run(["--help"], function () {
                assert.match(self.stdout, self.cli.helpOpt.signature + ": Shows this message.");
                assert.match(self.stdout, portOpt.signature + ": Help text is here.");
                done();
            });
        }
    },

    "option": {
        setUp: function () {
            this.port = this.cli.opt("-p", "--port", "Help text is here.", {});
        },

        "should be addressable by short key": function (done) {
            var self = this;
            this.cli.run(["-p"], function () {
                assert(self.port.isSet);
                done();
            });
        },

        "should be addressable by long key": function (done) {
            var self = this;
            this.cli.run(["--port"], function () {
                assert(self.port.isSet);
                done();
            });
        }
    },

    "test calls 'loadOptions' once if present": function (done) {
        var self = this;
        mockLogger(this);
        this.cli.loadOptions = this.spy();

        this.cli.run(["--help"], function () {
            self.cli.run(["--help"], function () {
                assert(self.cli.loadOptions.calledOnce);
                done();
            });
        });
    },

    "help topics": {
        setUp: function () {
            mockLogger(this);
            this.cli.helpTopics = {
                "topic": "This is the text for the topic.",
                "other": "Another topic"
            }
        },

        "should be listed with the description of --help in the --help output": function (done) {
            var self = this;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, "See also --help [topic,other].");
                done();
            });
        },

        "should print topic help with --help sometopic": function (done) {
            var self = this;
            this.cli.run(["--help", "topic"], function () {
                assert.equals(self.stdout, "This is the text for the topic.\n");
                done();
            });
        },

        "should print error message with --help noneexistingtopic": function (done) {
            var self = this;
            this.cli.run(["--help", "doesnotexist"], function () {
                assert.equals(self.stdout, "The topic 'doesnotexist' does not exist. "
                              + "Valid topics are: topic,other.\n");
                done();
            });
        },

        "should print topic unwrapped when just one topic": function (done) {
            var self = this;

            this.cli.helpTopics = {
                "topic": "This is the text for the topic."
            }

            this.cli.run(["--help"], function () {
                assert.match(self.stdout, "See also --help topic.");
                done();
            });
        },

        "should not print any topic information when empty topics object is specified": function (done) {
            this.cli.helpTopics = {};
            var self = this;
            this.cli.run(["--help"], function () {
                refute.match(self.stdout, "See also --help [].");
                done();
            });
        }
    },



    "option restricted to list of values": {
        setUp: function () {
            mockLogger(this);
            this.aaaOpt = this.cli.opt("-a", "--aaa", "Aaaaa!", {
                values: ["foo", "bar", "baz"]
            });
        },

        "should list available options in help output": function (done) {
            var self = this;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, "One of foo, bar, baz.");
                done();
            });
        },

        "should get value set when value passed to it": function (done) {
            var self = this;
            this.cli.run(["-a", "bar"], function () {
                assert.equals(self.aaaOpt.value(), "bar");
                done();
            });
        },

        "should error when getting a value not in the list": function (done) {
            var self = this;
            this.cli.run(["-a", "lolcat"], function () {
                // The actual error message comes from buster-args.
                // TODO: Find a better way to test the error msg here.
                refute.equals(self.stderr, "");
                done();
            });
        }
    },

    "option with default value": {
        setUp: function () {
            mockLogger(this);
            this.aaaOpt = this.cli.opt("-f", "--ffff", "Fffffuuu", {
                defaultValue: "DRM"
            });
        },

        "should print default value in help text": function (done) {
            var self = this;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, "Default is DRM.");
                done();
            });
        },

        "should have default value": function (done) {
            var self = this;
            this.cli.run([], function () {
                assert.equals(self.aaaOpt.value(), "DRM");
                done();
            });
        },

        "should provide overridden value": function (done) {
            var self = this;
            this.cli.run(["-f", "gaming consoles"], function () {
                assert.equals(self.aaaOpt.value(), "gaming consoles");
                done();
            });
        },

        "// should fail with no value": function (done) {
            // Not failing. Probably a flaw in buster-args.
            var self = this;
            this.cli.run(["-f"], function () {
                refute.equals(self.stderr, "");
                done();
            });
        }
    },

    "option with value": {
        setUp: function () {
            mockLogger(this);
            this.someOpt = this.cli.opt("-s", "--ss", "A creeper.", {
                hasValue: true
            });
        },

        "should get value assigned": function (done) {
            var self = this;
            this.cli.run(["-s", "ssssssBOOOOOM!"], function () {
                assert.equals(self.someOpt.value(), "ssssssBOOOOOM!");
                done();
            });
        }
    },

    "option with validator": {
        setUp: function () {
            mockLogger(this);
            this.anOpt = this.cli.opt("-c", "--character", "The character.", {
                validators: {"required": "Here's a custom error msg."}
            });
        },

        "should perform validation": function (done) {
            var self = this;
            this.cli.run([], function () {
                assert.match(self.stderr, "Here's a custom error msg.");
                done();
            });
        }
    },


    "should call onRun when there are no errors": function (done) {
        this.cli.onRun = function () {
            assert(true);
            done();
        };

        this.cli.run([], function () {});
    },

    "should not call onRun when there are errors": function (done) {
        var self = this;
        mockLogger(this);
        this.cli.onRun = this.spy();
        var someOpt = this.cli.opt("-a", "--aa", "Aaaaa");
        someOpt.addValidator(function () { return "An error."; });
        this.cli.run(["-a"], function () {
            refute(self.cli.onRun.called);
            done();
        });
    }
});