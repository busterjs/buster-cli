busterEventedLogger = require("buster-evented-logger");

function createShortLevelAliases(logger) {
    logger.d = logger.debug;
    logger.i = logger.info;
    logger.l = logger.log;
    logger.w = logger.warn;
    logger.e = logger.error;
}

function defaultLogger(logger, outStream) {
    if (logger && typeof logger.write == "function") {
        return logger;
    }

    return outStream;
}

module.exports = {
    create: function (stdout, stderr) {
        var levels = ["error", "warn", "log", "info", "debug"];
        var reporter = this.createReporter(stdout, stderr);
        var logger = busterEventedLogger.create({ levels: levels });
        var inline = busterEventedLogger.create({ levels: levels });

        Object.defineProperty(logger, "inline", {
            get: function () {
                inline.level = logger.level;
                return inline;
            }
        });

        this.subscribeReporter(logger, reporter, "\n");
        this.subscribeReporter(logger.inline, reporter, "");
        createShortLevelAliases(logger);
        createShortLevelAliases(logger.inline);

        return logger;
    },

    createReporter: function (out, err) {
        var stdout = defaultLogger(out, process.stdout);
        var stderr = defaultLogger(err, process.stderr);

        return {
            log: stdout,
            info: stdout,
            debug: stdout,
            warn: stderr,
            error: stderr
        };
    },

    subscribeReporter: function (logger, reporter, suffix) {
        logger.on("log", function (msg) {
            var prefix = logger.verbose ? "[" + msg.level.toUpperCase() + "] " : "";
            reporter[msg.level].write(prefix + msg.message + suffix);
        });
    }
};
