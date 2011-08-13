var busterArgs = require("buster-args");
var term = require("buster-terminal");
var stdioLogger = require("./stdio-logger");

module.exports = {
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

    run: function (argv, callback) {
        loadOptions.call(this);

        var self = this;
        this.args.handle(argv, function (errors) {
            handleOptions.call(self, errors);
             if (callback) callback();
        });
    },

    get args() {
        return this._args || (this._args = Object.create(busterArgs));
    },

    get logger() {
        return this._logger || (this._logger = stdioLogger.create());
    },

    set logger(value) {
        this._logger = value;
    },

    get options() {
        return this._options || (this._options = []);
    },

    get helpTopics() {
        return this._helpTopics;
    },

    set helpTopics(value) {
        var isUnset = !value || Object.keys(value).length == 0;

        if (isUnset) {
            delete this._helpTopics;
        } else {
            this._helpTopics = value;
        }


        this.helpOpt.hasValue = !isUnset;
    },

    get helpOpt() {
        return this._helpOpt || (this._helpOpt = this.opt("-h", "--help", "Shows this message."));
    }
};

function loadOptions() {
    if (this.hasLoadedOptions) return;
    this.hasLoadedOptions = true;

    // Calling is enough to load it.
    this.helpOpt;

    if (this.loadOptions) this.loadOptions();
}

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
        this.logger.info(this.helpTopics[topic]);
    } else {
        this.logger.info("The topic '" + topic + "' does not exist. "
                         + "Valid topics are: "
                         + Object.keys(this.helpTopics).join(",") + ".");
    }
}

function printHelp() {
    this.logger.info(this.missionStatement);
    this.logger.info();
    this.logger.info(this.description);
    this.logger.info();

    var signatures = this.options.map(function (o) { return o.signature; });
    var sigWitdh = term.strings.maxWidth(signatures);

    for (var i = 0, ii = this.options.length; i < ii; i++) {
        var option = this.options[i];
        var alignedSignature = term.strings.alignLeft(option.signature, sigWitdh);
        var helpText = option.helpText;
        if (option == this.helpOpt && this.helpTopics) {
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