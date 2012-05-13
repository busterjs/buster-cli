var B = require("buster-core");
var S = require("buster-terminal");

function helpTopicsFor(opt) {
    if (!opt.helpTopics) { return ""; }
    var topics = Object.keys(opt.helpTopics);
    var help = topics.length === 1 ? topics[0] : "[" + topics.join(",") + "]";
    return " See also " + opt.signature + " " + help + ".";
}

function logHelpTopic(logger, topics, topic) {
    if (topics[topic]) { return logger.log(topics[topic]); }
    var names = Object.keys(topics).join(",");
    logger.error("No such help topic '" + topic + "'. Try without a specific " +
                 "help topic, or one of: " + names + ".");
}

function reflowAndIndent(text) {
    var indDepth = this.sigWidth + this.spacing + this.indent;
    var indentation = S.repeat(" ", indDepth);
    var width = this.width - indentation.length;
    return S.reflow(text, width).split("\n").join("\n" + indentation);
}

function optionHelpSummary(option) {
    return S.repeat(" ", this.indent) +
        S.alignLeft(option.signature, this.sigWidth) +
        S.repeat(" ", this.spacing) +
        reflowAndIndent.call(this, option.helpText + helpTopicsFor(option));
}

module.exports = {
    width: 80,
    indent: 4,
    spacing: 3,

    create: function (cli, options) {
        return B.extend(B.create(this), { cli: cli }, options);
    },

    addHelpOption: function (missionStatement, description, topics) {
        var opt = this.cli.opt("-h", "--help", "Show this message.", {
            hasValue: true
        });
        opt.helpTopics = topics;
        // To allow for --help with no value when we have help topics.
        opt.acceptsValueAbsence = true;
        this.cli.on("args:parsed", this.helpLogger(opt, {
            missionStatement: missionStatement,
            description: description
        }));
    },

    helpLogger: function (opt, options) {
        var logger = this.cli.logger;
        if (!logger) { return function () {}; }
        return function () {
            if (!opt.isSet) { return; }
            if (opt.value) {
                return logHelpTopic(logger, opt.helpTopics, opt.value);
            }
            if (options.missionStatement) {
                logger.log(options.missionStatement + "\n");
            }
            if (options.description) {
                logger.log(options.description + "\n");
            }
            logger.log(this.formatHelp(this.cli.args));
            this.cli.loggedHelp = true;
        }.bind(this);
    },

    formatHelp: function (args) {
        var signatures = args.options.map(function (a) { return a.signature; });
        this.sigWidth = S.maxWidth(signatures);
        return args.options.map(B.bind(this, optionHelpSummary)).join("\n");
    }
};