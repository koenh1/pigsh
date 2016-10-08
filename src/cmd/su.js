/*
 * Copyright (C) 2012-2014 by Coriolis Technologies Pvt Ltd.
 * This program is free software - see the file COPYING for license details.
 */

function Su(opts) {
    var self = this;

    Su.base.call(self, opts);
}

inherit(Su, Command);

Su.prototype.usage = 'su        -- set user \n\n' +
    'Usage:\n' +
    '    su\n' +
    '    su <user>\n' +
    '    su [-h | --help]\n\n' +
    'Options:\n' +
    '    -h --help    Show this message.\n';

Su.prototype.next = check_next(do_docopt(function() {
    var self = this,
        comps = [],
        pv = pigshell.version;

    self.done = true;

    if (self.docopts["<user>"]) {
        pigshell.user=self.docopts["<user>"]
        sys.putenv(self,'user',self.docopts["<user>"])
        return self.exit(true)
    }  else return self.output("user="+sys.getenv(self,'user'))
}));

Command.register("su", Su);
