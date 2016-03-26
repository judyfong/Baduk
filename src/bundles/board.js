$(document).ready(function(e) {
    $('.board').click(function(e){
 
        var posX = (e.pageX - 48  - $(this).position().left);
        var posY = (e.pageY - 70 - $(this).position().top);

        var row = parseInt(posX / 57);
        var col = parseInt(posY / 57);
 
        if (row == 9) {
            row = 8;
        }
 
        if (col == 9) {
            col = 8;
        }

        console.log(row, col);

        var room = /[^/]*$/.exec(window.location.pathname)[0];

        socket.emit('post_new_piece', {
            'row': row,
            'col': col,
            'room': room
        });

    });

socket.on('new_game_state', function (msg) {
    $('.board').css("background", cssOfAll(msg.blackStones, msg.whiteStones));
    $('.board').css("background-size", '60px');
});


cssOfAll = function (blackStones, whiteStones) {
    cssOfBlack = blackStones.map(function (stone) {
        return cssOf(stone.x, stone.y, 'black');
    });
    cssOfWhite = whiteStones.map(function (stone) {
        return cssOf(stone.x, stone.y, 'white');
    });
    return cssOfBlack.concat(cssOfWhite).join(',');
}


cssOf = function (row, col, type) {
    var filename;
    if (type === 'white') {
        filename = '../img/white_circle.png';
    } else {
        filename = '../img/black_circle.png';
    }
    var posX = row * 55;
    var posY = col * 55;
    return 'url("' + filename + '") ' + posX + 'px ' + posY + 'px no-repeat';
}

});
