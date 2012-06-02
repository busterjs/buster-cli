var stdioLogger = require("buster-stdio-logger");

function createLogLevelOption(cli, logger) {
    var opt = cli.opt("-l", "--log-level", "Set logging level.", {
        values: logger.levels
    });
    cli.on("args:parsed", function () {
        if (opt.isSet) { logger.level = opt.value; }
    });
}

function maxTimesSet(times) {
    return function (opt) {
        if (opt.timesSet > times) {
            throw new Error(opt.signature + " can only be set " + times + " times.");
        }
    };
}

function increaseLogLevel(opt, logger) {
    return function () {
        if (!opt.isSet) { return; }
        var levels = logger.levels;
        var curr = levels.indexOf(logger.level);
        logger.level = levels[curr + opt.timesSet];
    };
}

function createVerboseOption(cli, logger) {
    var verbose = cli.opt(
        "-v",
        "--verbose",
        "Increase verbosity level. Include one (log level info) or two times " +
            "(e.g. -vv, log level debug)."
    );
    verbose.addValidator(maxTimesSet(2));
    cli.on("args:parsed", increaseLogLevel(verbose, logger));
}

module.exports = {
    createFor: function (cli, stdout, stderr) {
        var logger = stdioLogger(stdout, stderr);
        logger.level = "log";
        createLogLevelOption(cli, logger);
        createVerboseOption(cli, logger);
        return logger;
    }
};
