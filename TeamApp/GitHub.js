var Request = require('request');
var Util = require('util');
var _ = require('lodash');

function GitHub() {
    this.base_uri = 'https://api.github.com';
    this.bgt_filename = 'bgt.json';

    // callback(err, data)
    this._get = function (path, success_code, access_token, callback) {
        var options = {
            'url': this.base_uri + path,
            "headers": {
                "authorization": Util.format("token %s", access_token),
                "accept": "application/vnd.github.v3+json",
                "content-type": "application/json",
                "user-agent": "BetterGithubTeams"
            }
        };
        Request.get(options, function (error, response, body) {
            if (error) {
                callback(error, null);
            } else if (response.statusCode != success_code) {
                callback(response.statusText || response.statusCode, null);
            } else {
                callback(null, JSON.parse(body));
            }
        });
    };

    //callback(err, data)
    this._post = function (path, body, success_code, access_token, callback) {
        var options = {
            'url': this.base_uri + path,
            "headers": {
                "authorization": Util.format("token %s", access_token),
                "accept": "application/vnd.github.v3+json",
                "content-type": "application/json",
                "user-agent": "BetterGithubTeams"
            },
            "json": true,
            "body": body
        };
        Request.post(options, function (error, response, body) {
            if (error) {
                callback(error, null);
            } else if (response.statusCode != success_code) {
                console.error(response.statusText || response.message);
                callback(response.statusText || response.statusCode, null);
            } else {
                console.log(body);
                callback(null, null);
            }
        });
    };

    //callback(err, data)
    this._delete = function (path, success_code, access_token, callback) {
        var options = {
            "url": this.base_uri+path,
            "headers": {
                "authorization": Util.format("token %s", access_token),
                "accept": "application/vnd.github.v3+json",
                "content-type": "application/json",
                "user-agent": "BetterGithubTeams"
            }
        };

        console.log(JSON.stringify(options, null, 2));
        Request.del(options, function (error, response, body) {
            if (error) {
                callback(error, null);
            } else if (response.statusCode !== success_code) {
                callback(response.statusText || response.statusCode, null);
            } else {
                console.log(body);
                callback(null, null);
            }
        });
    };

    // Gets the Authenticated User
    // callback(err, user)
    this.GetUser = function (access_token, callback) {
        this._get('/user', 200, access_token, function (err, body) {
            callback(err, body);
        });
    };

    // Gets the user by username
    // callback(err, user)
    this.GetUserByUsername = function (username, access_token, callback) {
        this._get(
            '/users/'+username,
            200, access_token,
            function (err, body) {
                callback(err, body);
            }
        );
    };

    // Get the Organizations of the authenticated user.
    // callback(err, [orgs])
    this.GetBriefOrgs = function (access_token, callback) {
        this._get('/user/orgs', 200, access_token, function (err, body) {
            callback(err, body);
        });
    };

    // Gets the Organization by the org login
    // callback(err, detailed_org)
    this.GetOrg = function (login, access_token, callback) {
        this._get(
            '/orgs/'+login,
            200, access_token,
            function (err, body) {
                callback(err, body);
            }
        );
    };

    // Gets the Organizations of the authenticated user.
    // callback(err, [orgs])
    this.GetOrgs = function (access_token, callback) {
        var self = this;

        self.GetBriefOrgs(access_token, function (err, brief_orgs) {
            var orgs = [];

            var WAIT_TODO = brief_orgs.length;
            var WAIT_DONE = 0;
            var WAIT_FUNC = function () {
                WAIT_DONE++;
                if (WAIT_DONE >= WAIT_TODO) {
                    callback(err, orgs);
                }
            };
            for (var i = 0; i < brief_orgs.length; i++) {
                self.GetOrg(brief_orgs[i].login, access_token, function (err, org) {
                    if (err) {
                        throw err;
                    }
                    orgs.push(org);
                    WAIT_FUNC();
                });
            }
        });
    };

    // Get brief teams by org login
    // callback(err, [teams])
    this.GetBriefTeams = function (login, access_token, callback) {
        this._get(
            '/orgs/'+login+'/teams',
            200, access_token,
            function (err, body) {
                callback(err, body);
            }
        );
    };

    // Get team by id
    // callback(err, team)
    this.GetTeam = function (id, access_token, callback) {
        this._get(
            '/teams/'+id,
            200, access_token,
            function (err, body) {
                callback(err, body);
            }
        );
    };

    // Get teams of authenticated users
    // callback(err, teams)
    this.GetTeams = function (access_token, callback) {
        var self = this;

        self.GetBriefTeams(access_token, function (err, brief_teams) {
            var teams = [];

            var WAIT_TODO = brief_teams.length;
            var WAIT_DONE = 0;
            var WAIT_FUNC = function () {
                WAIT_DONE++;
                if (WAIT_DONE >= WAIT_TODO) {
                    callback(err, teams);
                }
            };

            for (var i = 0; i < brief_teams.length; i++) {
                self.GetTeam(brief_teams[i].id, access_token, function (err, team) {
                    teams.push(team);
                    WAIT_FUNC();
                });
            }
        });
    };

    //callback(err, [members])
    this.GetTeamMembers = function (id, access_token, callback) {
        var self = this;

        this._get(
            '/teams/'+id+'/members',
            200, access_token,
            function (err, body) {
                callback(err, body);
            }
        );
    };

    // callback(err, [gists]) - gists don't have content
    this.ListGists = function (access_token, callback) {
        this._get(
            '/gists',
            200, access_token,
            function (err, body) {
                callback(err, body);
            }
        );
    };

    // callback(err, gist) - has content
    this.GetGist = function (id, access_token, callback) {
        this._get(
            '/gists/'+id,
            200, access_token,
            function (err, body) {
                callback(err, body);
            }
        );
    };

    // callback(err);
    this.DeleteGist = function(id, access_token, callback) {
        var url = '/gists/'+id;

        this._delete(url, 204, access_token, function(err){
            if(err){callback(err); return;}

            callback(null);
        });
    };

    this.CreateGist = function(files, description, is_public, access_token, callback) {
        var body = {
            "description": description,
            "public": is_public,
            "files": files
        };
        this._post('/gists', body, 201, access_token, function(err, body){
            if(err){callback(err, null); return;}

            callback(null, body);
        });
    };

    /**************************************************************************
     * Advanced Github
     */

    // callback(err, id) - file is json
    this.GetBGTFileId = function (access_token, callback) {
        var self = this;
        self.ListGists(access_token, function (err, gists) {
            if (err) {callback(err, null); return;}
            //Check all gists
            for(var i = 0; i < gists.length; i++) {
                //If it has the bgt file
                if(_.has(gists[i].files, self.bgt_filename)) {
                    callback(null, gists[i].id);
                    return;
                }
            }
            callback(null, null);
        });
    };

    // callback(err, file) - file is json
    this.GetBGTFile = function(access_token, callback) {
        var self = this;
        self.GetBGTFileId(access_token, function(err, id){
            console.log('GetBGTFileId callback - Err: '+err+' Id: '+id);

            if(err){callback(err, null); return;}
            if(id == null) {callback(null, null); return;}

            self.GetGist(id, access_token, function(err, gist){
                console.log('GetGist callback - Err: '+err+' Gist: '+gist);
                if(err){callback(err, null); return;}

                callback(null, JSON.parse(gist.files[self.bgt_filename].content));
            });
        });
    };

    // callback(err)
    this.CreateBGTFile = function(access_token, callback) {
        var self = this;
        self.GetBGTFileId(access_token, function(err, id){
            console.log('GetBGTFileId callback - Err: '+err+' Id: '+id);

            if(err){callback(err); return;}
            if(id != null){callback('Gist with file '+self.bgt_filename+' already exists.'); return;}

            var files = {};
            var desc = 'This is the Better Github Teams gist. Please don\'t modify this file.';
            files[self.bgt_filename] = {
                "content": '{}'
            };

            self.CreateGist(files, desc, false, access_token, function(err, data){
                console.log('CreateGist callback - Err: '+err+' Data: '+data);
                if(err){callback(err); return;}

                callback(null);
            })
        });
    };

    // callback(err)
    this.DeleteBGTFile = function(access_token, callback){
        var self = this;
        self.GetBGTFileId(access_token, function(err, id){
            if(err != null){callback(err); return;}
            if(id == null){callback('BGT file already exists.'); return;}

            self.DeleteGist(id, access_token, function(err){
                if(err != null){callback(err); return;}

                callback(null);
            })
        });
    }
}

module.exports = new GitHub();