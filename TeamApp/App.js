var Request = require('request');
var Express = require('express');
var CookieSession = require('cookie-session');
var ServeStatic = require('serve-static');
var QueryString = require('querystring');
var Jade = require('jade');
var Fs = require('fs');
var Util = require('util');
var _ = require('lodash');
var Async = require('async');

var GitHub = require('./GitHub');

var App = Express();

//require('request').debug = true;

// *************************************** JADE COMPILATION ***************************************
var jade_fns = {};
jade_fns['/'] = Jade.compileFile('jade/index.jade');
jade_fns['dashboard'] = Jade.compileFile('jade/dashboard.jade');
jade_fns['org'] = Jade.compileFile('jade/org.jade');
jade_fns['bgteam'] = Jade.compileFile('jade/bgteam.jade');
jade_fns['bgteam-addusers'] = Jade.compileFile('jade/bgteam-addusers.jade');
jade_fns['bgteam-addrepos'] = Jade.compileFile('jade/bgteam-addrepos.jade');

// *************************************** GLOBALS ***************************************
var secret_json = JSON.parse(Fs.readFileSync('Secret.json'));
var client_id = secret_json['client_id'];
var client_secret = secret_json['client_secret'];

// *************************************** OTHER FUNCTIONS ***************************************
function MakeWebAlert(type, message) {
    return {"type": type, "message": message};
}

// *************************************** USE METHODS ***************************************
App.use(CookieSession({
    secret: 'BGT-Cookie-Session'
}));

App.use(function(req, res, next){
    console.log(Util.format('%s - %s - %s - token %s', req.method, req.path, req.ip, req.session.access_token));

    next();
});

App.use('/static', Express.static('static'));
App.use('/bootstrap', Express.static('bower_components/bootstrap/dist'));
App.use('/jquery', Express.static('bower_components/jquery/dist'));

App.get('/', function (req, res) {
    var ACCESS_TOKEN = req.session.access_token;
    var LOCALS = {
        "authenticated": ACCESS_TOKEN != null
    };
    res.send( jade_fns['/'](LOCALS) );
});

App.get('/auth', function(req, res) {
    var uri = null;
    var params = null;
    if(req.query.code == null) {
        // GET GITHUB CODE
        uri = 'https://github.com/login/oauth/authorize';
        params = {
            "client_id": client_id,
            "redirect_uri": 'http://localhost:3000/auth',
            "scope": 'gist, admin:org, user'
        };
        uri = Util.format('%s?%s', uri, QueryString.stringify(params));
        res.redirect(uri);
    } else {
        //GET GITHUB ACCESS TOKEN
        uri = 'https://github.com/login/oauth/access_token';
        params = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": req.query.code,
            "redirect_uri": 'http://localhost:3000/dashboard'
        };
        uri = uri + '?' + QueryString.stringify(params);

        Request.post(uri, function(err, resp, body){
            var query = QueryString.parse(body);
            req.session.access_token = query['access_token'];

            res.redirect('/dashboard');
        });
    }
});

App.get('/dashboard', function(req, res) {
    var ACCESS_TOKEN = req.session.access_token;
    if(ACCESS_TOKEN == null){  res.redirect('/'); return;  }
    var LOCALS = {
        "authenticated": ACCESS_TOKEN != null
    };

    Async.parallel({
        "orgs": function(callback){
            GitHub.GetOrgs(ACCESS_TOKEN, function(err, orgs){
                callback(err, orgs);
            });
        },
        "json": function(callback){
            GitHub.GetBGTJson(ACCESS_TOKEN, function(err, json){
                callback(err, json);
            });
        }
    }, function(err, result){
        if(err){throw err;}

        LOCALS.bgt_json = result.json;
        LOCALS.orgs = result.orgs;

        res.send(jade_fns['dashboard'](LOCALS));
    });
});

App.get('/dashboard/org/:login', function(req, res){
    var ACCESS_TOKEN = req.session.access_token;
    if(ACCESS_TOKEN == null) {
        res.redirect('/'); return;
    }
    var LOGIN = req.params.login;
    var LOCALS = {
        "authenticated": true
    };

    Async.parallel({
        "json": function(callback){
            GitHub.GetBGTJson(ACCESS_TOKEN, function(err, file){
                callback(err, file);
            });
        },
        "org": function(callback){
            GitHub.GetOrg(LOGIN, ACCESS_TOKEN, function(err, org){
                callback(err, org);
            });
        }
    }, function(err, result){
        if(err){throw err;}
        if(result.json == null){throw Error('No BGT Json');}

        if( _.has(result.json, LOGIN) ){
            LOCALS.org_in_bgt = true;
            LOCALS.bgteams = result.json[LOGIN];
            LOCALS.org = result.org;

            res.send( jade_fns['org'](LOCALS) );
        } else {
            LOCALS.org_in_bgt = false;
            LOCALS.org = result.org;

            res.send( jade_fns['org'](LOCALS) )
        }
    });
});

App.get('/dashboard/org/:login/bgteam/:bgteam', function(req, res){
    var ACCESS_TOKEN = req.session.access_token;
    var LOGIN = req.params.login;
    var BGTEAM = req.params.bgteam;
    if(ACCESS_TOKEN == null){  res.redirect('/'); return;  }

    var LOCALS = {
        "authenticated": ACCESS_TOKEN != null
    };

    Async.parallel({
        "json": function(callback){
            GitHub.GetBGTJson(ACCESS_TOKEN, function(err, json){
                callback(err, json);
            });
        },
        "org": function(callback){
            GitHub.GetOrg(LOGIN, ACCESS_TOKEN, function(err, org){
                callback(err, org);
            });
        }
    }, function(err, result){
        if(err){throw err;}
        if(result.json == null){throw Error('BGT Json not found.');}

        LOCALS.bgteam = result.json[LOGIN][BGTEAM];
        LOCALS.org = result.org;
        LOCALS.login = LOGIN;

        res.send(jade_fns['bgteam'](LOCALS));
    });
});

App.get('/dashboard/org/:login/bgteam/:bgteam/users', function(req, res){
    var ACCESS_TOKEN = req.session.access_token;
    var LOGIN = req.params.login;
    var BGTEAM = req.params.bgteam;
    var PAGE = req.query.page;
    if(PAGE == null){ PAGE = 1; }
    var LOCALS = {
        "authenticated": ACCESS_TOKEN != null
    };
    if(ACCESS_TOKEN == null){res.redirect('/'); return;}

    Async.parallel({
        "memberlink": function(callback){
            GitHub.GetOrgMembers(LOGIN, ACCESS_TOKEN, PAGE, function(err, members, pages){
                callback(err, {"org_members": members, "pages": pages});
            });
        },
        "json": function(callback){
            GitHub.GetBGTJson(ACCESS_TOKEN, function(err, json){
                callback(err, json);
            });
        },
        "org": function(callback){
            GitHub.GetOrg(LOGIN, ACCESS_TOKEN, function(err, org){
                callback(err, org);
            });
        }
    }, function(err, result){
        if(err){throw err;}
        if(result.json == null){throw Error('No BGT File.');}

        LOCALS.org = result.org;
        LOCALS.pages = result.memberlink.pages;
        LOCALS.bgteam = result.json[LOGIN][BGTEAM];
        LOCALS.bgt_json = result.json;
        LOCALS.org_members = _.map(result.memberlink.org_members, function(mem){
            mem.in_team = ( _.indexOf(LOCALS.bgteam.users, mem.login) != -1 );
            return mem;
        });
        LOCALS.page = parseInt(PAGE);


        res.send(jade_fns['bgteam-addusers'](LOCALS));
    });
});

App.get('/dashboard/org/:login/bgteam/:bgteam/repos/:permission', function(req, res){
    var ACCESS_TOKEN = req.session.access_token;
    var LOGIN = req.params.login;
    var BGTEAM = req.params.bgteam;
    var PERMISSION = req.params.permission;
    var PAGE = req.query.page;
    if(PAGE == null){ PAGE = 1; }
    var LOCALS = {
        "authenticated": ACCESS_TOKEN != null
    };
    if(ACCESS_TOKEN == null){res.redirect('/'); return;}

    Async.parallel({
        "repolink": function(callback){
            GitHub.GetOrgRepos(LOGIN, ACCESS_TOKEN, PAGE, function(err, repos, pages){
                callback(err, {"org_repos": repos, "pages": pages});
            });
        },
        "json": function(callback){
            GitHub.GetBGTJson(ACCESS_TOKEN, function(err, json){
                callback(err, json);
            });
        },
        "org": function(callback){
            GitHub.GetOrg(LOGIN, ACCESS_TOKEN, function(err, org){
                callback(err, org);
            });
        }
    }, function(err, result){
        console.log('got');
        if(err){throw err;}
        if(result.json == null){throw Error('No BGT File.');}

        LOCALS.org = result.org;
        LOCALS.pages = result.repolink.pages;
        LOCALS.bgteam = result.json[LOGIN][BGTEAM];
        LOCALS.bgt_json = result.json;
        LOCALS.org_repos = _.map(result.repolink.org_repos, function(rep){
            var in_team = false;
            for(var i = 0; i < LOCALS.bgteam[PERMISSION+'_repos'].length; i++){
                var repo = LOCALS.bgteam[PERMISSION+'_repos'][i];
                if(rep.owner.login == repo.owner && rep.name == repo.name) {
                    in_team = true;
                    break;
                }
            }
            rep.in_team = in_team;
            return rep;
        });
        LOCALS.page = parseInt(PAGE);
        LOCALS.permission = PERMISSION;

        res.send(jade_fns['bgteam-addrepos'](LOCALS));
    });
});

App.get('/logout', function(req, res){
    if(req.session.access_token != null) {
        delete req.session.access_token;
    }
    res.redirect('/');
});

App.get('/create_bgt_file', function(req, res) {
    var ACCESS_TOKEN = req.session.access_token;
    if(ACCESS_TOKEN == null){  res.redirect('/'); return;  }

    GitHub.CreateBGTJson(ACCESS_TOKEN, function(err){
        if(err){throw err;}
        res.redirect('/dashboard');
    });
});

App.get('/delete_bgt_file', function(req, res) {
    var ACCESS_TOKEN = req.session.access_token;
    if(ACCESS_TOKEN == null){  res.redirect('/'); return;  }

    GitHub.DeleteBGTJson(ACCESS_TOKEN, function(err){
        if(err){throw err;}
        res.redirect('/dashboard');
    });
});

App.get('/insert_org/:login', function(req, res){
    var ACCESS_TOKEN = req.session.access_token;
    var LOGIN = req.params.login;
    if(ACCESS_TOKEN == null) {
        res.redirect('/');
        return;
    }

    //Get File
    GitHub.GetBGTJson(ACCESS_TOKEN, function(err, json){
        if(err != null){res.redirect('/'); return;} //Error getting file
        if(json == null){res.redirect('/dashboard'); return;} //File doesn't exist
        if(_.has(json, LOGIN)){res.redirect('/'); return;} //Already has

        GitHub.GetOrg(LOGIN, ACCESS_TOKEN, function(err, org){
            if(err != null){throw err;}
            json[LOGIN] = {};

            //Apply changes to file
            GitHub.UpdateBGTJson(json, ACCESS_TOKEN, function(err){
                if(err != null){throw err;}

                res.redirect('/dashboard/org/'+LOGIN);
            });
        });
    });
});

App.get('/remove_org/:login', function(req, res){
    var ACCESS_TOKEN = req.session.access_token;
    var LOGIN = req.params.login;
    if(ACCESS_TOKEN == null) {
        res.redirect('/');
        return;
    }

    GitHub.GetBGTJson(ACCESS_TOKEN, function(err, json){
        if(err != null){throw err;}
        if(json == null){throw err;}

        delete json[LOGIN];

        GitHub.UpdateBGTJson(json, ACCESS_TOKEN, function(err){
            if(err != null){throw err;}

            res.redirect('/dashboard/org/'+LOGIN);
        })
    });
});

App.get('/apply_changes/:login', function(req, res){
    var LOGIN = req.params.login;
    var ACCESS_TOKEN = req.session.access_token;
    if(ACCESS_TOKEN == null){res.redirect('/'); return;}

    GitHub.UpdateGitHubFromBGTJson(LOGIN, ACCESS_TOKEN, function(err){
        if(err){throw err;}
        console.log('Called back');
    });
    res.redirect('/dashboard/org/'+LOGIN);
});

App.get('/dashboard/:login/add_bgt', function(req, res){
    var LOGIN = req.params.login;
    var ACCESS_TOKEN = req.session.access_token;
    var BGTEAM_NAME = req.query.bgteam_name;
    if(ACCESS_TOKEN == null){res.redirect('/'); return;}
    if(BGTEAM_NAME == null){res.redirect('/dashboard'); return;}

    GitHub.GetBGTJson(ACCESS_TOKEN, function(err, json){
        if(err){throw err;}
        if(json == null){throw Error('Did not find file.');}

        //BGTeam already exists
        if(_.has(json.LOGIN, BGTEAM_NAME)) {
            res.redirect('/dashboard/org/'+LOGIN);
        }
        //BGT does not exist
        else {
            json[LOGIN][BGTEAM_NAME] = {
                "name": BGTEAM_NAME,
                "users": [],
                "read_repos": [],
                "read_id": null,
                "write_repos": [],
                "write_id": null,
                "admin_repos": [],
                "admin_id": null
            };
            GitHub.UpdateBGTJson(json, ACCESS_TOKEN, function(err){
                if(err){throw err;}
                res.redirect('/dashboard/org/'+LOGIN);
            });
        }
    });
});

App.get('/remove_bgt/:login/:bgteam', function(req, res){
    var ACCESS_TOKEN = req.session.access_token;
    if(ACCESS_TOKEN == null){ res.redirect('/'); return; }

    var LOGIN = req.params.login;
    var BGTEAM = req.params.bgteam;

    GitHub.GetBGTJson(ACCESS_TOKEN, function(err, json){
        if(err){throw err;}
        if(json == null){throw Error('No BGT file found.');}

        if(json[LOGIN][BGTEAM].read_id != null){
            json._teamstodelete.push(json[LOGIN][BGTEAM].read_id);
        }
        if(json[LOGIN][BGTEAM].write_id != null){
            json._teamstodelete.push(json[LOGIN][BGTEAM].write_id);
        }
        if(json[LOGIN][BGTEAM].admin_id != null){
            json._teamstodelete.push(json[LOGIN][BGTEAM].admin_id);
        }

        delete json[LOGIN][BGTEAM];

        GitHub.UpdateBGTJson(json, ACCESS_TOKEN, function(err){
            if(err){throw err;}
            res.redirect('/dashboard/org/'+LOGIN);
        });
    });

});

App.get('/toggle_user/:org_login/:bgteam/:user_login', function(req, res){
    var ACCESS_TOKEN = req.session.access_token;
    if(ACCESS_TOKEN == null){ res.redirect('/'); return;}

    var ORGLOGIN = req.params.org_login;
    var BGTEAM = req.params.bgteam;
    var USERLOGIN = req.params.user_login;

    GitHub.GetBGTJson(ACCESS_TOKEN, function(err, json){
        if(err){throw err;}

        //If user not in, add
        var findIndex = _.indexOf(json[ORGLOGIN][BGTEAM].users, USERLOGIN);
        if(findIndex === -1) {
            json[ORGLOGIN][BGTEAM].users.push(USERLOGIN);
        } else {
            json[ORGLOGIN][BGTEAM].users.splice(findIndex, 1);
        }
        GitHub.UpdateBGTJson(json, ACCESS_TOKEN, function(err){
            if(err){throw err;}
            res.redirect('/dashboard/org/'+ORGLOGIN+'/bgteam/'+BGTEAM+'/users');
        });
    });
});

App.get('/toggle_repo', function(req, res){
    var ACCESS_TOKEN = req.session.access_token;
    var PERMISSION = req.query.perm;
    var BGTEAM = req.query.bgteam;
    var ORGLOGIN = req.query.orglogin;
    var OWNER = req.query.owner;
    var REPO = req.query.repo;
    if(ACCESS_TOKEN == null) {
        res.redirect('/'); return;
    }

    Async.parallel({
        "json": function(callback){
            GitHub.GetBGTJson(ACCESS_TOKEN, function(err, json){
                callback(err, json);
            });
        },
        "repo": function(callback){
            GitHub.GetRepo(OWNER, REPO, ACCESS_TOKEN, function(err, repo){
                callback(err, repo);
            });
        }
    }, function(err, result){
        if(err){throw err;}
        if(result.json == null){throw Error('No BGT file.');}

        var json = result.json;

        var perm = null;
        switch(PERMISSION){
            case 'read': perm = 'read_repos'; break;
            case 'write': perm = 'write_repos'; break;
            case 'admin': perm = 'admin_repos'; break;
            default:
                res.redirect('/');
                return;
        }

        //If user not in, add

        var findIndex = _.findIndex(json[ORGLOGIN][BGTEAM][perm], function(repo){
            return repo.owner == OWNER && repo.name == REPO;
        });
        console.log(findIndex)
        if(findIndex == -1) {
            json[ORGLOGIN][BGTEAM][perm].push({"owner": OWNER, "name": REPO});
        } else {
            json[ORGLOGIN][BGTEAM][perm].splice(findIndex, 1);
        }
        GitHub.UpdateBGTJson(json, ACCESS_TOKEN, function(err){
            if(err){throw err;}
            res.redirect('/dashboard/org/'+ORGLOGIN+'/bgteam/'+BGTEAM+'/repos/'+PERMISSION);
        });
    });
});

var Server = App.listen(3000, function () {
    var host = Server.address().address;
    var port = Server.address().port;
    console.log(Util.format('BGT App listening at http://%s:%s', host, port));
});
