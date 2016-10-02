
/*
 * Copyright (C) 2012-2014 by Coriolis Technologies Pvt Ltd.
 * This program is free software - see the file COPYING for license details.
 */

/*
 * Auth subsystem.
 */

var Auth = {
};

var OA2Client = function(opts) {
    this.opts = $.extend({}, this.constructor.defaults, opts);
    this.authdata = {};
    Auth[this.name] = this.authdata;
};

OA2Client.prototype.get_params = function(name, centry, opts) {
    var self = this,
        oauth2 = {client_id: self.opts.client_id, redirect_uri: self.opts.redirect_uri},
        opts2 = {},
        scope = opts.scope || self.opts.scope,
        display = "iframe",
        cscope = centry.scope,
        force = opts.force || !name;

    if (name) {
        scope = opts.scope || centry.scope || self.opts.scope;
        if (scope && opts.scope && opts.scope.sort().toString() !==
            scope.sort().toString()) {
            force = true;
        }
    }
    if (force) {
        display = "popup";
    }

    opts2.url = self.opts.auth_url;
    opts2.force = force;
    opts2.display = display;
    opts2.popupWidth = self.opts.popupWidth;
    opts2.popupHeight = self.opts.popupHeight;
    opts2.scope = scope;
    oauth2.scope = scope.map(function(s) { return self.opts.scope_map[s]; })
        .filter(function(s) { return !!s; })
        .join(self.opts.scope_sep);
    opts2.oauth2 = oauth2;

    return opts2;
};

OA2Client.prototype.login = function(name, opts, cb) {
    var self = this,
        cache = self.cache_list(),
        centry = cache[name] || {},
        opts2 = self.get_params(name, centry, opts),
        now = Date.now() / 1000,
        exp = isnumber(centry.expires) && centry.expires - 300 < now;

    //assert("OA2Client.login.1", opts2.force || (name && centry.access_token),
    //    centry);

    if (opts2.force || exp) {
        return do_login();
    }

    check_token(centry.access_token, centry.expires, ef(retry_login,
        function(access_token, expires, scope) {
        get_userinfo(access_token, expires, scope, ef(retry_login, cb));
    }));

    function retry_login() {
        if (name) {
            self.cache_remove(name);
        }
        return do_login();
    }
    
    function error(err) {
        if (name) {
            self.cache_remove(name);
            publish("auth.logout", {network: self.name, user: name});
        }
        return cb(err);
    }

    function do_login() {
        var go2 = new OAuth2(opts2);

        go2.login(ef(error, function(msg) {
            var access_token = msg.access_token,
                expires_in = +msg.expires_in || self.opts.expires_in ||
                    "unknown",
                expires = isnumber(expires_in) ?
                    Date.now() / 1000 + expires_in : expires_in;
            if (!access_token) {
                return error("OAuth2 login failed");
            }
            check_token(access_token, expires, ef(error,
                function(access_token, expires, scope) {
                return get_userinfo(access_token, expires, scope,
                    ef(error, cb));
            }));
        }));
    }

    function check_token(access_token, expires, cb) {
        if (!self.check_token) {
                return cb(null, access_token, expires, opts2.scope);
        }
        self.check_token(access_token, ef(cb, function(expires_in, rscope) {
            var expires = isnumber(expires_in) ? Date.now() / 1000 +
                expires_in : expires;
            var scope = [];
            rscope.forEach(function(r) {
                for (var k in self.opts.scope_map) {
                    if (r === self.opts.scope_map[k]) {
                        scope.push(k);
                        return;
                    }
                }
            });
            return cb(null, access_token, expires, scope);
        }));
    }

    function get_userinfo(access_token, expires, token_scope, cb) {
        self.userinfo(access_token, ef(cb, function(res) {
            var t = {
                    userinfo: res,
                    access_token: access_token,
                    expires: expires,
                    scope: token_scope.join(","),
                    _jfs: ["userinfo", "access_token", "expires", "scope"]
                },
                username = res.email,
                old = self.authdata[username],
                now = Date.now() / 1000;
            if (old && old._timer) {
                clearTimeout(old._timer);
            }

            if (isnumber(expires) && expires - now > 600) {
                t._timer = setTimeout(self.login.bind(self, username,
                    opts, function(){}), (expires - now - 300) * 1000);
            }
            self.authdata[username] = t;
            var centry = {
                scope: token_scope,
                access_token: access_token,
                expires: expires
            };
            self.cache_add(username, centry);
            publish("auth.login", {network: self.name, user: username});
            return cb(null, t);
        }));
    }
};

OA2Client.prototype.logout = function(name, opts, cb) {
    if (this.authdata[name]) {
        clearTimeout(this.authdata[name]._timer);
        delete this.authdata[name];
    }
    this.cache_remove(name);
    publish("auth.logout", {network: this.name, user: name});
    return cb(null, null);
};

OA2Client.prototype.users = function() {
    return Object.keys(this.authdata);
};

OA2Client.prototype.get_auth = function(name) {
    return this.authdata[name];
};

OA2Client.prototype.cache_list = function() {
    var str = localStorage[this.opts.cache] || "";
    return parse_json(str) || {};
};

OA2Client.prototype.cache_add = function(name, data) {
    var cache = this.cache_list();
    cache[name] = data;
    localStorage[this.opts.cache] = JSON.stringify(cache);
};

OA2Client.prototype.cache_remove = function(name) {
    var cache = this.cache_list();
    delete cache[name];
    localStorage[this.opts.cache] = JSON.stringify(cache);
};

OA2Client.prototype.userinfo = function(access_token, cb) {
    $.getJSON(this.opts.userinfo_url + access_token, function(userinfo) {
        //console.log("USERINFO", userinfo);
        return cb(null, userinfo);
    }).fail(function() {
        return cb("Invalid access token?");
    });
};

var GoogleOA2 = function(opts) {
    this.name = "google";
    GoogleOA2.base.call(this, opts);
};

inherit(GoogleOA2, OA2Client);

GoogleOA2.defaults = {
    cache: "google-oauth2",
    client_id: "1062433776402.apps.googleusercontent.com",
    scope_map: {
        basic: "https://www.googleapis.com/auth/userinfo.profile",
        email: "https://www.googleapis.com/auth/userinfo.email",
        drive: "https://www.googleapis.com/auth/drive",
        picasa: "https://picasaweb.google.com/data/"
    },
    scope_sep: " ",
    scope: ["basic", "email", "drive", "picasa"],
    auth_url: "https://accounts.google.com/o/oauth2/auth",
    userinfo_url: "https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=",
    redirect_uri: pigshell.site.vurl + "/common/oauth2_redirect.html"
};


GoogleOA2.prototype.get_params = function(name, centry, opts) {
    var opts2 = GoogleOA2.base.prototype.get_params.call(this, name, centry,
        opts);

    if (opts.force) {
        opts2.oauth2.approval_prompt = "force";
    }
    if (name) {
        opts2.oauth2.login_hint = name;
    }
    return opts2;
};

GoogleOA2.prototype.check_token = function(token, cb) {
    var self = this;
    $.getJSON("https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + token, function(tokeninfo) {
        if (tokeninfo.audience !== self.opts.client_id) {
            return cb("Tokeninfo failed client id verification!");
        }
        return cb(null, tokeninfo.expires_in, tokeninfo.scope.split(/\s+/));
    }).fail(function() {
        return cb("Tokeninfo failed");
    });
};

VFS.register_handler("GoogleAuth", new GoogleOA2());
VFS.register_auth_handler("google", "GoogleAuth");

var DropboxOA2 = function(opts) {
    this.name = "dropbox";
    DropboxOA2.base.call(this, opts);
};

inherit(DropboxOA2, OA2Client);

DropboxOA2.defaults = {
    cache: "dropbox-oauth2",
    client_id: "ctc1idg9mu021c5",
    scope_map: {},
    scope: [],
    scope_sep: " ",
    auth_url: "https://www.dropbox.com/1/oauth2/authorize",
    userinfo_url: "https://api.dropbox.com/1/account/info?access_token=",
    redirect_uri: "https://" + pigshell.site.name + "/common/oauth2_redirect.html",
    popupHeight: 550
};

DropboxOA2.prototype.get_params = function(name, centry, opts) {
    var opts2 = DropboxOA2.base.prototype.get_params.call(this, name, centry,
        opts);

    if (!name) {
        opts2.oauth2.force_reapprove = "true";
    }
    return opts2;
};

DropboxOA2.prototype.logout = function(name, opts, cb) {
    var self = this,
        access_token = self.authdata[name] ? self.authdata[name].access_token : null;
    if (!access_token) {
        return ret(null);
    }
    $.getJSON('https://api.dropbox.com/1/disable_access_token?access_token=' +
        access_token, function() {
        return ret(null);
    }).fail(function() {
        return ret("Failed to disable access token");
    });
    function ret(e) {
        DropboxOA2.base.prototype.logout.call(self, name, opts, function(err) {
            return cb(err || e, null);
        });
    }
};

VFS.register_handler("DropboxAuth", new DropboxOA2());
VFS.register_auth_handler("dropbox", "DropboxAuth");

var WindowsOA2 = function(opts) {
    this.name = "windows";
    WindowsOA2.base.call(this, opts);
};

inherit(WindowsOA2, OA2Client);

WindowsOA2.defaults = {
    cache: "windows-oauth2",
    client_id: "0000000048175E9E",
    scope_map: {
        signin: "wl.signin",
        basic: "wl.basic",
        onedrive: "wl.skydrive_update",
        email: "wl.emails"
    },
    scope: ["signin", "basic", "onedrive", "email"],
    scope_sep: ",",
    auth_url: "https://login.live.com/oauth20_authorize.srf",
    userinfo_url: "https://apis.live.net/v5.0/me?access_token=",
    redirect_uri: pigshell.site.vurl + "/common/oauth2_redirect.html"
};

WindowsOA2.prototype.userinfo = function(access_token, cb) {
    WindowsOA2.base.prototype.userinfo.call(this, access_token, ef(cb, function(userinfo) {
        userinfo.email = userinfo.emails.account || userinfo.id + "@windowslive";
        return cb(null, userinfo);
    }));
};

WindowsOA2.prototype.check_token = function(token, cb) {
    var self = this;
    $.getJSON("https://apis.live.net/v5.0/me/permissions?access_token=" + token,
        function(res) {
        return cb(null, null, Object.keys(res.data[0]));
    }).fail(function() {
        return cb("Tokeninfo failed");
    });
};

VFS.register_handler("WindowsAuth", new WindowsOA2());
VFS.register_auth_handler("windows", "WindowsAuth");

var AmazonOA2 = function(opts) {
    this.name = "amazon";
    AmazonOA2.base.call(this, opts);
};

inherit(AmazonOA2, OA2Client);

AmazonOA2.defaults = {
    cache: "amazon-oauth2",
    client_id: "amzn1.application-oa2-client.814724a1168844f5bcb1bb59e98cc906",
    scope_map: {
        basic: "profile"
    },
    scope_sep: " ",
    scope: ["basic"],
    auth_url: "https://www.amazon.com/ap/oa",
    userinfo_url: "https://api.amazon.com/user/profile?access_token=",
    redirect_uri: "https://" + pigshell.site.name + "/common/oauth2_redirect.html",
    popupWidth: 800,
    popupHeight: 550
};

VFS.register_handler("AmazonAuth", new AmazonOA2());
VFS.register_auth_handler("amazon", "AmazonAuth");
