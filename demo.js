/*  demo.js http://github.com/bgrins/javascript-astar
    MIT License

    Set up the demo page for the A* Search
*/
/* global Graph, astar, $ */

var WALL = 0,
    performance = window.performance;
function syntaxHighlight(json) {
    if (typeof json != 'string') {
         json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}
function output(inp) {
    document.body.appendChild(document.createElement('pre')).innerHTML = inp;
}

$(function() {

    var $grid = $("#search_grid"),
        $selectWallFrequency = $("#selectWallFrequency"),
        $selectGridSize = $("#selectGridSize"),
        $checkDebug = $("#checkDebug"),
        $searchDiagonal = $("#searchDiagonal"),
        $checkClosest = $("#checkClosest");

    var opts = {
        wallFrequency: $selectWallFrequency.val(),
        gridSize: $selectGridSize.val(),
        debug: true,
        diagonal: $searchDiagonal.is("checked"),
        closest: $checkClosest.is("checked")
    };

    var grid = new GraphSearch($grid, opts, astar.search);
    
    $("#btnGenerate").click(function() {
        grid.initialize();
    });

    $selectWallFrequency.change(function() {
        grid.setOption({wallFrequency: $(this).val()});
        grid.initialize();
    });

    $selectGridSize.change(function() {
        grid.setOption({gridSize: $(this).val()});
        grid.initialize();
    });

    $checkDebug.change(function() {
        grid.setOption({debug: $(this).is(":checked")});
    });

    $searchDiagonal.change(function() {
        var val = $(this).is(":checked");
        grid.setOption({diagonal: val});
        grid.graph.diagonal = val;
    });

    $checkClosest.change(function() {
        grid.setOption({closest: $(this).is(":checked")});
    });

    $("#generateWeights").click( function () {
        if ($("#generateWeights").prop("checked")) {
            $('#weightsKey').slideDown();
        } else {
            $('#weightsKey').slideUp();
        }
    });

});

var css = { start: "start", finish: "finish", wall: "wall", active: "active" };

function GraphSearch($graph, options, implementation) {
    this.$graph = $graph;
    this.search = implementation;
    this.opts = $.extend({wallFrequency:0.1, debug:true, gridSize:10}, options);
    this.initialize();
}
GraphSearch.prototype.setOption = function(opt) {
    this.opts = $.extend(this.opts, opt);
    this.drawDebugInfo();
};
GraphSearch.prototype.initialize = function() {
    this.grid = [];
    var self = this,
        nodes = [],
        $graph = this.$graph;

    $graph.empty();

    var cellWidth = ($graph.width()/this.opts.gridSize)-2,  // -2 for border
        cellHeight = ($graph.height()/this.opts.gridSize)-2,
        $cellTemplate = $("<span />").addClass("grid_item").width(cellWidth).height(cellHeight),
        startSet = false;

    /*
        Pesos da heuristica:
        1 = Terreno plano (verde)
        2 = Terreno com declinio (amarelo)
        3 = Cadeia motanhosa (marrom)
        0 = parede (preta)
    */
    var nodes = [
        [1,1,1,2,1,1,1,1,1,2],
        [2,2,2,2,1,1,1,2,2,3],
        [2,1,1,1,1,1,2,2,2,2],
        [2,1,1,1,1,1,1,2,2,3],
        [2,2,1,2,2,2,2,2,2,2],
        [2,3,2,3,3,3,3,3,3,3],
        [3,3,3,3,0,0,3,0,0,0],
        [3,3,3,3,3,3,0,0,0,0],
        [3,0,3,3,3,3,3,0,3,3],
        [0,0,3,3,3,3,3,3,3,3]
    ];
    
    for(var x = 0; x < nodes.length; x++) {
        
        var $row = $("<div class='clear' />"),
            nodeRow = [],
            gridRow = [];
        
        for(var y = 0; y < nodes.length; y++) {
            
            var id = "cell_"+x+"_"+y,
            $cell = $cellTemplate.clone();
            
            $cell.attr("id", id).attr("x", x).attr("y", y);
            $row.append($cell);
            gridRow.push($cell);
            
            var isWall = nodes[x][y] == 0;
            if(isWall) {
                $cell.addClass(css.wall);
            }
            else  {
                var cell_weight = nodes[x][y];
                $cell.addClass('weight' + cell_weight);
                
                //$cell.html(cell_weight);
                
                if (!startSet) {
                    $cell.addClass(css.start);
                    startSet = true;
                }
            } 
        }
        $graph.append($row);

        this.grid.push(gridRow);
        
    }
    

    this.graph = new Graph(nodes);
    
    console.log(this.graph);
    // bind cell event, set start/wall positions
    this.$cells = $graph.find(".grid_item");
    this.$cells.click(function() {
        self.cellClicked($(this));
    });
};
GraphSearch.prototype.cellClicked = function($end) {

    var end = this.nodeFromElement($end);

    if($end.hasClass(css.wall) || $end.hasClass(css.start)) {
        return;
    }

    this.$cells.removeClass(css.finish);
    $end.addClass("finish");
    var $start = this.$cells.filter("." + css.start),
        start = this.nodeFromElement($start);

    var sTime = performance ? performance.now() : new Date().getTime();

    var path = this.search(this.graph, start, end, {
        closest: this.opts.closest
    });
    var fTime = performance ? performance.now() : new Date().getTime(),
        duration = (fTime-sTime).toFixed(2);

    if(path.length === 0) {
        $("#message").text("nao foi possivel encontrar um caminho (" + duration + "ms)");
        this.animateNoPath();
    }
    else {
        $("#message").text("procura demorou " + duration + "ms.");
        this.drawDebugInfo();
        this.animatePath(path);
        //Final do algoritmo
       
        
        var ultima_alteracao = this.graph.dirtyNodes.pop();
        console.log(ultima_alteracao);
        $('#finalStatus').html(syntaxHighlight(ultima_alteracao));
    }
};
GraphSearch.prototype.drawDebugInfo = function() {
    this.$cells.html(" ");
    var that = this;
    if(this.opts.debug) {
        that.$cells.each(function() {
            var node = that.nodeFromElement($(this)),
                debug = false;
            if (node.visited) {
                debug = "<div class='f'>" + node.f + "</div><br /><div class='g'>" + node.g + "</div><br /><div class='h'>" + node.h + "</div>";
            }

            if (debug) {
                $(this).html(debug);
            }
        });
    }
};
GraphSearch.prototype.nodeFromElement = function($cell) {
    return this.graph.grid[parseInt($cell.attr("x"))][parseInt($cell.attr("y"))];
};
GraphSearch.prototype.animateNoPath = function() {
    var $graph = this.$graph;
    var jiggle = function(lim, i) {
        if(i>=lim) { $graph.css("top", 0).css("left", 0); return; }
        if(!i) i=0;
        i++;
        $graph.css("top", Math.random()*6).css("left", Math.random()*6);
        setTimeout(function() {
            jiggle(lim, i);
        }, 5);
    };
    jiggle(15);
};
GraphSearch.prototype.animatePath = function(path) {
    var grid = this.grid,
        timeout = 1000 / grid.length,
        elementFromNode = function(node) {
        return grid[node.x][node.y];
    };

    var self = this;
    // will add start class if final
    var removeClass = function(path, i) {
        if(i >= path.length) { // finished removing path, set start positions
            return setStartClass(path, i);
        }
        elementFromNode(path[i]).removeClass(css.active);
        setTimeout(function() {
            removeClass(path, i+1);
        }, timeout*path[i].getCost());
    };
    var setStartClass = function(path, i) {
        if(i === path.length) {
            self.$graph.find("." + css.start).removeClass(css.start);
            elementFromNode(path[i-1]).addClass(css.start);
        }
    };
    var addClass = function(path, i) {
        if(i >= path.length) { // Finished showing path, now remove
            return removeClass(path, 0);
        }
        elementFromNode(path[i]).addClass(css.active);
        setTimeout(function() {
            addClass(path, i+1);
        }, timeout*path[i].getCost());
    };

    addClass(path, 0);
    this.$graph.find("." + css.start).removeClass(css.start);
    this.$graph.find("." + css.finish).removeClass(css.finish).addClass(css.start);
};
