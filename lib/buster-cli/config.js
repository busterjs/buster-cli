var B = require("buster-core");
var Path = require("path");
var fs = require("fs");
var configuration = require("buster-configuration");
var Minimatch = require("minimatch").Minimatch;
var A = require("async");
var glob = require("glob");

function prop(name) {
    return function (object) {
        return object[name];
    };
}

function nameAndEnv(group) {
    return group.name + " (" + group.environment + ")";
}

function noGroupsError(cli, file, groups) {
    // groupFilter() => RegExp|null, if not null use the original string
    var groupFilter = cli.groupFilter() && cli.groupOpt.value;
    var envFilter = cli.environmentFilter();
    var message = file + " contains no configuration groups";
    var mapper;

    if (envFilter) {
        mapper = prop("environment");
        message += " for environment '" + envFilter + "'";
    }
    if (groupFilter) {
        mapper = prop("name");
        message += " that matches '" + groupFilter + "'";
    }
    if (envFilter && groupFilter) { mapper = nameAndEnv; }
    if (envFilter || groupFilter) {
        message += "\nTry one of:\n  " + groups.map(mapper).join("\n  ");
    }

    return new Error(message);
}

function defaultFiles(baseName) {
    return [
        "{base}.js",
        "test/{base}.js",
        "spec/{base}.js"
    ].map(function (file) { return file.replace("{base}", baseName); });
}

function isExistingFile(file) {
    try {
        var stat = fs.statSync(file);
        return stat.isFile();
    } catch (e) {}
}

function tryFileNames(baseDir, files) {
    var i, l;
    for (i = 0, l = files.length; i < l; ++i) {
        var file = Path.join(baseDir, files[i]);
        if (isExistingFile(file)) { return file; }
    }
}

function inflate(config, file) {
    try {
        config.loadFile(file);
        config.source = file;
        return config;
    } catch (e) {
        e.message = "Error loading configuration " + file + "\n" + e.message;
        throw e;
    }
}

function filterTests(filters, config) {
    var matchers = filters.map(function (filter) {
        return new Minimatch(filter);
    });
    if (matchers.length === 0) { return; }
    config.on("load:tests", function (rs) {
        rs.filter(function (resource) {
            var file = Path.join(rs.rootPath, resource.path);
            return matchers.every(function (m) { return !m.match(file); });
        }).forEach(function (resource) { rs.remove(resource.path); });
    });
}

module.exports = {
    create: function (cli, options) {
        options = options || {};
        var config = B.extend(B.create(this), {
            baseName: options.baseName,
            cli: cli,
            defaultFiles: options.defaultFiles || defaultFiles(options.baseName)
        });
        config.opt = cli.opt("-c", "--config", "Test configuration file", {
            hasValue: true
        });
        return config;
    },

    addGroupOption: function () {
        this.groupOpt = this.cli.opt(
            "-g",
            "--config-group",
            "Test configuration group(s) to load",
            { hasValue: true }
        );
    },

    addTestsOption: function () {
        this.testsOpt = this.cli.opt(
            "-t",
            "--tests",
            "Test files (within active configuration) to run",
            { hasValue: true }
        );
    },

    addEnvOption: function () {
        this.envOpt = this.cli.opt(
            "-e",
            "--environment",
            "Test configuration environment to load",
            { hasValue: true }
        );
    },

    groupFilter: function () {
        var filter = this.groupOpt && this.groupOpt.value;
        return (filter && new RegExp(filter, "i")) || null;
    },

    environmentFilter: function () {
        return this.envOpt && this.envOpt.value;
    },

    testFilters: function () {
        if (!this.testsOpt || !this.testsOpt.value) { return []; }
        return this.testsOpt.value.split(",").map(function (path) {
            return Path.resolve(process.cwd(), path);
        });
    },

    findDefaultFiles: function (baseDir, callback) {
        var file;
        while (!file && baseDir !== "/") {
            file = tryFileNames(baseDir, this.defaultFiles);
            baseDir = Path.dirname(baseDir);
        }
        callback(null, isExistingFile(file) ? [file] : []);
    },

    findFiles: function (baseDir, file, callback) {
        if (!file) { return this.findDefaultFiles(baseDir, callback); }
        glob(file, { cwd: baseDir }, function (err, files) {
            callback(err, files && files.filter(function (f) {
                return isExistingFile(f);
            }));
        });
    },

    requireConfigFiles: function (fileName, callback) {
        this.findFiles(process.cwd(), fileName, function (err, files) {
            var sig = this.opt.signature;
            if (files.length === 0 && fileName) {
                return callback(new Error(sig + ": " + fileName +
                                          " did not match any files"));
            }
            if (files.length === 0) {
                return callback(new Error(sig + " not provided, and none of\n[" +
                                          this.defaultFiles.join(", ") + "] exist"));
            }
            try {
                callback(null, files.map(function (f) {
                    return inflate(configuration.create(), f);
                }));
            } catch (e) {
                callback(e);
            }
        }.bind(this));
    },

    filter: function (config) {
        config.filterEnv(this.environmentFilter());
        config.filterGroup(this.groupFilter());
        filterTests(this.testFilters(), config);
        return config;
    },

    loadConfig: function (callback) {
        var allGroups = [];
        var files = this.opt.value || "";
        var extractGroups = function (groups, file, next) {
            this.requireConfigFiles(file, function (err, configs) {
                if (err) { return next(err); }
                var filtered = [], sources = [];
                configs.forEach(function (config) {
                    allGroups = allGroups.concat(config.groups);
                    filtered = filtered.concat(this.filter(config).groups);
                    sources.push(config.source);
                }.bind(this));
                if (filtered.length === 0) {
                    return next(noGroupsError(this, sources.join(","), allGroups));
                }
                next(null, groups.concat(filtered));
            }.bind(this));
        }.bind(this);

        var names = files.split(",");
        var groups = A.reduce(names, [], extractGroups, function (err, groups) {
            callback(err, groups);
        });
    }
};
