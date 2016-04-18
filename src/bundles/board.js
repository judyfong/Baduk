
// Sets the Border to the board dynamically
var setBorder = function () {
    var boardPadding = ($('.board').width() / 17) + 3;
    $('.board').css('padding', boardPadding).fadeTo(1, .99).fadeTo(1, 1);
}

$(document).ready(function (e) {
$('[data-toggle="popover"]').popover();

setBorder();
setBorder();
setTimeout (function (){
  if( $('#roommates > pre').length < 2) {
      $('#userWait').modal('show');
  }
}, 1000);

var coordOfClick = function (e) {
    var mouseX = e.pageX;
    var mouseY = e.pageY;

    var boardX = $(".board").offset().left;
    var boardY = $(".board").offset().top;

    var mouseRelX = mouseX - boardX;
    var mouseRelY = mouseY - boardY;

    var mousePctX = mouseRelX / $(".board").width();
    var mousePctY = mouseRelY / $(".board").height();

    // 0.07 is empirical
    var mousePicPctX = mousePctX - 0.07;
    var mousePicPctY = mousePctY - 0.07;

    var pieceCoordX = Math.round(mousePicPctX * 8);
    var pieceCoordY = Math.round(mousePicPctY * 8);

    return {
        x: pieceCoordX,
        y: pieceCoordY
    }
}

window.onBoardClick = function (e) {

    var coordOfClickE = coordOfClick(e);

    var room = /[^/]*$/.exec(window.location.pathname)[0];

    socket.emit('post_new_piece', {
        'row': coordOfClickE.x,
        'col': coordOfClickE.y,
        'room': room
    });
}

$('.board').click(window.onBoardClick);

$('#passBtn').click(function () {
    socket.emit('post_pass', {
        'room': room
    });
});

$('#resignBtn').click(function () {
    socket.emit('post_resign', {
        'room': room
    });
});

$(window).mousemove(function (e) {

    if (typeof(window.your_color) === 'undefined') return;

    var coordOfClickE = coordOfClick(e);

    var pieceCoordX = coordOfClickE.x;
    var pieceCoordY = coordOfClickE.y;

    var stoneSize = $('.board').width() / 8;
    var posOfStone = posOf(pieceCoordX, pieceCoordY);

    $('.ghostPiece').remove();
    if (0 <= pieceCoordX && pieceCoordX < 9
     && 0 <= pieceCoordY && pieceCoordY < 9
     && isLegalMove(window.mostRecentGameState, window.your_color, pieceCoordX, pieceCoordY)
    ) {
        var ghostPiece = $('<img>', {
            'class': 'ghostPiece',
            'src': '/img/black_circle.png',
            'css': {
                position: 'absolute',
                opacity: 0.4,
                left: posOfStone.x,
                top: posOfStone.y,
                width: stoneSize - 2,
            }
        });
        ghostPiece.click(function (event) {
            window.onBoardClick(event);
        });
        $(".inner").prepend(ghostPiece);
    }

});

$(window).resize(function () {
     window.renderSelectedGameState();
});

window.drawDebug = function (gameState) {
    $('.inner').empty().append(imgOfAll(gameState.blackStones, gameState.whiteStones, {}));
}

window.renderSelectedGameState = function () {
    if (window.mostRecentGameState) {
        render(window.mostRecentGameState, window.selectedMoveIdx);
    }
}

var resultStringOf = function (color, advantage) {
    if (advantage === 'resign') {
        return color[0].toUpperCase() + '+R';
    } else {
        return color[0].toUpperCase() + advantage.toString();
    }
}

socket.on('new_game_state', function (gameState) {

    // Play the sound for a new piece
    var move_sound = new Audio("/sounds/move.wav");
    move_sound.play();

    if (gameState.result) {
        $("#gameState").text(resultStringOf(gameState.result.winner, gameState.result.advantage));
    } else if (gameState.turn === 'white') {
        $("#gameState").text('White to play');
    } else {
        $("#gameState").text('Black to play');
    }
    window.mostRecentGameState = gameState;

    if (gameState.moves.length > 0) {
        var mostRecentMove = gameState.moves.slice(-1)[0];
        if (mostRecentMove.action === 'pass') {
            color = mostRecentMove.player_color.charAt(0).toUpperCase() + mostRecentMove.player_color.slice(1);
            window.notifyFromServer(color + ' passed');
        } else if (mostRecentMove.action === 'resign') {
            color = mostRecentMove.player_color.charAt(0).toUpperCase() + mostRecentMove.player_color.slice(1);
            window.notifyFromServer(color + ' resigned');
        }
    }

    window.selectedMoveIdx = gameState.moves.length - 1;
    window.renderSelectedGameState();
});

socket.on('move_is_illegal', function (msg) {
    console.log('illegal move');
});

var render = function (gameState, selectedMoveIdx) {
    setBorder();

    var selectedStones = boardStateHistoryOf(gameState)[selectedMoveIdx + 1].stones;
    var selectedMove = gameState.moves[selectedMoveIdx];

    $('.inner').empty().append(imgOfAll(selectedStones, gameState.size, selectedMove));
    $('#moveHistory').empty().append(renderedMoveHistoryOf(gameState, selectedMoveIdx));
}

var pairsOf = function (arr) {
    // return array of pairs [[arr[0], arr[1]], [arr[2], arr[3]] ...]
    var ret = [];
    for (var i=0; i<arr.length; i+=2) {
        if (i+1 < arr.length) {
            ret.push([{
                'idx': i,
                'elem': arr[i],
            }, {
                'idx': i+1,
                'elem': arr[i+1],
            }]);
        } else {
            ret.push([{
                'idx': i,
                'elem': arr[i],
            }]);
        }
    }
    return ret;
}

// return modified european coordinates of a move
// top left = A1, bottom right = T19 (I is skipped)
var reprOfMove = function (move) {
    if (move.action === 'pass') return 'pass';
    if (move.action === 'resign') return 'resign';
    if (move.action === 'new_piece') {
        return 'ABCDEFGHJKLMNOPQRST'[move.row] + (move.col + 1).toString();
    }
    if (move.action === undefined) throw "no action in " + JSON.stringify(move);
    throw "unrecognized move action " + move.action;
}

var renderedMoveHistoryOf = function (gameState, selectedMoveIdx) {
    return pairsOf(gameState.moves).map(function (moves) {
        if (moves.length === 2) {

            var container = $('<div>');

            var move1 = $('<span>', {
                text: reprOfMove(moves[0].elem),
            });
            var move2 = $('<span>', {
                text: reprOfMove(moves[1].elem),
            });

            if (moves[0].idx === selectedMoveIdx) {
                move1.css('font-weight', 'bold');
            } else if (moves[1].idx === selectedMoveIdx) {
                move2.css('font-weight', 'bold');
            }

            move1.click(function () {
                console.log('selected', moves[0].idx);
                window.selectedMoveIdx = moves[0].idx;
                window.renderSelectedGameState();
            });
            move2.click(function () {
                console.log('selected', moves[1].idx);
                window.selectedMoveIdx = moves[1].idx;
                window.renderSelectedGameState();
            });

            container.append(move1);
            container.append('|');
            container.append(move2);



            return container;
        } else {
            var container = $('<div>');
            var move1 = $('<span>', {
                text: reprOfMove(moves[0].elem),
            });

            if (moves[0].idx === selectedMoveIdx) {
                move1.css('font-weight', 'bold');
            }

            move1.click(function () {
                console.log('selected', moves[0].idx);
                window.selectedMoveIdx = moves[0].idx;
                window.renderSelectedGameState();
            });

            container.append(move1);
            return container;
        }
    });
}


imgOfAll = function (stones, boardSize, mostRecentMove) {

    var ret = [];

    for (var i=0; i<boardSize; i++) for (var j=0; j<boardSize; j++) {
        if (stones[i][j] === 1) {
            ret.push(imgOf(i, j, 'black', mostRecentMove));
        } else if (stones[i][j] === 2) {
            ret.push(imgOf(i, j, 'white', mostRecentMove));
        }
    }

    return ret;
}

posOf = function (row, col) {
    var stoneSize = $('.board').width() / 8;
    var impX = 19;
    var impY = $('.container').width() > 900 ? 85 : 67;
    return {
        x: (row * stoneSize) + impX,
        y: (col * stoneSize) + impY,
    };

}

imgOf = function (row, col, type, mostRecentMove) {
    var filename = '/img/' + type + '_circle';
    if (mostRecentMove.row === row && mostRecentMove.col === col) {
        filename += '_recent'
    }
    filename += '.png';

    var stoneSize = $('.board').width() / 8;
    var posOfStone = posOf(row, col);

    var css = {
        'position': 'absolute',
        'left': posOfStone.x,
        'top': posOfStone.y,
        'width': (stoneSize - 2)
    };

    return $("<img>", {
        'src': filename,
        'css': css
    });
}

});
