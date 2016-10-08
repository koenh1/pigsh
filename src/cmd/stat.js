/*
 * Copyright (C) 2012-2014 by Coriolis Technologies Pvt Ltd.
 * This program is free software - see the file COPYING for license details.
 */

// YYY optstr_parse, make sure opts passed down to lower level ops
function Stat(opts) {
    var self = this;

    Stat.base.call(self, opts);
    self.entries = [];
    self.arglist = [];
}

inherit(Stat, Command);

Stat.prototype.usage = 'stat           -- display file metadata\n\n' +
    'Usage:\n' +
    '    stat [-h | --help]\n' +
    '    stat [-v] [<file>...]\n\n' +
    'Options:\n' +
    '    -v           verbose\n'+
    '    -h --help    Show this message.\n';


Stat.prototype.next = check_next(do_docopt(fileargs(function() {
    var self = this;

    if (self.inited === undefined) {
        self.inited = true;
    }
    self.unext({}, cef(self, function(file) {
        if (file === null) {
            return self.exit();
        }
        file=file._lfile;
        if (typeof file.getmeta === 'function') {
            file.getmeta({},function(err,result){
                if (err) {
                    return self.exit(err, file.name);
                }
                if (result==null) return self.exit(true,file.name);
                else return self.output(result);
            });
        } else {
            return self.exit(file.name+" does not support stat ")
        }
    }));
})));

Command.register("stat", Stat);
