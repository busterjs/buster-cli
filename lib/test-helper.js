var stdioLogger = require("./stdio-logger");
var rmrf = require("rimraf");
var path = require("path");
var fs = require("fs");
var FIXTURES_ROOT = path.resolve(__dirname, "..", "fixtures");

module.exports = {
    FIXTURES_ROOT: FIXTURES_ROOT,

    mockLogger: function mockLogger(context) {
        context.stdout = "";
        context.stderr = "";
        var j = Array.prototype.join;

        context.cli.logger = stdioLogger.create(
            { puts: function () { context.stdout += j.call(arguments, " ") + "\n"; }},
            { puts: function () { context.stderr += j.call(arguments, " ") + "\n"; }}
        )
    },

    mkdir: function (dir) {
        var dirs = [FIXTURES_ROOT].concat(dir.split("/")), tmp = "";

        for (var i = 0, l = dirs.length; i < l; ++i) {
            tmp += dirs[i] + "/";

            try {
                fs.mkdirSync(tmp, "755");
            } catch (e) {}
        }
    },

    writeFile: function (file, contents) {
        file = path.join(FIXTURES_ROOT, file);
        this.mkdir(path.dirname(file));
        fs.writeFileSync(file, contents);
    },

    cdFixtures: function () {
        this.mkdir("");
        process.chdir(FIXTURES_ROOT);
    },

    clearFixtures: function (done) {
        rmrf(FIXTURES_ROOT, function (err) {
            if (err) require("buster").log(err.toString());
            done();
        });
    }
};
