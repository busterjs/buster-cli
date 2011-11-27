var busterArgs = require("buster-args");
var term = require("buster-terminal");
var stdioLogger = require("buster-stdio-logger");

var colorOpt = {
    "dim": { color: true, bright: false },
    "bright": { color: true, bright: true }
};

var DEFAULT_CONFIG_FILES = ["buster.js", "test/buster.js", "spec/buster.js"];

module.exports = {
    create: function (stdout, stderr) {
        var cli = Object.create(this);
        cli.logger = stdioLogger(stdout, stderr);
        cli.logger.level = "log";
        cli.options = [];
        cli.args = Object.create(busterArgs)
        cli.helpOpt = createHelpOption.call(cli);
        cli.logLevelOpt = createLogLevelOption.call(cli);
        cli.verboseOpt = createVerboseOption.call(cli);

        return cli;
    },

    opt: function (shortFlag, longFlag, helpText, options) {
        var opt = this.args.createOption(shortFlag, longFlag);
        opt.helpText = helpText;

        options = options || {};
        if ("values" in options) {
            opt.hasValue = true;
            opt.helpText += " One of " + options.values.join(", ") + ".";
            opt.addValidator(busterArgs.validators.inEnum(options.values));
        }

        if ("defaultValue" in options) {
            opt.hasValue = true;
            opt.helpText += " Default is " + options.defaultValue + ".";
            opt.defaultValue = options.defaultValue;
        }

        if ("hasValue" in options) {
            opt.hasValue = true;
        }

        if ("validators" in options) {
            for (var validatorName in options.validators) {
                var errorMsg = options.validators[validatorName];
                opt.addValidator(busterArgs.validators[validatorName](errorMsg));
            }
        }

        this.options.push(opt);
        return opt;
    },

    opd: function (signature, helpText) {
        var opd = this.args.createOperand();
        opd.signature = signature;
        opd.helpText = helpText;
        this.options.push(opd);
        return opd;
    },

    run: function (argv, callback) {
        loadOptions.call(this);

        var self = this;
        this.args.handle(loadArgs.call(this, argv), function (errors) {
            handleOptions.call(self, errors);
             if (callback) callback();
        });
    },

    err: function err(message) {
        this.logger.error(message);
        process.exit(1);
    },

    addConfigOption: function (environment) {
        this.config = this.opt("-c", "--config", "Test configuration file", {
            hasValue: true,
            validators: { "file": "-c/--config: ${1} is not a file" }
        });

        this.configGroup = this.opt(
            "-g", "--config-group", "Test configuration group(s) to load", {
                hasValue: true
            }
        );

        if (environment) {
            this.envFilter = environment;
        } else {
            this.configEnv = this.opt(
                "-e", "--environment", "Test configuration environment to load", {
                    hasValue: true
                }
            );
        }
    },

    groupFilter: function () {
        var filter = this.configGroup.value;
        return filter && new RegExp(filter, "i") || null;
    },

    environmentFilter: function () {
        return this.envFilter || this.configEnv.value;
    },

    onConfig: function (callback) {
        var config = require("buster-configuration").create(), loaded;

        try {
            var configFilePaths = [this.config.value].concat(DEFAULT_CONFIG_FILES);
            loaded = loadConfigModule(config, configFilePaths);
        } catch (e) {
            return callback(e);
        }

        if (!loaded) {
            return callback({ message: this.config.signature + " not provided, and " +
                              "none of\n[" + DEFAULT_CONFIG_FILES.join(", ") + "] exists" });
        }

        var allGroups = config.groups;
        config.filterEnv(this.environmentFilter());
        config.filterGroup(this.groupFilter());
        this.config.actualValue = config.groups;
        config.resolveGroups(function (err) {
            if (err) {
                callback({message: err});
            } else {
                if (this.config.value.length == 0) {
                    callback(noGroupsError.call(this, loaded, allGroups));
                } else {
                    callback(undefined, this.config.value);
                }
            }
        }.bind(this));
    }
};

function property(name) {
    return function (object) {
        return object[name];
    };
}

function noGroupsError(file, groups) {
    var groupFilter = this.groupFilter() && this.configGroup.value;
    var envFilter = this.environmentFilter();
    var message = file + " contains no configuration groups";

    function nameAndEnvironment(group) {
        return group.name + " (" + group.environment + ")";
    }

    if (groupFilter && envFilter) {
        message += " for environment '" + envFilter + "' that matches '" +
            groupFilter + "'\nTry one of:\n  " +
            groups.map(nameAndEnvironment).join("\n  ");
    } else if (envFilter) {
        message += " for environment '" + envFilter + "'\n" +
            "Try one of: " + groups.map(property("environment")).join(", ");
    } else if (groupFilter) {
        message += " that matches '" + this.configGroup.value + "'\n" +
            "Try one of:\n  " + groups.map(property("name")).join("\n  ");
    }

    return { message: message };
}

function createHelpOption() {
    var helpOpt = this.opt("-h", "--help", "Show this message.", {
        hasValue: true
    });

    // To allow for --help with no value when we have help topics.
    helpOpt.acceptsValueAbsence = true;
    return helpOpt;
}

function createLogLevelOption() {
    return this.opt("-l", "--log-level", "Set logging level.", {
        values: this.logger.levels
    });
}

function createVerboseOption() {
    var verbose = this.opt("-v", "--verbose", "Increase verbosity level. Include one (log level info) or two time (e.g. -vv, log level debug).");

    verbose.addValidator(function (opt, promise) {
        if (opt.timesSet > 2) {
            promise.reject("-v can only be set two times.");
        } else {
            promise.resolve();
        }
    });

    return verbose;
}

function loadOptions() {
    if (this.hasLoadedOptions) return;
    this.hasLoadedOptions = true;
    this.helpOpt.hasValue = hasHelpTopics.call(this);
    if (this.loadOptions) this.loadOptions();
}

function hasHelpTopics() {
    return this.helpTopics !== undefined && Object.keys(this.helpTopics).length > 0;
};

function handleOptions(errors) {
    if (errors) {
        this.logger.error(errors[0]);
        return;
    }

    if (this.helpOpt.isSet) {
        if (this.helpOpt.value) {
            printTopicHelp.call(this);
        } else {
            printHelp.call(this);
        }

        return;
    }

    setLogLevel.call(this);

    if (this.onRun) this.onRun();
}

function printTopicHelp() {
    var topic = this.helpOpt.value;

    if (topic in this.helpTopics) {
        this.logger.log(this.helpTopics[topic]);
    } else {
        this.logger.error("No such help topic '" + topic +
                          "'. Try without a specific help topic, or one of: " +
                          Object.keys(this.helpTopics).join(",") + ".");
    }
}

function printHelp() {
    this.logger.log(this.missionStatement + "\n");
    if (this.usage) this.logger.log("Usage: " + this.usage + "\n");
    if (this.description) this.logger.log(this.description + "\n");

    var signatures = this.options.map(function (o) { return o.signature; });
    var sigWitdh = term.strings.maxWidth(signatures);

    for (var i = 0, ii = this.options.length; i < ii; i++) {
        var option = this.options[i];
        var alignedSignature = term.strings.alignLeft(option.signature, sigWitdh);
        var helpText = option.helpText;
        if (option == this.helpOpt && hasHelpTopics.call(this)) {
            var topics = Object.keys(this.helpTopics);
            var topicListText;
            if (topics.length == 1) {
                topicListText = topics[0];
            } else {
                topicListText = "[" + topics. join(",") + "]";
            }
            helpText += "See also --help " + topicListText + "."
        }
        this.logger.log("    " + alignedSignature + "   " + helpText);
    }
}

function setLogLevel() {
    if (this.logLevelOpt.isSet) {
        this.logger.level = this.logLevelOpt.value;
    }

    if (this.verboseOpt.isSet) {
        var levels = this.logger.levels;
        var curr = levels.indexOf(this.logger.level);
        this.logger.level = levels[curr + this.verboseOpt.timesSet];
    }
}

function loadConfigModule(config, files) {
    for (var i = 0, l = files.length; i < l; ++i) {
        if (!files[i]) continue;

        try {
            if (config.loadGroupsFromConfigFile(files[i], process.cwd())) {
                return files[i];
            }
        } catch (e) {
            e.message = "Error loading configuration " + files[i] + "\n" + e.message;
            throw e;
        }
    }
}

function loadArgs(argv) {
    var argvArr = (argv || []).slice(0);
    var env = this.environmentVariable;

    if (env && typeof process.env[env] == "string") {
        return argvArr.concat(process.env[env].split(" "));
    }

    return argvArr;
}
