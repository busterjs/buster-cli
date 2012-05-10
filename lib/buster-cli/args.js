var B = require("buster-core");
var args = require("buster-args");

function setPossibleValues(opt, values) {
    if (!values) { return; }
    opt.hasValue = true;
    opt.helpText += " One of " + values.join(", ") + ".";
    opt.addValidator(args.validators.inEnum(values));
}

function setDefaultValue(opt, defaultValue) {
    opt.hasValue = true;
    opt.helpText += " Default is " + defaultValue + ".";
    opt.defaultValue = defaultValue;
}

function addValidators(opt, validators) {
    if (!validators) { return; }
    var validator, msg;
    for (validator in validators) {
        msg = validators[validator];
        opt.addValidator(args.validators[validator](msg));
    }
}

module.exports = B.extend(B.create(args), B.create(B.eventEmitter), {
    opt: function (shortFlag, longFlag, helpText, options) {
        var opt = this.createOption(shortFlag, longFlag);
        opt.helpText = helpText;
        options = options || {};
        setPossibleValues(opt, options.values);
        if (options.hasOwnProperty("defaultValue")) {
            setDefaultValue(opt, options.defaultValue);
        }
        if (options.hasOwnProperty("hasValue")) {
            opt.hasValue = !!options.hasValue;
        }
        addValidators(opt, options.validators);
        return opt;
    },

    opd: function (signature, helpText) {
        var opd = this.createOperand();
        opd.signature = signature;
        opd.helpText = helpText;
        return opd;
    }
});
