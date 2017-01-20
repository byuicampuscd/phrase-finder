const fs = require('fs'),
    admZip = require('adm-zip'),
    _path = require("path"),
    options = JSON.parse(fs.readFileSync("./options.json"));
//console.log(options);

function auditFile(file, dest, html,  callback) {
    //console.log("Auditing File....",file)
    fs.readFile(file, "utf8", function (err, output) {
        if (err) throw err;
        var newOutput = output;
        var results = options.phrases.map(function (phrase) {
            var searchTerm = (phrase.regex) ? new RegExp(phrase.phrase, phrase.flag) : new RegExp(`(${phrase.phrase})`, phrase.flag),
                matches = output.match(searchTerm);
            //console.log(newOutput.match(searchTerm));
            newOutput = newOutput.replace(searchTerm, (phrase.color && phrase.color.toLowerCase() === "rainbow" ) ? `<span class="rainbow"><strong>[$&]</span></strong> `:`<span style="background-color:${phrase.color || "yellow"}"><strong>[$&]</span></strong> `);
            return {phrase: phrase.phrase, results:matches};
        });
        var newFile = (html) ? newOutput+"<style>.rainbow {background-image: -webkit-gradient( linear, left top, right top, color-stop(0, #f22), color-stop(0.15, #f2f), color-stop(0.3, #22f), color-stop(0.45, #2ff), color-stop(0.6, #2f2),color-stop(0.75, #2f2), color-stop(0.9, #ff2), color-stop(1, #f22) );background-image: gradient( linear, left top, right top, color-stop(0, #f22), color-stop(0.15, #f2f), color-stop(0.3, #22f), color-stop(0.45, #2ff), color-stop(0.6, #2f2),color-stop(0.75, #2f2), color-stop(0.9, #ff2), color-stop(1, #f22) );color:transparent;-webkit-background-clip: text;background-clip: text;}</style>" : `<!DOCTYPE HTML><html><head><title>Test Output</title></head><style>.rainbow {background-image: -webkit-gradient( linear, left top, right top, color-stop(0, #f22), color-stop(0.15, #f2f), color-stop(0.3, #22f), color-stop(0.45, #2ff), color-stop(0.6, #2f2),color-stop(0.75, #2f2), color-stop(0.9, #ff2), color-stop(1, #f22) );background-image: gradient( linear, left top, right top, color-stop(0, #f22), color-stop(0.15, #f2f), color-stop(0.3, #22f), color-stop(0.45, #2ff), color-stop(0.6, #2f2),color-stop(0.75, #2f2), color-stop(0.9, #ff2), color-stop(1, #f22) );color:transparent;-webkit-background-clip: text;background-clip: text;}</style><body>${newOutput}</body></html>`.replace(/(\n\r)|(\r\n)|\n/g, "<br>"),
            name = file.split("/")
        name = name[name.length - 1].replace(_path.extname(file), ".html");
        var tst = results.filter(function (item) {
            ////console.log(item.results);
            return item.results;
        });
        ////console.log(_path.extname(file));
       // //console.log(name, results);
        ////console.log('tst: ', tst.length <= 0, name)
        if (tst.length > 0)
            fs.writeFile(dest, newFile, function (err) {
                if (err) throw err;
                ////console.log("Done!");
                callback({file:name, itemsFound: results});
            });
        else
            callback({});
//        options.phrases.map(function (item, index) {
//            if (results[index])
//                //console.log(item.phrase + "  :  " + results[index].length)
//        });
    });

}

function iterateProcess(array, index, amount, delay) {
    return function (process, done) {
        var end = (index + amount < array.length) ? index + amount : array.length,
            selection = array.slice(index, end),
            first = array.slice(0, index),
            last = array.slice(end, array.length),
            completed = false;
        process(selection, function (selection) {
//            ///console.log("Selection: " + selection);
            var modified = first.concat(selection.concat(last));
            if (index + amount < array.length) {
                if (!delay)
                    iterateProcess(modified, index + amount, amount)(process, done);
                else
                    setTimeout(function () {
                        iterateProcess(modified, index + amount, amount, delay)(process, done);
                    }, delay);
            } else {
                if (!completed) {
                    completed = true;
                    done(modified);
                }
            }
        },index+amount);
    };
}

function auditFolder(path,name,callback){
    
fs.readdir(path, function (err, items) {
    //console.log(name);
    itp = items.filter(function(item){
        var ext = (_path.extname(item));
        return (ext.match(/\.html|\.txt/gi));
    })
    var processed = 0;
    iterateProcess(itp,0,1, 50)(function(dirs, done){
        ////console.log(dirs);
        try{
            (fs.readdirSync("./output/"+name))
        }catch(e){
            fs.mkdirSync("./output/"+name);
        }
        dirs.forEach(function (item) {
            var ext = (_path.extname(item));
            if(!ext.match(/\.html|\.txt/gi)){
                ////console.log("Oops!");
                ////console.log("Finished Scanning File!");
                processed++;
                //console.log(processed+" / "+itp.length)
                done([]);
                return;
            }
            auditFile(path +"/" + item, "./output/"+name+"/"+item.replace(ext, ".html"), ext === ".html", function(res){
                ////console.log(res, "Finished Scanning File!");
                processed++;
                console.log(processed+" / "+itp.length)
                done([res]);
            });
        });
    }, function(results){
        //console.log("Finished With Folder ", name)
        var len = fs.readdirSync("./output/"+name);
        if(len.length <= 0)
            deleteFolder("./output/"+name);
        callback({path:name, results:results});
    })
});
}

function auditCourses(){
    fs.readdir("./Courses", function(err, dir){
       if(err) throw err;
            ////console.log(dir);
        iterateProcess(dir, 0, 1)(function(items, done, index){
            items.forEach(function(item){
               var zip = new admZip("./Courses/"+item);
                try{
                    fs.mkdirSync("./tmp");
                }catch(e){
                    deleteFolder("./tmp");
                    fs.mkdirSync("./tmp");
                }
               zip.getEntries().forEach(function(entry){
                  ////console.log("Name: "+ entry.entryName);
                  zip.extractEntryTo(entry.entryName, "./tmp", false, true); 
               });
                
                auditFolder("./tmp", item.split(".zip")[0],function(results){
                    deleteFolder("./tmp");
                    //console.log('\033[2J');
                    console.log(`Finished: ${index} / ${dir.length}`)
                    done([results]); 
                });
    
            });
        }, function(data){
            compileCSV(data);
        });
    });
}

var total = {};
function compileCSV(results){
    var csv = "ID, File,";
    for(var i of options.phrases)
        csv += i.phrase+",";
    csv += "\n";
    results.map(function(course){
       var id = course.path.match(/_\d.+_/g)[0].replace(/_/g, "");
        //console.log(id);
        var found = course.results.filter(function(item){
            return item.file;
        });
        found.forEach(function(item){
            csv += id+","+item.file+",";
            item.itemsFound.forEach(function(phrase){
               if(!total[phrase.phrase]) total[phrase.phrase] = 0;
                total[phrase.phrase] += ((phrase.results) ? phrase.results.length : 0);
               csv += ((phrase.results) ? phrase.results.length : 0) + ",";
           });
           csv += "\n";
        });
        //console.log(found);
    });
    csv += ",Total:,";
    for(var i in total)
        csv+= total[i]+",";
    csv += "\n";
    fs.writeFile("output/output.csv",csv, function(err){
       if(err) throw err;
        //console.log("Mission Accomplished!", total);
    });
    ////console.log(csv);
}

auditCourses();

//auditFolder("./test-docs", function(results){
//    results.forEach(function(item){
//       //console.log(item.itemsFound); 
//    });
//});

 function deleteFolder(path) {
    try{
        fs.statSync(path);
    }catch(e){
        //console.log("Error deleting the specified path.");
        return;
    }
    var items = fs.readdirSync(path);
    items.forEach(function(file){
      var currentDir = path + "/" + file;
      if(fs.statSync(currentDir).isDirectory()) { 
        deleteFolder(currentDir);
      } else { 
        fs.unlinkSync(currentDir);
      }
    });
    fs.rmdirSync(path);
};