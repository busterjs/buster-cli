var busterArgs = require("buster-args");
var term = require("buster-terminal");
var stdioLogger = require("./stdio-logger");

module.exports = {
    create: function (stdout, stderr) {
        var cli = Object.create(this);
        cli.logger = stdioLogger.create(stdout, stderr);
        cli.logger.level = "log";
        cli.options = [];
        cli.args = Object.create(busterArgs)
        cli.helpOpt = createHelpOption.call(cli);

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
        this.args.handle(argv, function (errors) {
            handleOptions.call(self, errors);
             if (callback) callback();
        });
    },

    err: function err(message) {
        this.logger.error(message);
        process.exit(1);
    }
};

function createHelpOption() {
    var helpOpt = this.opt("-h", "--help", "Show this message.", {
        hasValue: true
    });

    // To allow for --help with no value when we have help topics.
    helpOpt.acceptsValueAbsence = true;
    return helpOpt;
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
        if (this.helpOpt.value()) {
            printTopicHelp.call(this);
        } else {
            printHelp.call(this);
        }

        return;
    }

    if (this.onRun) this.onRun();
}

function printTopicHelp() {
    var topic = this.helpOpt.value();

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
        this.logger.log("    " + alignedSignature + ": " + helpText);
    }
}