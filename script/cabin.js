var cabin = (function(){
  var doc = document
    , toA = function(args) {
        return Array.prototype.slice.apply(args);
      }
    , extract = function(pattern,str) {
        var matches = [];
        str.replace(pattern,function(_,c){
          matches.push(c);
        });
        return matches;
      }
    , lastTag = /[^\s]+$/
    , elR = /^[^\.#]+/
    , idR = /#([^\.$]+)/
    , classR = /\.([^\.$#]+)/g
    , isStringNumber = function(o) {
        return typeof o === "string" || typeof o === "number";
      }
    , curry = function(fn) {
        var args = toA(arguments).slice(1);
        return function() {
          return fn.apply(null,args.concat(toA(arguments)));
        };
      };

  // the building function
  var build = function(selector,duck) {
    // quick check, different case for text nodes
    if(selector == "text") return doc.createTextNode(duck);
    if(!duck) duck = "";

    var tag = lastTag.exec(selector)[0]
      , nest = selector.slice(0,-tag.length-1)
      , noOpts = duck.nodeType || isStringNumber(duck)
      , opts = noOpts ? {} : duck
      , kids = toA(arguments).slice(noOpts ? 1 : 2)
      , id = idR.exec(tag)
      , classes = extract(classR,tag)
      , el = doc.createElement(elR.exec(tag));

    for(var o in opts) {
      if(opts.hasOwnProperty(o)) el.setAttribute(o,opts[o]);
    }
    // if there's an id, get the good match
    if(id) el.id = id[1];
    // make a string out of the classes
    if(classes.length) el.className = classes.join(" ");
    // now the actual appending
    for(var i = 0, l = kids.length; i < l; i++) {
      var kid = kids[i];
      el.appendChild(kid.nodeType ? kid : doc.createTextNode(kid));
    }
    // recurse on nest if there is one
    return nest ? build(nest,el) : el;
  };

  build.list = function(els,sep) {
    var fragment = doc.createDocumentFragment();
    for(var i = 0, l = els.length; i < l; i++) {
      fragment.appendChild(els[i]);
      if(sep && i < l-1) {
        fragment.appendChild(sep.cloneNode(true));
      }
    }
    return fragment;
  };

  build.curry = function(fn) {
    return curry(fn,build);
  };

  return build;
})();