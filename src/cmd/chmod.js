/*
 * Copyright (C) 2012-2014 by Coriolis Technologies Pvt Ltd.
 * This program is free software - see the file COPYING for license details.
 */

// YYY optstr_parse, make sure opts passed down to lower level ops
function Chmod(opts) {
    var self = this;

    Chmod.base.call(self, opts);
    self.entries = [];
    self.arglist = [];
}

inherit(Chmod, Command);

Chmod.prototype.usage = 'chmod           -- update file metadata\n\n' +
    'Usage:\n' +
    '    chmod [-h | --help]\n' +
    '    chmod -s [<file>...]\n' +
    '    chmod [-v] <arg> [<file>...]\n\n' +
    'Options:\n' +
    '    -s           show file metadata\n'+
    '    -v           verbose\n'+
    '    -h --help    Show this message.\n';


Chmod.prototype.next = check_next(do_docopt(fileargs(function() {
    var self = this;

    if (self.inited === undefined) {
        self.inited = true;
        self.value=self.docopts['<arg>'];
    }
    self.unext({}, cef(self, function(file) {
        if (file === null) {
            return self.exit();
        }
        file=file._lfile;
        if (typeof file.chmod === 'function') {
            file.chmod({},self.value,self.docopts['-v'],function(err,result){
                if (err) {
                    return self.exit(err, file.name);
                }
                if (result==null) return self.exit(true,file.name);
                else return self.output(result);
            });
        } else {
            return self.exit(file.name+" does not support chmod ")
        }
    }));
})));

Command.register("chmod", Chmod);
