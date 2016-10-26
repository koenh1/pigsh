

function SetVar(opts) {
    var self = this;

    SetVar.base.call(self, opts);
}

inherit(SetVar, Command);

SetVar.prototype.usage = 'setvar       -- set var\n\n' +
    'Usage:\n' +
    '    setvar <field> [<obj>...]\n' +
    '    setvar [-h | --help]\n\n' +
    'Options:\n' +
    '    -h --help    Show this message.\n' +
    '    <field>     Format string, e.g. "%(name)20s %(size)d\\n"\n';

SetVar.prototype.next = check_next(do_docopt(objargs(function() {
    var self = this;
    if (!self.inited) {
        self.fields=self.docopts['<field>'].split(',').reverse()
        self.inited=true
        self.object={}
    }

    next();
    function next() {
        self.unext({}, cef(self, function(item) {
            if (item === null) {
                self.done=true;
                self.output(self.object);
                return self.exit(false);
            }
            var field=self.fields.pop();
                self.object[field]=item
                return next();
//                return self.output(out);
        }));
}})));

Command.register("setvar", SetVar);
