/*
 * build.ts
 * by VILIC VANE
 */

import fs = require('fs-extra');
import glob = require('glob');

interface ICLArgOption {
    name: string;
    shortName?: string;
    default?: any;
    type?: string;
    switch?: boolean;
    descriptiton?: string;
}

class CLArgs {
    [name: string]: any;
    [index: number]: string;

    private _options: ICLArgOption[];

    constructor(options: ICLArgOption[]= [], args = process.argv.slice(1)) {
        this._options = options;

        var names: string[] = [];
        var shortNames: string[] = [];

        options.forEach(option => {
            names.push(option.name);
            shortNames.push(option.shortName);
        });

        var paramOption: ICLArgOption = null;
        var unnamed = 0;

        args.forEach(arg => {
            if (paramOption == null) {
                var index: number;

                if (/^--./.test(arg)) {
                    index = names.indexOf(arg.substr(2));
                } else if (/^-./.test(arg)) {
                    index = shortNames.indexOf(arg.substr(1));
                } else {
                    index = -1;
                }

                if (index < 0) {
                    this[unnamed++] = arg;
                } else {
                    var option = options[index];
                    var name = option.name;

                    if (option.switch) {
                        this[name] = true;
                    } else {
                        paramOption = option;
                    }
                }
            } else {
                this[paramOption.name] = CLArgs._getValue(arg, paramOption);
                paramOption = null;
            }
        });

        options.forEach(option => {
            if (!CLArgs._hop.call(this, option.name)) {
                this[option.name] = CLArgs._getValue(null, option);
            }
        });
    }

    printUsage() {
        var switches: ICLArgOption[] = [];
        var options = this._options
            .filter(option => {
                if (option.switch) {
                    switches.push(option);
                    return false;
                } else {
                    return true;
                }
            });

        if (switches.length) {
            console.log('Switches:');
            switches.forEach(printOption);
        }

        if (options.length) {
            console.log('Options:');
            options.forEach(printOption);
        }

        function printOption(option: ICLArgOption) {
            var parts = [
                '--' + option.name,
                option.shortName ? '-' + option.shortName : '',
                option.descriptiton ? option.descriptiton : ''
            ];

            var line = parts.join('\t');
            console.log('    ' + line);
        }
    }

    private static _hop = Object.prototype.hasOwnProperty;

    private static _getValue(str: string, option: ICLArgOption): any {
        if (str == null) {
            if (CLArgs._hop.call(option, 'default')) {
                return option.default;
            }

            if (option.switch) {
                return false;
            }

            return str; // null or undefined
        } else {
            switch (option.type) {
                case 'number':
                    return Number(str);
                case 'boolean':
                    return Boolean(str);
                default:
                    return str;
            }
        }
    }
}

var args = new CLArgs([
    {
        name: 'module',
        shortName: 'm',
        type: 'boolean',
        switch: true,
        descriptiton: 'enable "module" flag.'
    },
    {
        name: 'library',
        shortName: 'l',
        default: './lib/',
        descriptiton: 'path of source files.'
    },
    {
        name: 'build',
        shortName: 'b',
        default: './bld/',
        descriptiton: 'path of build directory.'
    },
    {
        name: 'extension',
        shortName: 'x',
        default: 'ts',
        descriptiton: 'extension of source files.'
    },
    {
        name: 'help',
        shortName: 'h',
        switch: true,
        descriptiton: 'show usage.'
    }
]);


if (args['help']) {
    args.printUsage();
    process.exit();
}

var libPath = <string>args['library'];
var bldPath = <string>args['build'];

libPath = libPath.replace(/\\/g, '/');

if (!/[\\/]$/.test(libPath)) {
    libPath += '/';
}

if (!/[\\/]$/.test(bldPath)) {
    bldPath += '/';
}

var files = glob.sync(libPath + '**/*.' + args['extension']);

class Processor {
    regex: RegExp;

    constructor(
        name: string,
        public replace: (text: string) => string
        ) {
        this.regex = new RegExp('^' + name + '(?:\\s+(.*))?$');
    }
}

var processors = [
    new Processor('if', text => 'if (' + text + ') {'),
    new Processor('else\\s*if', text => '} else if (' + text + ') {'),
    new Processor('else', text => '} else {'),
    new Processor('end\\s*if', text => '}'),
    new Processor('echo', text => '__output += ' + text + ';')
];

function generate(source: string) {
    var globalEval = eval;

    var code = "\
        'use strict';\
        var __output = '';\
        var args = " + JSON.stringify(args) + ";";

    var overallRegex = /[ \t]*\/\/#(.+)(?:\r?\n|$)|\/\*#(.+)\*\/|[\s\S]/g;

    var pendingCodeText = '';
    var groups: RegExpExecArray;
    while (groups = overallRegex.exec(source)) {
        var processorLine = groups[1] || groups[2];
        if (processorLine) {
            var pendingCode: string;

            var matched = processors.some(processor => {
                var groups = processor.regex.exec(processorLine);
                if (groups) {
                    pendingCode = processor.replace(groups[1]);
                    return true;
                }
            });

            if (matched) {
                if (pendingCodeText) {
                    code += '__output += ' + JSON.stringify(pendingCodeText) + ';';
                    pendingCodeText = '';
                }

                code += pendingCode;
            } else {
                pendingCodeText += groups[0];
            }
        } else {
            pendingCodeText += groups[0];
        }
    }

    if (pendingCodeText) {
        code += '__output += ' + JSON.stringify(pendingCodeText) + ';';
        pendingCodeText = '';
    }

    code += '__output;';

    return globalEval(code);
}

files.forEach(file => {
    var modifiedDate = fs.statSync(file).mtime;
    var output = generate(fs.readFileSync(file, 'utf-8'));
    var outputFile = bldPath + file.substr(libPath.length);
    fs.outputFileSync(outputFile, output);
    console.log('generated "' + outputFile + '"');
});

