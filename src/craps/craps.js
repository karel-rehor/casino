

class Craps{
    constructor(){
        this.spot = 0;
        this.rolled = 0;
        this.state = 'neutral';
        this.passDice = false;
    }

    static rollDie(){
        return Math.floor(Math.random() * Math.floor(6)) + 1
    }

    static rollDice(ct){
        let result = 0;
        for(let i = 0; i < ct; i++){
            result += Craps.rollDie();
        }
        return result;
    }

    async roll(){
        this.rolled = Craps.rollDice(2);
        if(this.spot === 0){//comeout
            if(this.rolled === 7 || this.rolled === 11){
                this.state = 'win';
                this.passDice = false;
            }else if(this.rolled < 4 || this.rolled > 11){
                this.state = 'lose';
                this.passDice = true;
            }else{
                this.spot = this.rolled;
                this.state = 'neutral';
                this.passDice = false;
            }
        }else{
            if(this.rolled === 7){
                this.state = 'lose';
                this.spot = 0;
                this.passDice = true;
            }else if(this.rolled === this.spot){
                this.state = 'win';
                this.spot = 0;
            }
        }
    }
}

module.exports = new Craps();



