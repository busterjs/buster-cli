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
        var logger = busterEventedLogger.create({
            levels: ["error", "warn", "log", "info", "debug"]
        });

        this.subscribeReporter(logger, this.createReporter(stdout, stderr));
        createShortLevelAliases(logger);

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

    subscribeReporter: function (logger, reporter) {
        logger.on("log", function (msg) {
            var prefix = logger.verbose ? "[" + msg.level.toUpperCase() + "] " : "";
            reporter[msg.level].write(prefix + msg.message + "\n");
        });
    }
};
