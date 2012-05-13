var B = require("buster-core");
var args = require("./buster-cli/args");
var help = require("./buster-cli/help");
var logger = require("./buster-cli/logger");
var config = require("./buster-cli/config");

// Public API

module.exports = B.extend(B.create(B.eventEmitter), {
    // Create a cli helper. Options:
    // {
    //     // Formatting options
    //     width: 80,  // Total width of any printed help
    //     indent: 4,  // Indent from left edge for printed help
    //     spacing: 3, // Spaces between options and explanations in help
    // }
    //
    create: function (options) {
        var cliArgs = B.create(args);
        var cli = B.extend(B.create(this), {
            args: cliArgs,
            opt: B.bind(cliArgs, "opt"),
            opd: B.bind(cliArgs, "opd"),
            environmentVariable: options.environmentVariable
        });
        var cliHelp = help.create(cli, options);
        cli.addHelpOption = B.bind(cliHelp, "addHelpOption");
        return cli;
    },

    environmentArgs: function () {
        var envVar = this.environmentVariable;
        if (!process.env[envVar]) { return []; }
        return process.env[envVar].split(" ");
    },

    parseArgs: function (args, callback) {
        args = this.environmentArgs().concat(args);
        this.args.handle(args, function (errors) {
            if (errors) { this.logger.error(errors[0]); }
            this.emit("args:parsed");
            callback(errors);
        }.bind(this));
    },

    createLogger: function (stdout, stderr) {
        this.logger = logger.createFor(this, stdout, stderr);
        return this.logger;
    },

    addConfigOption: function (baseName, defaultFiles) {
        var cfg = config.create(this, {
            baseName: baseName,
            defaultFiles: defaultFiles
        });
        cfg.addGroupOption();
        cfg.addTestsOption();
        cfg.addEnvOption();
        this.loadConfig = B.bind(cfg, "loadConfig");
    },

    exit: function (code) {
        process.exit(code || 0);
    },

    err: function err(message) {
        this.logger.error(message);
        this.exit(1);
    }
});
