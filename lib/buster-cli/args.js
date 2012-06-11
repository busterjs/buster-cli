var B = require("buster-core");
var args = require("posix-argv-parser");
var v = args.validators;

function getHelpText(helpText, options) {
    if (options.values) {
        helpText += " One of " + options.values.join(", ") + ".";
    }
    if (options.defaultValue) {
        helpText += " Default is " + options.defaultValue + ".";
    }
    return helpText;
}

function getValidators(options) {
    if (!options.validators) { return []; }
    var validator, msg, validators = [];
    var rawValidators = options.validators || {};
    for (validator in rawValidators) {
        msg = rawValidators[validator];
        validators.push(v[validator](msg));
    }
    if (options.values) {
        validators.push(v.inEnum(options.values));
    }
    if (typeof options.maxTimes === "number") {
        validators.push(v.maxTimesSet(options.maxTimes));
    }
    return validators;
}

module.exports = B.extend(B.create(args), B.create(B.eventEmitter), {
    opt: function (shortFlag, longFlag, helpText, options) {
        options = options || {};
        var opt = this.createOption([shortFlag, longFlag], B.extend({
            defaultValue: options.defaultValue,
            hasValue: !!options.values || !!options.hasValue,
            validators: getValidators(options)
        }));
        opt.helpText = getHelpText(helpText, options);
        return opt;
    },

    opd: function (signature, helpText, options) {
        return this.createOperand(signature, {
            helpText: helpText,
            greedy: options && options.greedy
        });
    }
});
