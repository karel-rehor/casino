
class Players{
    constructor(players){ //string array
        this.players = players;
        this.playerCt = 0;
    }

    getCurrent(){
        return this.players[this.playerCt];
    }

    next(){
        this.playerCt++;
        this.playerCt %= this.players.length;
    }

    getAll(){
        return this.players;
    }

    getCount(){
        return this.playerCt;
    }

}

module.exports = { Players };
