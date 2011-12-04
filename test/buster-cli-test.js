var buster = require("buster");
var busterEventedLogger = require("buster-evented-logger")
var assert = buster.assert;
var refute = buster.refute;
var busterCli = require("../lib/buster-cli");
var cliHelper = require("../lib/test-helper");

buster.testCase("buster-cli", {
    setUp: function () {
        this.cli = busterCli.create();
    },

    "should have logger": function () {
        assert(busterEventedLogger.isPrototypeOf(this.cli.logger));
    },

    "should run without callback": function () {
        cliHelper.mockLogger(this);
        this.cli.run(["--help"]);
        assert(true);
    },

    "generic help output": {
        setUp: function () {
            cliHelper.mockLogger(this);
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
                assert.match(self.stdout, /-h\/--help \s*Show this message\./);
                assert.match(self.stdout, /-p\/--port \s*Help text is here\./);
                done();
            });
        }
    },

    "log levels": {
        setUp: function () {
            cliHelper.mockLogger(this);
        },

        "should set to log by default": function (done) {
            this.cli.onRun = function () {
                this.logger.info("Yo man");
                this.logger.log("Hey");
            };

            cliHelper.run(this, [], function () {
                refute.stdout("Yo man");
                assert.stdout("Hey");
                done();
            });
        },

        "should set to info with --log-level": function (done) {
            this.cli.onRun = function () {
                this.logger.info("Yo man");
                this.logger.log("Hey");
            };

            cliHelper.run(this, ["--log-level", "info"], function () {
                assert.stdout("Yo man");
                done();
            });
        },

        "should include --log-level in help output": function (done) {
            cliHelper.run(this, ["-h"], function () {
                assert.stdout("-l/--log-level");
                assert.stdout("Set logging level");
                done();
            });
        },

        "should fail if providing -l without argument": function (done) {
            cliHelper.run(this, ["-l"], function () {
                assert.stderr("No value specified");
                done();
            });
        },

        "should fail if providing illegal logging level": function (done) {
            cliHelper.run(this, ["-l", "dubious"], function () {
                assert.stderr("one of [error, warn, log, info, debug], got dubious");
                done();
            });
        },

        "should set to info with -v": function (done) {
            this.cli.onRun = function () {
                this.logger.debug("Yo man");
                this.logger.info("Hey");
            };

            cliHelper.run(this, ["-v"], function () {
                refute.stdout("Yo man");
                assert.stdout("Hey");
                done();
            });
        },

        "should set to debug with -vv": function (done) {
            this.cli.onRun = function () {
                this.logger.debug("Yo man");
                this.logger.info("Hey");
            };

            cliHelper.run(this, ["-vv"], function () {
                assert.stdout("Yo man");
                done();
            });
        },

        "should fail if setting -v more than twice": function (done) {
            cliHelper.run(this, ["-vvv"], function () {
                assert.stderr("-v can only be set two times.");
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

    "calls 'loadOptions' once if present": function (done) {
        var self = this;
        cliHelper.mockLogger(this);
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
            cliHelper.mockLogger(this);
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
                assert.equals(self.stderr, "No such help topic 'doesnotexist'. "
                              + "Try without a specific help topic, or one of: topic,other.\n");
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
            cliHelper.mockLogger(this);
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
                assert.equals(self.aaaOpt.value, "bar");
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
            cliHelper.mockLogger(this);
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
                assert.equals(self.aaaOpt.value, "DRM");
                done();
            });
        },

        "should provide overridden value": function (done) {
            var self = this;
            this.cli.run(["-f", "gaming consoles"], function () {
                assert.equals(self.aaaOpt.value, "gaming consoles");
                done();
            });
        },

        " should fail with no value": function (done) {
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
            cliHelper.mockLogger(this);
            this.someOpt = this.cli.opt("-s", "--ss", "A creeper.", {
                hasValue: true
            });
        },

        "should get value assigned": function (done) {
            var self = this;
            this.cli.run(["-s", "ssssssBOOOOOM!"], function () {
                assert.equals(self.someOpt.value, "ssssssBOOOOOM!");
                done();
            });
        }
    },

    "option with validator": {
        setUp: function () {
            cliHelper.mockLogger(this);
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

    "operand": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.fooOpd = this.cli.opd("Foo", "Does a foo.");
        },

        "should be listed in --help output": function (done) {
            var self = this;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, /Foo +   Does a foo/);
                done();
            });
        },

        "should get value assigned": function (done) {
            var self = this;
            this.cli.run(["some value"], function () {
                assert.equals(self.fooOpd.value, "some value");
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
        cliHelper.mockLogger(this);
        this.cli.onRun = this.spy();
        var someOpt = this.cli.opt("-a", "--aa", "Aaaaa");
        someOpt.addValidator(function (arg, promise) { promise.reject("An error."); });
        this.cli.run(["-a"], function () {
            refute(self.cli.onRun.called);
            done();
        });
    },

    "panicing": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.stub(process, "exit");
        },

        "should logg to stderr": function (done) {
            var self = this;

            this.cli.onRun = function () {
                this.err("Uh-oh! Trouble!");
            };

            this.cli.run([], function () {
                assert.equals(self.stdout, "");
                assert.match(self.stderr, "Uh-oh! Trouble!");
                done();
            });
        }
    },

    "configuration": {
        setUp: function () {
            cliHelper.cdFixtures();
            cliHelper.mockLogger(this);
            this.cli.addConfigOption();
        },

        tearDown: function (done) {
            for (var mod in require.cache) {
                if (/fixtures/.test(mod)) {
                    delete require.cache[mod];
                }
            }

            cliHelper.clearFixtures(done);
        },

        "fails if config does not exist": function (done) {
            this.cli.run(["-c", "file.js"], function () {
                assert.match(this.stderr, "-c/--config: file.js is not a file");
                done();
            }.bind(this));
        },

        "fails if config is a directory": function (done) {
            cliHelper.mkdir("buster");

            this.cli.run(["-c", "buster"], function () {
                assert.match(this.stderr, "-c/--config: buster is not a file");
                done();
            }.bind(this));
        },

        "fails if default config does not exist": function (done) {
            this.cli.run([], function () {
                this.cli.onConfig(function (err) {
                    assert(err);
                    assert.match(err.message,
                                 "-c/--config not provided, and none of\n" +
                                 "[buster.js, test/buster.js, spec/buster.js] exists");
                    done();
                });
            }.bind(this));
        },

        "fails if config contains errors": function (done) {
            cliHelper.writeFile("buster.js", "modul.exports");

            this.cli.run(["-c", "buster.js"], function () {
                this.cli.onConfig(function (err) {
                    assert.match(err.message, "Error loading configuration buster.js");
                    assert.match(err.message, "modul is not defined");
                    assert.match(err.stack, /\d+:\d+/);
                    done();
                });
            }.bind(this));
        },

        "fails if configuration has no groups": function (done) {
            cliHelper.writeFile("buster.js", "");

            this.cli.run([], function () {
                this.cli.onConfig(function (err) {
                    assert(err);
                    assert.match(err.message, "buster.js contains no configuration");
                    done();
                });
            }.bind(this));
        },

        "smart configuration loading": {
            setUp: function () {
                cliHelper.mkdir("somewhere/nested/place");
                this.assertConfigLoaded = function (done) {
                    this.cli.run([], function () {
                        this.cli.onConfig(function (err) {
                            refute.defined(err);
                            done();
                        });
                    }.bind(this));
                };
            },

            tearDown: cliHelper.clearFixtures,

            "with config in root directory": {
                setUp: function () {
                    cliHelper.writeFile("buster.js", "module.exports = " +
                                        JSON.stringify({
                                            "Node tests": { environment: "node" }
                                        }));
                },

                "finds configuration in parent directory": function (done) {
                    process.chdir("somewhere");
                    this.assertConfigLoaded(done);
                },

                "finds configuration three levels down": function (done) {
                    process.chdir("somewhere/nested/place");
                    this.assertConfigLoaded(done);
                }
            },

            "with config in root/test directory": {
                setUp: function () {
                    cliHelper.mkdir("test");
                    cliHelper.writeFile("test/buster.js", "module.exports = " +
                                        JSON.stringify({
                                            "Node tests": { environment: "node" }
                                        }));
                },

                "finds configuration in parent directory": function (done) {
                    process.chdir("somewhere");
                    this.assertConfigLoaded(done);
                },

                "finds configuration three levels down": function (done) {
                    process.chdir("somewhere/nested/place");
                    this.assertConfigLoaded(done);
                }
            }
        },

        "config groups": {
            setUp: function () {
                cliHelper.writeFile("buster.js", "module.exports = " + JSON.stringify({
                    "Node tests": { environment: "node" },
                    "Browser tests": { environment: "browser" }
                }));
            },

            tearDown: cliHelper.clearFixtures,

            "should only yield config for provided group": function (done) {
                var self = this;

                this.cli.run(["-g", "Browser tests"], function () {
                    var spy = this.spy(function () {
                        setTimeout(function () {
                            assert.calledOnce(spy);
                            var groups = self.cli.config.value;
                            assert.equals(groups.length, 1);
                            assert.equals(groups[0].name, "Browser tests");
                            done();
                        }, 5);
                    });

                    this.cli.onConfig(spy);
                }.bind(this));
            },

            "should only yield config for fuzzily matched group": function (done) {
                var self = this;

                this.cli.run(["-g", "browser"], function () {
                    var spy = this.spy(function (err, groups) {
                        setTimeout(function () {
                            assert.calledOnce(spy);
                            assert.equals(groups.length, 1);
                            assert.equals(groups[0].name, "Browser tests");
                            done();
                        }, 5);
                    });

                    this.cli.onConfig(spy);
                }.bind(this));
            },

            "fails if no groups match": function (done) {
                this.cli.run(["-g", "stuff"], function () {
                    this.cli.onConfig(function (err) {
                        assert(err);
                        assert.match(err.message, "buster.js contains no configuration groups that matches 'stuff'");
                        assert.match(err.message, "Try one of");
                        assert.match(err.message, "Browser tests");
                        assert.match(err.message, "Node tests");
                        done();
                    });
                }.bind(this));
            }
        },

        "config environments": {
            setUp: function () {
                cliHelper.writeFile("buster.js", "module.exports = " + JSON.stringify({
                    "Node tests": { environment: "node" },
                    "Browser tests": { environment: "browser" }
                }));
            },

            "should only yield config for provided environment": function (done) {
                var self = this;
                this.cli.run(["-e", "node"], function () {
                    var spy = this.spy(function (err, groups) {
                        setTimeout(function () {
                            assert.calledOnce(spy);
                            assert.equals(groups.length, 1);
                            assert.equals(groups[0].name, "Node tests");
                            done();
                        }, 5);
                    });

                    this.cli.onConfig(spy);
                }.bind(this));
            },

            "should match config environments with --environment": function (done) {
                var self = this;

                this.cli.run(["--environment", "browser"], function () {
                    var spy = this.spy(function (err, groups) {
                        setTimeout(function () {
                            assert.equals(groups.length, 1);
                            assert.equals(groups[0].name, "Browser tests");
                            done();
                        }, 5);
                    });

                    this.cli.onConfig(spy);
                }.bind(this));
            },

            "fails if no environments match": function (done) {
                this.cli.run(["-e", "places"], function () {
                    this.cli.onConfig(function (err) {
                        assert(err);
                        assert.match(err.message, "buster.js contains no configuration groups for environment 'places'");
                        assert.match(err.message, "Try one of");
                        assert.match(err.message, "browser");
                        assert.match(err.message, "node");
                        done();
                    });
                }.bind(this));
            },

            "fails if no groups match environment and group": function (done) {
                this.cli.run(["-e", "node", "-g", "browser"], function () {
                    this.cli.onConfig(function (err) {
                        assert(err);
                        assert.match(err.message, "buster.js contains no configuration groups for environment 'node' that matches 'browser'");
                        assert.match(err.message, "Try one of");
                        assert.match(err.message, "Node tests (node)");
                        assert.match(err.message, "Browser tests (browser)");
                        done();
                    });
                }.bind(this));
            }
        },

        "config files": {
            setUp: function () {
                cliHelper.writeFile("buster.js", "module.exports = " + JSON.stringify({
                    "Node tests": {
                        environment: "node",
                        sources: ["src1.js"],
                        tests: ["test1.js", "test2.js"]
                    }
                }));

                cliHelper.writeFile("src1.js", "Src #1");
                cliHelper.writeFile("test1.js", "Test #1");
            },

            tearDown: cliHelper.clearFixtures,

            "strips unmatched files in tests": function (done) {
                this.cli.run(["--tests", "test1.js"], function () {
                    this.cli.onConfig(function (err, groups) {
                        var rs = groups[0].resourceSet;
                        assert.equals(rs.load.length, 2);
                        refute.defined(rs.resources["test2.js"]);
                        done();
                    }.bind(this));
                }.bind(this));
            },

            "// fails on non-existent tests":
            "Don't know where to do this - the error spawns in the load:tests " +
                " handler.\nMust keep state to handle properly(?)",

            "resolves relative paths": function (done) {
                process.chdir("..");
                this.cli.run(["-c", "fixtures/buster.js",
                              "--tests", "fixtures/test1.js"], function () {
                    this.cli.onConfig(function (err, groups) {
                        var rs = groups[0].resourceSet;
                        assert.equals(rs.load.length, 2);
                        refute.defined(rs.resources["test2.js"]);
                        done();
                    }.bind(this));
                }.bind(this));
            }
        }
    },

    "configuration with specified environment": {
        setUp: function () {
            cliHelper.cdFixtures();
            cliHelper.mockLogger(this);

            cliHelper.writeFile("buster.js", "module.exports = " + JSON.stringify({
                "Node tests": { environment: "node" },
                "Browser tests": { environment: "browser" }
            }));
        },

        "set to browser": {
            setUp: function () {
                this.cli.addConfigOption("browser");
            },

            "should only contain browser groups": function (done) {
                var self = this;
                this.cli.run([], function () {
                    self.cli.onConfig(function (err, groups) {
                        refute.defined(err);
                        assert.equals(groups.length, 1);
                        assert.equals(groups[0].environment, "browser");
                        done();
                    });
                });
            }
        },

        "set to node": {
            setUp: function () {
                this.cli.addConfigOption("node");
            },

            "should only contain node groups": function (done) {
                var self = this;
                this.cli.run([], function () {
                    self.cli.onConfig(function (err, groups) {
                        refute.defined(err);
                        assert.equals(groups.length, 1);
                        assert.equals(groups[0].environment, "node");
                        done();
                    });
                });
            }
        }
    },

    "cli customization": {
        setUp: function () {
            this.busterOpt = process.env.BUSTER_OPT;
        },

        tearDown: function () {
            process.env.BUSTER_OPT = this.busterOpt;
        },

        "adds command-line options set with environment variable": function () {
            var stub = this.stub(this.cli.args, "handle");
            this.cli.environmentVariable = "BUSTER_OPT";
            process.env.BUSTER_OPT = "--color none -r specification"

            this.cli.run([]);

            assert.calledWith(stub, ["--color", "none", "-r", "specification"]);
        },

        "does not add command-line options when no environment variable is set":
        function () {
            var stub = this.stub(this.cli.args, "handle");
            process.env.BUSTER_OPT = "--color none -r specification"

            this.cli.run([]);

            assert.calledWith(stub, []);
        }
    }
});
