var stdioLogger = require("./stdio-logger");

module.exports = {
    mockLogger: function mockLogger(context) {
        context.stdout = "";
        context.stderr = "";
        var j = Array.prototype.join;

        context.cli.logger = stdioLogger.create(
            { puts: function () { context.stdout += j.call(arguments, " ") + "\n"; }},
            { puts: function () { context.stderr += j.call(arguments, " ") + "\n"; }}
        )
    }
};
