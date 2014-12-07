
module.parse = function(header_link){
    var json = {};
    var pages = header_link.split(', ');
    for(var i = 0; i < pages.length; i++) {
        var pieces = pages[i].split('; ');
        var url = pieces[0].slice('<'.length, pieces[0].length-'>'.length);
        var rel = pieces[1].slice('rel="'.length, pieces[1].length-'"'.length);
        json[rel] = url;
    }
    return json;
};