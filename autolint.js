module.exports = {
    paths: [
        "lib/**/*.js",
        "test/*.js"
    ],
    linterOptions: {
        node: true,
        browser: true,
        plusplus: true,
        sloppy: true,
        vars: true,
        nomen: true,
        forin: true,
        predef: [
            "define",
            "assert",
            "refute",
            "buster"
        ]
    }
};
